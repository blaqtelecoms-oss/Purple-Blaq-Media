create table public.clients (
	id text primary key default gen_random_uuid()::text,
	company_name text not null,
	logo text,
	description text,
	contact_person text,
	email text,
	phone text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.enquiries (
	id text primary key default gen_random_uuid()::text,
	full_name text not null,
	email text not null,
	phone text,
	company text,
	enquiry_type text,
	message text not null,
	status text not null default 'New' check (status in ('New', 'Contacted', 'Closed')),
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.projects (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	kind text not null check (kind in ('client', 'internal')),
	client_id text,
	type text,
	description text,
	image text,
	goals text,
	tasks jsonb not null default '[]'::jsonb,
	budget numeric not null default 0,
	spent numeric not null default 0,
	platform text,
	workspace_name text,
	app_url text,
	workspace_url text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.support_tickets (
	id text primary key default gen_random_uuid()::text,
	sender_name text not null,
	sender_email text not null,
	subject text not null default 'General enquiry',
	status text not null default 'Open' check (status in ('Open', 'Resolved')),
	assigned_to_id text,
	messages jsonb not null default '[]'::jsonb,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.team_members (
	id text primary key default gen_random_uuid()::text,
	full_name text not null,
	email text not null unique check (email = lower(email)),
	job_title text,
	role text not null check (role in ('Admin', 'Development', 'Marketing', 'Finance', 'Support')),
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.transactions (
	id text primary key default gen_random_uuid()::text,
	type text not null check (type in ('in', 'out')),
	date date not null,
	description text,
	category text,
	client_id text,
	amount numeric not null,
	status text not null default 'Pending' check (status in ('Paid', 'Pending')),
	invoice text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create index projects_client_id_idx on public.projects (client_id);
create index support_tickets_assigned_to_id_idx on public.support_tickets (assigned_to_id);
create index transactions_client_id_idx on public.transactions (client_id);

create function public.set_updated_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	new.updated_date = now();
	return new;
end;
$$;

create trigger clients_set_updated_date before update on public.clients
for each row execute function public.set_updated_date();
create trigger enquiries_set_updated_date before update on public.enquiries
for each row execute function public.set_updated_date();
create trigger projects_set_updated_date before update on public.projects
for each row execute function public.set_updated_date();
create trigger support_tickets_set_updated_date before update on public.support_tickets
for each row execute function public.set_updated_date();
create trigger team_members_set_updated_date before update on public.team_members
for each row execute function public.set_updated_date();
create trigger transactions_set_updated_date before update on public.transactions
for each row execute function public.set_updated_date();

create function public.prevent_last_admin_removal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if tg_op = 'DELETE' then
		if old.role = 'Admin' then
			perform pg_advisory_xact_lock(7142091);
			if (select count(*) from public.team_members where role = 'Admin') <= 1 then
				raise exception 'Cannot remove the last Admin.';
			end if;
		end if;
		return old;
	end if;

	if old.role = 'Admin' and new.role <> 'Admin' then
		perform pg_advisory_xact_lock(7142091);
		if (select count(*) from public.team_members where role = 'Admin') <= 1 then
			raise exception 'Cannot remove the last Admin.';
		end if;
	end if;
	return new;
end;
$$;

create trigger team_members_prevent_last_admin
before update of role or delete on public.team_members
for each row execute function public.prevent_last_admin_removal();

create function public.current_crm_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
	select role
	from public.team_members
	where auth.uid() is not null
		and email = lower(auth.jwt() ->> 'email')
	limit 1;
$$;

create function public.has_crm_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(public.current_crm_role() = any(allowed_roles), false);
$$;

revoke all on function public.current_crm_role() from public, anon;
revoke all on function public.has_crm_role(text[]) from public, anon;
grant execute on function public.current_crm_role() to authenticated;
grant execute on function public.has_crm_role(text[]) to authenticated;

alter table public.clients enable row level security;
alter table public.enquiries enable row level security;
alter table public.projects enable row level security;
alter table public.support_tickets enable row level security;
alter table public.team_members enable row level security;
alter table public.transactions enable row level security;

revoke all on public.clients, public.enquiries, public.projects,
	public.support_tickets, public.team_members, public.transactions
from public, anon, authenticated;
grant select, insert, update, delete on public.clients, public.enquiries,
	public.projects, public.support_tickets, public.team_members, public.transactions
to authenticated;

create policy "CRM roles read clients"
on public.clients for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing']));
create policy "Editors create clients"
on public.clients for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Editors update clients"
on public.clients for update to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Editors delete clients"
on public.clients for delete to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Admins read enquiries"
on public.enquiries for select to authenticated
using (public.has_crm_role(array['Admin']));
create policy "Admins update enquiries"
on public.enquiries for update to authenticated
using (public.has_crm_role(array['Admin']))
with check (public.has_crm_role(array['Admin']));
create policy "Admins delete enquiries"
on public.enquiries for delete to authenticated
using (public.has_crm_role(array['Admin']));

create policy "CRM roles read projects"
on public.projects for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing']));
create policy "Editors create projects"
on public.projects for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Development', 'Marketing']));
create policy "Editors update projects"
on public.projects for update to authenticated
using (public.has_crm_role(array['Admin', 'Development', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Development', 'Marketing']));
create policy "Editors delete projects"
on public.projects for delete to authenticated
using (public.has_crm_role(array['Admin', 'Development', 'Marketing']));

create policy "Support roles read tickets"
on public.support_tickets for select to authenticated
using (public.has_crm_role(array['Admin', 'Support']));
create policy "Support roles update tickets"
on public.support_tickets for update to authenticated
using (public.has_crm_role(array['Admin', 'Support']))
with check (public.has_crm_role(array['Admin', 'Support']));
create policy "Admins delete tickets"
on public.support_tickets for delete to authenticated
using (public.has_crm_role(array['Admin']));

create policy "Admins and support read team"
on public.team_members for select to authenticated
using (
	email = lower(auth.jwt() ->> 'email')
	or public.has_crm_role(array['Admin', 'Support'])
);
create policy "Admins create team members"
on public.team_members for insert to authenticated
with check (public.has_crm_role(array['Admin']));
create policy "Admins update team members"
on public.team_members for update to authenticated
using (public.has_crm_role(array['Admin']))
with check (public.has_crm_role(array['Admin']));
create policy "Admins delete team members"
on public.team_members for delete to authenticated
using (public.has_crm_role(array['Admin']));

create policy "Finance roles read transactions"
on public.transactions for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance']));
create policy "Finance roles create transactions"
on public.transactions for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Finance']));
create policy "Finance roles update transactions"
on public.transactions for update to authenticated
using (public.has_crm_role(array['Admin', 'Finance']))
with check (public.has_crm_role(array['Admin', 'Finance']));
create policy "Finance roles delete transactions"
on public.transactions for delete to authenticated
using (public.has_crm_role(array['Admin', 'Finance']));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'crm-files',
	'crm-files',
	false,
	10485760,
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "CRM members read private files"
on storage.objects for select to authenticated
using (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);
create policy "Editors upload private files"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'crm-files'
	and (storage.foldername(name))[1] = auth.uid()::text
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);
create policy "Editors update own private files"
on storage.objects for update to authenticated
using (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
)
with check (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);
create policy "Editors delete own private files"
on storage.objects for delete to authenticated
using (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);

do $$
begin
	if exists (
		select 1 from public.team_members
		where email = 'edusoft.linda@gmail.com'
	) then
		update public.team_members
		set role = 'Admin'
		where email = 'edusoft.linda@gmail.com';
	else
		insert into public.team_members (full_name, email, role, job_title)
		values ('Linda', 'edusoft.linda@gmail.com', 'Admin', 'Administrator');
	end if;
end;
$$;

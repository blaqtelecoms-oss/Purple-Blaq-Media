create or replace function public.current_crm_role()
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

create or replace function public.has_crm_role(allowed_roles text[])
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

drop policy if exists "CRM roles read clients" on public.clients;
create policy "CRM roles read clients"
on public.clients for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing']));
drop policy if exists "Editors create clients" on public.clients;
create policy "Editors create clients"
on public.clients for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Marketing']));
drop policy if exists "Editors update clients" on public.clients;
create policy "Editors update clients"
on public.clients for update to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));
drop policy if exists "Editors delete clients" on public.clients;
create policy "Editors delete clients"
on public.clients for delete to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));

drop policy if exists "Admins read enquiries" on public.enquiries;
create policy "Admins read enquiries"
on public.enquiries for select to authenticated
using (public.has_crm_role(array['Admin']));
drop policy if exists "Admins update enquiries" on public.enquiries;
create policy "Admins update enquiries"
on public.enquiries for update to authenticated
using (public.has_crm_role(array['Admin']))
with check (public.has_crm_role(array['Admin']));
drop policy if exists "Admins delete enquiries" on public.enquiries;
create policy "Admins delete enquiries"
on public.enquiries for delete to authenticated
using (public.has_crm_role(array['Admin']));

drop policy if exists "CRM roles read projects" on public.projects;
create policy "CRM roles read projects"
on public.projects for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing']));
drop policy if exists "Editors create projects" on public.projects;
create policy "Editors create projects"
on public.projects for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Development', 'Marketing']));
drop policy if exists "Editors update projects" on public.projects;
create policy "Editors update projects"
on public.projects for update to authenticated
using (public.has_crm_role(array['Admin', 'Development', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Development', 'Marketing']));
drop policy if exists "Editors delete projects" on public.projects;
create policy "Editors delete projects"
on public.projects for delete to authenticated
using (public.has_crm_role(array['Admin', 'Development', 'Marketing']));

drop policy if exists "Support roles read tickets" on public.support_tickets;
create policy "Support roles read tickets"
on public.support_tickets for select to authenticated
using (public.has_crm_role(array['Admin', 'Support']));
drop policy if exists "Support roles update tickets" on public.support_tickets;
create policy "Support roles update tickets"
on public.support_tickets for update to authenticated
using (public.has_crm_role(array['Admin', 'Support']))
with check (public.has_crm_role(array['Admin', 'Support']));
drop policy if exists "Admins delete tickets" on public.support_tickets;
create policy "Admins delete tickets"
on public.support_tickets for delete to authenticated
using (public.has_crm_role(array['Admin']));

drop policy if exists "Admins and support read team" on public.team_members;
create policy "Admins and support read team"
on public.team_members for select to authenticated
using (
	email = lower(auth.jwt() ->> 'email')
	or public.has_crm_role(array['Admin', 'Support'])
);
drop policy if exists "Admins create team members" on public.team_members;
create policy "Admins create team members"
on public.team_members for insert to authenticated
with check (public.has_crm_role(array['Admin']));
drop policy if exists "Admins update team members" on public.team_members;
create policy "Admins update team members"
on public.team_members for update to authenticated
using (public.has_crm_role(array['Admin']))
with check (public.has_crm_role(array['Admin']));
drop policy if exists "Admins delete team members" on public.team_members;
create policy "Admins delete team members"
on public.team_members for delete to authenticated
using (public.has_crm_role(array['Admin']));

drop policy if exists "Finance roles read transactions" on public.transactions;
create policy "Finance roles read transactions"
on public.transactions for select to authenticated
using (public.has_crm_role(array['Admin', 'Finance']));
drop policy if exists "Finance roles create transactions" on public.transactions;
create policy "Finance roles create transactions"
on public.transactions for insert to authenticated
with check (public.has_crm_role(array['Admin', 'Finance']));
drop policy if exists "Finance roles update transactions" on public.transactions;
create policy "Finance roles update transactions"
on public.transactions for update to authenticated
using (public.has_crm_role(array['Admin', 'Finance']))
with check (public.has_crm_role(array['Admin', 'Finance']));
drop policy if exists "Finance roles delete transactions" on public.transactions;
create policy "Finance roles delete transactions"
on public.transactions for delete to authenticated
using (public.has_crm_role(array['Admin', 'Finance']));

drop policy if exists "CRM members read private files" on storage.objects;
create policy "CRM members read private files"
on storage.objects for select to authenticated
using (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);
drop policy if exists "Editors upload private files" on storage.objects;
create policy "Editors upload private files"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'crm-files'
	and (storage.foldername(name))[1] = auth.uid()::text
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);
drop policy if exists "Editors update own private files" on storage.objects;
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
drop policy if exists "Editors delete own private files" on storage.objects;
create policy "Editors delete own private files"
on storage.objects for delete to authenticated
using (
	bucket_id = 'crm-files'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);

-- Marketing Hub: leads, campaigns, content, email, tasks, assets, tools and integrations.
-- Reuses existing clients and transactions (Finance) tables. No tokens stored here.

-- Ensure the updated_date trigger function exists (may be missing if the initial
-- migration was applied partially on the remote database).
create or replace function public.set_updated_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create table public.marketing_leads (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	company text,
	email text,
	phone text,
	source text not null default 'Website form',
	stage text not null default 'New' check (stage in ('New', 'Contacted', 'Proposal sent', 'Won', 'Lost')),
	value numeric not null default 0,
	campaign_id text,
	owner text,
	notes text,
	utm_source text,
	utm_campaign text,
	converted_client_id text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.campaigns (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	channel text,
	budget numeric not null default 0,
	spend numeric not null default 0,
	revenue numeric not null default 0,
	status text not null default 'Planned' check (status in ('Planned', 'Active', 'Ended')),
	start_date date,
	end_date date,
	external_account text,
	external_id text,
	expense_id text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.content_items (
	id text primary key default gen_random_uuid()::text,
	title text not null,
	platform text not null default 'Blog',
	status text not null default 'Idea' check (status in ('Idea', 'Drafting', 'Review', 'Scheduled', 'Published')),
	publish_date date,
	owner text,
	caption text,
	assets jsonb not null default '[]'::jsonb,
	external_post_id text,
	reach numeric not null default 0,
	likes numeric not null default 0,
	clicks numeric not null default 0,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.email_messages (
	id text primary key default gen_random_uuid()::text,
	direction text not null check (direction in ('inbound', 'outbound')),
	resend_id text,
	thread_id text,
	in_reply_to text,
	from_email text,
	to_email text,
	cc text,
	subject text,
	text text,
	html text,
	attachments jsonb not null default '[]'::jsonb,
	received_or_sent_at timestamptz,
	is_read boolean not null default false,
	lead_id text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.email_campaigns (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	sent_at timestamptz,
	list_size numeric not null default 0,
	open_rate numeric not null default 0,
	click_rate numeric not null default 0,
	status text not null default 'Draft',
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.marketing_tasks (
	id text primary key default gen_random_uuid()::text,
	title text not null,
	assignee text,
	due_date date,
	status text not null default 'To do' check (status in ('To do', 'In progress', 'Done')),
	requested_from text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.brand_assets (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	kind text not null default 'file' check (kind in ('file', 'colour', 'font', 'guideline')),
	url_or_value text,
	category text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.testimonials (
	id text primary key default gen_random_uuid()::text,
	quote text not null,
	client_id text,
	project_id text,
	approved boolean not null default false,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.competitors (
	id text primary key default gen_random_uuid()::text,
	name text not null,
	offering text,
	pricing text,
	notes text,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.marketing_budgets (
	id text primary key default gen_random_uuid()::text,
	month date not null,
	amount numeric not null default 0,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create table public.integration_connections (
	id text primary key default gen_random_uuid()::text,
	key text not null unique,
	status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'needs_setup')),
	account_label text,
	connected_at timestamptz,
	last_sync_at timestamptz,
	created_date timestamptz not null default now(),
	updated_date timestamptz not null default now(),
	created_by_id text,
	created_by text,
	source_data jsonb not null default '{}'::jsonb
);

create index marketing_leads_campaign_id_idx on public.marketing_leads (campaign_id);
create index marketing_leads_stage_idx on public.marketing_leads (stage);
create index marketing_leads_converted_client_id_idx on public.marketing_leads (converted_client_id);
create index campaigns_expense_id_idx on public.campaigns (expense_id);
create index email_messages_lead_id_idx on public.email_messages (lead_id);
create index email_messages_resend_id_idx on public.email_messages (resend_id);
create index email_messages_thread_id_idx on public.email_messages (thread_id);
create index content_items_publish_date_idx on public.content_items (publish_date);

create trigger marketing_leads_set_updated_date before update on public.marketing_leads
for each row execute function public.set_updated_date();
create trigger campaigns_set_updated_date before update on public.campaigns
for each row execute function public.set_updated_date();
create trigger content_items_set_updated_date before update on public.content_items
for each row execute function public.set_updated_date();
create trigger email_messages_set_updated_date before update on public.email_messages
for each row execute function public.set_updated_date();
create trigger email_campaigns_set_updated_date before update on public.email_campaigns
for each row execute function public.set_updated_date();
create trigger marketing_tasks_set_updated_date before update on public.marketing_tasks
for each row execute function public.set_updated_date();
create trigger brand_assets_set_updated_date before update on public.brand_assets
for each row execute function public.set_updated_date();
create trigger testimonials_set_updated_date before update on public.testimonials
for each row execute function public.set_updated_date();
create trigger competitors_set_updated_date before update on public.competitors
for each row execute function public.set_updated_date();
create trigger marketing_budgets_set_updated_date before update on public.marketing_budgets
for each row execute function public.set_updated_date();
create trigger integration_connections_set_updated_date before update on public.integration_connections
for each row execute function public.set_updated_date();

-- Keep Finance in sync: each campaign with spend has one matching Marketing expense.
create function public.sync_campaign_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if TG_OP = 'INSERT' then
		if coalesce(NEW.spend, 0) > 0 then
			insert into public.transactions (type, date, description, category, amount, status, source_data)
			values ('out', coalesce(NEW.start_date, current_date), 'Marketing: ' || NEW.name, 'Marketing', NEW.spend, 'Paid',
				jsonb_build_object('campaign_id', NEW.id, 'source', 'marketing_hub'))
			returning id into NEW.expense_id;
		end if;
	elsif TG_OP = 'UPDATE' then
		if coalesce(NEW.spend, 0) is distinct from coalesce(OLD.spend, 0) then
			if NEW.expense_id is not null then
				if coalesce(NEW.spend, 0) > 0 then
					update public.transactions
					set amount = NEW.spend, description = 'Marketing: ' || NEW.name, date = coalesce(NEW.start_date, current_date)
					where id = NEW.expense_id;
				else
					delete from public.transactions where id = NEW.expense_id;
					NEW.expense_id = null;
				end if;
			elsif coalesce(NEW.spend, 0) > 0 then
				insert into public.transactions (type, date, description, category, amount, status, source_data)
				values ('out', coalesce(NEW.start_date, current_date), 'Marketing: ' || NEW.name, 'Marketing', NEW.spend, 'Paid',
					jsonb_build_object('campaign_id', NEW.id, 'source', 'marketing_hub'))
				returning id into NEW.expense_id;
			end if;
		end if;
	end if;
	return NEW;
end;
$$;

create trigger campaigns_sync_expense
before insert or update on public.campaigns
for each row execute function public.sync_campaign_expense();

-- When a campaign is deleted, remove its matching expense too.
create function public.cleanup_campaign_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if OLD.expense_id is not null then
		delete from public.transactions where id = OLD.expense_id;
	end if;
	return OLD;
end;
$$;

create trigger campaigns_cleanup_expense
before delete on public.campaigns
for each row execute function public.cleanup_campaign_expense();

-- Row level security
alter table public.marketing_leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.content_items enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.marketing_tasks enable row level security;
alter table public.brand_assets enable row level security;
alter table public.testimonials enable row level security;
alter table public.competitors enable row level security;
alter table public.marketing_budgets enable row level security;
alter table public.integration_connections enable row level security;

revoke all on
	public.marketing_leads, public.campaigns, public.content_items,
	public.email_messages, public.email_campaigns, public.marketing_tasks,
	public.brand_assets, public.testimonials, public.competitors,
	public.marketing_budgets, public.integration_connections
from public, anon, authenticated;

grant select, insert, update, delete on
	public.marketing_leads, public.campaigns, public.content_items,
	public.email_messages, public.email_campaigns, public.marketing_tasks,
	public.brand_assets, public.testimonials, public.competitors,
	public.marketing_budgets, public.integration_connections
to authenticated;

create policy "Marketing roles read marketing data"
on public.marketing_leads for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write marketing leads"
on public.marketing_leads for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read campaigns"
on public.campaigns for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write campaigns"
on public.campaigns for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read content"
on public.content_items for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write content"
on public.content_items for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read email messages"
on public.email_messages for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write email messages"
on public.email_messages for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read email campaigns"
on public.email_campaigns for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write email campaigns"
on public.email_campaigns for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read marketing tasks"
on public.marketing_tasks for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write marketing tasks"
on public.marketing_tasks for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read brand assets"
on public.brand_assets for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write brand assets"
on public.brand_assets for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read testimonials"
on public.testimonials for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write testimonials"
on public.testimonials for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read competitors"
on public.competitors for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write competitors"
on public.competitors for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read budgets"
on public.marketing_budgets for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write budgets"
on public.marketing_budgets for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

create policy "Marketing roles read integrations"
on public.integration_connections for select to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']));
create policy "Marketing roles write integrations"
on public.integration_connections for all to authenticated
using (public.has_crm_role(array['Admin', 'Marketing']))
with check (public.has_crm_role(array['Admin', 'Marketing']));

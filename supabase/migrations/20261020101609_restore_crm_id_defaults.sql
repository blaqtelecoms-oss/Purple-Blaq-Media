alter table public.clients
	alter column id set default gen_random_uuid()::text;

alter table public.enquiries
	alter column id set default gen_random_uuid()::text;

alter table public.projects
	alter column id set default gen_random_uuid()::text;

alter table public.support_tickets
	alter column id set default gen_random_uuid()::text;

alter table public.team_members
	alter column id set default gen_random_uuid()::text;

alter table public.transactions
	alter column id set default gen_random_uuid()::text;
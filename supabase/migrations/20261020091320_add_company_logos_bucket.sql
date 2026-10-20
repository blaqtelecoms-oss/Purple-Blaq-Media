insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'company-logos',
	'company-logos',
	false,
	10485760,
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set name = excluded.name,
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "CRM roles read company logos"
on storage.objects for select to authenticated
using (
	bucket_id = 'company-logos'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);

create policy "Marketing editors upload company logos"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'company-logos'
	and (storage.foldername(name))[1] = auth.uid()::text
	and public.has_crm_role(array['Admin', 'Marketing'])
);

create policy "Marketing editors update own company logos"
on storage.objects for update to authenticated
using (
	bucket_id = 'company-logos'
	and public.has_crm_role(array['Admin', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
)
with check (
	bucket_id = 'company-logos'
	and public.has_crm_role(array['Admin', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);

create policy "Marketing editors delete own company logos"
on storage.objects for delete to authenticated
using (
	bucket_id = 'company-logos'
	and public.has_crm_role(array['Admin', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);
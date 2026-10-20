insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'project-images',
	'project-images',
	false,
	10485760,
	array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set name = excluded.name,
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "CRM roles read project images"
on storage.objects for select to authenticated
using (
	bucket_id = 'project-images'
	and public.has_crm_role(array['Admin', 'Finance', 'Development', 'Marketing'])
);

create policy "Project editors upload project images"
on storage.objects for insert to authenticated
with check (
	bucket_id = 'project-images'
	and (storage.foldername(name))[1] = auth.uid()::text
	and public.has_crm_role(array['Admin', 'Development', 'Marketing'])
);

create policy "Project editors update own project images"
on storage.objects for update to authenticated
using (
	bucket_id = 'project-images'
	and public.has_crm_role(array['Admin', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
)
with check (
	bucket_id = 'project-images'
	and public.has_crm_role(array['Admin', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);

create policy "Project editors delete own project images"
on storage.objects for delete to authenticated
using (
	bucket_id = 'project-images'
	and public.has_crm_role(array['Admin', 'Development', 'Marketing'])
	and ((storage.foldername(name))[1] = auth.uid()::text or public.has_crm_role(array['Admin']))
);
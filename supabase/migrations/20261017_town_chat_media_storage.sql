-- Town chat attachments: run in Supabase SQL Editor as project owner.
-- Uses public URLs for compatibility with the current message attachment_url column.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  20971520,
  array['image/*', 'video/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Each authenticated user may upload only into their own first-level folder: <auth.uid()>/...
drop policy if exists "Town users upload own chat media" on storage.objects;
create policy "Town users upload own chat media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Town users update own chat media" on storage.objects;
create policy "Town users update own chat media"
on storage.objects for update to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Town users delete own chat media" on storage.objects;
create policy "Town users delete own chat media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

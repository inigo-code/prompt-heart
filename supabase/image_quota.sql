-- Prompt Heart: cloud image limit, so the free Supabase plan stays sustainable.
-- Each account can keep at most 20 prompt images in storage (the profile photo, avatar.jpg, is extra).
-- Keep in sync with CLOUD_IMAGE_LIMIT in src/lib/images.ts. Safe to run more than once.

-- The count runs in a security definer function, outside row-level security. Counting
-- storage.objects from inside a policy on storage.objects is rejected by Supabase Storage as
-- infinite recursion (error 42P17), which made every upload fail. The function only ever counts the
-- caller's own images, and lives in a schema the API doesn't expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.own_prompt_image_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from storage.objects o
  where o.bucket_id = 'prompt-images'
    and (storage.foldername(o.name))[1] = (select auth.uid())::text
    and storage.filename(o.name) <> 'avatar.jpg'
$$;

revoke all on function private.own_prompt_image_count() from public, anon;
grant execute on function private.own_prompt_image_count() to authenticated;

alter policy "own prompt images insert" on storage.objects
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      storage.filename(name) = 'avatar.jpg'
      or (select private.own_prompt_image_count()) < 20
    )
  );

-- Images are resized to ~100 KB on the phone; 2 MB per file is plenty and caps abuse.
update storage.buckets set file_size_limit = 2097152 where id = 'prompt-images';

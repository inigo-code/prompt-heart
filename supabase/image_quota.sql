-- Prompt Heart: cloud image limit, so the free Supabase plan stays sustainable.
-- Each account can keep at most 20 prompt images in storage (the profile photo, avatar.jpg, is extra).
-- Keep in sync with CLOUD_IMAGE_LIMIT in src/lib/images.ts. Safe to run more than once.

alter policy "own prompt images insert" on storage.objects
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      storage.filename(name) = 'avatar.jpg'
      or (
        select count(*)
        from storage.objects o
        where o.bucket_id = 'prompt-images'
          and (storage.foldername(o.name))[1] = (select auth.uid())::text
          and storage.filename(o.name) <> 'avatar.jpg'
      ) < 20
    )
  );

-- Images are resized to ~100 KB on the phone; 2 MB per file is plenty and caps abuse.
update storage.buckets set file_size_limit = 2097152 where id = 'prompt-images';

-- Prompt Heart: who can upload to the prompt images bucket. Each account can store as many images as it
-- likes, in its own folder only (the 20-image limit was removed on 2026-11-05). Safe to run more than once.

alter policy "own prompt images insert" on storage.objects
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop function if exists private.own_prompt_image_count();

-- Images are resized to ~100 KB on the phone; 2 MB per file is plenty and caps abuse.
update storage.buckets set file_size_limit = 2097152 where id = 'prompt-images';

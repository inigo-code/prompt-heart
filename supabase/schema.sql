-- Prompt Heart (formerly Prompt Notes): cloud sync schema.
-- Paste into Supabase Dashboard -> SQL Editor -> New query, then Run. Safe to run more than once.
--
-- Sync model:
--   * Records keep their client-generated ids; (user_id, id) is the primary key.
--   * Deletes are soft (deleted_at), so other devices learn about them.
--   * Conflicts resolve last-write-wins on modified_at (client ms timestamp):
--     an incoming write that is not newer than what's stored is silently ignored.
--   * server_updated_at is set by the server and is what devices pull from.

create table if not exists public.folders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  color text not null,
  created_at bigint not null,
  modified_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table if not exists public.prompts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null default '',
  body text not null default '',
  folder_id text,
  tags text[] not null default '{}',
  pinned boolean not null default false,
  copy_count integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null,
  last_copied_at bigint,
  modified_at bigint not null,
  deleted_at bigint,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index if not exists folders_pull_idx on public.folders (user_id, server_updated_at);
create index if not exists prompts_pull_idx on public.prompts (user_id, server_updated_at);

-- Last-write-wins + server timestamp. For prompts, copy stats only ever go up, whichever text wins
-- (see copy_stats.sql), so copying on a device that missed an edit never overwrites the newer text.
create or replace function public.sync_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  copies integer;
  copied bigint;
begin
  if tg_op = 'UPDATE' and tg_table_name = 'prompts' then
    copies := greatest(new.copy_count, old.copy_count);
    copied := nullif(greatest(coalesce(new.last_copied_at, 0), coalesce(old.last_copied_at, 0)), 0);
    if new.modified_at <= old.modified_at then
      if copies = old.copy_count and copied is not distinct from old.last_copied_at then
        return null; -- nothing new (also stops echo loops)
      end if;
      new := old; -- the stored text is the same or newer: keep it
    end if;
    new.copy_count := copies;
    new.last_copied_at := copied;
  elsif tg_op = 'UPDATE' and new.modified_at <= old.modified_at then
    return null; -- stored row is the same or newer; skip (also stops echo loops)
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists folders_sync_lww on public.folders;
create trigger folders_sync_lww before insert or update on public.folders
  for each row execute function public.sync_lww();

drop trigger if exists prompts_sync_lww on public.prompts;
create trigger prompts_sync_lww before insert or update on public.prompts
  for each row execute function public.sync_lww();

-- Row Level Security: each user can only see and write their own rows.
alter table public.folders enable row level security;
alter table public.prompts enable row level security;

drop policy if exists "own folders" on public.folders;
create policy "own folders" on public.folders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own prompts" on public.prompts;
create policy "own prompts" on public.prompts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Live updates between devices.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'folders') then
    alter publication supabase_realtime add table public.folders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'prompts') then
    alter publication supabase_realtime add table public.prompts;
  end if;
end;
$$;

-- Image attachments (added later; safe to re-run).
alter table public.prompts add column if not exists images text[] not null default '{}';

-- Private bucket; files live at <user id>/<image id>.jpg and only their owner can reach them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prompt-images', 'prompt-images', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own prompt images read" on storage.objects;
create policy "own prompt images read" on storage.objects for select to authenticated
  using (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own prompt images insert" on storage.objects;
create policy "own prompt images insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own prompt images update" on storage.objects;
create policy "own prompt images update" on storage.objects for update to authenticated
  using (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own prompt images delete" on storage.objects;
create policy "own prompt images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'prompt-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

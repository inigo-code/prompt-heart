-- Prompt Heart: copying a prompt must never overwrite newer text from another device.
-- Copy statistics (copy_count, last_copied_at) only ever go up, whichever version of the text wins:
-- an upload whose text is older than the stored row (modified_at is not newer) keeps the stored text
-- and only raises the copy stats. Folders keep plain last-write-wins. Safe to run more than once.

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

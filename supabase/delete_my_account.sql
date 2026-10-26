-- Prompt Heart: in-app "Delete account".
-- Paste into Supabase Dashboard -> SQL Editor -> New query, then Run. Safe to run more than once.
--
-- Lets a signed-in user delete their own account and nothing else (auth.uid() is the caller).
-- Their prompts and folders are removed with it (ON DELETE CASCADE on user_id); the app deletes
-- their image files from Storage before calling this.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

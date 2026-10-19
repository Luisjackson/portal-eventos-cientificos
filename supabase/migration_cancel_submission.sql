-- Execute no SQL Editor do Supabase.
-- Permite ao autor cancelar somente uma submissão pertencente à própria conta.
-- As tabelas relacionadas usam ON DELETE CASCADE.

create or replace function public.cancel_my_submission(p_submission_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na conta para continuar';
  end if;

  delete from public.submissions
  where id = p_submission_id
    and user_id = (select auth.uid())
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$$;

revoke all on function public.cancel_my_submission(uuid) from public;
grant execute on function public.cancel_my_submission(uuid) to authenticated;

notify pgrst, 'reload schema';

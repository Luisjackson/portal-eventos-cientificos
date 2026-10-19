-- Execute no SQL Editor do Supabase.
-- Cancela somente uma inscrição pertencente ao usuário autenticado e informa
-- ao portal se a linha foi realmente removida.

create or replace function public.cancel_my_registration(p_registration_id uuid)
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

  delete from public.registrations
  where id = p_registration_id
    and user_id = (select auth.uid())
  returning id into v_deleted_id;

  return v_deleted_id is not null;
end;
$$;

revoke all on function public.cancel_my_registration(uuid) from public;
grant execute on function public.cancel_my_registration(uuid) to authenticated;

notify pgrst, 'reload schema';

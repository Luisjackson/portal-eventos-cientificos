-- Execute no SQL Editor do Supabase.
-- Permite que integrantes ativos da organização excluam seus eventos.
-- Os vínculos do comitê são removidos pela chave estrangeira ON DELETE CASCADE.

create or replace function public.delete_organization_event(
  p_event_id uuid,
  p_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na conta para continuar';
  end if;

  if not (select public.is_organization_member(p_organization_id)) then
    raise exception 'Acesso restrito à organização';
  end if;

  delete from public.event_configurations
  where id = p_event_id
    and organization_id = p_organization_id;

  return found;
end;
$$;

revoke all on function public.delete_organization_event(uuid, uuid) from public;
grant execute on function public.delete_organization_event(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';

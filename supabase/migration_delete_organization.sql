-- Execute no SQL Editor do Supabase.
-- Permite que somente o proprietário exclua sua organização.
-- Eventos, integrantes e comitês vinculados são removidos em cascata.

create or replace function public.delete_my_organization(p_organization_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na conta para continuar';
  end if;

  if not (select public.is_organization_owner(p_organization_id)) then
    raise exception 'Somente o proprietário pode excluir esta organização';
  end if;

  delete from public.organizations
  where id = p_organization_id
    and created_by = (select auth.uid());

  return found;
end;
$$;

revoke all on function public.delete_my_organization(uuid) from public;
grant execute on function public.delete_my_organization(uuid) to authenticated;

notify pgrst, 'reload schema';

-- Execute depois de migration_self_service_organizations.sql.
-- Garante que integrantes das organizações acessíveis apareçam no painel.

create or replace function public.list_my_organization_members()
returns table (
  id uuid,
  organization_id uuid,
  user_id uuid,
  email text,
  role text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    om.id,
    om.organization_id,
    om.user_id,
    om.email,
    om.role,
    om.active,
    om.created_at,
    om.updated_at
  from public.organization_members om
  where exists (
    select 1
    from public.organization_members access
    where access.organization_id = om.organization_id
      and access.user_id = (select auth.uid())
      and access.active
  )
  order by om.created_at;
$$;

revoke all on function public.list_my_organization_members() from public;
grant execute on function public.list_my_organization_members() to authenticated;

notify pgrst, 'reload schema';

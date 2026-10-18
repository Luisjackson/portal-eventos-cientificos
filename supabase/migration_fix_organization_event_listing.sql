-- Execute depois de migration_self_service_organizations.sql.
-- Remove a referência circular entre as políticas RLS de eventos e comitês.

create or replace function public.is_event_committee_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_committee_members ecm
    where ecm.event_id = p_event_id
      and ecm.user_id = (select auth.uid())
      and ecm.active
  );
$$;

create or replace function public.is_event_organization_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_configurations ec
    join public.organization_members om on om.organization_id = ec.organization_id
    where ec.id = p_event_id
      and om.user_id = (select auth.uid())
      and om.active
  );
$$;

revoke all on function public.is_event_committee_member(uuid) from public;
revoke all on function public.is_event_organization_member(uuid) from public;
grant execute on function public.is_event_committee_member(uuid) to authenticated;
grant execute on function public.is_event_organization_member(uuid) to authenticated;

drop policy if exists "Comitê consulta configurações de eventos" on public.event_configurations;
create policy "Comitê consulta configurações de eventos"
on public.event_configurations for select to authenticated
using (
  (select public.is_organization_member(organization_id))
  or (select public.is_event_committee_member(id))
  or (organization_id is null and (select public.is_committee()))
);

drop policy if exists "Equipe consulta comitês dos eventos" on public.event_committee_members;
create policy "Equipe consulta comitês dos eventos"
on public.event_committee_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_event_organization_member(event_id))
);

notify pgrst, 'reload schema';

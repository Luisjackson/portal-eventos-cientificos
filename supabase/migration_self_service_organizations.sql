-- Execute uma vez no SQL Editor depois de migration_committee_area.sql.
-- Habilita organizações criadas pelo próprio usuário e comitês por evento.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 120),
  acronym text not null default '' check (char_length(acronym) <= 20),
  description text not null default '' check (char_length(description) <= 1000),
  institution text not null default '' check (char_length(institution) <= 160),
  contact_email text not null,
  website text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'organizer' check (role in ('owner', 'organizer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.event_configurations
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create table if not exists public.event_committee_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_configurations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id, active);
create index if not exists event_configurations_organization_idx on public.event_configurations (organization_id);
create index if not exists event_committee_members_user_idx on public.event_committee_members (user_id, active);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.event_committee_members enable row level security;

revoke all on table public.organizations, public.organization_members, public.event_committee_members from anon;
grant select on table public.organizations, public.organization_members, public.event_committee_members to authenticated;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.active
  );
$$;

create or replace function public.is_organization_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id
      and om.user_id = (select auth.uid())
      and om.role = 'owner'
      and om.active
  );
$$;

create or replace function public.is_event_committee_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.event_committee_members ecm
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

create or replace function public.is_committee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.event_committee_members ecm
      where ecm.user_id = (select auth.uid()) and ecm.active
    )
    or exists (
      select 1 from public.organization_members om
      where om.user_id = (select auth.uid()) and om.active
    )
    or exists (
      select 1 from public.committee_members cm
      where cm.user_id = (select auth.uid()) and cm.active
    );
$$;

drop policy if exists "Usuário consulta suas organizações" on public.organizations;
create policy "Usuário consulta suas organizações"
on public.organizations for select to authenticated
using ((select public.is_organization_member(id)));

drop policy if exists "Integrante consulta equipe da organização" on public.organization_members;
create policy "Integrante consulta equipe da organização"
on public.organization_members for select to authenticated
using ((select public.is_organization_member(organization_id)));

drop policy if exists "Equipe consulta comitês dos eventos" on public.event_committee_members;
create policy "Equipe consulta comitês dos eventos"
on public.event_committee_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_event_organization_member(event_id))
);

drop policy if exists "Comitê consulta configurações de eventos" on public.event_configurations;
create policy "Comitê consulta configurações de eventos"
on public.event_configurations for select to authenticated
using (
  (select public.is_organization_member(organization_id))
  or (select public.is_event_committee_member(id))
  or (organization_id is null and (select public.is_committee()))
);

drop policy if exists "Comitê configura eventos" on public.event_configurations;
create policy "Comitê configura eventos"
on public.event_configurations for all to authenticated
using ((select public.is_organization_member(organization_id)))
with check ((select public.is_organization_member(organization_id)));

create or replace function public.create_organization(
  p_name text,
  p_acronym text,
  p_description text,
  p_institution text,
  p_contact_email text,
  p_website text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text;
begin
  if (select auth.uid()) is null then raise exception 'Entre na conta para continuar'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then raise exception 'Informe o nome da organização'; end if;
  if position('@' in coalesce(p_contact_email, '')) = 0 then raise exception 'Informe um e-mail válido'; end if;
  select email into v_email from auth.users where id = (select auth.uid());
  insert into public.organizations (name, acronym, description, institution, contact_email, website, created_by)
  values (trim(p_name), upper(trim(coalesce(p_acronym, ''))), trim(coalesce(p_description, '')), trim(coalesce(p_institution, '')), lower(trim(p_contact_email)), trim(coalesce(p_website, '')), (select auth.uid()))
  returning id into v_id;
  insert into public.organization_members (organization_id, user_id, email, role)
  values (v_id, (select auth.uid()), lower(v_email), 'owner');
  return v_id;
end;
$$;

create or replace function public.save_organization_event(
  p_event_id uuid,
  p_organization_id uuid,
  p_event_name text,
  p_description text,
  p_location text,
  p_format text,
  p_starts_on date,
  p_ends_on date,
  p_submission_deadline date,
  p_review_deadline date,
  p_modalities text[],
  p_contact_email text,
  p_published boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if not (select public.is_organization_member(p_organization_id)) then raise exception 'Acesso restrito à organização'; end if;
  if p_format not in ('Presencial', 'Online', 'Híbrido') then raise exception 'Formato inválido'; end if;
  if p_ends_on < p_starts_on then raise exception 'A data final deve ser posterior à inicial'; end if;
  if p_event_id is null then
    insert into public.event_configurations (organization_id, event_name, description, location, format, starts_on, ends_on, submission_deadline, review_deadline, modalities, contact_email, published)
    values (p_organization_id, trim(p_event_name), trim(p_description), trim(p_location), p_format, p_starts_on, p_ends_on, p_submission_deadline, p_review_deadline, p_modalities, lower(trim(p_contact_email)), p_published)
    returning id into v_id;
  else
    update public.event_configurations set
      event_name = trim(p_event_name), description = trim(p_description), location = trim(p_location), format = p_format,
      starts_on = p_starts_on, ends_on = p_ends_on, submission_deadline = p_submission_deadline,
      review_deadline = p_review_deadline, modalities = p_modalities, contact_email = lower(trim(p_contact_email)),
      published = p_published, updated_at = now()
    where id = p_event_id and organization_id = p_organization_id
    returning id into v_id;
    if v_id is null then raise exception 'Evento não encontrado'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.manage_organization_member(
  p_organization_id uuid,
  p_email text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid;
begin
  if not (select public.is_organization_owner(p_organization_id)) then raise exception 'Somente o proprietário pode alterar a equipe'; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'Conta não encontrada'; end if;
  insert into public.organization_members (organization_id, user_id, email, role, active)
  values (p_organization_id, v_user_id, lower(trim(p_email)), 'organizer', p_active)
  on conflict (organization_id, user_id) do update set active = excluded.active, email = excluded.email, updated_at = now();
  return v_user_id;
end;
$$;

create or replace function public.manage_event_committee_member(
  p_event_id uuid,
  p_email text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
begin
  select organization_id into v_organization_id from public.event_configurations where id = p_event_id;
  if v_organization_id is null or not (select public.is_organization_member(v_organization_id)) then raise exception 'Acesso restrito à organização'; end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'Conta não encontrada'; end if;
  insert into public.event_committee_members (event_id, user_id, email, active)
  values (p_event_id, v_user_id, lower(trim(p_email)), p_active)
  on conflict (event_id, user_id) do update set active = excluded.active, email = excluded.email, updated_at = now();
  return v_user_id;
end;
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_owner(uuid) from public;
revoke all on function public.is_event_committee_member(uuid) from public;
revoke all on function public.is_event_organization_member(uuid) from public;
revoke all on function public.create_organization(text, text, text, text, text, text) from public;
revoke all on function public.save_organization_event(uuid, uuid, text, text, text, text, date, date, date, date, text[], text, boolean) from public;
revoke all on function public.manage_organization_member(uuid, text, boolean) from public;
revoke all on function public.manage_event_committee_member(uuid, text, boolean) from public;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_owner(uuid) to authenticated;
grant execute on function public.is_event_committee_member(uuid) to authenticated;
grant execute on function public.is_event_organization_member(uuid) to authenticated;
grant execute on function public.create_organization(text, text, text, text, text, text) to authenticated;
grant execute on function public.save_organization_event(uuid, uuid, text, text, text, text, date, date, date, date, text[], text, boolean) to authenticated;
grant execute on function public.manage_organization_member(uuid, text, boolean) to authenticated;
grant execute on function public.manage_event_committee_member(uuid, text, boolean) to authenticated;
grant execute on function public.is_committee() to authenticated;

notify pgrst, 'reload schema';

-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Requer schema.sql, migration_author_area.sql e migration_reviewer_area.sql.

create table if not exists public.committee_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'committee' check (role in ('organizer', 'committee')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.committee_members enable row level security;
revoke all on table public.committee_members from anon;
grant select on table public.committee_members to authenticated;

create or replace function public.is_committee()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.committee_members
    where user_id = (select auth.uid()) and active
  );
$$;

revoke all on function public.is_committee() from public;
grant execute on function public.is_committee() to authenticated;

drop policy if exists "Membro consulta o comitê" on public.committee_members;
create policy "Membro consulta o comitê"
on public.committee_members for select to authenticated
using ((select public.is_committee()));

create table if not exists public.event_configurations (
  id uuid primary key default gen_random_uuid(),
  event_name text not null unique,
  description text not null default '',
  location text not null default '',
  format text not null default 'Presencial' check (format in ('Presencial', 'Online', 'Híbrido')),
  starts_on date,
  ends_on date,
  submission_deadline date,
  review_deadline date,
  modalities text[] not null default '{}',
  contact_email text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_configurations enable row level security;
grant select on table public.event_configurations to anon, authenticated;
grant insert, update, delete on table public.event_configurations to authenticated;

drop policy if exists "Público consulta eventos publicados" on public.event_configurations;
create policy "Público consulta eventos publicados"
on public.event_configurations for select to anon, authenticated
using (published);

drop policy if exists "Comitê consulta configurações de eventos" on public.event_configurations;
create policy "Comitê consulta configurações de eventos"
on public.event_configurations for select to authenticated
using ((select public.is_committee()));

drop policy if exists "Comitê configura eventos" on public.event_configurations;
create policy "Comitê configura eventos"
on public.event_configurations for all to authenticated
using ((select public.is_committee()))
with check ((select public.is_committee()));

alter table public.registrations add column if not exists attendance_confirmed boolean not null default false;
alter table public.registrations add column if not exists badge_issued boolean not null default false;
alter table public.submissions add column if not exists decision_message text;
alter table public.submissions add column if not exists published boolean not null default false;
alter table public.submissions add column if not exists published_at timestamptz;
alter table public.review_assignments add column if not exists reviewer_email text;

update public.review_assignments ra
set reviewer_email = u.email
from auth.users u
where u.id = ra.reviewer_id and ra.reviewer_email is null;

create table if not exists public.submission_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 3 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists submission_messages_submission_idx
on public.submission_messages (submission_id, created_at);

alter table public.submission_messages enable row level security;
revoke all on table public.submission_messages from anon;
grant select on table public.submission_messages to authenticated;

drop policy if exists "Autor consulta mensagens da submissão" on public.submission_messages;
create policy "Autor consulta mensagens da submissão"
on public.submission_messages for select to authenticated
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id and s.user_id = (select auth.uid())
  )
  or (select public.is_committee())
);

drop policy if exists "Comitê consulta perfis" on public.profiles;
create policy "Comitê consulta perfis"
on public.profiles for select to authenticated
using ((select public.is_committee()));

drop policy if exists "Comitê consulta inscrições" on public.registrations;
create policy "Comitê consulta inscrições"
on public.registrations for select to authenticated
using ((select public.is_committee()));

drop policy if exists "Comitê consulta submissões" on public.submissions;
create policy "Comitê consulta submissões"
on public.submissions for select to authenticated
using ((select public.is_committee()));

drop policy if exists "Comitê consulta revisões" on public.review_assignments;
create policy "Comitê consulta revisões"
on public.review_assignments for select to authenticated
using ((select public.is_committee()));

create or replace function public.manage_committee_member(
  p_email text,
  p_role text,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not (select public.is_committee()) then
    raise exception 'Acesso restrito à organização';
  end if;
  if p_role not in ('organizer', 'committee') then
    raise exception 'Papel inválido';
  end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user_id is null then raise exception 'Conta não encontrada'; end if;
  insert into public.committee_members (user_id, email, role, active)
  values (v_user_id, lower(trim(p_email)), p_role, p_active)
  on conflict (user_id) do update set role = excluded.role, active = excluded.active, email = excluded.email, updated_at = now();
  update public.profiles set role = 'comite', updated_at = now() where id = v_user_id;
  return v_user_id;
end;
$$;

create or replace function public.assign_reviewer_committee(
  p_submission_id uuid,
  p_reviewer_email text,
  p_deadline date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid;
  v_assignment_id uuid;
begin
  if not (select public.is_committee()) then raise exception 'Acesso restrito à organização'; end if;
  select id into v_reviewer_id from auth.users where lower(email) = lower(trim(p_reviewer_email)) limit 1;
  if v_reviewer_id is null then raise exception 'Conta de revisor não encontrada'; end if;
  if not exists (select 1 from public.submissions where id = p_submission_id) then raise exception 'Submissão não encontrada'; end if;
  insert into public.review_assignments (submission_id, reviewer_id, reviewer_email, deadline)
  values (p_submission_id, v_reviewer_id, lower(trim(p_reviewer_email)), coalesce(p_deadline, current_date + 14))
  on conflict (submission_id, reviewer_id) do update set deadline = excluded.deadline, reviewer_email = excluded.reviewer_email, updated_at = now()
  returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;

create or replace function public.assign_submission_reviewer(
  p_submission_id uuid,
  p_reviewer_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid;
  v_assignment_id uuid;
begin
  if not exists (
    select 1 from public.submissions
    where id = p_submission_id and user_id = (select auth.uid())
  ) then raise exception 'Submissão não encontrada ou não pertence ao usuário'; end if;
  select id into v_reviewer_id from auth.users where lower(email) = lower(trim(p_reviewer_email)) limit 1;
  if v_reviewer_id is null then raise exception 'Não existe uma conta cadastrada com esse e-mail'; end if;
  if v_reviewer_id = (select auth.uid()) then raise exception 'O autor não pode revisar o próprio artigo'; end if;
  insert into public.review_assignments (submission_id, reviewer_id, reviewer_email, deadline)
  values (p_submission_id, v_reviewer_id, lower(trim(p_reviewer_email)), current_date + 14)
  on conflict (submission_id, reviewer_id) do update set deadline = excluded.deadline, reviewer_email = excluded.reviewer_email, updated_at = now()
  returning id into v_assignment_id;
  return v_assignment_id;
end;
$$;

create or replace function public.record_submission_decision(
  p_submission_id uuid,
  p_decision text,
  p_message text,
  p_publish boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_committee()) then raise exception 'Acesso restrito à organização'; end if;
  if p_decision not in ('accepted', 'changes_requested', 'rejected') then raise exception 'Decisão inválida'; end if;
  if char_length(trim(coalesce(p_message, ''))) < 10 then raise exception 'Informe uma comunicação com pelo menos 10 caracteres'; end if;
  update public.submissions
  set status = p_decision,
      decision_message = trim(p_message),
      review_text = trim(p_message),
      decision_at = now(),
      published = case when p_decision = 'accepted' then p_publish else false end,
      published_at = case when p_decision = 'accepted' and p_publish then now() else null end,
      updated_at = now()
  where id = p_submission_id;
  if not found then raise exception 'Submissão não encontrada'; end if;
  insert into public.submission_messages (submission_id, sender_id, message)
  values (p_submission_id, (select auth.uid()), trim(p_message));
end;
$$;

create or replace function public.send_submission_message(p_submission_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_committee()) then raise exception 'Acesso restrito à organização'; end if;
  if char_length(trim(coalesce(p_message, ''))) < 3 then raise exception 'Mensagem muito curta'; end if;
  insert into public.submission_messages (submission_id, sender_id, message)
  values (p_submission_id, (select auth.uid()), trim(p_message));
end;
$$;

create or replace function public.manage_registration(
  p_registration_id uuid,
  p_payment_status text,
  p_attendance_confirmed boolean,
  p_badge_issued boolean,
  p_certificate_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_committee()) then raise exception 'Acesso restrito à organização'; end if;
  if p_payment_status not in ('pending', 'paid', 'cancelled') then raise exception 'Pagamento inválido'; end if;
  update public.registrations
  set payment_status = p_payment_status,
      attendance_confirmed = p_attendance_confirmed,
      badge_issued = p_badge_issued,
      certificate_available = p_certificate_available
  where id = p_registration_id;
  if not found then raise exception 'Inscrição não encontrada'; end if;
end;
$$;

create or replace function public.public_approved_articles()
returns table (event_name text, title text, track text, authors text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.event_name, s.title, s.track,
    concat_ws(', ', nullif(p.full_name, ''), (
      select string_agg(c.full_name, ', ' order by c.created_at)
      from public.coauthors c where c.submission_id = s.id
    )) as authors
  from public.submissions s
  left join public.profiles p on p.id = s.user_id
  where s.published and s.status in ('accepted', 'final_submitted')
  order by s.published_at desc nulls last;
$$;

revoke all on function public.manage_committee_member(text, text, boolean) from public;
revoke all on function public.assign_reviewer_committee(uuid, text, date) from public;
revoke all on function public.assign_submission_reviewer(uuid, text) from public;
revoke all on function public.record_submission_decision(uuid, text, text, boolean) from public;
revoke all on function public.send_submission_message(uuid, text) from public;
revoke all on function public.manage_registration(uuid, text, boolean, boolean, boolean) from public;
grant execute on function public.manage_committee_member(text, text, boolean) to authenticated;
grant execute on function public.assign_reviewer_committee(uuid, text, date) to authenticated;
grant execute on function public.assign_submission_reviewer(uuid, text) to authenticated;
grant execute on function public.record_submission_decision(uuid, text, text, boolean) to authenticated;
grant execute on function public.send_submission_message(uuid, text) to authenticated;
grant execute on function public.manage_registration(uuid, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.public_approved_articles() to anon, authenticated;

-- Depois de executar a migração, torne sua conta organizadora (troque o e-mail):
-- insert into public.committee_members (user_id, email, role)
-- select id, email, 'organizer' from auth.users
-- where lower(email) = lower('seu-email@exemplo.com')
-- on conflict (user_id) do update set active = true, role = 'organizer', email = excluded.email;

notify pgrst, 'reload schema';

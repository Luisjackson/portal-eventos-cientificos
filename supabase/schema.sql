-- Execute este arquivo uma vez no SQL Editor do projeto Supabase.
-- Ele cria os perfis e as inscrições com acesso restrito ao próprio usuário.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'participante'
    check (role in ('participante', 'autor', 'revisor', 'comite')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated;

drop policy if exists "Usuário pode visualizar o próprio perfil" on public.profiles;
create policy "Usuário pode visualizar o próprio perfil"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' in ('participante', 'autor')
        then new.raw_user_meta_data ->> 'role'
      else 'participante'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  event_date text not null,
  event_location text not null,
  category text not null check (category in ('Estudante', 'Profissional')),
  activities text[] not null default '{}',
  activity_hours integer not null default 0 check (activity_hours >= 0),
  amount numeric(10, 2) not null check (amount >= 0),
  payment_method text not null default 'pix' check (payment_method = 'pix'),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  certificate_available boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, event_name)
);

alter table public.registrations enable row level security;
revoke all on table public.registrations from anon;
grant select, insert, update on table public.registrations to authenticated;

drop policy if exists "Usuário pode visualizar as próprias inscrições" on public.registrations;
create policy "Usuário pode visualizar as próprias inscrições"
on public.registrations for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuário pode criar as próprias inscrições" on public.registrations;
create policy "Usuário pode criar as próprias inscrições"
on public.registrations for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuário pode atualizar as próprias inscrições" on public.registrations;
create policy "Usuário pode atualizar as próprias inscrições"
on public.registrations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

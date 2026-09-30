-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Ele amplia o perfil e cria a jornada persistente do autor, incluindo PDFs privados.

alter table public.profiles add column if not exists institution text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

grant update (full_name, role, institution, bio, updated_at) on table public.profiles to authenticated;

drop policy if exists "Usuário pode atualizar o próprio perfil" on public.profiles;
create policy "Usuário pode atualizar o próprio perfil"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and role in ('participante', 'autor')
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  title text not null check (char_length(title) >= 10),
  track text not null,
  abstract text not null check (char_length(abstract) between 80 and 1500),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'changes_requested', 'accepted', 'rejected', 'final_submitted')),
  original_file_path text not null,
  original_file_name text not null,
  final_file_path text,
  final_file_name text,
  review_text text,
  decision_at timestamptz,
  final_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists submissions_user_id_idx on public.submissions (user_id);
alter table public.submissions enable row level security;
revoke all on table public.submissions from anon;
grant select, insert on table public.submissions to authenticated;

drop policy if exists "Autor pode visualizar as próprias submissões" on public.submissions;
create policy "Autor pode visualizar as próprias submissões"
on public.submissions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Autor pode criar as próprias submissões" on public.submissions;
create policy "Autor pode criar as próprias submissões"
on public.submissions for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'submitted');

create table if not exists public.coauthors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  institution text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists coauthors_submission_id_idx on public.coauthors (submission_id);
alter table public.coauthors enable row level security;
revoke all on table public.coauthors from anon;
grant select, insert, delete on table public.coauthors to authenticated;

drop policy if exists "Autor pode visualizar os coautores" on public.coauthors;
create policy "Autor pode visualizar os coautores"
on public.coauthors for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Autor pode cadastrar coautores" on public.coauthors;
create policy "Autor pode cadastrar coautores"
on public.coauthors for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.submissions
    where submissions.id = submission_id
      and submissions.user_id = (select auth.uid())
  )
);

drop policy if exists "Autor pode remover coautores" on public.coauthors;
create policy "Autor pode remover coautores"
on public.coauthors for delete to authenticated
using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-files', 'article-files', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Autor envia os próprios artigos" on storage.objects;
create policy "Autor envia os próprios artigos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Autor atualiza os próprios artigos" on storage.objects;
create policy "Autor atualiza os próprios artigos"
on storage.objects for update to authenticated
using (
  bucket_id = 'article-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'article-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Autor lê os próprios artigos" on storage.objects;
create policy "Autor lê os próprios artigos"
on storage.objects for select to authenticated
using (
  bucket_id = 'article-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Autor remove os próprios artigos" on storage.objects;
create policy "Autor remove os próprios artigos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'article-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.submit_final_version(
  p_submission_id uuid,
  p_file_path text,
  p_file_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submissions
  set final_file_path = p_file_path,
      final_file_name = p_file_name,
      status = 'final_submitted',
      final_submitted_at = now(),
      updated_at = now()
  where id = p_submission_id
    and user_id = (select auth.uid())
    and status in ('accepted', 'changes_requested');

  if not found then
    raise exception 'Submissão não encontrada ou não permite versão final';
  end if;
end;
$$;

revoke all on function public.submit_final_version(uuid, text, text) from public;
grant execute on function public.submit_final_version(uuid, text, text) to authenticated;


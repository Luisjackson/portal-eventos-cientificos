-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Ele cria atribuições de revisão, pareceres e acesso privado aos PDFs designados.

create table if not exists public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  deadline date not null default (current_date + 14),
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed', 'conflict')),
  clarity_score integer check (clarity_score between 1 and 5),
  originality_score integer check (originality_score between 1 and 5),
  methodology_score integer check (methodology_score between 1 and 5),
  relevance_score integer check (relevance_score between 1 and 5),
  recommendation text check (recommendation in ('accept', 'minor_changes', 'major_changes', 'reject')),
  review_text text,
  conflict_reason text,
  started_at timestamptz,
  submitted_at timestamptz,
  conflict_declared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, reviewer_id)
);

create index if not exists review_assignments_reviewer_idx
on public.review_assignments (reviewer_id, status, deadline);

alter table public.review_assignments enable row level security;
revoke all on table public.review_assignments from anon;
grant select on table public.review_assignments to authenticated;

drop policy if exists "Revisor visualiza as próprias atribuições" on public.review_assignments;
create policy "Revisor visualiza as próprias atribuições"
on public.review_assignments for select to authenticated
using ((select auth.uid()) = reviewer_id);

drop policy if exists "Revisor visualiza trabalhos atribuídos" on public.submissions;
create policy "Revisor visualiza trabalhos atribuídos"
on public.submissions for select to authenticated
using (
  exists (
    select 1 from public.review_assignments
    where review_assignments.submission_id = submissions.id
      and review_assignments.reviewer_id = (select auth.uid())
      and review_assignments.status <> 'conflict'
  )
);

drop policy if exists "Revisor lê PDFs atribuídos" on storage.objects;
create policy "Revisor lê PDFs atribuídos"
on storage.objects for select to authenticated
using (
  bucket_id = 'article-files'
  and array_length(storage.foldername(name), 1) >= 2
  and exists (
    select 1 from public.review_assignments
    where review_assignments.submission_id::text = (storage.foldername(name))[2]
      and review_assignments.reviewer_id = (select auth.uid())
      and review_assignments.status <> 'conflict'
  )
);

create or replace function public.start_review(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.review_assignments
  set status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = p_assignment_id
    and reviewer_id = (select auth.uid())
    and status = 'assigned';
end;
$$;

create or replace function public.submit_review(
  p_assignment_id uuid,
  p_clarity_score integer,
  p_originality_score integer,
  p_methodology_score integer,
  p_relevance_score integer,
  p_recommendation text,
  p_review_text text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_clarity_score is null or p_clarity_score not between 1 and 5
    or p_originality_score is null or p_originality_score not between 1 and 5
    or p_methodology_score is null or p_methodology_score not between 1 and 5
    or p_relevance_score is null or p_relevance_score not between 1 and 5 then
    raise exception 'As notas devem estar entre 1 e 5';
  end if;

  if p_recommendation is null or p_recommendation not in ('accept', 'minor_changes', 'major_changes', 'reject') then
    raise exception 'Recomendação inválida';
  end if;

  if char_length(trim(coalesce(p_review_text, ''))) < 80 then
    raise exception 'O parecer deve ter pelo menos 80 caracteres';
  end if;

  update public.review_assignments
  set clarity_score = p_clarity_score,
      originality_score = p_originality_score,
      methodology_score = p_methodology_score,
      relevance_score = p_relevance_score,
      recommendation = p_recommendation,
      review_text = trim(p_review_text),
      status = 'completed',
      submitted_at = now(),
      updated_at = now()
  where id = p_assignment_id
    and reviewer_id = (select auth.uid())
    and status in ('assigned', 'in_progress');

  if not found then
    raise exception 'Atribuição não encontrada ou já encerrada';
  end if;
end;
$$;

create or replace function public.declare_review_conflict(
  p_assignment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_reason, ''))) < 20 then
    raise exception 'Explique o conflito em pelo menos 20 caracteres';
  end if;

  update public.review_assignments
  set conflict_reason = trim(p_reason),
      status = 'conflict',
      conflict_declared_at = now(),
      updated_at = now()
  where id = p_assignment_id
    and reviewer_id = (select auth.uid())
    and status in ('assigned', 'in_progress');

  if not found then
    raise exception 'Atribuição não encontrada ou já encerrada';
  end if;
end;
$$;

revoke all on function public.start_review(uuid) from public;
revoke all on function public.submit_review(uuid, integer, integer, integer, integer, text, text) from public;
revoke all on function public.declare_review_conflict(uuid, text) from public;
grant execute on function public.start_review(uuid) to authenticated;
grant execute on function public.submit_review(uuid, integer, integer, integer, integer, text, text) to authenticated;
grant execute on function public.declare_review_conflict(uuid, text) to authenticated;

create or replace function public.mark_submission_under_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.submissions
  set status = 'under_review', updated_at = now()
  where id = new.submission_id and status = 'submitted';
  return new;
end;
$$;

drop trigger if exists on_review_assignment_created on public.review_assignments;
create trigger on_review_assignment_created
after insert on public.review_assignments
for each row execute procedure public.mark_submission_under_review();

-- Exemplo de atribuição pela organização (substitua os e-mails/título):
-- insert into public.review_assignments (submission_id, reviewer_id, deadline)
-- select s.id, u.id, current_date + 14
-- from public.submissions s cross join auth.users u
-- where s.title = 'Título do artigo' and u.email = 'revisor@exemplo.com';

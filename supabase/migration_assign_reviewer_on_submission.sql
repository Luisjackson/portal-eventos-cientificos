-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Permite que, neste protótipo, o autor atribua sua nova submissão a uma conta pelo e-mail.
-- Requer que migration_reviewer_area.sql já tenha sido executada.

create or replace function public.reviewer_account_exists(p_reviewer_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(p_reviewer_email))
      and id <> (select auth.uid())
  );
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
    select 1
    from public.submissions
    where id = p_submission_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'Submissão não encontrada ou não pertence ao usuário';
  end if;

  select id into v_reviewer_id
  from auth.users
  where lower(email) = lower(trim(p_reviewer_email))
  limit 1;

  if v_reviewer_id is null then
    raise exception 'Não existe uma conta cadastrada com esse e-mail';
  end if;

  if v_reviewer_id = (select auth.uid()) then
    raise exception 'O autor não pode revisar o próprio artigo';
  end if;

  insert into public.review_assignments (
    submission_id,
    reviewer_id,
    deadline
  )
  values (
    p_submission_id,
    v_reviewer_id,
    current_date + 14
  )
  on conflict (submission_id, reviewer_id)
  do update set
    deadline = excluded.deadline,
    updated_at = now()
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

revoke all on function public.assign_submission_reviewer(uuid, text) from public;
revoke all on function public.reviewer_account_exists(text) from public;
grant execute on function public.assign_submission_reviewer(uuid, text) to authenticated;
grant execute on function public.reviewer_account_exists(text) to authenticated;

notify pgrst, 'reload schema';

-- Execute no SQL Editor do Supabase.
-- Lista todos os nomes de eventos no formulário de submissão sem expor as
-- demais configurações privadas e remove os limites mínimos de caracteres.

alter table public.submissions
  drop constraint if exists submissions_title_check;

alter table public.submissions
  drop constraint if exists submissions_abstract_check;

create or replace function public.list_submission_event_names()
returns table (event_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct trim(ec.event_name) as event_name
  from public.event_configurations ec
  where trim(coalesce(ec.event_name, '')) <> ''
  order by 1;
$$;

revoke all on function public.list_submission_event_names() from public;
grant execute on function public.list_submission_event_names() to authenticated;

notify pgrst, 'reload schema';

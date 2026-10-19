-- Execute no SQL Editor do Supabase.
-- Adiciona conteúdo detalhado e configurável à página pública dos eventos.

alter table public.event_configurations
  add column if not exists program_items jsonb not null default '[]'::jsonb,
  add column if not exists call_title text not null default '',
  add column if not exists call_description text not null default '',
  add column if not exists submission_guidelines text[] not null default '{}',
  add column if not exists contact_phone text not null default '',
  add column if not exists service_hours text not null default '';

create or replace function public.save_event_public_content(
  p_event_id uuid,
  p_program_items jsonb,
  p_call_title text,
  p_call_description text,
  p_submission_guidelines text[],
  p_contact_phone text,
  p_service_hours text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_organization_id uuid;
begin
  select organization_id into v_organization_id
  from public.event_configurations
  where id = p_event_id;

  if v_organization_id is null or not (select public.is_organization_member(v_organization_id)) then
    raise exception 'Acesso restrito à organização';
  end if;

  update public.event_configurations
  set
    program_items = coalesce(p_program_items, '[]'::jsonb),
    call_title = trim(coalesce(p_call_title, '')),
    call_description = trim(coalesce(p_call_description, '')),
    submission_guidelines = coalesce(p_submission_guidelines, '{}'),
    contact_phone = trim(coalesce(p_contact_phone, '')),
    service_hours = trim(coalesce(p_service_hours, '')),
    updated_at = now()
  where id = p_event_id
    and organization_id = v_organization_id;

  return found;
end;
$$;

revoke all on function public.save_event_public_content(uuid, jsonb, text, text, text[], text, text) from public;
grant execute on function public.save_event_public_content(uuid, jsonb, text, text, text[], text, text) to authenticated;

notify pgrst, 'reload schema';

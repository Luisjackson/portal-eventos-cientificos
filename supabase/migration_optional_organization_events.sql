-- Execute depois de migration_self_service_organizations.sql.
-- Permite salvar um evento como rascunho sem preencher nenhum campo.

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
declare
  v_id uuid;
  v_event_name text;
  v_format text;
begin
  if not (select public.is_organization_member(p_organization_id)) then
    raise exception 'Acesso restrito à organização';
  end if;

  v_format := coalesce(nullif(trim(coalesce(p_format, '')), ''), 'Presencial');
  if v_format not in ('Presencial', 'Online', 'Híbrido') then raise exception 'Formato inválido'; end if;
  if p_starts_on is not null and p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'A data final deve ser posterior à inicial';
  end if;

  v_event_name := nullif(trim(coalesce(p_event_name, '')), '');
  if v_event_name is null then
    if p_event_id is null then
      v_event_name := 'Evento sem título ' || upper(substr(gen_random_uuid()::text, 1, 4));
    else
      v_event_name := 'Evento sem título ' || upper(substr(p_event_id::text, 1, 4));
    end if;
  end if;

  if p_event_id is null then
    insert into public.event_configurations (
      organization_id, event_name, description, location, format, starts_on, ends_on,
      submission_deadline, review_deadline, modalities, contact_email, published
    ) values (
      p_organization_id, v_event_name, trim(coalesce(p_description, '')), trim(coalesce(p_location, '')),
      v_format, p_starts_on, p_ends_on, p_submission_deadline, p_review_deadline,
      coalesce(p_modalities, '{}'), lower(trim(coalesce(p_contact_email, ''))), coalesce(p_published, false)
    ) returning id into v_id;
  else
    update public.event_configurations set
      event_name = v_event_name,
      description = trim(coalesce(p_description, '')),
      location = trim(coalesce(p_location, '')),
      format = v_format,
      starts_on = p_starts_on,
      ends_on = p_ends_on,
      submission_deadline = p_submission_deadline,
      review_deadline = p_review_deadline,
      modalities = coalesce(p_modalities, '{}'),
      contact_email = lower(trim(coalesce(p_contact_email, ''))),
      published = coalesce(p_published, false),
      updated_at = now()
    where id = p_event_id and organization_id = p_organization_id
    returning id into v_id;
    if v_id is null then raise exception 'Evento não encontrado'; end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_organization_event(uuid, uuid, text, text, text, text, date, date, date, date, text[], text, boolean) from public;
grant execute on function public.save_organization_event(uuid, uuid, text, text, text, text, date, date, date, date, text[], text, boolean) to authenticated;

notify pgrst, 'reload schema';

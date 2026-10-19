-- Execute no SQL Editor do Supabase.
-- Adiciona uma cor de identificação e permite que o proprietário edite a organização.

alter table public.organizations
  add column if not exists brand_color text not null default '#2563EB';

alter table public.organizations
  drop constraint if exists organizations_brand_color_check;

alter table public.organizations
  add constraint organizations_brand_color_check
  check (brand_color in ('#2563EB', '#7C3AED', '#059669', '#EA580C', '#DC2626', '#475569'));

create or replace function public.update_my_organization(
  p_organization_id uuid,
  p_name text,
  p_acronym text,
  p_description text,
  p_institution text,
  p_contact_email text,
  p_website text,
  p_brand_color text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na conta para continuar';
  end if;
  if not (select public.is_organization_owner(p_organization_id)) then
    raise exception 'Somente o proprietário pode editar a organização';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Informe o nome da organização';
  end if;
  if position('@' in coalesce(p_contact_email, '')) = 0 then
    raise exception 'Informe um e-mail válido';
  end if;
  if p_brand_color not in ('#2563EB', '#7C3AED', '#059669', '#EA580C', '#DC2626', '#475569') then
    raise exception 'Escolha uma cor válida';
  end if;

  update public.organizations
  set
    name = trim(p_name),
    acronym = upper(trim(coalesce(p_acronym, ''))),
    description = trim(coalesce(p_description, '')),
    institution = trim(coalesce(p_institution, '')),
    contact_email = lower(trim(p_contact_email)),
    website = trim(coalesce(p_website, '')),
    brand_color = p_brand_color,
    updated_at = now()
  where id = p_organization_id
    and created_by = (select auth.uid());

  return found;
end;
$$;

revoke all on function public.update_my_organization(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.update_my_organization(uuid, text, text, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

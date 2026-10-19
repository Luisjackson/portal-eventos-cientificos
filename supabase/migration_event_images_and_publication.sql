-- Execute depois de migration_self_service_organizations.sql.
-- Adiciona capas opcionais aos eventos e armazenamento público das imagens.

alter table public.event_configurations
  add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-images',
  'event-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Organizadores enviam imagens de eventos" on storage.objects;
create policy "Organizadores enviam imagens de eventos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.active
  )
);

drop policy if exists "Organizadores atualizam imagens de eventos" on storage.objects;
create policy "Organizadores atualizam imagens de eventos"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.active
  )
)
with check (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.active
  )
);

drop policy if exists "Organizadores removem imagens de eventos" on storage.objects;
create policy "Organizadores removem imagens de eventos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-images'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.active
  )
);

notify pgrst, 'reload schema';

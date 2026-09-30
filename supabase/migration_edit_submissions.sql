-- Execute este arquivo uma vez no SQL Editor do Supabase.
-- Permite ao autor editar os dados e substituir o PDF das próprias submissões.

grant update (
  event_name,
  title,
  track,
  abstract,
  original_file_path,
  original_file_name,
  updated_at
) on table public.submissions to authenticated;

drop policy if exists "Autor pode editar as próprias submissões" on public.submissions;
create policy "Autor pode editar as próprias submissões"
on public.submissions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

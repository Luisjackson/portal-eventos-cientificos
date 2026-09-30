-- Execute no SQL Editor se o schema.sql já foi instalado anteriormente.
-- Libera apenas o cancelamento das inscrições pertencentes ao usuário conectado.

grant delete on table public.registrations to authenticated;

drop policy if exists "Usuário pode cancelar as próprias inscrições" on public.registrations;
create policy "Usuário pode cancelar as próprias inscrições"
on public.registrations for delete to authenticated
using ((select auth.uid()) = user_id);

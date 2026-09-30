# Portal de Eventos Científicos

Esboço inicial navegável para a atividade de IHC da UNEB. A primeira entrega cobre a área pública do portal e demonstra:

- descoberta de eventos por busca, área e modalidade;
- agenda de chamadas com prazo aberto;
- programação e chamada de trabalhos específicas para cada evento;
- cartões de eventos com favoritos e feedback;
- acesso às áreas de Participante, Autor, Revisor e Comitê Científico;
- login, cadastro e recuperação de senha integrados ao Supabase Auth;
- página autenticada separada com visão geral, perfil editável, eventos inscritos e cancelamento;
- inscrição persistida no Supabase e pagamento Pix demonstrativo com QR Code;
- crachá imprimível, certificado condicionado à presença e acompanhamento do pagamento;
- submissão persistente de artigos em PDF, coautores, situação, parecer e versão final;
- estados normal, vazio e de sucesso;
- layout responsivo e navegação por teclado.

## Executar localmente

```bash
python3 -m http.server 4173 --directory dist
```

Abra `http://localhost:4173` no navegador.

## Autenticação

O login e o cadastro usam Supabase Auth com e-mail e senha. Nome e perfil são enviados como metadados da conta e, quando a tabela `public.profiles` está configurada, o portal consulta o perfil protegido por Row Level Security. Cadastros públicos podem escolher os perfis Participante ou Autor; Revisor e Comitê científico devem ser atribuídos por um administrador.

Para ativar a persistência de perfis e inscrições, execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor do projeto Supabase. As políticas RLS garantem que cada usuário consulte e altere somente as próprias inscrições.

Se o schema principal já foi executado antes da funcionalidade de cancelamento, execute também [`supabase/migration_cancel_registration.sql`](./supabase/migration_cancel_registration.sql).

Para ativar o perfil editável e a área do autor, execute também [`supabase/migration_author_area.sql`](./supabase/migration_author_area.sql). A migração cria as tabelas de submissões e coautores, um bucket privado para os PDFs e políticas RLS. O parecer e a decisão são preenchidos pela organização diretamente no Supabase neste estágio do protótipo.

## Estrutura

- `dist/index.html`: estrutura e conteúdo do portal;
- `dist/styles.css`: identidade visual e responsividade;
- `dist/app.js`: busca, filtros, favoritos e diálogo de acesso;
- `dist/dashboard.js`: área autenticada do participante e do autor;
- `supabase/`: schema e migrações do banco;
- `.openai/hosting.json`: configuração de publicação do protótipo.

# Portal de Eventos Científicos

Esboço inicial navegável para a atividade de IHC da UNEB. A primeira entrega cobre a área pública do portal e demonstra:

- descoberta de eventos por busca, área e modalidade;
- agenda de chamadas com prazo aberto;
- programação, chamada, orientações, prazos, trabalhos aprovados e contatos específicos para cada evento;
- cartões de eventos com favoritos e feedback;
- acesso às áreas de Participante, Autor, Revisor e Comitê Científico;
- login, cadastro e recuperação de senha integrados ao Supabase Auth;
- página autenticada separada com visão geral, perfil editável, eventos inscritos e cancelamento;
- inscrição persistida no Supabase e pagamento Pix demonstrativo com QR Code;
- crachá imprimível, certificado condicionado à presença e acompanhamento do pagamento;
- submissão persistente de artigos em PDF, coautores, situação, parecer e versão final;
- área do revisor com trabalhos atribuídos, PDF privado, critérios, notas, parecer, conflito e prazos;
- área protegida da organização e do comitê para eventos, participantes, equipe, múltiplos revisores, decisões, comunicações, publicação de aprovados e emissão de documentos;
- estados normal, vazio e de sucesso;
- layout responsivo e navegação por teclado.

## Executar localmente

```bash
python3 -m http.server 4173 --directory dist
```

Abra `http://localhost:4173` no navegador.

## Autenticação

O login e o cadastro usam Supabase Auth com e-mail e senha. O nome é enviado como metadado da conta e, quando a tabela `public.profiles` está configurada, o portal consulta o perfil protegido por Row Level Security. O cadastro é único: a pessoa assume o papel de participante ao se inscrever e de autora ao submeter um trabalho, podendo acumular os dois papéis. Revisor e Comitê científico continuam sendo permissões concedidas pela organização.

Para ativar a persistência de perfis e inscrições, execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor do projeto Supabase. As políticas RLS garantem que cada usuário consulte e altere somente as próprias inscrições.

Se o schema principal já foi executado antes da funcionalidade de cancelamento, execute também [`supabase/migration_cancel_registration.sql`](./supabase/migration_cancel_registration.sql).

Para ativar o perfil editável e a área do autor, execute também [`supabase/migration_author_area.sql`](./supabase/migration_author_area.sql). A migração cria as tabelas de submissões e coautores, um bucket privado para os PDFs e políticas RLS. O parecer e a decisão são preenchidos pela organização diretamente no Supabase neste estágio do protótipo.

Se a área do autor já estava ativa, execute [`supabase/migration_edit_submissions.sql`](./supabase/migration_edit_submissions.sql) para permitir que cada autor altere os dados, coautores e PDF das próprias submissões sem mudar o ID do artigo.

Para ativar a área do revisor, execute [`supabase/migration_reviewer_area.sql`](./supabase/migration_reviewer_area.sql). O revisor não escolhe esse papel no cadastro: a organização cria uma atribuição relacionando uma submissão à conta do revisor. Há um exemplo de SQL comentado no final da migração. Cada pessoa acessa somente as próprias atribuições e PDFs.

Neste protótipo, o formulário de nova submissão também permite indicar a conta do revisor pelo e-mail. Depois da migração da área do revisor, execute [`supabase/migration_assign_reviewer_on_submission.sql`](./supabase/migration_assign_reviewer_on_submission.sql) para ativar essa atribuição automática.

Para ativar a gestão da organização, execute [`supabase/migration_committee_area.sql`](./supabase/migration_committee_area.sql). Depois, use o comando comentado no final do arquivo para cadastrar a primeira conta organizadora. A área ficará disponível em `comite.html`; somente membros ativos conseguem consultar ou alterar os dados administrativos.

## Estrutura

- `dist/index.html`: estrutura e conteúdo do portal;
- `dist/styles.css`: identidade visual e responsividade;
- `dist/app.js`: busca, filtros, favoritos e diálogo de acesso;
- `dist/dashboard.js`: área autenticada do participante e do autor;
- `supabase/`: schema e migrações do banco;
- `.openai/hosting.json`: configuração de publicação do protótipo.

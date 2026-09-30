# Portal de Eventos Científicos

Esboço inicial navegável para a atividade de IHC da UNEB. A primeira entrega cobre a área pública do portal e demonstra:

- descoberta de eventos por busca, área e modalidade;
- agenda de chamadas com prazo aberto;
- cartões de eventos com favoritos e feedback;
- acesso às áreas de Participante, Autor, Revisor e Comitê Científico;
- login, cadastro e recuperação de senha integrados ao Supabase Auth;
- estados normal, vazio e de sucesso;
- layout responsivo e navegação por teclado.

## Executar localmente

```bash
python3 -m http.server 4173 --directory dist
```

Abra `http://localhost:4173` no navegador.

## Autenticação

O login e o cadastro usam Supabase Auth com e-mail e senha. Nome e perfil são enviados como metadados da conta e, quando a tabela `public.profiles` está configurada, o portal consulta o perfil protegido por Row Level Security. Cadastros públicos podem escolher os perfis Participante ou Autor; Revisor e Comitê científico devem ser atribuídos por um administrador.

## Estrutura

- `dist/index.html`: estrutura e conteúdo do portal;
- `dist/styles.css`: identidade visual e responsividade;
- `dist/app.js`: busca, filtros, favoritos e diálogo de acesso;
- `.openai/hosting.json`: configuração de publicação do protótipo.

# Backlog do protótipo de IHC

Este backlog organiza as lacunas encontradas na comparação entre o protótipo, o estudo de aplicações correlatas e o enunciado da atividade. As funcionalidades são demonstrativas e não dependem de backend.

## Baixa dificuldade

- [x] Página detalhada do evento com programação, prazos, orientações, trabalhos aprovados e contato.
- [x] Botão de inscrição visível na página do evento.
- [x] Estado de carregamento ao abrir detalhes.
- [x] Mensagens de validação contextual no login.
- [x] Página 404 com caminhos de recuperação.
- [x] Painel de acessibilidade com tamanho do texto, alto contraste e redução de movimento.
- [x] Linha do tempo visual das etapas da chamada.
- [ ] Filtro dedicado por cidade, data e classificação indicativa.
- [x] Programação pública específica para cada evento.

## Média dificuldade

- [x] Inscrição demonstrativa em etapas, com categoria, atividades, carga horária, resumo e Pix simulado.
- [x] Chatbot demonstrativo para dúvidas sobre datas, locais, inscrições, programação e prazos dos eventos cadastrados.
- [x] Login, criação de conta, sessão persistente e recuperação de senha integrados ao Supabase Auth.
- [x] Painel do participante com perfil, eventos inscritos, atividades e indicadores de certificados.
- [x] Página separada “Minha área” e cancelamento seguro de inscrição.
- [x] QR Code Pix demonstrativo no fluxo de inscrição.
- [x] Crachá imprimível e certificado com código de validação (consulta pública ainda pendente).
- [ ] Assistente de submissão com salvamento de rascunho.
- [x] Cadastro persistente de coautores (validação de conta ainda pendente).
- [ ] Painel do revisor com artigo, critérios, prazo e declaração de conflito.
- [ ] Seletor de perfil ativo para quem acumula os papéis de autor e revisor.
- [ ] Estados vazios, de carregamento, sucesso e erro em todos os fluxos.

## Alta dificuldade

- [ ] Painel do comitê para configurar evento, modalidades e prazos.
- [ ] Distribuição de cada artigo para mais de um revisor.
- [ ] Consolidação de notas, pareceres e decisão final.
- [x] Exibição de decisão/parecer e envio protegido da versão final pelo autor.
- [ ] Gestão de participantes, pagamentos e emissão em lote de crachás e certificados.
- [x] Persistência das inscrições por usuário no Supabase com Row Level Security.
- [x] Persistência de submissões e PDFs privados no Supabase com Row Level Security.
- [ ] SMTP personalizado e integração de pagamento real.

## Artefatos acadêmicos

- [ ] Wireframes de baixa fidelidade.
- [ ] Protótipo de média fidelidade.
- [ ] Matriz de rastreabilidade entre estudo, manual visual, wireframes e versão final.
- [ ] Evidências dos estados e dos fluxos principais para apresentação.

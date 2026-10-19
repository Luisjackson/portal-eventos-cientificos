(() => {
  if (document.querySelector('[data-open-access]')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <button class="access-trigger" type="button" data-open-access data-label="Acessibilidade" aria-label="Abrir recursos de acessibilidade" title="Acessibilidade"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="4" r="2"/><path d="M5 8.5c2.2.8 4.6 1.2 7 1.2s4.8-.4 7-1.2M12 10v4M8 21l4-7 4 7"/></svg></button>
    <dialog class="access-dialog" id="global-access-dialog" aria-labelledby="global-access-title"><button class="dialog-close" type="button" aria-label="Fechar recursos de acessibilidade" data-close-global-access>×</button><p class="dialog-kicker">Preferências de leitura</p><h2 id="global-access-title">Acessibilidade</h2><p>Personalize a interface neste dispositivo.</p><div class="access-options"><div><span>Tamanho do texto</span><div class="button-group"><button type="button" data-global-font="decrease" aria-label="Diminuir texto">A−</button><button type="button" data-global-font="reset">Padrão</button><button type="button" data-global-font="increase" aria-label="Aumentar texto">A+</button></div></div><label><span><strong>Alto contraste</strong><small>Aumenta a distinção entre texto e fundo</small></span><input type="checkbox" id="global-contrast-toggle"/></label><label><span><strong>Reduzir movimento</strong><small>Desativa animações e rolagem suave</small></span><input type="checkbox" id="global-motion-toggle"/></label></div><button class="button button-secondary full" type="button" id="global-reset-access">Restaurar preferências</button></dialog>
    <button class="chat-trigger" type="button" id="global-chat-trigger" aria-expanded="false" aria-controls="global-event-chat" aria-label="Abrir assistente de eventos"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 18.5 3.5 22l4.2-2A9.5 9.5 0 1 0 5 18.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg><span class="chat-trigger-label">Tire suas dúvidas</span></button>
    <section class="chat-panel" id="global-event-chat" role="dialog" aria-modal="false" aria-labelledby="global-chat-title" hidden><header class="chat-header"><span class="chat-avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 9h8M8 13h5M7 19l-4 2 1.4-4A8 8 0 1 1 7 19Z"/></svg></span><div><h2 id="global-chat-title">Assistente de eventos</h2><p><span aria-hidden="true"></span> Respostas com dados cadastrados</p></div><button class="chat-close" type="button" aria-label="Fechar assistente" data-close-global-chat>×</button></header><div class="chat-messages" id="global-chat-messages" role="log" aria-live="polite"><div class="chat-message bot"><span class="sr-only">Assistente:</span><p>Olá! Posso ajudar com datas, locais, programação, inscrições e prazos dos eventos publicados.</p></div></div><div class="chat-suggestions"><button type="button" data-global-question="Quais eventos estão disponíveis?">Eventos disponíveis</button><button type="button" data-global-question="Quais são os prazos?">Prazos</button><button type="button" data-global-question="Como faço uma inscrição?">Inscrições</button></div><form class="chat-form" id="global-chat-form"><label class="sr-only" for="global-chat-input">Digite sua dúvida sobre os eventos</label><input id="global-chat-input" type="text" maxlength="240" autocomplete="off" placeholder="Pergunte sobre um evento..." required/><button type="submit" aria-label="Enviar pergunta"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 4 17 8-17 8 3-8-3-8Z"/><path d="M7 12h14"/></svg></button></form><p class="chat-note">As respostas usam os eventos publicados na Alexandria.</p></section>`);

  const accessDialog = document.querySelector('#global-access-dialog');
  const contrastToggle = document.querySelector('#global-contrast-toggle');
  const motionToggle = document.querySelector('#global-motion-toggle');
  const savePreferences = () => localStorage.setItem('portal-accessibility', JSON.stringify({
    fontSize: Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10),
    contrast: document.documentElement.classList.contains('high-contrast'),
    reducedMotion: document.documentElement.classList.contains('reduce-motion')
  }));
  const applyPreferences = (preferences = {}) => {
    const fontSize = Math.min(20, Math.max(14, preferences.fontSize || 16));
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
    document.documentElement.classList.toggle('high-contrast', Boolean(preferences.contrast));
    document.documentElement.classList.toggle('reduce-motion', Boolean(preferences.reducedMotion));
    contrastToggle.checked = Boolean(preferences.contrast);
    motionToggle.checked = Boolean(preferences.reducedMotion);
  };
  try { applyPreferences(JSON.parse(localStorage.getItem('portal-accessibility') || '{}')); } catch { applyPreferences(); }
  document.querySelector('[data-open-access]').addEventListener('click', () => accessDialog.showModal());
  document.querySelector('[data-close-global-access]').addEventListener('click', () => accessDialog.close());
  document.querySelectorAll('[data-global-font]').forEach((button) => button.addEventListener('click', () => {
    const current = Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10);
    const next = button.dataset.globalFont === 'reset' ? 16 : current + (button.dataset.globalFont === 'increase' ? 1 : -1);
    applyPreferences({ fontSize: next, contrast: contrastToggle.checked, reducedMotion: motionToggle.checked }); savePreferences();
  }));
  contrastToggle.addEventListener('change', () => { document.documentElement.classList.toggle('high-contrast', contrastToggle.checked); savePreferences(); });
  motionToggle.addEventListener('change', () => { document.documentElement.classList.toggle('reduce-motion', motionToggle.checked); savePreferences(); });
  document.querySelector('#global-reset-access').addEventListener('click', () => { applyPreferences({ fontSize: 16 }); savePreferences(); });

  const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'a definir';
  const catalog = [
    { name: 'Simpósio Brasileiro de Ciência de Dados', location: 'Salvador · BA', format: 'Presencial', date: '12 a 15 de novembro de 2026', deadline: '8 de outubro de 2026', contact: 'dados2026@universidade.br', description: 'Ciência de dados e inteligência artificial responsável.' },
    { name: 'Congresso Nacional de Inovação em Saúde', location: 'Recife · PE', format: 'Presencial', date: '22 a 24 de novembro de 2026', deadline: '2 de novembro de 2026', contact: 'saudeinovacao@congresso.org.br', description: 'Tecnologia, práticas clínicas e inovação em saúde.' },
    { name: 'Workshop de Robótica e Sistemas Autônomos', location: 'Feira de Santana · BA', format: 'Presencial', date: '5 de dezembro de 2026', deadline: '20 de novembro de 2026', contact: 'robotica@workshop.org.br', description: 'Robótica, automação e sistemas autônomos.' }
  ];
  const client = window.supabase?.createClient('https://tgcaycijcaoemaztkwfn.supabase.co', 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c');
  async function loadPublishedEvents() {
    if (!client) return;
    const { data, error } = await client.from('event_configurations').select('*').eq('published', true);
    if (error) return;
    (data || []).forEach((item) => {
      const event = {
        name: item.event_name,
        location: item.location || 'Local a definir',
        format: item.format || 'Formato a definir',
        date: item.starts_on ? `${formatDate(item.starts_on)}${item.ends_on && item.ends_on !== item.starts_on ? ` a ${formatDate(item.ends_on)}` : ''}` : 'Data a definir',
        deadline: item.submission_deadline ? formatDate(item.submission_deadline) : 'a definir',
        contact: [item.contact_email, item.contact_phone].filter(Boolean).join(' · ') || 'Contato a definir',
        description: item.description || 'Evento científico publicado na Alexandria',
        program: Array.isArray(item.program_items) ? item.program_items.map((entry) => `${entry.day || ''} ${entry.time || ''} ${entry.title || ''}`.trim()).join('; ') : ''
      };
      const index = catalog.findIndex((existing) => existing.name === event.name);
      if (index >= 0) catalog[index] = { ...catalog[index], ...event }; else catalog.push(event);
    });
  }
  loadPublishedEvents();

  const panel = document.querySelector('#global-event-chat');
  const trigger = document.querySelector('#global-chat-trigger');
  const messages = document.querySelector('#global-chat-messages');
  const input = document.querySelector('#global-chat-input');
  const addMessage = (text, sender = 'bot') => {
    const item = document.createElement('div'); item.className = `chat-message ${sender}`;
    item.innerHTML = `<span class="sr-only">${sender === 'bot' ? 'Assistente' : 'Você'}:</span><p></p>`;
    item.querySelector('p').textContent = text; messages.append(item); messages.scrollTop = messages.scrollHeight;
  };
  const answer = (question) => {
    const normalized = normalize(question);
    if (/quais|listar|disponiveis|cadastrados|todos/.test(normalized) && /evento/.test(normalized)) return `${catalog.length} eventos publicados:\n${catalog.map((event) => `• ${event.name} — ${event.location}`).join('\n')}`;
    if (/prazo/.test(normalized) && !catalog.some((event) => normalize(event.name).split(' ').some((part) => part.length > 4 && normalized.includes(part)))) return `Prazos de submissão:\n${catalog.map((event) => `• ${event.name}: ${event.deadline}`).join('\n')}`;
    if (/como.*inscri|inscricao/.test(normalized) && !catalog.some((event) => normalized.includes(normalize(event.name)))) return 'Abra o evento desejado na página inicial e selecione “Inscreva-se”. Depois, acompanhe a confirmação em Minha Área.';
    const event = catalog.find((item) => normalized.includes(normalize(item.name)) || normalize(item.name).split(' ').some((part) => part.length > 5 && normalized.includes(part)));
    if (!event) return `Não identifiquei o evento. Posso listar os ${catalog.length} eventos publicados para você.`;
    if (/onde|local|cidade/.test(normalized)) return `${event.name}: ${event.location}, formato ${event.format}.`;
    if (/quando|data|dia/.test(normalized)) return `${event.name} acontecerá em ${event.date}.`;
    if (/prazo|submiss|chamada/.test(normalized)) return `O prazo de submissão de ${event.name} é ${event.deadline}.`;
    if (/programa|horario|atividade/.test(normalized)) return event.program ? `Programação de ${event.name}: ${event.program}.` : `A programação de ${event.name} ainda não foi publicada.`;
    if (/contato|email|telefone/.test(normalized)) return `Contato de ${event.name}: ${event.contact}.`;
    return `${event.name}: ${event.description} Data: ${event.date}. Local: ${event.location}.`;
  };
  const toggleChat = (open = panel.hidden) => { panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) input.focus(); };
  trigger.addEventListener('click', () => toggleChat());
  document.querySelector('[data-close-global-chat]').addEventListener('click', () => toggleChat(false));
  document.querySelector('#global-chat-form').addEventListener('submit', (event) => { event.preventDefault(); const question = input.value.trim(); if (!question) return; addMessage(question, 'user'); input.value = ''; window.setTimeout(() => addMessage(answer(question)), 250); });
  document.querySelectorAll('[data-global-question]').forEach((button) => button.addEventListener('click', () => { addMessage(button.dataset.globalQuestion, 'user'); window.setTimeout(() => addMessage(answer(button.dataset.globalQuestion)), 250); }));
})();

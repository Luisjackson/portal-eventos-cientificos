const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const areaFilter = document.querySelector('#area-filter');
const chips = [...document.querySelectorAll('[data-filter]')];
const eventCards = [...document.querySelectorAll('.event-card')];
const emptyState = document.querySelector('#empty-state');
const loginButton = document.querySelector('.login-button');
const loginDialog = document.querySelector('#portal-dialog');
const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');
const authIntro = document.querySelector('#auth-intro');
const authSuccess = document.querySelector('#dialog-success');
const accountPanel = document.querySelector('#account-panel');
const eventDialog = document.querySelector('#event-dialog');
const registrationDialog = document.querySelector('#registration-dialog');
const accessDialog = document.querySelector('#access-dialog');
const dashboardSection = document.querySelector('#minha-area');
const dashboardEvents = document.querySelector('#dashboard-events');
const chatTrigger = document.querySelector('#chat-trigger');
const chatPanel = document.querySelector('#event-chat');
const chatMessages = document.querySelector('#chat-messages');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const toast = document.querySelector('#toast');
const SUPABASE_URL = 'https://tgcaycijcaoemaztkwfn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c';
const SITE_URL = 'https://luisjackson.github.io/portal-eventos-cientificos/';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
let selectedType = 'todos';
let toastTimer;
let wizardStep = 1;
let currentChatEvent = null;
let currentAuthUser = null;
let currentProfile = null;
let currentRegistrationEvent = null;

const events = {
  'Simpósio Brasileiro de Ciência de Dados': { type: 'Simpósio', date: '12 a 15 de novembro de 2026', location: 'Salvador · BA', format: 'presencial', deadline: 'submissões até 8 de outubro de 2026', registration: 'inscrições abertas; valores demonstrativos de R$ 60 para estudantes e R$ 120 para profissionais', program: 'credenciamento às 8h30, palestra de abertura às 10h e sessões técnicas às 14h', contact: 'eventos@universidade.br · (71) 3000-2026', aliases: ['simposio', 'ciencia de dados', 'dados', 'salvador'], image: './assets/events/data-science.webp', description: 'Pesquisadores, estudantes e profissionais discutem aplicações responsáveis de dados em ciência, indústria e políticas públicas.' },
  'Congresso Nacional de Inovação em Saúde': { type: 'Congresso', date: '22 a 24 de novembro de 2026', location: 'Recife · PE', format: 'presencial', deadline: 'inscrições até 15 de novembro de 2026; chamada de pôsteres até 2 de novembro', registration: 'inscrições abertas no protótipo', program: 'a programação detalhada ainda não foi cadastrada', contact: 'eventos@universidade.br', aliases: ['congresso', 'saude', 'recife', 'inovacao em saude'], image: './assets/events/health-innovation.webp', description: 'Um encontro dedicado a novas tecnologias, práticas clínicas e pesquisas que ampliam o acesso à saúde.' },
  'Workshop de Robótica e Sistemas Autônomos': { type: 'Workshop', date: '5 de dezembro de 2026', location: 'Feira de Santana · BA', format: 'presencial', deadline: 'vagas disponíveis enquanto houver disponibilidade', registration: 'inscrições abertas no protótipo', program: 'atividades práticas de robótica, automação e sistemas autônomos', contact: 'eventos@universidade.br', aliases: ['workshop', 'robotica', 'sistemas autonomos', 'feira de santana'], image: './assets/events/robotics-workshop.webp', description: 'Atividades práticas sobre robótica, automação e sistemas autônomos para estudantes e pesquisadores.' }
};

function addChatMessage(text, sender = 'bot') {
  const message = document.createElement('div');
  message.className = `chat-message ${sender}`;
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = sender === 'bot' ? 'Assistente:' : 'Você:';
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  message.append(label, paragraph);
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function findEvent(question) {
  const normalized = normalize(question);
  return Object.entries(events).find(([, event]) => event.aliases.some((alias) => normalized.includes(alias))) || null;
}

function answerEventQuestion(question) {
  const normalized = normalize(question);
  const match = findEvent(question);
  if (match) currentChatEvent = match;
  const selected = match || currentChatEvent;

  if (/quais|listar|disponiveis|cadastrados|todos os eventos/.test(normalized) && /evento/.test(normalized)) {
    return `Temos 3 eventos cadastrados:\n• Simpósio Brasileiro de Ciência de Dados — Salvador\n• Congresso Nacional de Inovação em Saúde — Recife\n• Workshop de Robótica e Sistemas Autônomos — Feira de Santana`;
  }
  if (/proximo prazo|prazos proximos|prazo geral/.test(normalized)) {
    return 'O próximo prazo é 8 de outubro de 2026, para submissão de artigos no Simpósio Brasileiro de Ciência de Dados.';
  }
  if (!selected) {
    return 'Sobre qual evento você quer saber? Pode escrever “Ciência de Dados”, “Inovação em Saúde” ou “Robótica”.';
  }

  const [name, event] = selected;
  if (/onde|local|cidade|endereco/.test(normalized)) return `${name} será em ${event.location}, no formato ${event.format}.`;
  if (/quando|data|dia|periodo/.test(normalized)) return `${name} acontecerá de ${event.date}.`;
  if (/prazo|submiss|chamada|ate quando/.test(normalized)) return `Para ${name}: ${event.deadline}.`;
  if (/inscri|valor|preco|custa|pagamento/.test(normalized)) return `Sobre a inscrição de ${name}: ${event.registration}.`;
  if (/programa|horario|atividade|palestra/.test(normalized)) return `Programação de ${name}: ${event.program}.`;
  if (/contato|email|telefone|falar/.test(normalized)) return `Contato de ${name}: ${event.contact}.`;
  if (/online|presencial|formato/.test(normalized)) return `${name} está cadastrado como evento ${event.format}.`;
  if (/sobre|tema|assunto|o que e/.test(normalized)) return `${name}: ${event.description}`;
  return `${name} acontece de ${event.date}, em ${event.location}. Posso informar também programação, inscrição, prazos e contato.`;
}

function sendChatQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addChatMessage(cleanQuestion, 'user');
  chatInput.value = '';
  const typing = document.createElement('div');
  typing.className = 'chat-message bot typing';
  typing.setAttribute('aria-label', 'Assistente digitando');
  typing.innerHTML = '<p><i></i><i></i><i></i></p>';
  chatMessages.append(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  window.setTimeout(() => {
    typing.remove();
    addChatMessage(answerEventQuestion(cleanQuestion));
  }, 480);
}

function toggleChat(forceOpen) {
  const open = typeof forceOpen === 'boolean' ? forceOpen : chatPanel.hidden;
  chatPanel.hidden = !open;
  chatTrigger.setAttribute('aria-expanded', String(open));
  chatTrigger.setAttribute('aria-label', open ? 'Fechar assistente de eventos' : 'Abrir assistente de eventos');
  if (open) window.setTimeout(() => chatInput.focus(), 0);
  else chatTrigger.focus();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function filterEvents() {
  const term = normalize(searchInput.value);
  const area = areaFilter.value;
  let visible = 0;
  eventCards.forEach((card) => {
    const show = (selectedType === 'todos' || card.dataset.type === selectedType)
      && (area === 'todos' || card.dataset.area === area)
      && (!term || normalize(card.dataset.search).includes(term));
    card.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible !== 0;
}

function getSession() {
  if (!currentAuthUser) return null;
  const metadata = currentAuthUser.user_metadata || {};
  const roleNames = {
    participante: 'Participante',
    autor: 'Autor',
    revisor: 'Revisor',
    comite: 'Comitê científico'
  };
  const storedRole = metadata.role || 'participante';
  return {
    id: currentAuthUser.id,
    name: currentProfile?.full_name || metadata.full_name || currentAuthUser.email?.split('@')[0] || 'Usuário',
    email: currentAuthUser.email || '',
    role: roleNames[currentProfile?.role || storedRole] || currentProfile?.role || storedRole
  };
}

async function loadCurrentProfile(user) {
  currentProfile = null;
  if (!user) return;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();
  if (!error && data) currentProfile = data;
}

function setAuthLoading(form, loading, loadingText) {
  const button = form.querySelector('button[type="submit"]');
  form.setAttribute('aria-busy', String(loading));
  button.disabled = loading;
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.textContent = loading ? loadingText : button.dataset.defaultText;
}

function authErrorMessage(error, context = 'login') {
  const message = normalize(error?.message || '');
  if (context === 'login') return 'E-mail ou senha não conferem.';
  if (message.includes('already registered') || message.includes('already been registered')) return 'Já existe uma conta com este e-mail.';
  if (message.includes('password')) return 'A senha não atende aos requisitos de segurança.';
  if (message.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
  return 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.';
}

function clearAuthErrors(form) {
  form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
  form.querySelectorAll('.input-error').forEach((input) => input.classList.remove('input-error'));
}

function setAuthError(inputId, errorId, message) {
  const input = document.querySelector(`#${inputId}`);
  document.querySelector(`#${errorId}`).textContent = message;
  input?.classList.toggle('input-error', Boolean(message));
}

function userInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function updateAuthButton() {
  const session = getSession();
  const label = loginButton.querySelector('.login-label');
  const avatar = loginButton.querySelector('.login-avatar');
  loginButton.classList.toggle('signed-in', Boolean(session));
  label.textContent = session ? session.name.split(' ')[0] : 'Entrar';
  avatar.hidden = !session;
  avatar.textContent = session ? userInitials(session.name) : '';
  loginButton.title = session ? `Conta de ${session.name}` : 'Entrar no portal';
}

function setAuthMode(mode) {
  authIntro.hidden = false;
  accountPanel.hidden = true;
  authSuccess.hidden = true;
  document.querySelector('#recovery-form').hidden = true;
  document.querySelector('#prototype-auth-note').hidden = false;
  const signup = mode === 'signup';
  loginForm.hidden = signup;
  signupForm.hidden = !signup;
  document.querySelector('#dialog-title').textContent = signup ? 'Crie sua conta' : 'Entre na sua conta';
  document.querySelector('#dialog-description').textContent = signup
    ? 'Cadastre seus dados para acessar as áreas do portal.'
    : 'Acompanhe inscrições, submissões e atividades do evento.';
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    const active = button.dataset.authMode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  window.setTimeout(() => document.querySelector(signup ? '#signup-name' : '#login-email').focus(), 0);
}

function showAuthSuccess(title, message) {
  authIntro.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  document.querySelector('#recovery-form').hidden = true;
  accountPanel.hidden = true;
  document.querySelector('#prototype-auth-note').hidden = true;
  document.querySelector('#auth-success-title').textContent = title;
  document.querySelector('#auth-success-message').textContent = message;
  authSuccess.hidden = false;
}

function showAccount(user) {
  authIntro.hidden = true;
  loginForm.hidden = true;
  signupForm.hidden = true;
  document.querySelector('#recovery-form').hidden = true;
  authSuccess.hidden = true;
  document.querySelector('#prototype-auth-note').hidden = true;
  document.querySelector('#account-avatar').textContent = userInitials(user.name);
  document.querySelector('#account-name').textContent = user.name;
  document.querySelector('#account-email').textContent = user.email;
  document.querySelector('#account-role').textContent = user.role;
  accountPanel.hidden = false;
}

function showPasswordRecovery() {
  authIntro.hidden = false;
  loginForm.hidden = true;
  signupForm.hidden = true;
  authSuccess.hidden = true;
  accountPanel.hidden = true;
  document.querySelector('#prototype-auth-note').hidden = true;
  document.querySelector('#dialog-title').textContent = 'Crie uma nova senha';
  document.querySelector('#dialog-description').textContent = 'Digite a nova senha para recuperar o acesso à sua conta.';
  document.querySelector('.auth-tabs').hidden = true;
  document.querySelector('#recovery-form').hidden = false;
  window.setTimeout(() => document.querySelector('#recovery-password').focus(), 0);
}

function openLogin() {
  const session = getSession();
  if (session) showAccount(session);
  else setAuthMode('login');
  loginDialog.showModal();
}

function openEvent(name) {
  const event = events[name] || events['Simpósio Brasileiro de Ciência de Dados'];
  currentRegistrationEvent = name;
  const loading = document.querySelector('#event-dialog-loading');
  const content = document.querySelector('#event-dialog-content');
  loading.hidden = false;
  content.hidden = true;
  eventDialog.setAttribute('aria-busy', 'true');
  eventDialog.showModal();
  window.setTimeout(() => {
    document.querySelector('#event-dialog-type').textContent = event.type;
    document.querySelector('#event-dialog-date').textContent = event.date;
    document.querySelector('#event-dialog-title').textContent = name;
    document.querySelector('#event-dialog-location').textContent = event.location;
    document.querySelector('#event-dialog-description').textContent = event.description;
    document.querySelector('#registration-title').textContent = name;
    loading.hidden = true;
    content.hidden = false;
    eventDialog.setAttribute('aria-busy', 'false');
  }, 420);
}

function setWizardStep(step) {
  wizardStep = step;
  document.querySelectorAll('.wizard-step').forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  const markers = [...document.querySelectorAll('.wizard-progress span')];
  const lines = [...document.querySelectorAll('.wizard-progress i')];
  markers.forEach((marker, index) => marker.classList.toggle('active', index < step));
  lines.forEach((line, index) => line.classList.toggle('active', index < step - 1));
  document.querySelector('#wizard-back').hidden = step === 1;
  document.querySelector('#wizard-next').textContent = step === 3 ? 'Confirmar inscrição' : 'Continuar';
  if (step === 3) updateRegistrationSummary();
}

function updateRegistrationSummary() {
  const category = document.querySelector('input[name="category"]:checked');
  const activities = [...document.querySelectorAll('input[name="activity"]:checked')];
  const hours = activities.reduce((total, item) => total + Number(item.dataset.hours), 0);
  document.querySelector('#summary-category').textContent = category?.value || '-';
  document.querySelector('#summary-hours').textContent = `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  document.querySelector('#summary-price').textContent = `R$ ${category?.dataset.price || 0}`;
}

function resetRegistration() {
  document.querySelector('#registration-form').reset();
  document.querySelector('#registration-form').hidden = false;
  document.querySelector('#registration-success').hidden = true;
  document.querySelector('#category-error').textContent = '';
  document.querySelector('#registration-save-error').textContent = '';
  setWizardStep(1);
}

function setDashboardIdentity(user) {
  document.querySelector('#dashboard-first-name').textContent = user.name.split(' ')[0];
  document.querySelector('#dashboard-avatar').textContent = userInitials(user.name);
  document.querySelector('#dashboard-profile-title').textContent = user.name;
  document.querySelector('#dashboard-profile-email').textContent = user.email;
  document.querySelector('#dashboard-profile-role').textContent = user.role;
}

function renderRegistration(registration) {
  const event = events[registration.event_name] || {};
  const card = document.createElement('article');
  card.className = 'dashboard-event';

  const cover = document.createElement('img');
  cover.src = event.image || './assets/events/data-science.webp';
  cover.alt = `Imagem do evento ${registration.event_name}`;

  const content = document.createElement('div');
  const title = document.createElement('h4');
  title.textContent = registration.event_name;
  const meta = document.createElement('div');
  meta.className = 'dashboard-event-meta';
  [registration.event_date, registration.event_location, registration.category].forEach((value) => {
    const item = document.createElement('span');
    item.textContent = value;
    meta.append(item);
  });
  content.append(title, meta);
  if (registration.activities?.length) {
    const activities = document.createElement('p');
    activities.className = 'dashboard-event-activities';
    activities.textContent = `Atividades: ${registration.activities.join(', ')}`;
    content.append(activities);
  }

  const status = document.createElement('div');
  status.className = 'dashboard-event-code';
  const statusLabel = document.createElement('strong');
  statusLabel.textContent = registration.payment_status === 'paid' ? 'Pagamento confirmado' : 'Pix demonstrativo';
  const code = document.createElement('span');
  code.textContent = `#${registration.id.slice(0, 8).toUpperCase()}`;
  status.append(statusLabel, code);
  card.append(cover, content, status);
  return card;
}

async function loadRegistrations() {
  const user = getSession();
  if (!user) return;
  const loading = document.querySelector('#dashboard-loading');
  const empty = document.querySelector('#dashboard-empty');
  const errorPanel = document.querySelector('#dashboard-error');
  loading.hidden = false;
  empty.hidden = true;
  errorPanel.hidden = true;
  dashboardEvents.replaceChildren();

  const { data, error } = await supabaseClient
    .from('registrations')
    .select('*')
    .order('created_at', { ascending: false });

  loading.hidden = true;
  if (error) {
    errorPanel.textContent = 'A área do usuário está pronta, mas a tabela de inscrições ainda precisa ser criada no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.';
    errorPanel.hidden = false;
    return;
  }

  const registrations = data || [];
  registrations.forEach((registration) => dashboardEvents.append(renderRegistration(registration)));
  empty.hidden = registrations.length !== 0;
  document.querySelector('#dashboard-registration-count').textContent = registrations.length;
  document.querySelector('#dashboard-hours-count').textContent = `${registrations.reduce((total, item) => total + Number(item.activity_hours || 0), 0)}h`;
  document.querySelector('#dashboard-certificate-count').textContent = registrations.filter((item) => item.certificate_available).length;
}

async function openDashboard() {
  const user = getSession();
  if (!user) {
    setAuthMode('login');
    document.querySelector('#dialog-description').textContent = 'Entre para acessar suas inscrições e atividades.';
    if (!loginDialog.open) loginDialog.showModal();
    return;
  }
  setDashboardIdentity(user);
  dashboardSection.hidden = false;
  if (loginDialog.open) loginDialog.close();
  if (registrationDialog.open) registrationDialog.close();
  await loadRegistrations();
  dashboardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveRegistration() {
  const user = getSession();
  if (!user || !currentRegistrationEvent) return false;
  const event = events[currentRegistrationEvent];
  const category = document.querySelector('input[name="category"]:checked');
  const activities = [...document.querySelectorAll('input[name="activity"]:checked')];
  const button = document.querySelector('#wizard-next');
  const errorPanel = document.querySelector('#registration-save-error');
  const record = {
    user_id: user.id,
    event_name: currentRegistrationEvent,
    event_date: event.date,
    event_location: event.location,
    category: category.value,
    activities: activities.map((item) => item.value),
    activity_hours: activities.reduce((total, item) => total + Number(item.dataset.hours), 0),
    amount: Number(category.dataset.price),
    payment_method: 'pix',
    payment_status: 'pending'
  };

  errorPanel.textContent = '';
  button.disabled = true;
  button.textContent = 'Registrando...';
  const { data, error } = await supabaseClient
    .from('registrations')
    .upsert(record, { onConflict: 'user_id,event_name' })
    .select()
    .single();
  button.disabled = false;
  button.textContent = 'Confirmar inscrição';
  if (error) {
    errorPanel.textContent = 'Não foi possível registrar. Confirme se o arquivo supabase/schema.sql foi executado no Supabase.';
    return false;
  }
  document.querySelector('#registration-code').textContent = `#${data.id.slice(0, 8).toUpperCase()}`;
  return true;
}

function saveAccessPreferences() {
  const preferences = {
    fontSize: Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10),
    contrast: document.documentElement.classList.contains('high-contrast'),
    reducedMotion: document.documentElement.classList.contains('reduce-motion')
  };
  localStorage.setItem('portal-accessibility', JSON.stringify(preferences));
}

function applyAccessPreferences(preferences = {}) {
  const fontSize = Math.min(20, Math.max(14, preferences.fontSize || 16));
  document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  document.documentElement.classList.toggle('high-contrast', Boolean(preferences.contrast));
  document.documentElement.classList.toggle('reduce-motion', Boolean(preferences.reducedMotion));
  document.querySelector('#contrast-toggle').checked = Boolean(preferences.contrast);
  document.querySelector('#motion-toggle').checked = Boolean(preferences.reducedMotion);
}

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  filterEvents();
  document.querySelector('#eventos').scrollIntoView({ behavior: 'smooth' });
});
areaFilter.addEventListener('change', filterEvents);
searchInput.addEventListener('input', filterEvents);

chips.forEach((chip) => chip.addEventListener('click', () => {
  selectedType = chip.dataset.filter;
  chips.forEach((item) => {
    const active = item === chip;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  filterEvents();
}));

document.querySelector('#clear-filters').addEventListener('click', () => {
  searchInput.value = '';
  areaFilter.value = 'todos';
  selectedType = 'todos';
  chips.forEach((item) => {
    const active = item.dataset.filter === 'todos';
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  filterEvents();
});

document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => {
  const saved = button.classList.toggle('saved');
  button.setAttribute('aria-pressed', String(saved));
  showToast(saved ? 'Evento salvo na sua lista.' : 'Evento removido da sua lista.');
}));

document.querySelectorAll('[data-event]').forEach((button) => button.addEventListener('click', () => openEvent(button.dataset.event)));
document.querySelectorAll('[data-close-event]').forEach((button) => button.addEventListener('click', () => eventDialog.close()));
document.querySelector('[data-start-registration]').addEventListener('click', () => {
  eventDialog.close();
  if (!getSession()) {
    setAuthMode('login');
    document.querySelector('#dialog-description').textContent = 'Entre ou crie sua conta para se inscrever neste evento.';
    loginDialog.showModal();
    return;
  }
  resetRegistration();
  registrationDialog.showModal();
});

document.querySelector('#wizard-next').addEventListener('click', async () => {
  if (wizardStep === 1 && !document.querySelector('input[name="category"]:checked')) {
    document.querySelector('#category-error').textContent = 'Escolha uma categoria para continuar.';
    document.querySelector('input[name="category"]').focus();
    return;
  }
  document.querySelector('#category-error').textContent = '';
  if (wizardStep < 3) setWizardStep(wizardStep + 1);
  else {
    const saved = await saveRegistration();
    if (!saved) return;
    document.querySelector('#registration-form').hidden = true;
    document.querySelector('#registration-success').hidden = false;
  }
});
document.querySelector('#wizard-back').addEventListener('click', () => setWizardStep(Math.max(1, wizardStep - 1)));
document.querySelectorAll('[data-close-registration]').forEach((button) => button.addEventListener('click', () => registrationDialog.close()));
document.querySelector('#view-dashboard-registration').addEventListener('click', openDashboard);

document.querySelectorAll('[data-open-login]').forEach((button) => button.addEventListener('click', openLogin));
document.querySelectorAll('[data-open-dashboard]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  openDashboard();
}));
document.querySelector('#open-dashboard-button').addEventListener('click', openDashboard);
document.querySelector('#dashboard-account').addEventListener('click', openLogin);
document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', () => {
  const session = getSession();
  if (session) {
    openDashboard();
    return;
  }
  else {
    setAuthMode('login');
    document.querySelector('#dialog-description').textContent = `Entre para acessar o painel de ${button.dataset.role}.`;
  }
  loginDialog.showModal();
}));
document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => loginDialog.close()));

document.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.querySelector('#login-email');
  const password = document.querySelector('#login-password');
  const normalizedEmail = email.value.trim().toLowerCase();
  clearAuthErrors(loginForm);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    setAuthError('login-email', 'login-email-error', 'Informe um e-mail válido, como nome@exemplo.com.');
    email.focus();
    return;
  }
  setAuthLoading(loginForm, true, 'Entrando...');
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: password.value
  });
  setAuthLoading(loginForm, false);
  if (error) {
    setAuthError('login-password', 'login-password-error', authErrorMessage(error, 'login'));
    password.focus();
    return;
  }
  currentAuthUser = data.user;
  await loadCurrentProfile(data.user);
  const user = getSession();
  updateAuthButton();
  showAuthSuccess(`Olá, ${user.name.split(' ')[0]}!`, 'Sua sessão foi iniciada e o portal reconheceu o seu perfil.');
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthErrors(signupForm);
  const name = document.querySelector('#signup-name').value.trim().replace(/\s+/g, ' ');
  const email = document.querySelector('#signup-email').value.trim().toLowerCase();
  const password = document.querySelector('#signup-password').value;
  const confirm = document.querySelector('#signup-confirm').value;
  const role = document.querySelector('#signup-role').value;
  const terms = document.querySelector('#signup-terms').checked;
  let firstInvalid = null;

  if (name.length < 3 || !name.includes(' ')) { setAuthError('signup-name', 'signup-name-error', 'Informe seu nome e sobrenome.'); firstInvalid ||= 'signup-name'; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAuthError('signup-email', 'signup-email-error', 'Informe um e-mail válido.'); firstInvalid ||= 'signup-email'; }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) { setAuthError('signup-password', 'signup-password-error', 'Use 8 caracteres ou mais, incluindo uma letra e um número.'); firstInvalid ||= 'signup-password'; }
  if (confirm !== password) { setAuthError('signup-confirm', 'signup-confirm-error', 'As senhas precisam ser iguais.'); firstInvalid ||= 'signup-confirm'; }
  if (!terms) { document.querySelector('#signup-terms-error').textContent = 'Confirme o armazenamento dos dados para continuar.'; firstInvalid ||= 'signup-terms'; }
  if (firstInvalid) { document.querySelector(`#${firstInvalid}`).focus(); return; }

  setAuthLoading(signupForm, true, 'Criando conta...');
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: SITE_URL,
      data: { full_name: name, role }
    }
  });
  setAuthLoading(signupForm, false);
  if (error) {
    setAuthError('signup-email', 'signup-email-error', authErrorMessage(error, 'signup'));
    document.querySelector('#signup-email').focus();
    return;
  }
  if (data.session) {
    currentAuthUser = data.user;
    await loadCurrentProfile(data.user);
    updateAuthButton();
    showAuthSuccess('Conta criada!', 'Seu cadastro foi concluído e você já está conectado ao portal.');
  } else {
    showAuthSuccess('Confira seu e-mail', 'Enviamos um link de confirmação. Depois de confirmar, volte ao portal para entrar.');
  }
});

document.querySelector('#forgot-password').addEventListener('click', async () => {
  const email = document.querySelector('#login-email').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAuthError('login-email', 'login-email-error', 'Informe um e-mail válido para recuperar a senha.');
    document.querySelector('#login-email').focus();
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
  showToast(error
    ? authErrorMessage(error, 'recovery')
    : 'Se o e-mail estiver cadastrado, você receberá um link de recuperação.');
});

document.querySelector('#recovery-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#recovery-password').value;
  const confirm = document.querySelector('#recovery-confirm').value;
  clearAuthErrors(event.currentTarget);
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    setAuthError('recovery-password', 'recovery-password-error', 'Use 8 caracteres ou mais, incluindo uma letra e um número.');
    return;
  }
  if (password !== confirm) {
    setAuthError('recovery-confirm', 'recovery-confirm-error', 'As senhas precisam ser iguais.');
    return;
  }
  setAuthLoading(event.currentTarget, true, 'Salvando senha...');
  const { error } = await supabaseClient.auth.updateUser({ password });
  setAuthLoading(event.currentTarget, false);
  if (error) {
    setAuthError('recovery-password', 'recovery-password-error', authErrorMessage(error, 'recovery'));
    return;
  }
  document.querySelector('.auth-tabs').hidden = false;
  showAuthSuccess('Senha atualizada!', 'Sua nova senha já pode ser usada para entrar no portal.');
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast('Não foi possível encerrar a sessão. Tente novamente.');
    return;
  }
  currentAuthUser = null;
  currentProfile = null;
  dashboardSection.hidden = true;
  updateAuthButton();
  loginDialog.close();
  showToast('Você saiu da conta.');
});

loginDialog.addEventListener('close', () => {
  loginForm.reset();
  signupForm.reset();
  document.querySelector('#recovery-form').reset();
  clearAuthErrors(loginForm);
  clearAuthErrors(signupForm);
  clearAuthErrors(document.querySelector('#recovery-form'));
  document.querySelector('#signup-terms-error').textContent = '';
  document.querySelector('.auth-tabs').hidden = false;
});

document.querySelector('[data-open-access]').addEventListener('click', () => accessDialog.showModal());
document.querySelector('[data-close-access]').addEventListener('click', () => accessDialog.close());
document.querySelectorAll('[data-font]').forEach((button) => button.addEventListener('click', () => {
  const current = Number.parseInt(getComputedStyle(document.documentElement).fontSize, 10);
  const action = button.dataset.font;
  const next = action === 'reset' ? 16 : current + (action === 'increase' ? 1 : -1);
  applyAccessPreferences({ fontSize: next, contrast: document.querySelector('#contrast-toggle').checked, reducedMotion: document.querySelector('#motion-toggle').checked });
  saveAccessPreferences();
}));
document.querySelector('#contrast-toggle').addEventListener('change', (event) => {
  document.documentElement.classList.toggle('high-contrast', event.target.checked);
  saveAccessPreferences();
});
document.querySelector('#motion-toggle').addEventListener('change', (event) => {
  document.documentElement.classList.toggle('reduce-motion', event.target.checked);
  saveAccessPreferences();
});
document.querySelector('#reset-access').addEventListener('click', () => {
  applyAccessPreferences({ fontSize: 16, contrast: false, reducedMotion: false });
  saveAccessPreferences();
  showToast('Preferências de acessibilidade restauradas.');
});

chatTrigger.addEventListener('click', () => toggleChat());
document.querySelector('[data-close-chat]').addEventListener('click', () => toggleChat(false));
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendChatQuestion(chatInput.value);
});
document.querySelectorAll('[data-chat-question]').forEach((button) => button.addEventListener('click', () => sendChatQuestion(button.dataset.chatQuestion)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !chatPanel.hidden) toggleChat(false);
});

[loginDialog, eventDialog, registrationDialog, accessDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) dialog.close();
}));

try {
  applyAccessPreferences(JSON.parse(localStorage.getItem('portal-accessibility')) || {});
} catch {
  applyAccessPreferences();
}
async function initializeAuth() {
  supabaseClient.auth.onAuthStateChange((event, nextSession) => {
    currentAuthUser = nextSession?.user || null;
    currentProfile = null;
    updateAuthButton();
    if (currentAuthUser) {
      loadCurrentProfile(currentAuthUser).then(() => {
        updateAuthButton();
        if (!dashboardSection.hidden) {
          setDashboardIdentity(getSession());
          loadRegistrations();
        }
      });
    } else {
      dashboardSection.hidden = true;
    }
    if (event === 'PASSWORD_RECOVERY') {
      showPasswordRecovery();
      if (!loginDialog.open) loginDialog.showModal();
    }
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  currentAuthUser = session?.user || null;
  await loadCurrentProfile(currentAuthUser);
  updateAuthButton();
  if (currentAuthUser && window.location.hash === '#minha-area') openDashboard();
}

initializeAuth();

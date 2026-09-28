const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const areaFilter = document.querySelector('#area-filter');
const chips = [...document.querySelectorAll('[data-filter]')];
const eventCards = [...document.querySelectorAll('.event-card')];
const emptyState = document.querySelector('#empty-state');
const loginDialog = document.querySelector('#portal-dialog');
const eventDialog = document.querySelector('#event-dialog');
const registrationDialog = document.querySelector('#registration-dialog');
const accessDialog = document.querySelector('#access-dialog');
const toast = document.querySelector('#toast');
let selectedType = 'todos';
let toastTimer;
let wizardStep = 1;

const events = {
  'Simpósio Brasileiro de Ciência de Dados': { type: 'Simpósio', date: '12 a 15 de novembro de 2026', location: 'Salvador · BA', description: 'Pesquisadores, estudantes e profissionais discutem aplicações responsáveis de dados em ciência, indústria e políticas públicas.' },
  'Congresso Nacional de Inovação em Saúde': { type: 'Congresso', date: '22 a 24 de novembro de 2026', location: 'Recife · PE', description: 'Um encontro dedicado a novas tecnologias, práticas clínicas e pesquisas que ampliam o acesso à saúde.' },
  'Workshop de Robótica e Sistemas Autônomos': { type: 'Workshop', date: '5 de dezembro de 2026', location: 'Feira de Santana · BA', description: 'Atividades práticas sobre robótica, automação e sistemas autônomos para estudantes e pesquisadores.' }
};

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

function openLogin(title = 'Entre na sua conta', description = 'Acompanhe inscrições, submissões e atividades do evento.') {
  document.querySelector('#login-form').hidden = false;
  document.querySelector('#dialog-success').hidden = true;
  document.querySelector('.portal-dialog .dialog-kicker').hidden = false;
  document.querySelector('.portal-dialog .dialog-icon').hidden = false;
  document.querySelector('.portal-dialog .dialog-footer').hidden = false;
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-title').hidden = false;
  document.querySelector('#dialog-description').textContent = description;
  document.querySelector('#dialog-description').hidden = false;
  loginDialog.showModal();
}

function openEvent(name) {
  const event = events[name] || events['Simpósio Brasileiro de Ciência de Dados'];
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
  setWizardStep(1);
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
  resetRegistration();
  registrationDialog.showModal();
});

document.querySelector('#wizard-next').addEventListener('click', () => {
  if (wizardStep === 1 && !document.querySelector('input[name="category"]:checked')) {
    document.querySelector('#category-error').textContent = 'Escolha uma categoria para continuar.';
    document.querySelector('input[name="category"]').focus();
    return;
  }
  document.querySelector('#category-error').textContent = '';
  if (wizardStep < 3) setWizardStep(wizardStep + 1);
  else {
    document.querySelector('#registration-form').hidden = true;
    document.querySelector('#registration-success').hidden = false;
  }
});
document.querySelector('#wizard-back').addEventListener('click', () => setWizardStep(Math.max(1, wizardStep - 1)));
document.querySelectorAll('[data-close-registration]').forEach((button) => button.addEventListener('click', () => registrationDialog.close()));

document.querySelectorAll('[data-open-login]').forEach((button) => button.addEventListener('click', () => openLogin()));
document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', () => openLogin(`Acessar como ${button.dataset.role}`, 'Entre para continuar para o painel correspondente ao seu perfil.')));
document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => loginDialog.close()));

document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const email = document.querySelector('#login-email');
  const password = document.querySelector('#login-password');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  const passwordValid = password.value.length >= 6;
  document.querySelector('#login-email-error').textContent = emailValid ? '' : 'Informe um e-mail válido, como nome@exemplo.com.';
  document.querySelector('#login-password-error').textContent = passwordValid ? '' : 'A senha precisa ter pelo menos 6 caracteres.';
  email.classList.toggle('input-error', !emailValid);
  password.classList.toggle('input-error', !passwordValid);
  if (!emailValid || !passwordValid) {
    (emailValid ? password : email).focus();
    return;
  }
  document.querySelector('#login-form').hidden = true;
  document.querySelector('.portal-dialog .dialog-kicker').hidden = true;
  document.querySelector('.portal-dialog .dialog-icon').hidden = true;
  document.querySelector('.portal-dialog .dialog-footer').hidden = true;
  document.querySelector('#dialog-title').hidden = true;
  document.querySelector('#dialog-description').hidden = true;
  document.querySelector('#dialog-success').hidden = false;
});
loginDialog.addEventListener('close', () => {
  document.querySelector('#login-form').reset();
  document.querySelectorAll('.field-error').forEach((error) => { if (error.id !== 'category-error') error.textContent = ''; });
  document.querySelectorAll('.input-error').forEach((input) => input.classList.remove('input-error'));
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

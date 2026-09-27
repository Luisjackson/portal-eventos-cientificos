const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const areaFilter = document.querySelector('#area-filter');
const chips = [...document.querySelectorAll('[data-filter]')];
const eventCards = [...document.querySelectorAll('.event-card')];
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#portal-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogDescription = document.querySelector('#dialog-description');
const loginForm = document.querySelector('#login-form');
const dialogSuccess = document.querySelector('#dialog-success');
const toast = document.querySelector('#toast');
let selectedType = 'todos';
let toastTimer;

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
    const matchesType = selectedType === 'todos' || card.dataset.type === selectedType;
    const matchesArea = area === 'todos' || card.dataset.area === area;
    const matchesTerm = !term || normalize(card.dataset.search).includes(term);
    const show = matchesType && matchesArea && matchesTerm;
    card.hidden = !show;
    if (show) visible += 1;
  });

  emptyState.hidden = visible !== 0;
}

function openDialog(title = 'Entre na sua conta', description = 'Acompanhe inscrições, submissões e atividades do evento.') {
  loginForm.hidden = false;
  dialogSuccess.hidden = true;
  document.querySelector('.dialog-kicker').hidden = false;
  document.querySelector('.dialog-icon').hidden = false;
  document.querySelector('.dialog-footer').hidden = false;
  dialogTitle.textContent = title;
  dialogDescription.textContent = description;
  dialogDescription.hidden = false;
  dialog.showModal();
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

document.querySelectorAll('[data-event]').forEach((button) => button.addEventListener('click', () => {
  showToast(`${button.dataset.event}: página de detalhes prevista para a próxima etapa.`);
}));

document.querySelectorAll('[data-open-login]').forEach((button) => button.addEventListener('click', () => openDialog()));

document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', () => {
  openDialog(`Acessar como ${button.dataset.role}`, 'Entre para continuar para o painel correspondente ao seu perfil.');
}));

document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));

dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) dialog.close();
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loginForm.hidden = true;
  document.querySelector('.dialog-kicker').hidden = true;
  document.querySelector('.dialog-icon').hidden = true;
  document.querySelector('.dialog-footer').hidden = true;
  dialogTitle.hidden = true;
  dialogDescription.hidden = true;
  dialogSuccess.hidden = false;
});

dialog.addEventListener('close', () => {
  dialogTitle.hidden = false;
  loginForm.reset();
});

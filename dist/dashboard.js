const SUPABASE_URL = 'https://tgcaycijcaoemaztkwfn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const eventImages = {
  'Simpósio Brasileiro de Ciência de Dados': './assets/events/data-science.webp',
  'Congresso Nacional de Inovação em Saúde': './assets/events/health-innovation.webp',
  'Workshop de Robótica e Sistemas Autônomos': './assets/events/robotics-workshop.webp'
};
const roleNames = { participante: 'Participante', autor: 'Autor', revisor: 'Revisor', comite: 'Comitê científico' };
const authRequired = document.querySelector('#auth-required');
const dashboardContent = document.querySelector('#dashboard-content');
const dashboardEvents = document.querySelector('#dashboard-events');
const cancelDialog = document.querySelector('#cancel-registration-dialog');
const toast = document.querySelector('#toast');
let currentUser = null;
let currentProfile = null;
let selectedRegistration = null;
let toastTimer;

function userInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function getUserView() {
  if (!currentUser) return null;
  const metadata = currentUser.user_metadata || {};
  const storedRole = currentProfile?.role || metadata.role || 'participante';
  return {
    name: currentProfile?.full_name || metadata.full_name || currentUser.email?.split('@')[0] || 'Usuário',
    email: currentUser.email || '',
    role: roleNames[storedRole] || storedRole
  };
}

async function loadProfile() {
  currentProfile = null;
  if (!currentUser) return;
  const { data, error } = await supabaseClient.from('profiles').select('full_name, role').eq('id', currentUser.id).maybeSingle();
  if (!error && data) currentProfile = data;
}

function updateIdentity() {
  const user = getUserView();
  if (!user) return;
  const initials = userInitials(user.name);
  document.querySelector('#dashboard-first-name').textContent = user.name.split(' ')[0];
  document.querySelector('#dashboard-avatar').textContent = initials;
  document.querySelector('#dashboard-header-avatar').textContent = initials;
  document.querySelector('#dashboard-header-label').textContent = user.name.split(' ')[0];
  document.querySelector('#dashboard-profile-title').textContent = user.name;
  document.querySelector('#dashboard-profile-email').textContent = user.email;
  document.querySelector('#dashboard-profile-role').textContent = user.role;
}

function renderRegistration(registration) {
  const card = document.createElement('article');
  card.className = 'dashboard-event';
  const cover = document.createElement('img');
  cover.src = eventImages[registration.event_name] || './assets/events/data-science.webp';
  cover.alt = `Imagem do evento ${registration.event_name}`;

  const content = document.createElement('div');
  const title = document.createElement('h3');
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

  const actions = document.createElement('div');
  actions.className = 'dashboard-event-code';
  const status = document.createElement('strong');
  status.textContent = registration.payment_status === 'paid' ? 'Pagamento confirmado' : 'Pix demonstrativo';
  const code = document.createElement('span');
  code.textContent = `#${registration.id.slice(0, 8).toUpperCase()}`;
  const cancel = document.createElement('button');
  cancel.className = 'cancel-registration-button';
  cancel.type = 'button';
  cancel.textContent = 'Cancelar inscrição';
  cancel.addEventListener('click', () => openCancelDialog(registration));
  actions.append(status, code, cancel);
  card.append(cover, content, actions);
  return card;
}

async function loadRegistrations() {
  const loading = document.querySelector('#dashboard-loading');
  const empty = document.querySelector('#dashboard-empty');
  const errorPanel = document.querySelector('#dashboard-error');
  loading.hidden = false;
  empty.hidden = true;
  errorPanel.hidden = true;
  dashboardEvents.replaceChildren();

  const { data, error } = await supabaseClient.from('registrations').select('*').order('created_at', { ascending: false });
  loading.hidden = true;
  if (error) {
    errorPanel.textContent = 'Não foi possível carregar suas inscrições. Atualize a página e tente novamente.';
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

function openCancelDialog(registration) {
  selectedRegistration = registration;
  document.querySelector('#cancel-event-name').textContent = registration.event_name;
  document.querySelector('#cancel-registration-error').textContent = '';
  cancelDialog.showModal();
}

async function cancelRegistration() {
  if (!selectedRegistration || !currentUser) return;
  const button = document.querySelector('#confirm-cancel-registration');
  const errorPanel = document.querySelector('#cancel-registration-error');
  button.disabled = true;
  button.textContent = 'Cancelando...';
  const { error } = await supabaseClient
    .from('registrations')
    .delete()
    .eq('id', selectedRegistration.id)
    .eq('user_id', currentUser.id);
  button.disabled = false;
  button.textContent = 'Cancelar inscrição';
  if (error) {
    errorPanel.textContent = 'Não foi possível cancelar. Execute a migração de cancelamento no Supabase e tente novamente.';
    return;
  }
  cancelDialog.close();
  selectedRegistration = null;
  showToast('Inscrição cancelada e removida da sua área.');
  await loadRegistrations();
}

async function showAuthenticatedArea(user) {
  currentUser = user;
  authRequired.hidden = true;
  dashboardContent.hidden = false;
  await loadProfile();
  updateIdentity();
  await loadRegistrations();
}

function showSignedOutArea() {
  currentUser = null;
  currentProfile = null;
  dashboardContent.hidden = true;
  authRequired.hidden = false;
}

document.querySelector('.menu-toggle').addEventListener('click', () => {
  const nav = document.querySelector('#main-nav');
  const open = nav.classList.toggle('open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', String(open));
});
document.querySelector('#dashboard-logout').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) return showToast('Não foi possível sair agora. Tente novamente.');
  window.location.href = './index.html';
});
document.querySelector('#confirm-cancel-registration').addEventListener('click', cancelRegistration);
document.querySelectorAll('[data-close-cancel]').forEach((button) => button.addEventListener('click', () => cancelDialog.close()));
cancelDialog.addEventListener('click', (event) => {
  const bounds = cancelDialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) cancelDialog.close();
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session?.user) showSignedOutArea();
});

async function initializeDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return showSignedOutArea();
  await showAuthenticatedArea(session.user);
}

initializeDashboard();

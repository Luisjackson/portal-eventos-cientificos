const SUPABASE_URL = 'https://tgcaycijcaoemaztkwfn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const authPanel = document.querySelector('#organization-auth');
const onboarding = document.querySelector('#organization-onboarding');
const dashboard = document.querySelector('#organization-dashboard');
const toast = document.querySelector('#toast');
let organizations = [];
let events = [];
let organizationMembers = [];
let committeeMembers = [];
let activeOrganizationId = null;
let currentUser = null;
let toastTimer;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function setButtonLoading(button, loading, text) {
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = loading;
  button.textContent = loading ? text : button.dataset.defaultText;
}

function activeOrganization() {
  return organizations.find((organization) => organization.id === activeOrganizationId);
}

function switchTab(name) {
  document.querySelectorAll('[data-organization-tab]').forEach((button) => {
    const active = button.dataset.organizationTab === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-organization-panel]').forEach((panel) => {
    const active = panel.dataset.organizationPanel === name;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  history.replaceState(null, '', `#${name}`);
}

function renderOrganizationSelector() {
  const list = document.querySelector('#organization-card-list');
  list.replaceChildren();
  organizations.forEach((organization) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `organization-choice${organization.id === activeOrganizationId ? ' active' : ''}`;
    card.setAttribute('aria-pressed', String(organization.id === activeOrganizationId));
    card.innerHTML = `<span>${escapeHtml(organization.acronym || organization.name.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(organization.name)}</strong><small>${escapeHtml(organization.institution || organization.contact_email)}</small></div><b>${organization.id === activeOrganizationId ? 'Em uso' : 'Acessar'} →</b>`;
    card.addEventListener('click', () => {
      activeOrganizationId = organization.id;
      resetEventForm();
      renderDashboard();
      document.querySelector('#organization-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    list.append(card);
  });
  const active = activeOrganization();
  document.querySelector('#organization-title').textContent = active ? active.name : 'Minhas organizações';
  document.querySelector('#organization-count').textContent = `${organizations.length} ${organizations.length === 1 ? 'organização' : 'organizações'}`;
}

function fillEventForm(event) {
  document.querySelector('#organization-event-id').value = event.id;
  document.querySelector('#organization-event-name').value = event.event_name || '';
  document.querySelector('#organization-event-description').value = event.description || '';
  document.querySelector('#organization-event-location').value = event.location || '';
  document.querySelector('#organization-event-format').value = event.format || 'Presencial';
  document.querySelector('#organization-event-start').value = event.starts_on || '';
  document.querySelector('#organization-event-end').value = event.ends_on || '';
  document.querySelector('#organization-event-submission').value = event.submission_deadline || '';
  document.querySelector('#organization-event-review').value = event.review_deadline || '';
  document.querySelector('#organization-event-modalities').value = (event.modalities || []).join(', ');
  document.querySelector('#organization-event-contact').value = event.contact_email || '';
  document.querySelector('#organization-event-published').checked = Boolean(event.published);
  document.querySelector('#organization-event-form-title').textContent = 'Editar evento';
  document.querySelector('#organization-event-cancel').hidden = false;
  document.querySelector('#organization-event-name').focus();
}

function resetEventForm() {
  document.querySelector('#organization-event-form').reset();
  document.querySelector('#organization-event-id').value = '';
  document.querySelector('#organization-event-form-title').textContent = 'Criar evento';
  document.querySelector('#organization-event-cancel').hidden = true;
  document.querySelector('#organization-event-error').textContent = '';
}

function renderEvents() {
  const list = document.querySelector('#organization-event-list');
  const empty = document.querySelector('#organization-event-empty');
  const eventSelect = document.querySelector('#event-committee-event');
  const organizationEvents = events.filter((event) => event.organization_id === activeOrganizationId);
  list.replaceChildren();
  eventSelect.replaceChildren(new Option('Selecione um evento', ''));
  organizationEvents.forEach((event) => {
    const article = document.createElement('article');
    article.innerHTML = `<div><span>${event.published ? 'Publicado' : 'Rascunho'}</span><strong>${escapeHtml(event.event_name)}</strong><p>${escapeHtml(event.location)} · ${escapeHtml(event.format)} · ${(event.modalities || []).length} modalidade(s)</p></div><button class="button button-secondary" type="button">Editar</button>`;
    article.querySelector('button').addEventListener('click', () => fillEventForm(event));
    list.append(article);
    eventSelect.add(new Option(event.event_name, event.id));
  });
  empty.hidden = organizationEvents.length !== 0;
}

function renderMembers() {
  const list = document.querySelector('#organization-member-list');
  list.replaceChildren();
  organizationMembers.filter((member) => member.organization_id === activeOrganizationId).forEach((member) => {
    const article = document.createElement('article');
    article.innerHTML = `<strong>${escapeHtml(member.email)}</strong><span>${member.role === 'owner' ? 'Proprietário' : 'Organizador'} · ${member.active ? 'ativo' : 'inativo'}</span>`;
    list.append(article);
  });
}

function renderCommittee() {
  const list = document.querySelector('#event-committee-list');
  const organizationEventIds = new Set(events.filter((event) => event.organization_id === activeOrganizationId).map((event) => event.id));
  list.replaceChildren();
  committeeMembers.filter((member) => organizationEventIds.has(member.event_id)).forEach((member) => {
    const event = events.find((item) => item.id === member.event_id);
    const article = document.createElement('article');
    article.innerHTML = `<strong>${escapeHtml(member.email)}</strong><span>${escapeHtml(event?.event_name || 'Evento')} · ${member.active ? 'ativo' : 'inativo'}</span>`;
    list.append(article);
  });
}

function renderDashboard() {
  renderOrganizationSelector();
  renderEvents();
  renderMembers();
  renderCommittee();
}

async function loadOrganizationMembers() {
  const rpcResult = await supabaseClient.rpc('list_my_organization_members');
  if (!rpcResult.error) return rpcResult;
  if (/does not exist|schema cache|could not find the function/i.test(rpcResult.error.message || '')) {
    return supabaseClient.from('organization_members').select('*').order('created_at');
  }
  return rpcResult;
}

async function loadOrganizationData() {
  const [organizationResult, eventResult, memberResult, committeeResult] = await Promise.all([
    supabaseClient.from('organizations').select('*').order('created_at'),
    supabaseClient.from('event_configurations').select('*').order('created_at', { ascending: false }),
    loadOrganizationMembers(),
    supabaseClient.from('event_committee_members').select('*').order('created_at')
  ]);
  const migrationMissing = [organizationResult, memberResult, committeeResult].some((result) => result.error && /does not exist|schema cache/i.test(result.error.message || ''));
  if (migrationMissing) {
    onboarding.hidden = false;
    document.querySelector('#organization-form-error').textContent = 'Execute supabase/migration_self_service_organizations.sql antes de criar a organização.';
    return;
  }
  if (eventResult.error) {
    const errorPanel = document.querySelector('#organization-event-error');
    const policyError = /recursion|policy/i.test(eventResult.error.message || '');
    errorPanel.textContent = policyError
      ? 'A lista não pôde ser carregada. Execute supabase/migration_fix_organization_event_listing.sql no Supabase.'
      : `Não foi possível carregar os eventos: ${eventResult.error.message}`;
  }
  if (memberResult.error) {
    document.querySelector('#organization-member-error').textContent = `Não foi possível carregar a equipe: ${memberResult.error.message}`;
  }
  organizations = organizationResult.data || [];
  events = eventResult.data || [];
  organizationMembers = memberResult.data || [];
  committeeMembers = committeeResult.data || [];
  if (!organizations.length) {
    onboarding.hidden = false;
    dashboard.hidden = true;
    document.querySelector('#organization-onboarding-cancel').hidden = true;
    document.querySelector('#organization-email').value = currentUser.email || '';
    return;
  }
  activeOrganizationId = organizations.some((item) => item.id === activeOrganizationId) ? activeOrganizationId : organizations[0].id;
  onboarding.hidden = true;
  dashboard.hidden = false;
  renderDashboard();
  switchTab(location.hash.slice(1) || 'events');
}

async function createOrganization(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const errorPanel = document.querySelector('#organization-form-error');
  setButtonLoading(button, true, 'Criando…');
  errorPanel.textContent = '';
  const { data, error } = await supabaseClient.rpc('create_organization', {
    p_name: document.querySelector('#organization-name').value.trim(),
    p_acronym: document.querySelector('#organization-acronym').value.trim(),
    p_description: document.querySelector('#organization-description').value.trim(),
    p_institution: document.querySelector('#organization-institution').value.trim(),
    p_contact_email: document.querySelector('#organization-email').value.trim(),
    p_website: document.querySelector('#organization-website').value.trim()
  });
  setButtonLoading(button, false);
  if (error) {
    errorPanel.textContent = /schema cache|does not exist/i.test(error.message || '') ? 'Execute a nova migração SQL no Supabase para habilitar organizações.' : error.message;
    return;
  }
  activeOrganizationId = data;
  showToast('Organização criada. Você agora é o proprietário.');
  await loadOrganizationData();
}

async function saveEvent(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const errorPanel = document.querySelector('#organization-event-error');
  setButtonLoading(button, true, 'Salvando…');
  errorPanel.textContent = '';
  const { data: savedEventId, error } = await supabaseClient.rpc('save_organization_event', {
    p_event_id: document.querySelector('#organization-event-id').value || null,
    p_organization_id: activeOrganizationId,
    p_event_name: document.querySelector('#organization-event-name').value.trim(),
    p_description: document.querySelector('#organization-event-description').value.trim(),
    p_location: document.querySelector('#organization-event-location').value.trim(),
    p_format: document.querySelector('#organization-event-format').value,
    p_starts_on: document.querySelector('#organization-event-start').value || null,
    p_ends_on: document.querySelector('#organization-event-end').value || null,
    p_submission_deadline: document.querySelector('#organization-event-submission').value || null,
    p_review_deadline: document.querySelector('#organization-event-review').value || null,
    p_modalities: document.querySelector('#organization-event-modalities').value.split(',').map((item) => item.trim()).filter(Boolean),
    p_contact_email: document.querySelector('#organization-event-contact').value.trim(),
    p_published: document.querySelector('#organization-event-published').checked
  });
  setButtonLoading(button, false);
  if (error) { errorPanel.textContent = error.message || 'Não foi possível salvar o evento.'; return; }
  resetEventForm();
  showToast('Evento salvo na organização.');
  await loadOrganizationData();
  if (savedEventId && !events.some((item) => item.id === savedEventId)) {
    errorPanel.textContent = 'O evento foi salvo, mas a lista não pôde ser atualizada. Execute supabase/migration_fix_organization_event_listing.sql no Supabase.';
  }
}

async function saveOrganizationMember(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const errorPanel = document.querySelector('#organization-member-error');
  setButtonLoading(button, true, 'Salvando…');
  errorPanel.textContent = '';
  const memberEmail = document.querySelector('#organization-member-email').value.trim().toLowerCase();
  const memberActive = document.querySelector('#organization-member-active').checked;
  const { data: savedUserId, error } = await supabaseClient.rpc('manage_organization_member', { p_organization_id: activeOrganizationId, p_email: memberEmail, p_active: memberActive });
  setButtonLoading(button, false);
  if (error) { errorPanel.textContent = /não encontrada/i.test(error.message || '') ? 'Essa pessoa precisa criar uma conta primeiro.' : error.message; return; }
  event.currentTarget.reset(); document.querySelector('#organization-member-active').checked = true;
  showToast('Equipe da organização atualizada.');
  await loadOrganizationData();
  if (savedUserId && !organizationMembers.some((member) => member.organization_id === activeOrganizationId && member.user_id === savedUserId)) {
    errorPanel.textContent = 'O integrante foi salvo, mas a lista não pôde ser atualizada. Execute supabase/migration_fix_organization_team_listing.sql no Supabase.';
  }
}

async function saveCommitteeMember(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  const errorPanel = document.querySelector('#event-committee-error');
  setButtonLoading(button, true, 'Salvando…');
  errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('manage_event_committee_member', { p_event_id: document.querySelector('#event-committee-event').value, p_email: document.querySelector('#event-committee-email').value.trim(), p_active: document.querySelector('#event-committee-active').checked });
  setButtonLoading(button, false);
  if (error) { errorPanel.textContent = /não encontrada/i.test(error.message || '') ? 'Essa pessoa precisa criar uma conta primeiro.' : error.message; return; }
  event.currentTarget.reset(); document.querySelector('#event-committee-active').checked = true;
  showToast('Comitê do evento atualizado.'); await loadOrganizationData();
}

document.querySelectorAll('[data-organization-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.organizationTab)));
document.querySelector('#organization-form').addEventListener('submit', createOrganization);
document.querySelector('#organization-event-form').addEventListener('submit', saveEvent);
document.querySelector('#organization-member-form').addEventListener('submit', saveOrganizationMember);
document.querySelector('#event-committee-form').addEventListener('submit', saveCommitteeMember);
document.querySelector('#organization-event-cancel').addEventListener('click', resetEventForm);
document.querySelector('#organization-members-refresh').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const errorPanel = document.querySelector('#organization-member-error');
  setButtonLoading(button, true, 'Atualizando…');
  errorPanel.textContent = '';
  try {
    await loadOrganizationData();
    if (!errorPanel.textContent) showToast('Lista de integrantes atualizada.');
  } catch (error) {
    errorPanel.textContent = error.message || 'Não foi possível atualizar a lista.';
  } finally {
    setButtonLoading(button, false);
  }
});
document.querySelector('#new-organization').addEventListener('click', () => {
  document.querySelector('#organization-form').reset();
  document.querySelector('#organization-form-error').textContent = '';
  document.querySelector('#organization-email').value = currentUser.email || '';
  document.querySelector('#organization-onboarding-cancel').hidden = false;
  dashboard.hidden = true;
  onboarding.hidden = false;
  document.querySelector('#organization-name').focus();
});
document.querySelector('#organization-onboarding-cancel').addEventListener('click', () => {
  onboarding.hidden = true;
  dashboard.hidden = false;
  renderDashboard();
});
document.querySelector('.menu-toggle').addEventListener('click', () => { const nav = document.querySelector('#main-nav'); const open = nav.classList.toggle('open'); document.querySelector('.menu-toggle').setAttribute('aria-expanded', String(open)); });
document.querySelector('#organization-logout').addEventListener('click', async () => { await supabaseClient.auth.signOut(); location.href = './index.html'; });

async function initializeOrganization() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user || null;
  if (!currentUser) { authPanel.hidden = false; return; }
  document.querySelector('#organization-logout').hidden = false;
  await loadOrganizationData();
}

initializeOrganization();

const SUPABASE_URL = 'https://tgcaycijcaoemaztkwfn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const authPanel = document.querySelector('#organization-auth');
const onboarding = document.querySelector('#organization-onboarding');
const dashboard = document.querySelector('#organization-dashboard');
const organizationEditDialog = document.querySelector('#organization-edit-dialog');
const deleteEventDialog = document.querySelector('#delete-event-dialog');
const toast = document.querySelector('#toast');
let organizations = [];
let events = [];
let organizationMembers = [];
let committeeMembers = [];
let activeOrganizationId = null;
let currentUser = null;
let eventPendingDeletion = null;
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
  const availableTabs = new Set(['events', 'team']);
  const selectedTab = availableTabs.has(name) ? name : 'events';
  document.querySelectorAll('[data-organization-tab]').forEach((button) => {
    const active = button.dataset.organizationTab === selectedTab;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-organization-panel]').forEach((panel) => {
    const active = panel.dataset.organizationPanel === selectedTab;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  history.replaceState(null, '', `#${selectedTab}`);
}

function formatDate(value) {
  if (!value) return 'A definir';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function renderOrganizationProfile() {
  const organization = activeOrganization();
  if (!organization) return;
  const organizationEvents = events.filter((event) => event.organization_id === organization.id);
  const members = organizationMembers.filter((member) => member.organization_id === organization.id);
  const profileMark = document.querySelector('#organization-profile-mark');
  profileMark.textContent = organization.acronym || organization.name.slice(0, 2).toUpperCase();
  profileMark.style.background = organization.brand_color || '#2563EB';
  document.querySelector('#organization-profile-name').textContent = organization.name;
  document.querySelector('#organization-profile-description').textContent = organization.description || 'Nenhuma descrição institucional informada.';
  document.querySelector('#organization-profile-institution').textContent = organization.institution || 'Não informada';
  document.querySelector('#organization-profile-contact').textContent = organization.contact_email || 'Não informado';
  const website = document.querySelector('#organization-profile-website');
  website.replaceChildren();
  if (organization.website) {
    const link = document.createElement('a');
    link.href = organization.website;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Visitar site ↗';
    website.append(link);
  } else {
    website.textContent = 'Não informado';
  }
  document.querySelector('#organization-profile-counts').textContent = `${organizationEvents.length} ${organizationEvents.length === 1 ? 'evento' : 'eventos'} · ${members.length} ${members.length === 1 ? 'integrante' : 'integrantes'}`;
  document.querySelector('#edit-organization').hidden = organization.created_by !== currentUser.id;
}

function renderOrganizationSelector() {
  const list = document.querySelector('#organization-card-list');
  list.replaceChildren();
  organizations.forEach((organization) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `organization-choice${organization.id === activeOrganizationId ? ' active' : ''}`;
    card.setAttribute('aria-pressed', String(organization.id === activeOrganizationId));
    card.innerHTML = `<span style="background:${escapeHtml(organization.brand_color || '#2563EB')}">${escapeHtml(organization.acronym || organization.name.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(organization.name)}</strong><small>${escapeHtml(organization.institution || organization.contact_email)}</small></div><b>${organization.id === activeOrganizationId ? 'Em uso' : 'Acessar'} →</b>`;
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
  document.querySelector('#organization-event-image').value = '';
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
    const committeeCount = committeeMembers.filter((member) => member.event_id === event.id && member.active).length;
    const article = document.createElement('article');
    article.innerHTML = `${event.cover_image_url ? `<img class="organization-event-cover" src="${escapeHtml(event.cover_image_url)}" alt="" />` : ''}<div class="organization-event-summary"><span>${event.published ? 'Publicado' : 'Rascunho'}</span><strong>${escapeHtml(event.event_name)}</strong><p>${escapeHtml(event.location || 'Local a definir')} · ${escapeHtml(event.format || 'Formato a definir')}</p><dl><div><dt>Período</dt><dd>${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}</dd></div><div><dt>Submissões</dt><dd>${formatDate(event.submission_deadline)}</dd></div><div><dt>Modalidades</dt><dd>${(event.modalities || []).length || 'A definir'}</dd></div><div><dt>Comitê</dt><dd>${committeeCount} ${committeeCount === 1 ? 'integrante' : 'integrantes'}</dd></div></dl></div><div class="organization-event-actions"><button class="organization-event-action" type="button" data-edit-event><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg><span>Editar evento</span></button><button class="organization-event-action" type="button" data-manage-committee><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Gerir comitê</span></button><a class="organization-event-action" href="./comite.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 9V3h4v6l5 9a2 2 0 0 1-1.75 3H6.75A2 2 0 0 1 5 18Z"/><path d="M8 15h8"/></svg><span>Gestão científica</span></a><button class="organization-event-action danger" type="button" data-delete-event><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg><span>Excluir evento</span></button></div>`;
    article.querySelector('[data-edit-event]').addEventListener('click', () => fillEventForm(event));
    article.querySelector('[data-manage-committee]').addEventListener('click', () => {
      eventSelect.value = event.id;
      document.querySelector('.event-committee-management').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    article.querySelector('[data-delete-event]').addEventListener('click', () => openDeleteEventDialog(event));
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
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'panel-intro';
    empty.textContent = 'Nenhum integrante vinculado aos comitês desta organização.';
    list.append(empty);
  }
}

function renderDashboard() {
  renderOrganizationSelector();
  renderOrganizationProfile();
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
  if (committeeResult.error) {
    document.querySelector('#event-committee-error').textContent = `Não foi possível carregar o comitê: ${committeeResult.error.message}`;
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

function openOrganizationEdit() {
  const organization = activeOrganization();
  if (!organization) return;
  document.querySelector('#edit-organization-name').value = organization.name || '';
  document.querySelector('#edit-organization-acronym').value = organization.acronym || '';
  document.querySelector('#edit-organization-institution').value = organization.institution || '';
  document.querySelector('#edit-organization-description').value = organization.description || '';
  document.querySelector('#edit-organization-email').value = organization.contact_email || '';
  document.querySelector('#edit-organization-website').value = organization.website || '';
  const color = organization.brand_color || '#2563EB';
  const colorInput = document.querySelector(`input[name="organization-color"][value="${color}"]`) || document.querySelector('input[name="organization-color"][value="#2563EB"]');
  colorInput.checked = true;
  document.querySelector('#organization-edit-error').textContent = '';
  organizationEditDialog.showModal();
}

async function updateOrganization(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const errorPanel = document.querySelector('#organization-edit-error');
  setButtonLoading(button, true, 'Salvando…'); errorPanel.textContent = '';
  const { data: updated, error } = await supabaseClient.rpc('update_my_organization', {
    p_organization_id: activeOrganizationId,
    p_name: document.querySelector('#edit-organization-name').value.trim(),
    p_acronym: document.querySelector('#edit-organization-acronym').value.trim(),
    p_description: document.querySelector('#edit-organization-description').value.trim(),
    p_institution: document.querySelector('#edit-organization-institution').value.trim(),
    p_contact_email: document.querySelector('#edit-organization-email').value.trim(),
    p_website: document.querySelector('#edit-organization-website').value.trim(),
    p_brand_color: document.querySelector('input[name="organization-color"]:checked').value
  });
  setButtonLoading(button, false);
  if (error || !updated) {
    errorPanel.textContent = /schema cache|function/i.test(error?.message || '')
      ? 'Execute migration_edit_organization.sql no Supabase e tente novamente.'
      : (error?.message || 'Somente o proprietário pode editar esta organização.');
    return;
  }
  organizationEditDialog.close(); showToast('Organização atualizada.'); await loadOrganizationData();
}

function openDeleteEventDialog(event) {
  eventPendingDeletion = event;
  document.querySelector('#delete-event-name').textContent = event.event_name || 'O evento selecionado';
  document.querySelector('#delete-event-error').textContent = '';
  deleteEventDialog.showModal();
}

function closeDeleteEventDialog() {
  deleteEventDialog.close();
  eventPendingDeletion = null;
}

async function deleteOrganizationEvent() {
  if (!eventPendingDeletion) return;
  const button = document.querySelector('#confirm-delete-event');
  const errorPanel = document.querySelector('#delete-event-error');
  setButtonLoading(button, true, 'Excluindo…');
  errorPanel.textContent = '';
  const { data: deleted, error } = await supabaseClient.rpc('delete_organization_event', {
    p_event_id: eventPendingDeletion.id,
    p_organization_id: activeOrganizationId
  });
  setButtonLoading(button, false);
  if (error || !deleted) {
    errorPanel.textContent = /schema cache|function/i.test(error?.message || '')
      ? 'Execute migration_delete_organization_event.sql no Supabase e tente novamente.'
      : (error?.message || 'Não foi possível excluir este evento.');
    return;
  }
  const deletedEventId = eventPendingDeletion.id;
  closeDeleteEventDialog();
  if (document.querySelector('#organization-event-id').value === deletedEventId) resetEventForm();
  showToast('Evento excluído da organização.');
  await loadOrganizationData();
}

async function uploadEventImage(eventId, file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${activeOrganizationId}/${eventId}/cover-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabaseClient.storage.from('event-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadError) return { error: uploadError };
  const { data } = supabaseClient.storage.from('event-images').getPublicUrl(path);
  const coverUrl = data.publicUrl;
  const { error: updateError } = await supabaseClient.from('event_configurations').update({ cover_image_url: coverUrl }).eq('id', eventId);
  return { error: updateError, coverUrl };
}

async function saveEvent(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const errorPanel = document.querySelector('#organization-event-error');
  const imageFile = document.querySelector('#organization-event-image').files[0];
  if (imageFile && (!['image/png', 'image/jpeg', 'image/webp'].includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024)) {
    errorPanel.textContent = 'Escolha uma imagem PNG, JPG ou WebP de até 5 MB.';
    return;
  }
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
  if (imageFile) {
    setButtonLoading(button, true, 'Enviando imagem…');
    const imageResult = await uploadEventImage(savedEventId, imageFile);
    setButtonLoading(button, false);
    if (imageResult.error) {
      errorPanel.textContent = /bucket|cover_image_url|schema cache/i.test(imageResult.error.message || '')
        ? 'O evento foi salvo, mas a imagem não. Execute supabase/migration_event_images_and_publication.sql no Supabase.'
        : `O evento foi salvo, mas a imagem não pôde ser enviada: ${imageResult.error.message}`;
      await loadOrganizationData();
      return;
    }
  }
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
document.querySelector('#edit-organization').addEventListener('click', openOrganizationEdit);
document.querySelector('#organization-edit-form').addEventListener('submit', updateOrganization);
document.querySelector('#close-organization-edit').addEventListener('click', () => organizationEditDialog.close());
document.querySelector('#cancel-organization-edit').addEventListener('click', () => organizationEditDialog.close());
document.querySelectorAll('[data-close-delete-event]').forEach((button) => button.addEventListener('click', closeDeleteEventDialog));
document.querySelector('#confirm-delete-event').addEventListener('click', deleteOrganizationEvent);
document.querySelector('#organization-event-form').addEventListener('submit', saveEvent);
document.querySelector('#organization-member-form').addEventListener('submit', saveOrganizationMember);
document.querySelector('#event-committee-form').addEventListener('submit', saveCommitteeMember);
document.querySelector('#organization-event-cancel').addEventListener('click', resetEventForm);
document.querySelector('#organization-members-refresh').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const errorPanel = document.querySelector('#organization-member-error');
  button.disabled = true;
  button.classList.add('loading');
  errorPanel.textContent = '';
  try {
    await loadOrganizationData();
    if (!errorPanel.textContent) showToast('Lista de integrantes atualizada.');
  } catch (error) {
    errorPanel.textContent = error.message || 'Não foi possível atualizar a lista.';
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
  }
});
document.querySelector('#event-committee-refresh').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const errorPanel = document.querySelector('#event-committee-error');
  button.disabled = true;
  button.classList.add('loading');
  errorPanel.textContent = '';
  try {
    await loadOrganizationData();
    if (!errorPanel.textContent) showToast('Lista do comitê atualizada.');
  } catch (error) {
    errorPanel.textContent = error.message || 'Não foi possível atualizar a lista do comitê.';
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
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

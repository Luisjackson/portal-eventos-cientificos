const SUPABASE_URL = 'https://tgcaycijcaoemaztkwfn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_s2DegO56caEwHGt2Op_Szg_F3dR6i5c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const authPanel = document.querySelector('#committee-auth');
const content = document.querySelector('#committee-content');
const toast = document.querySelector('#toast');
let profiles = [];
let registrations = [];
let submissions = [];
let eventConfigurations = [];
let committeeMembers = [];
let toastTimer;

const statusNames = { submitted: 'Submetido', under_review: 'Em avaliação', changes_requested: 'Correções solicitadas', accepted: 'Aceito', rejected: 'Não aceito', final_submitted: 'Versão final' };
const reviewStatusNames = { assigned: 'Aguardando', in_progress: 'Em avaliação', completed: 'Concluída', conflict: 'Conflito' };
const recommendationNames = { accept: 'Aceitar', minor_changes: 'Pequenas correções', major_changes: 'Correções substanciais', reject: 'Não aceitar' };

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function profileName(userId) {
  return profiles.find((profile) => profile.id === userId)?.full_name || 'Usuário cadastrado';
}

function switchTab(name) {
  document.querySelectorAll('[data-committee-tab]').forEach((button) => {
    const active = button.dataset.committeeTab === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-committee-panel]').forEach((panel) => {
    const active = panel.dataset.committeePanel === name;
    panel.hidden = !active; panel.classList.toggle('active', active);
  });
  history.replaceState(null, '', `#${name}`);
}

function renderOverview() {
  const reviews = submissions.flatMap((submission) => submission.review_assignments || []);
  document.querySelector('#committee-submission-count').textContent = submissions.length;
  document.querySelector('#committee-review-count').textContent = reviews.filter((review) => review.status === 'completed').length;
  document.querySelector('#committee-participant-count').textContent = registrations.length;
  document.querySelector('#committee-published-count').textContent = submissions.filter((submission) => submission.published).length;
  const statusGrid = document.querySelector('#committee-status-grid');
  statusGrid.replaceChildren();
  ['submitted', 'under_review', 'changes_requested', 'accepted', 'rejected', 'final_submitted'].forEach((status) => {
    const item = document.createElement('article');
    const total = submissions.filter((submission) => submission.status === status).length;
    item.innerHTML = `<strong>${total}</strong><span>${statusNames[status]}</span>`;
    statusGrid.append(item);
  });
}

function renderEvents() {
  const list = document.querySelector('#committee-event-list');
  list.replaceChildren();
  eventConfigurations.forEach((event) => {
    const article = document.createElement('article');
    article.innerHTML = `<div><span>${event.published ? 'Publicado' : 'Rascunho'}</span><strong>${escapeHtml(event.event_name)}</strong><p>${escapeHtml(event.location)} · ${escapeHtml(event.format)} · ${event.modalities?.length || 0} modalidade(s)</p></div><button class="button button-secondary" type="button">Editar</button>`;
    article.querySelector('button').addEventListener('click', () => fillEventForm(event));
    list.append(article);
  });
}

function fillEventForm(event) {
  document.querySelector('#event-config-name').value = event.event_name || '';
  document.querySelector('#event-config-description').value = event.description || '';
  document.querySelector('#event-config-location').value = event.location || '';
  document.querySelector('#event-config-format').value = event.format || 'Presencial';
  document.querySelector('#event-config-start').value = event.starts_on || '';
  document.querySelector('#event-config-end').value = event.ends_on || '';
  document.querySelector('#event-config-submission-deadline').value = event.submission_deadline || '';
  document.querySelector('#event-config-review-deadline').value = event.review_deadline || '';
  document.querySelector('#event-config-modalities').value = (event.modalities || []).join(', ');
  document.querySelector('#event-config-contact').value = event.contact_email || '';
  document.querySelector('#event-config-published').checked = Boolean(event.published);
  document.querySelector('#event-config-name').focus();
}

async function saveEvent(event) {
  event.preventDefault();
  const errorPanel = document.querySelector('#event-config-error');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const record = {
    event_name: document.querySelector('#event-config-name').value.trim(),
    description: document.querySelector('#event-config-description').value.trim(),
    location: document.querySelector('#event-config-location').value.trim(),
    format: document.querySelector('#event-config-format').value,
    starts_on: document.querySelector('#event-config-start').value,
    ends_on: document.querySelector('#event-config-end').value,
    submission_deadline: document.querySelector('#event-config-submission-deadline').value,
    review_deadline: document.querySelector('#event-config-review-deadline').value,
    modalities: document.querySelector('#event-config-modalities').value.split(',').map((item) => item.trim()).filter(Boolean),
    contact_email: document.querySelector('#event-config-contact').value.trim().toLowerCase(),
    published: document.querySelector('#event-config-published').checked,
    updated_at: new Date().toISOString()
  };
  button.disabled = true; button.textContent = 'Salvando…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.from('event_configurations').upsert(record, { onConflict: 'event_name' });
  button.disabled = false; button.textContent = 'Salvar configuração';
  if (error) { errorPanel.textContent = 'Não foi possível salvar a configuração.'; return; }
  showToast('Configuração do evento salva.'); event.currentTarget.reset(); await loadData();
}

function reviewSummary(review) {
  const scores = [review.clarity_score, review.originality_score, review.methodology_score, review.relevance_score].filter(Boolean);
  const average = scores.length ? (scores.reduce((total, score) => total + Number(score), 0) / scores.length).toFixed(1) : '—';
  return `<li><div><strong>${escapeHtml(review.reviewer_email || 'Revisor atribuído')}</strong><span>${reviewStatusNames[review.status] || review.status} · prazo ${new Date(`${review.deadline}T12:00:00`).toLocaleDateString('pt-BR')}</span></div><small>Nota ${average}${review.recommendation ? ` · ${escapeHtml(recommendationNames[review.recommendation])}` : ''}</small></li>`;
}

function renderSubmissions() {
  const list = document.querySelector('#committee-submission-list');
  const empty = document.querySelector('#committee-submission-empty');
  list.replaceChildren(); empty.hidden = submissions.length !== 0;
  submissions.forEach((submission) => {
    const reviews = submission.review_assignments || [];
    const card = document.createElement('article');
    card.className = 'committee-submission-card';
    card.innerHTML = `<header><div><span>${escapeHtml(submission.event_name)}</span><h3>${escapeHtml(submission.title)}</h3><p>${escapeHtml(profileName(submission.user_id))} · ${escapeHtml(submission.track)}</p></div><strong class="submission-status ${['accepted','final_submitted'].includes(submission.status) ? 'success' : submission.status === 'rejected' ? 'danger' : 'warning'}">${statusNames[submission.status] || submission.status}</strong></header><div class="committee-review-progress"><strong>${reviews.filter((review) => review.status === 'completed').length}/${reviews.length}</strong><span>revisões concluídas</span></div><ul class="committee-review-list">${reviews.length ? reviews.map(reviewSummary).join('') : '<li class="empty-line">Nenhum revisor atribuído</li>'}</ul><details><summary>Distribuir para outro revisor</summary><form class="committee-inline-form" data-assign-reviewer><label>E-mail do revisor<input type="email" name="reviewer_email" required /></label><label>Prazo<input type="date" name="deadline" required /></label><button class="button button-primary" type="submit">Atribuir</button><p class="field-error" aria-live="polite"></p></form></details><details><summary>Registrar decisão e comunicar autor</summary><form class="committee-decision-form" data-record-decision><label>Decisão<select name="decision" required><option value="">Selecione</option><option value="accepted">Aceitar</option><option value="changes_requested">Solicitar correções</option><option value="rejected">Não aceitar</option></select></label><label class="wide">Comunicação ao autor<textarea name="message" rows="3" minlength="10" required>${escapeHtml(submission.decision_message || '')}</textarea></label><label class="committee-check wide"><input type="checkbox" name="publish" ${submission.published ? 'checked' : ''} /> Divulgar na lista pública de artigos aprovados</label><button class="button button-primary" type="submit">Registrar decisão</button><p class="field-error" aria-live="polite"></p></form></details><details><summary>Enviar mensagem sem alterar decisão</summary><form class="committee-message-form" data-send-message><textarea name="message" rows="2" minlength="3" placeholder="Orientação, lembrete ou aviso ao autor" required></textarea><button class="button button-secondary" type="submit">Enviar mensagem</button><p class="field-error" aria-live="polite"></p></form></details>`;
    const deadline = card.querySelector('[name="deadline"]');
    deadline.value = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    card.querySelector('[data-assign-reviewer]').addEventListener('submit', (event) => assignReviewer(event, submission.id));
    card.querySelector('[data-record-decision]').addEventListener('submit', (event) => recordDecision(event, submission.id));
    card.querySelector('[data-send-message]').addEventListener('submit', (event) => sendMessage(event, submission.id));
    list.append(card);
  });
}

async function assignReviewer(event, submissionId) {
  event.preventDefault(); const form = event.currentTarget; const errorPanel = form.querySelector('.field-error'); const button = form.querySelector('button');
  button.disabled = true; button.textContent = 'Atribuindo…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('assign_reviewer_committee', { p_submission_id: submissionId, p_reviewer_email: form.reviewer_email.value.trim(), p_deadline: form.deadline.value });
  button.disabled = false; button.textContent = 'Atribuir';
  if (error) { errorPanel.textContent = error.message.includes('não encontrada') ? 'Não existe conta cadastrada com esse e-mail.' : 'Não foi possível atribuir o revisor.'; return; }
  showToast('Revisor atribuído ao trabalho.'); await loadData();
}

async function recordDecision(event, submissionId) {
  event.preventDefault(); const form = event.currentTarget; const errorPanel = form.querySelector('.field-error'); const button = form.querySelector('button');
  button.disabled = true; button.textContent = 'Registrando…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('record_submission_decision', { p_submission_id: submissionId, p_decision: form.decision.value, p_message: form.message.value.trim(), p_publish: form.publish.checked });
  button.disabled = false; button.textContent = 'Registrar decisão';
  if (error) { errorPanel.textContent = 'Não foi possível registrar a decisão.'; return; }
  showToast('Decisão registrada e comunicada ao autor.'); await loadData();
}

async function sendMessage(event, submissionId) {
  event.preventDefault(); const form = event.currentTarget; const errorPanel = form.querySelector('.field-error'); const button = form.querySelector('button');
  button.disabled = true; button.textContent = 'Enviando…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('send_submission_message', { p_submission_id: submissionId, p_message: form.message.value.trim() });
  button.disabled = false; button.textContent = 'Enviar mensagem';
  if (error) { errorPanel.textContent = 'Não foi possível enviar a mensagem.'; return; }
  form.reset(); showToast('Mensagem enviada ao autor.'); await loadData();
}

function renderParticipants() {
  const list = document.querySelector('#committee-participant-list');
  const empty = document.querySelector('#committee-participant-empty');
  list.replaceChildren(); empty.hidden = registrations.length !== 0;
  registrations.forEach((registration) => {
    const card = document.createElement('article'); card.className = 'committee-participant-card';
    card.innerHTML = `<div><span>${escapeHtml(registration.event_name)}</span><h3>${escapeHtml(profileName(registration.user_id))}</h3><p>${escapeHtml(registration.category)} · código #${registration.id.slice(0, 8).toUpperCase()}</p></div><form><label>Pagamento<select name="payment"><option value="pending">Pendente</option><option value="paid">Confirmado</option><option value="cancelled">Cancelado</option></select></label><label><input type="checkbox" name="attendance" ${registration.attendance_confirmed ? 'checked' : ''} /> Presença</label><label><input type="checkbox" name="badge" ${registration.badge_issued ? 'checked' : ''} /> Emitir crachá</label><label><input type="checkbox" name="certificate" ${registration.certificate_available ? 'checked' : ''} /> Emitir certificado</label><button class="button button-secondary" type="submit">Salvar</button><p class="field-error"></p></form>`;
    card.querySelector('[name="payment"]').value = registration.payment_status;
    card.querySelector('form').addEventListener('submit', (event) => manageParticipant(event, registration.id));
    list.append(card);
  });
}

async function manageParticipant(event, registrationId) {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); const errorPanel = form.querySelector('.field-error');
  button.disabled = true; button.textContent = 'Salvando…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('manage_registration', { p_registration_id: registrationId, p_payment_status: form.payment.value, p_attendance_confirmed: form.attendance.checked, p_badge_issued: form.badge.checked, p_certificate_available: form.certificate.checked });
  button.disabled = false; button.textContent = 'Salvar';
  if (error) { errorPanel.textContent = 'Não foi possível atualizar a inscrição.'; return; }
  showToast('Participante atualizado.'); await loadData();
}

function renderMembers() {
  const list = document.querySelector('#committee-member-list'); list.replaceChildren();
  committeeMembers.forEach((member) => {
    const item = document.createElement('article');
    item.innerHTML = `<strong>${escapeHtml(member.email)}</strong><span>${member.role === 'organizer' ? 'Organização' : 'Comitê científico'} · ${member.active ? 'ativo' : 'inativo'}</span>`;
    list.append(item);
  });
}

async function saveMember(event) {
  event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); const errorPanel = document.querySelector('#committee-member-error');
  button.disabled = true; button.textContent = 'Salvando…'; errorPanel.textContent = '';
  const { error } = await supabaseClient.rpc('manage_committee_member', { p_email: document.querySelector('#committee-member-email').value.trim(), p_role: document.querySelector('#committee-member-role').value, p_active: document.querySelector('#committee-member-active').checked });
  button.disabled = false; button.textContent = 'Adicionar ou atualizar';
  if (error) { errorPanel.textContent = error.message.includes('não encontrada') ? 'Essa conta ainda não está cadastrada.' : 'Não foi possível salvar o membro.'; return; }
  form.reset(); document.querySelector('#committee-member-active').checked = true; showToast('Equipe atualizada.'); await loadData();
}

async function loadData() {
  const [profileResult, registrationResult, submissionResult, eventResult, memberResult] = await Promise.all([
    supabaseClient.from('profiles').select('id, full_name, institution'),
    supabaseClient.from('registrations').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('submissions').select('*, review_assignments(*), submission_messages(*)').order('created_at', { ascending: false }),
    supabaseClient.from('event_configurations').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('committee_members').select('*').order('created_at', { ascending: true })
  ]);
  const firstError = [profileResult, registrationResult, submissionResult, eventResult, memberResult].find((result) => result.error)?.error;
  if (firstError) { document.querySelector('#committee-submission-error').textContent = 'Não foi possível carregar a gestão. Verifique se migration_committee_area.sql foi executada.'; document.querySelector('#committee-submission-error').hidden = false; return; }
  profiles = profileResult.data || []; registrations = registrationResult.data || []; submissions = submissionResult.data || []; eventConfigurations = eventResult.data || []; committeeMembers = memberResult.data || [];
  renderOverview(); renderEvents(); renderSubmissions(); renderParticipants(); renderMembers();
}

document.querySelectorAll('[data-committee-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.committeeTab)));
document.querySelector('#event-config-form').addEventListener('submit', saveEvent);
document.querySelector('#committee-member-form').addEventListener('submit', saveMember);
document.querySelector('.menu-toggle').addEventListener('click', () => { const nav = document.querySelector('#main-nav'); const open = nav.classList.toggle('open'); document.querySelector('.menu-toggle').setAttribute('aria-expanded', String(open)); });
document.querySelector('#committee-logout').addEventListener('click', async () => { await supabaseClient.auth.signOut(); location.href = './index.html'; });

async function initializeCommittee() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) { authPanel.hidden = false; return; }
  const { data: allowed, error } = await supabaseClient.rpc('is_committee');
  if (error || !allowed) { document.querySelector('#committee-auth-message').textContent = error ? 'Execute a migração da área do comitê e cadastre sua conta como organizadora.' : 'Sua conta não está cadastrada como integrante ativo da organização ou do comitê.'; authPanel.hidden = false; return; }
  content.hidden = false; document.querySelector('#committee-logout').hidden = false;
  await loadData(); switchTab(location.hash.slice(1) || 'overview');
}

initializeCommittee();

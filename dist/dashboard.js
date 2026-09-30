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
const statusDetails = {
  submitted: { label: 'Submetido', step: 1, className: 'info' },
  under_review: { label: 'Em avaliação', step: 2, className: 'warning' },
  changes_requested: { label: 'Correções solicitadas', step: 3, className: 'warning' },
  accepted: { label: 'Aceito', step: 3, className: 'success' },
  rejected: { label: 'Não aceito', step: 3, className: 'danger' },
  final_submitted: { label: 'Versão final enviada', step: 4, className: 'success' }
};

const authRequired = document.querySelector('#auth-required');
const dashboardContent = document.querySelector('#dashboard-content');
const dashboardEvents = document.querySelector('#dashboard-events');
const cancelDialog = document.querySelector('#cancel-registration-dialog');
const submissionDialog = document.querySelector('#submission-dialog');
const finalVersionDialog = document.querySelector('#final-version-dialog');
const documentDialog = document.querySelector('#document-dialog');
const toast = document.querySelector('#toast');
let currentUser = null;
let currentProfile = null;
let registrations = [];
let submissions = [];
let selectedRegistration = null;
let selectedSubmission = null;
let toastTimer;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function userInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function getUserView() {
  if (!currentUser) return null;
  const metadata = currentUser.user_metadata || {};
  return {
    name: currentProfile?.full_name || metadata.full_name || currentUser.email?.split('@')[0] || 'Usuário',
    email: currentUser.email || '',
    institution: currentProfile?.institution || '',
    bio: currentProfile?.bio || ''
  };
}

function activityRoleLabel() {
  const participant = registrations.length > 0;
  const author = submissions.length > 0;
  if (participant && author) return 'Participante e autor';
  if (author) return 'Autor';
  if (participant) return 'Participante';
  return 'Sem atividades';
}

async function loadProfile() {
  currentProfile = null;
  if (!currentUser) return;
  const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
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
  document.querySelector('#dashboard-profile-role').textContent = activityRoleLabel();
  document.querySelector('#profile-full-name').value = user.name;
  document.querySelector('#profile-email').value = user.email;
  document.querySelector('#profile-institution').value = user.institution;
  document.querySelector('#profile-bio').value = user.bio;
}

function switchTab(tabName, updateHash = true) {
  const validTab = document.querySelector(`[data-dashboard-panel="${tabName}"]`) ? tabName : 'overview';
  document.querySelectorAll('[data-dashboard-tab]').forEach((button) => {
    const active = button.dataset.dashboardTab === validTab;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-dashboard-panel]').forEach((panel) => {
    const active = panel.dataset.dashboardPanel === validTab;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  if (updateHash) history.replaceState(null, '', `#${validTab}`);
}

function paymentLabel(status) {
  return { paid: 'Pagamento confirmado', pending: 'Aguardando confirmação', cancelled: 'Pagamento cancelado' }[status] || 'Em processamento';
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
    const item = document.createElement('span'); item.textContent = value; meta.append(item);
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
  status.className = `payment-status ${registration.payment_status === 'paid' ? 'success' : 'warning'}`;
  status.textContent = paymentLabel(registration.payment_status);
  const code = document.createElement('span');
  code.textContent = `#${registration.id.slice(0, 8).toUpperCase()}`;
  const badge = document.createElement('button');
  badge.className = 'mini-action'; badge.type = 'button'; badge.textContent = 'Ver crachá';
  badge.addEventListener('click', () => openDocument('badge', registration));
  const cancel = document.createElement('button');
  cancel.className = 'cancel-registration-button'; cancel.type = 'button'; cancel.textContent = 'Cancelar inscrição';
  cancel.addEventListener('click', () => openCancelDialog(registration));
  actions.append(status, code, badge, cancel);
  card.append(cover, content, actions);
  return card;
}

function renderDocuments() {
  const grid = document.querySelector('#document-grid');
  const empty = document.querySelector('#documents-empty');
  grid.replaceChildren();
  registrations.forEach((registration) => {
    const card = document.createElement('article');
    card.className = 'document-card';
    card.innerHTML = `<div class="document-icon" aria-hidden="true">▣</div><div><span>Crachá do participante</span><h3>${escapeHtml(registration.event_name)}</h3><p>Código #${registration.id.slice(0, 8).toUpperCase()}</p></div>`;
    const badgeButton = document.createElement('button');
    badgeButton.className = 'button button-secondary'; badgeButton.type = 'button'; badgeButton.textContent = 'Abrir crachá';
    badgeButton.addEventListener('click', () => openDocument('badge', registration));
    card.append(badgeButton); grid.append(card);

    const certificate = document.createElement('article');
    certificate.className = `document-card ${registration.certificate_available ? '' : 'locked'}`;
    certificate.innerHTML = `<div class="document-icon" aria-hidden="true">★</div><div><span>Certificado</span><h3>${escapeHtml(registration.event_name)}</h3><p>${registration.certificate_available ? `${registration.activity_hours || 0} horas certificadas` : 'Disponível após confirmação de presença'}</p></div>`;
    const certificateButton = document.createElement('button');
    certificateButton.className = 'button button-secondary'; certificateButton.type = 'button';
    certificateButton.textContent = registration.certificate_available ? 'Abrir certificado' : 'Ainda indisponível';
    certificateButton.disabled = !registration.certificate_available;
    if (registration.certificate_available) certificateButton.addEventListener('click', () => openDocument('certificate', registration));
    certificate.append(certificateButton); grid.append(certificate);
  });
  empty.hidden = registrations.length !== 0;
}

function openDocument(type, registration) {
  const user = getUserView();
  const code = registration.id.slice(0, 8).toUpperCase();
  const printable = document.querySelector('#printable-document');
  if (type === 'badge') {
    printable.innerHTML = `<article class="badge-document"><div class="document-brand"><span class="atom-symbol">◉</span><span>Portal de <strong>Eventos Científicos</strong></span></div><p>CRACHÁ DO PARTICIPANTE</p><h2 id="document-title">${escapeHtml(user.name)}</h2><span>${escapeHtml(user.institution || 'Participante')}</span><hr><h3>${escapeHtml(registration.event_name)}</h3><p>${escapeHtml(registration.event_date)} · ${escapeHtml(registration.event_location)}</p><div class="document-code">#${code}</div></article>`;
  } else {
    printable.innerHTML = `<article class="certificate-document"><div class="document-brand"><span class="atom-symbol">◉</span><span>Portal de <strong>Eventos Científicos</strong></span></div><p>CERTIFICADO DE PARTICIPAÇÃO</p><h2 id="document-title">Certificamos que <strong>${escapeHtml(user.name)}</strong></h2><p>participou de <strong>${escapeHtml(registration.event_name)}</strong>, realizado em ${escapeHtml(registration.event_date)}, com carga horária de ${Number(registration.activity_hours || 0)} horas.</p><div class="certificate-signature"><span>Comissão organizadora</span><span>Validação #${code}</span></div></article>`;
  }
  documentDialog.showModal();
}

function renderOverview() {
  const feed = document.querySelector('#overview-feed');
  const empty = document.querySelector('#overview-empty');
  feed.replaceChildren();
  registrations.slice(0, 2).forEach((registration) => {
    const item = document.createElement('article');
    item.className = 'overview-item';
    item.innerHTML = `<span class="overview-symbol" aria-hidden="true">●</span><div><strong>${escapeHtml(registration.event_name)}</strong><p>${escapeHtml(registration.event_date)} · ${paymentLabel(registration.payment_status)}</p></div>`;
    feed.append(item);
  });
  submissions.slice(0, 2).forEach((submission) => {
    const detail = statusDetails[submission.status] || statusDetails.submitted;
    const item = document.createElement('article');
    item.className = 'overview-item';
    item.innerHTML = `<span class="overview-symbol article" aria-hidden="true">◇</span><div><strong>${escapeHtml(submission.title)}</strong><p>${escapeHtml(submission.event_name)} · ${detail.label}</p></div>`;
    feed.append(item);
  });
  empty.hidden = registrations.length + submissions.length !== 0;
}

async function loadRegistrations() {
  const empty = document.querySelector('#dashboard-empty');
  const errorPanel = document.querySelector('#dashboard-error');
  errorPanel.hidden = true;
  dashboardEvents.replaceChildren();
  const { data, error } = await supabaseClient.from('registrations').select('*').order('created_at', { ascending: false });
  if (error) {
    errorPanel.textContent = 'Não foi possível carregar suas inscrições. Atualize a página e tente novamente.';
    errorPanel.hidden = false; registrations = []; return;
  }
  registrations = data || [];
  registrations.forEach((registration) => dashboardEvents.append(renderRegistration(registration)));
  empty.hidden = registrations.length !== 0;
  document.querySelector('#dashboard-registration-count').textContent = registrations.length;
  document.querySelector('#dashboard-certificate-count').textContent = registrations.filter((item) => item.certificate_available).length;
  renderDocuments();
}

function submissionStatusTimeline(submission) {
  const detail = statusDetails[submission.status] || statusDetails.submitted;
  const labels = ['Submissão', 'Avaliação', 'Decisão', 'Versão final'];
  const timeline = document.createElement('ol');
  timeline.className = 'submission-timeline';
  labels.forEach((label, index) => {
    const item = document.createElement('li');
    if (index + 1 <= detail.step) item.className = 'done';
    if (index + 1 === detail.step) item.setAttribute('aria-current', 'step');
    item.innerHTML = `<span>${index + 1}</span><small>${label}</small>`;
    timeline.append(item);
  });
  return timeline;
}

function renderSubmission(submission) {
  const detail = statusDetails[submission.status] || statusDetails.submitted;
  const card = document.createElement('article');
  card.className = 'submission-card';
  const heading = document.createElement('div');
  heading.className = 'submission-heading';
  heading.innerHTML = `<div><span>${escapeHtml(submission.event_name)}</span><h3>${escapeHtml(submission.title)}</h3><p>${escapeHtml(submission.track)} · Protocolo #${submission.id.slice(0, 8).toUpperCase()}</p></div><strong class="submission-status ${detail.className}">${detail.label}</strong>`;
  card.append(heading, submissionStatusTimeline(submission));
  const metadata = document.createElement('div');
  metadata.className = 'submission-metadata';
  const coauthors = submission.coauthors || [];
  metadata.innerHTML = `<span><strong>Arquivo:</strong> ${escapeHtml(submission.original_file_name || 'artigo.pdf')}</span><span><strong>Coautores:</strong> ${coauthors.length ? coauthors.map((item) => escapeHtml(item.full_name)).join(', ') : 'Nenhum cadastrado'}</span><span><strong>Enviado:</strong> ${new Date(submission.created_at).toLocaleDateString('pt-BR')}</span>`;
  card.append(metadata);
  if (submission.review_text) {
    const review = document.createElement('section');
    review.className = 'review-box';
    review.innerHTML = `<span>Parecer recebido</span><p>${escapeHtml(submission.review_text)}</p>`;
    card.append(review);
  } else {
    const pending = document.createElement('p');
    pending.className = 'review-pending'; pending.textContent = 'O parecer aparecerá aqui quando a avaliação for concluída.'; card.append(pending);
  }
  if (['accepted', 'changes_requested'].includes(submission.status)) {
    const finalButton = document.createElement('button');
    finalButton.className = 'button button-primary submission-final-button'; finalButton.type = 'button';
    finalButton.textContent = 'Enviar versão final';
    finalButton.addEventListener('click', () => openFinalVersion(submission));
    card.append(finalButton);
  } else if (submission.status === 'final_submitted') {
    const done = document.createElement('p'); done.className = 'final-version-done'; done.textContent = `✓ Versão final enviada: ${submission.final_file_name || 'arquivo-final.pdf'}`; card.append(done);
  }
  return card;
}

async function loadSubmissions() {
  const list = document.querySelector('#submission-list');
  const empty = document.querySelector('#submissions-empty');
  const errorPanel = document.querySelector('#submissions-error');
  list.replaceChildren(); errorPanel.hidden = true;
  const { data, error } = await supabaseClient.from('submissions').select('*, coauthors(*)').order('created_at', { ascending: false });
  if (error) {
    submissions = [];
    if (error.code === '42P01' || /submissions/i.test(error.message || '')) {
      errorPanel.textContent = 'A área de artigos está pronta no site, mas a migração supabase/migration_author_area.sql ainda precisa ser executada no SQL Editor.';
    } else errorPanel.textContent = 'Não foi possível carregar suas submissões agora.';
    errorPanel.hidden = false; empty.hidden = true;
  } else {
    submissions = data || [];
    submissions.forEach((submission) => list.append(renderSubmission(submission)));
    empty.hidden = submissions.length !== 0;
  }
  document.querySelector('#dashboard-submission-count').textContent = submissions.length;
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
  button.disabled = true; button.textContent = 'Cancelando...';
  const { error } = await supabaseClient.from('registrations').delete().eq('id', selectedRegistration.id).eq('user_id', currentUser.id);
  button.disabled = false; button.textContent = 'Cancelar inscrição';
  if (error) { errorPanel.textContent = 'Não foi possível cancelar. Tente novamente.'; return; }
  cancelDialog.close(); selectedRegistration = null; showToast('Inscrição cancelada e removida da sua área.');
  await loadRegistrations(); updateIdentity(); renderOverview();
}

function addCoauthorRow(values = {}) {
  const row = document.createElement('div');
  row.className = 'coauthor-row';
  row.innerHTML = `<label>Nome<input type="text" data-coauthor-name value="${escapeHtml(values.full_name || '')}" required /></label><label>E-mail<input type="email" data-coauthor-email value="${escapeHtml(values.email || '')}" required /></label><label>Instituição<input type="text" data-coauthor-institution value="${escapeHtml(values.institution || '')}" /></label>`;
  const remove = document.createElement('button');
  remove.type = 'button'; remove.className = 'remove-coauthor'; remove.setAttribute('aria-label', 'Remover coautor'); remove.textContent = '×';
  remove.addEventListener('click', () => row.remove()); row.append(remove);
  document.querySelector('#coauthor-list').append(row);
}

function openSubmission() {
  document.querySelector('#submission-form').reset();
  document.querySelector('#coauthor-list').replaceChildren();
  document.querySelector('#submission-form-error').textContent = '';
  submissionDialog.showModal();
}

function validPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && file.size <= 10 * 1024 * 1024;
}

async function submitArticle(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorPanel = document.querySelector('#submission-form-error');
  const file = document.querySelector('#submission-file').files[0];
  const abstract = document.querySelector('#submission-abstract').value.trim();
  if (!validPdf(file)) { errorPanel.textContent = 'Selecione um arquivo PDF de até 10 MB.'; return; }
  if (abstract.length < 80) { errorPanel.textContent = 'O resumo precisa ter pelo menos 80 caracteres.'; return; }
  const coauthors = [...document.querySelectorAll('.coauthor-row')].map((row) => ({
    full_name: row.querySelector('[data-coauthor-name]').value.trim(),
    email: row.querySelector('[data-coauthor-email]').value.trim().toLowerCase(),
    institution: row.querySelector('[data-coauthor-institution]').value.trim()
  }));
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Enviando…'; errorPanel.textContent = '';
  const submissionId = crypto.randomUUID();
  const storagePath = `${currentUser.id}/${submissionId}/original.pdf`;
  const { error: uploadError } = await supabaseClient.storage.from('article-files').upload(storagePath, file, { contentType: 'application/pdf', upsert: false });
  if (uploadError) {
    errorPanel.textContent = /bucket|not found|policy/i.test(uploadError.message || '') ? 'Execute a migração da área do autor no Supabase antes de enviar artigos.' : 'Não foi possível enviar o PDF. Tente novamente.';
    button.disabled = false; button.textContent = 'Enviar artigo'; return;
  }
  const record = {
    id: submissionId, user_id: currentUser.id,
    event_name: document.querySelector('#submission-event').value,
    title: document.querySelector('#submission-title').value.trim(),
    track: document.querySelector('#submission-track').value,
    abstract, original_file_path: storagePath, original_file_name: file.name, status: 'submitted'
  };
  const { error: insertError } = await supabaseClient.from('submissions').insert(record);
  if (insertError) {
    await supabaseClient.storage.from('article-files').remove([storagePath]);
    errorPanel.textContent = 'Não foi possível registrar a submissão. Execute a migração indicada e tente novamente.';
    button.disabled = false; button.textContent = 'Enviar artigo'; return;
  }
  if (coauthors.length) {
    const { error: coauthorError } = await supabaseClient.from('coauthors').insert(coauthors.map((coauthor) => ({ ...coauthor, submission_id: submissionId, owner_id: currentUser.id })));
    if (coauthorError) showToast('Artigo enviado, mas não foi possível salvar todos os coautores.');
  }
  button.disabled = false; button.textContent = 'Enviar artigo'; submissionDialog.close();
  showToast('Artigo submetido com sucesso.'); await loadSubmissions(); updateIdentity(); renderOverview(); switchTab('submissions');
}

function openFinalVersion(submission) {
  selectedSubmission = submission;
  document.querySelector('#final-version-form').reset();
  document.querySelector('#final-version-error').textContent = '';
  finalVersionDialog.showModal();
}

async function submitFinalVersion(event) {
  event.preventDefault();
  const file = document.querySelector('#final-version-file').files[0];
  const errorPanel = document.querySelector('#final-version-error');
  if (!validPdf(file)) { errorPanel.textContent = 'Selecione um arquivo PDF de até 10 MB.'; return; }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Enviando…';
  const storagePath = `${currentUser.id}/${selectedSubmission.id}/final.pdf`;
  const { error: uploadError } = await supabaseClient.storage.from('article-files').upload(storagePath, file, { contentType: 'application/pdf', upsert: true });
  if (uploadError) { errorPanel.textContent = 'Não foi possível enviar a versão final.'; button.disabled = false; button.textContent = 'Enviar versão final'; return; }
  const { error } = await supabaseClient.rpc('submit_final_version', { p_submission_id: selectedSubmission.id, p_file_path: storagePath, p_file_name: file.name });
  button.disabled = false; button.textContent = 'Enviar versão final';
  if (error) { errorPanel.textContent = 'O arquivo foi enviado, mas não foi possível atualizar a submissão.'; return; }
  finalVersionDialog.close(); selectedSubmission = null; showToast('Versão final enviada com sucesso.'); await loadSubmissions(); renderOverview();
}

async function saveProfile(event) {
  event.preventDefault();
  const name = document.querySelector('#profile-full-name').value.trim().replace(/\s+/g, ' ');
  const errorPanel = document.querySelector('#profile-error');
  if (name.length < 3) { errorPanel.textContent = 'Informe seu nome completo.'; return; }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Salvando…'; errorPanel.textContent = '';
  const updates = { full_name: name, institution: document.querySelector('#profile-institution').value.trim(), bio: document.querySelector('#profile-bio').value.trim(), updated_at: new Date().toISOString() };
  const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
  button.disabled = false; button.textContent = 'Salvar alterações';
  if (error) { errorPanel.textContent = 'Não foi possível salvar. Execute a migração da área do autor no Supabase.'; return; }
  currentProfile = { ...currentProfile, ...updates }; updateIdentity(); showToast('Perfil atualizado com sucesso.');
}

async function showAuthenticatedArea(user) {
  currentUser = user; authRequired.hidden = true; dashboardContent.hidden = false;
  await loadProfile(); updateIdentity();
  await Promise.all([loadRegistrations(), loadSubmissions()]);
  updateIdentity();
  document.querySelectorAll('.dashboard-loading-shared').forEach((item) => { item.hidden = true; });
  renderOverview();
  switchTab(location.hash.slice(1) || 'overview', false);
}

function showSignedOutArea() {
  currentUser = null; currentProfile = null; dashboardContent.hidden = true; authRequired.hidden = false;
}

document.querySelector('.menu-toggle').addEventListener('click', () => {
  const nav = document.querySelector('#main-nav'); const open = nav.classList.toggle('open');
  document.querySelector('.menu-toggle').setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('[data-dashboard-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.dashboardTab)));
document.querySelectorAll('[data-go-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.goTab)));
document.querySelector('#dashboard-session-link').addEventListener('click', (event) => { event.preventDefault(); switchTab('profile'); });
document.querySelector('#dashboard-logout').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) return showToast('Não foi possível sair agora. Tente novamente.');
  window.location.href = './index.html';
});
document.querySelector('#confirm-cancel-registration').addEventListener('click', cancelRegistration);
document.querySelectorAll('[data-close-cancel]').forEach((button) => button.addEventListener('click', () => cancelDialog.close()));
document.querySelector('#new-submission').addEventListener('click', openSubmission);
document.querySelectorAll('[data-open-submission]').forEach((button) => button.addEventListener('click', openSubmission));
document.querySelectorAll('[data-close-submission]').forEach((button) => button.addEventListener('click', () => submissionDialog.close()));
document.querySelector('#add-coauthor').addEventListener('click', () => addCoauthorRow());
document.querySelector('#submission-form').addEventListener('submit', submitArticle);
document.querySelectorAll('[data-close-final]').forEach((button) => button.addEventListener('click', () => finalVersionDialog.close()));
document.querySelector('#final-version-form').addEventListener('submit', submitFinalVersion);
document.querySelectorAll('[data-close-document]').forEach((button) => button.addEventListener('click', () => documentDialog.close()));
document.querySelector('#print-document').addEventListener('click', () => window.print());
document.querySelector('#profile-form').addEventListener('submit', saveProfile);

[cancelDialog, submissionDialog, finalVersionDialog, documentDialog].forEach((dialog) => dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) dialog.close();
}));

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session?.user) showSignedOutArea();
});

async function initializeDashboard() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user) return showSignedOutArea();
  await showAuthenticatedArea(session.user);
}

initializeDashboard();

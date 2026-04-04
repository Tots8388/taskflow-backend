const API = 'https://taskflow-backend-production-5345.up.railway.app/api';

// ── STATE ──────────────────────────────────────────────────
let token = localStorage.getItem('tf_token') || null;
let tasks = [], categories = [], allTasks = [];
let currentFilter = 'all', currentPage = 1, totalPages = 1;
let editingTaskId = null, editingCatId = null;
let chartPriority = null, chartCategory = null;
let authMode = 'login';

// ── UTILS ──────────────────────────────────────────────────
const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => t.className = 'toast', 2800);
}

function sync(state) {
  document.getElementById('sync-dot').className = 'sync-dot ' + state;
}

// ── API HELPER ─────────────────────────────────────────────
async function api(method, path, body = null, isFormData = false) {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : null
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = typeof data === 'object'
      ? Object.values(data).flat().join(' ')
      : 'Request failed';
    throw new Error(msg);
  }
  return data;
}

// ── AUTH ───────────────────────────────────────────────────
function switchAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0 && mode === 'login') || (i === 1 && mode === 'signup'))
  );
  document.getElementById('auth-btn').textContent = mode === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('email-field').style.display = mode === 'signup' ? 'flex' : 'none';
  document.getElementById('auth-error').textContent = '';
}

async function authSubmit() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const email = document.getElementById('auth-email').value.trim();
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-btn');

  if (!username || !password) { errEl.textContent = 'Please fill in all fields.'; return; }
  btn.disabled = true;
  btn.textContent = authMode === 'login' ? 'Signing in...' : 'Creating account...';
  errEl.textContent = '';

  try {
    if (authMode === 'signup') {
      await api('POST', '/register/', { username, email, password });
      toast('Account created! Signing you in...', 'ok');
    }
    const data = await api('POST', '/token/', { username, password });
    token = data.access;
    localStorage.setItem('tf_token', token);
    bootApp(username);
  } catch (e) {
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
  }
}

function logout() {
  token = null;
  localStorage.removeItem('tf_token');
  tasks = []; categories = []; allTasks = [];
  document.getElementById('app').classList.remove('visible');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
}

// ── BOOT ───────────────────────────────────────────────────
async function bootApp(username) {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  document.getElementById('user-badge').textContent = username;
  await Promise.all([fetchCategories(), fetchAllTasks()]);
  fetchTasks();
  fetchProfile();
}

// Check for existing token on load
if (token) {
  // Verify token is still valid by fetching profile
  api('GET', '/profile/')
    .then(data => bootApp(data.username))
    .catch(() => {
      localStorage.removeItem('tf_token');
      token = null;
    });
}

// ── FETCH ALL TASKS (for dashboard counts) ─────────────────
async function fetchAllTasks() {
  try {
    const data = await api('GET', '/tasks/?page_size=100');
    allTasks = data.results || data;
  } catch (e) {
    allTasks = [];
  }
}

// ── FETCH TASKS (paginated) ────────────────────────────────
async function fetchTasks() {
  sync('syncing');
  const ordering = document.getElementById('sort-select').value;

  let params = `?page=${currentPage}&ordering=${ordering}`;
  if (currentFilter === 'pending') params += '&done=false';
  else if (currentFilter === 'done') params += '&done=true';
  else if (currentFilter === 'high') params += '&priority=high';
  else if (currentFilter === 'medium') params += '&priority=medium';
  else if (currentFilter === 'low') params += '&priority=low';
  else if (currentFilter === 'overdue') params += '&done=false';
  else if (!['all'].includes(currentFilter)) params += `&category=${currentFilter}`;

  try {
    const data = await api('GET', `/tasks/${params}`);
    tasks = data.results || data;
    totalPages = data.count ? Math.ceil(data.count / 10) : 1;

    // client-side overdue filter (API doesn't have this field)
    if (currentFilter === 'overdue') {
      tasks = tasks.filter(isOverdue);
    }

    // fetch all for counts/dashboard
    await fetchAllTasks();
    sync('synced');
    renderTasks();
    renderCounts();
    renderPagination(data.count);
  } catch (e) {
    sync('error');
    toast(e.message, 'err');
  }
}

// ── FETCH CATEGORIES ───────────────────────────────────────
async function fetchCategories() {
  try {
    const data = await api('GET', '/categories/');
    categories = data.results || data;
    renderCategorySelects();
    renderCategoryFilters();
    renderCategoriesView();
  } catch (e) {
    toast('Failed to load categories', 'err');
  }
}

// ── ADD TASK ───────────────────────────────────────────────
async function addTask() {
  const name = document.getElementById('task-input').value.trim();
  if (!name) return;
  const btn = document.getElementById('add-btn');
  btn.disabled = true; btn.textContent = '...';
  sync('syncing');

  const catId = document.getElementById('cat-select').value;
  const due = document.getElementById('due-input').value;

  try {
    await api('POST', '/tasks/', {
      name,
      priority: document.getElementById('priority-select').value,
      category: catId ? parseInt(catId) : null,
      due: due || null,
      done: false
    });
    document.getElementById('task-input').value = '';
    document.getElementById('due-input').value = '';
    sync('synced');
    toast('Task added ✓', 'ok');
    currentPage = 1;
    fetchTasks();
  } catch (e) {
    sync('error');
    toast(e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '+ Add';
  }
}

// ── TOGGLE DONE ────────────────────────────────────────────
async function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  try {
    await api('PATCH', `/tasks/${id}/`, { done: !t.done });
    fetchTasks();
  } catch (e) {
    toast('Update failed', 'err');
  }
}

// ── DELETE TASK ────────────────────────────────────────────
async function deleteTask(id) {
  try {
    await api('DELETE', `/tasks/${id}/`);
    toast('Deleted');
    fetchTasks();
  } catch (e) {
    toast('Delete failed', 'err');
  }
}

// ── EDIT MODAL ─────────────────────────────────────────────
function openEditModal(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('edit-name').value = t.name;
  document.getElementById('edit-priority').value = t.priority;
  document.getElementById('edit-due').value = t.due || '';
  renderCategorySelects();
  document.getElementById('edit-category').value = t.category || '';
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  editingTaskId = null;
  document.getElementById('edit-modal').classList.add('hidden');
}

async function saveEdit() {
  const name = document.getElementById('edit-name').value.trim();
  if (!name || !editingTaskId) return;
  const btn = document.getElementById('edit-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const catVal = document.getElementById('edit-category').value;

  try {
    await api('PATCH', `/tasks/${editingTaskId}/`, {
      name,
      priority: document.getElementById('edit-priority').value,
      category: catVal ? parseInt(catVal) : null,
      due: document.getElementById('edit-due').value || null
    });
    closeEditModal();
    toast('Task updated ✓', 'ok');
    fetchTasks();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── CATEGORY MODAL ─────────────────────────────────────────
function openCatModal(id = null) {
  editingCatId = id;
  const cat = id ? categories.find(c => c.id === id) : null;
  document.getElementById('cat-modal-title').textContent = id ? 'Edit Category' : 'New Category';
  document.getElementById('cat-name').value = cat?.name || '';
  document.getElementById('cat-color').value = cat?.color || '#8b6fd4';
  document.getElementById('cat-save-btn').textContent = id ? 'Save Changes' : 'Create';
  document.getElementById('cat-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('cat-name').focus(), 50);
}

function closeCatModal() {
  editingCatId = null;
  document.getElementById('cat-modal').classList.add('hidden');
}

async function saveCat() {
  const name = document.getElementById('cat-name').value.trim();
  if (!name) return;
  const btn = document.getElementById('cat-save-btn');
  btn.disabled = true;

  try {
    if (editingCatId) {
      await api('PATCH', `/categories/${editingCatId}/`, {
        name, color: document.getElementById('cat-color').value
      });
      toast('Category updated ✓', 'ok');
    } else {
      await api('POST', '/categories/', {
        name, color: document.getElementById('cat-color').value
      });
      toast('Category created ✓', 'ok');
    }
    closeCatModal();
    await fetchCategories();
    fetchTasks();
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

async function deleteCat(id) {
  try {
    await api('DELETE', `/categories/${id}/`);
    toast('Category deleted');
    await fetchCategories();
    fetchTasks();
  } catch (e) {
    toast('Delete failed', 'err');
  }
}

// ── PROFILE ────────────────────────────────────────────────
async function fetchProfile() {
  try {
    const data = await api('GET', '/profile/');
    document.getElementById('profile-username').textContent = data.username;
    document.getElementById('profile-email').textContent = data.email || '—';
    document.getElementById('profile-bio').value = data.bio || '';
    document.getElementById('user-badge').textContent = data.username;

    const avatarEl = document.getElementById('profile-avatar');
    const placeholder = document.getElementById('avatar-placeholder');
    if (data.avatar_url) {
      avatarEl.src = data.avatar_url;
      avatarEl.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      avatarEl.style.display = 'none';
      placeholder.style.display = 'flex';
      placeholder.textContent = (data.username || '?')[0].toUpperCase();
    }
  } catch (e) {
    // token may have expired
  }
}

async function saveBio() {
  const bio = document.getElementById('profile-bio').value;
  try {
    await api('PATCH', '/profile/', { bio });
    toast('Bio saved ✓', 'ok');
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function uploadAvatar(input) {
  if (!input.files[0]) return;
  const form = new FormData();
  form.append('avatar', input.files[0]);
  try {
    await api('PATCH', '/profile/', form, true);
    toast('Avatar updated ✓', 'ok');
    fetchProfile();
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function changePassword() {
  const old_password = document.getElementById('old-password').value;
  const new_password = document.getElementById('new-password').value;
  const errEl = document.getElementById('pw-error');
  errEl.textContent = '';

  if (!old_password || !new_password) { errEl.textContent = 'Please fill in both fields.'; return; }

  try {
    await api('POST', '/change-password/', { old_password, new_password });
    toast('Password updated ✓', 'ok');
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
  } catch (e) {
    errEl.textContent = e.message;
  }
}

// ── FILTER ─────────────────────────────────────────────────
function setFilter(f, btn) {
  currentFilter = f;
  currentPage = 1;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fetchTasks();
}

function isOverdue(t) {
  if (!t.due || t.done) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(t.due + 'T00:00:00') < today;
}

function dueLabel(due) {
  if (!due) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { text: 'Overdue', cls: 'overdue' };
  if (diff === 0) return { text: 'Today', cls: 'soon' };
  if (diff === 1) return { text: 'Tomorrow', cls: 'soon' };
  return { text: due, cls: '' };
}

// ── RENDER TASKS ───────────────────────────────────────────
function renderTasks() {
  const titles = { all: 'All Tasks', pending: 'Pending', done: 'Completed', overdue: 'Overdue', high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
  const cat = categories.find(c => c.id === parseInt(currentFilter));
  document.getElementById('view-title').textContent = cat ? cat.name : (titles[currentFilter] || 'Tasks');

  const list = document.getElementById('task-list');
  if (!tasks.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">✦</div><p>No tasks here.</p></div>`;
    return;
  }

  list.innerHTML = tasks.map(t => {
    const cat = categories.find(c => c.id === t.category);
    const dl = dueLabel(t.due);
    return `<div class="task-card ${t.done ? 'done' : ''}" data-priority="${t.priority}">
      <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleDone(${t.id})">${t.done ? '✓' : ''}</div>
      <div class="task-info">
        <div class="task-name">${esc(t.name)}</div>
        <div class="task-meta">
          <span class="tag p-tag">${t.priority}</span>
          ${cat ? `<span class="tag c-tag" style="background:${cat.color}22;color:${cat.color}">${esc(cat.name)}</span>` : ''}
          ${dl ? `<span class="due-tag ${dl.cls}">◷ ${dl.text}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="act-btn edit" onclick="openEditModal(${t.id})" title="Edit">✎</button>
        <button class="act-btn del" onclick="deleteTask(${t.id})" title="Delete">✕</button>
      </div>
    </div>`;
  }).join('');
}

// ── RENDER COUNTS ──────────────────────────────────────────
function renderCounts() {
  const overdue = allTasks.filter(isOverdue).length;
  const counts = {
    all: allTasks.length,
    pending: allTasks.filter(t => !t.done).length,
    done: allTasks.filter(t => t.done).length,
    overdue,
    high: allTasks.filter(t => t.priority === 'high').length,
    medium: allTasks.filter(t => t.priority === 'medium').length,
    low: allTasks.filter(t => t.priority === 'low').length,
  };
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById('cnt-' + k);
    if (el) el.textContent = v;
  });
}

// ── RENDER PAGINATION ──────────────────────────────────────
function renderPagination(count) {
  const bar = document.getElementById('pagination-bar');
  const info = document.getElementById('pagination-info');
  if (!count || totalPages <= 1) { bar.innerHTML = ''; info.textContent = `${count || 0} tasks`; return; }

  info.textContent = `${count} tasks`;
  let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>`;
  bar.innerHTML = html;
}

function goPage(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  fetchTasks();
}

// ── RENDER CATEGORY SELECTS ────────────────────────────────
function renderCategorySelects() {
  const opts = categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  document.getElementById('cat-select').innerHTML = '<option value="">No category</option>' + opts;
  document.getElementById('edit-category').innerHTML = '<option value="">No category</option>' + opts;
}

// ── RENDER CATEGORY FILTERS ────────────────────────────────
function renderCategoryFilters() {
  document.getElementById('cat-filters').innerHTML = categories.map(c => {
    const cnt = allTasks.filter(t => t.category === c.id).length;
    const isActive = currentFilter === String(c.id);
    return `<button class="filter-btn ${isActive ? 'active' : ''}" onclick="setFilter('${c.id}', this)">
      <span class="filter-dot" style="background:${c.color}"></span> ${esc(c.name)}
      <span class="filter-count">${cnt}</span>
    </button>`;
  }).join('');
}

// ── RENDER CATEGORIES VIEW ─────────────────────────────────
function renderCategoriesView() {
  const grid = document.getElementById('cat-grid');
  if (!categories.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:span 3"><div class="empty-icon">◈</div><p>No categories yet.</p></div>`;
    return;
  }
  grid.innerHTML = categories.map(c => {
    const cnt = allTasks.filter(t => t.category === c.id).length;
    return `<div class="cat-card">
      <div class="cat-card-top">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="cat-color-dot" style="background:${c.color}"></div>
          <div class="cat-name">${esc(c.name)}</div>
        </div>
        <div class="cat-actions">
          <button class="act-btn edit" onclick="openCatModal(${c.id})" title="Edit">✎</button>
          <button class="act-btn del" onclick="deleteCat(${c.id})" title="Delete">✕</button>
        </div>
      </div>
      <div class="cat-task-count">${cnt} task${cnt !== 1 ? 's' : ''}</div>
    </div>`;
  }).join('');
}

// ── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  const total = allTasks.length;
  const done = allTasks.filter(t => t.done).length;
  const pending = allTasks.filter(t => !t.done).length;
  const overdue = allTasks.filter(isOverdue).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  document.getElementById('d-total').textContent = total;
  document.getElementById('d-done').textContent = done;
  document.getElementById('d-pending').textContent = pending;
  document.getElementById('d-overdue').textContent = overdue;
  document.getElementById('d-pct').textContent = pct + '% rate';

  if (chartPriority) chartPriority.destroy();
  chartPriority = new Chart(document.getElementById('chart-priority'), {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: [
          allTasks.filter(t => t.priority === 'high').length,
          allTasks.filter(t => t.priority === 'medium').length,
          allTasks.filter(t => t.priority === 'low').length
        ],
        backgroundColor: ['#ff5a5a', '#ffaa44', '#4cde90'],
        borderWidth: 0, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#5e5e78', font: { family: 'DM Mono', size: 11 }, boxWidth: 12 } } }
    }
  });

  const catCounts = categories.map(c => ({
    name: c.name, color: c.color,
    count: allTasks.filter(t => t.category === c.id).length
  })).filter(c => c.count > 0);

  if (chartCategory) chartCategory.destroy();
  chartCategory = new Chart(document.getElementById('chart-category'), {
    type: 'bar',
    data: {
      labels: catCounts.map(c => c.name),
      datasets: [{
        data: catCounts.map(c => c.count),
        backgroundColor: catCounts.map(c => c.color + '99'),
        borderColor: catCounts.map(c => c.color),
        borderWidth: 1, borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#5e5e78', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#2a2a38' } },
        y: { ticks: { color: '#5e5e78', font: { family: 'DM Mono', size: 10 }, stepSize: 1 }, grid: { color: '#2a2a38' } }
      }
    }
  });
}

// ── VIEWS ──────────────────────────────────────────────────
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  btn.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'categories') renderCategoriesView();
  if (name === 'profile') fetchProfile();
}

// close modals on overlay click
document.getElementById('edit-modal').addEventListener('click', function(e) { if (e.target === this) closeEditModal(); });
document.getElementById('cat-modal').addEventListener('click', function(e) { if (e.target === this) closeCatModal(); });

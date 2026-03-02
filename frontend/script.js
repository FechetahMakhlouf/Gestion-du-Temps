// Auth
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
    document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
}

function showMsg(el, msg, type) {
    el.innerHTML = `<div class="auth-msg ${type}">${msg}</div>`;
}
async function doLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pwd = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-msg');
    if (!email || !pwd) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }
    try {
        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pwd })
        });
        showMsg(msgEl, 'Connexion réussie', 'success');
        setTimeout(startApp, 500);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pwd = document.getElementById('reg-password').value;
    const msgEl = document.getElementById('reg-msg');
    if (!name || !email || !pwd) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }
    if (pwd.length < 6) { showMsg(msgEl, 'Mot de passe trop court (min 6 chars).', 'error'); return; }
    try {
        const data = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password: pwd })
        });
        showMsg(msgEl, 'Compte créé ! Connexion...', 'success');
        setTimeout(startApp, 800);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function doLogout() {
    await apiCall('/api/auth/logout', { method: 'POST' }).catch(() => { });
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    toast('À bientôt !', 'info');
}

async function startApp() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'block';
    const user = await apiCall('/api/auth/me');
    document.getElementById('sidebar-username').textContent = user.name;
    buildColorGrid();
    renderAll();
}
// Navigation
function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(name)) n.classList.add('active');
    });
    if (name === 'schedule') renderScheduleGrid();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Subjects
let selectedColor = '#1d4ed8';
const COLORS = [
    '#1d4ed8', '#2563eb', '#7c3aed', '#9333ea', '#db2777', '#e11d48',
    '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a',
    '#059669', '#0d9488', '#0891b2', '#0369a1', '#4338ca', '#6d28d9',
    '#be185d', '#9f1239', '#b45309', '#78350f', '#15803d', '#155e75',
];

function buildColorGrid() {
    const grid = document.getElementById('color-grid');
    grid.innerHTML = COLORS.map(c => `
        <div class="color-swatch ${c === selectedColor ? 'selected' : ''}" 
             style="background:${c}" 
             onclick="pickColor('${c}',this)"></div>
    `).join('');
}

function pickColor(c, el) {
    selectedColor = c;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
}

function openSubjectModal(id) {
    const modal = document.getElementById('subject-modal');
    document.getElementById('subj-edit-id').value = id || '';
    document.getElementById('subj-msg').innerHTML = '';
    if (id) {
        loadSubjectsForEdit(id);
    } else {
        document.getElementById('subject-modal-title').textContent = 'Ajouter une matière';
        document.getElementById('subj-name').value = '';
        document.getElementById('subj-type').value = 'Cours';
        selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        buildColorGrid();
    }
    modal.classList.add('open');
}

async function loadSubjectsForEdit(id) {
    const subjects = await apiCall('/api/subjects');
    const subj = subjects.find(s => s.id === id);
    if (!subj) return;
    document.getElementById('subject-modal-title').textContent = 'Modifier la matière';
    document.getElementById('subj-name').value = subj.name;
    document.getElementById('subj-type').value = subj.type;
    selectedColor = subj.color;
    buildColorGrid();
}

async function saveSubject() {
    const name = document.getElementById('subj-name').value.trim();
    const type = document.getElementById('subj-type').value;
    const id = document.getElementById('subj-edit-id').value;
    const msgEl = document.getElementById('subj-msg');
    if (!name) { showMsg(msgEl, 'Le nom est requis.', 'error'); return; }

    const payload = { name, type, color: selectedColor };
    try {
        if (id) {
            await apiCall(`/api/subjects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            await apiCall('/api/subjects', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        closeModal('subject-modal');
        await renderAll();
        toast(id ? 'Matière modifiée ✓' : 'Matière ajoutée ✓', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function deleteSubject(id) {
    if (!confirm('Supprimer cette matière ? Les créneaux assignés seront aussi effacés.')) return;
    try {
        await apiCall(`/api/subjects/${id}`, { method: 'DELETE' });
        await renderAll();
        toast('Matière supprimée', 'info');
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function renderSubjectsPanel() {
    const subjects = await apiCall('/api/subjects');
    const sched = await apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`);

    // Stats
    const statsEl = document.getElementById('subj-stats');
    const usedSet = new Set(Object.values(sched));
    statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-num">${subjects.length}</div><div class="stat-label">Matières</div></div>
        <div class="stat-card"><div class="stat-num">${usedSet.size}</div><div class="stat-label">Utilisées</div></div>
        <div class="stat-card"><div class="stat-num">${Object.keys(sched).length}</div><div class="stat-label">Créneaux assignés</div></div>
    `;

    const grid = document.getElementById('subjects-grid');
    if (!subjects.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">📚</div>
            <div class="empty-title">Aucune matière</div>
            <div class="empty-sub">Cliquez sur "Ajouter une matière" pour commencer</div>
        </div>`;
        return;
    }
    // count occurrences in schedule for this week
    const countMap = {};
    Object.values(sched).forEach(id => countMap[id] = (countMap[id] || 0) + 1);
    grid.innerHTML = subjects.map(s => `
        <div class="subject-card" style="border-left-color:${s.color}">
            <div class="subject-card-header">
                <div class="subject-card-name" style="color:${s.color}">${s.name}</div>
                <div class="subject-card-actions">
                    <button class="icon-btn" onclick="openSubjectModal('${s.id}')" title="Modifier">✏</button>
                    <button class="icon-btn danger" onclick="deleteSubject('${s.id}')" title="Supprimer">🗑</button>
                </div>
            </div>
            <div class="subject-card-meta">
                <span class="meta-badge">${s.type}</span>
                <span class="meta-badge">${countMap[s.id] || 0} créneaux</span>
            </div>
        </div>
    `).join('');
}
let currentWeekOffset = 0;
let selectedSubjectId = null;
let interactionMode = 'click';
let currentActiveDays = [];

/* ══════════════════════════════════════════════
   UTILS — Loading states, password toggle
══════════════════════════════════════════════ */

function setLoading(btnId, isLoading) {
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn._origText = btn.innerHTML;
        btn.innerHTML = '<span class="btn-spinner"></span>';
    } else {
        btn.disabled = false;
        btn.innerHTML = btn._origText || btn.innerHTML;
    }
}

function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.classList.toggle('active', isPassword);
    // Swap eye / eye-off icon
    btn.innerHTML = isPassword
        ? `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
               <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
               <circle cx="12" cy="12" r="3"/>
           </svg>`;
}

function showLoader() {
    const l = document.getElementById('app-loader');
    if (l) l.classList.add('visible');
}
function hideLoader() {
    const l = document.getElementById('app-loader');
    if (l) l.classList.remove('visible');
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((t, i) => {
        const isActive = (i === 0 && tab === 'login') || (i === 1 && tab === 'register');
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive);
    });
    document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
    // Auto-focus first field
    requestAnimationFrame(() => {
        const first = document.querySelector(`#${tab === 'login' ? 'login-email' : 'reg-name'}`);
        if (first) first.focus();
    });
}

function showMsg(el, msg, type) {
    el.innerHTML = `<div class="auth-msg ${type}">${msg}</div>`;
}

async function doLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pwd = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-msg');
    if (!email || !pwd) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }

    setLoading('login-submit', true);
    try {
        await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pwd })
        });
        showMsg(msgEl, 'Connexion réussie', 'success');
        setTimeout(() => { msgEl.innerHTML = ''; }, 2000);
        setTimeout(() => {
            startApp();
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        }, 500);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
        setLoading('login-submit', false);
    }
}

async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pwd = document.getElementById('reg-password').value;
    const confirmPwd = document.getElementById('reg-confirm-password').value;
    const msgEl = document.getElementById('reg-msg');

    if (!name || !email || !pwd || !confirmPwd) {
        showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return;
    }
    if (pwd.length < 6) {
        showMsg(msgEl, 'Mot de passe trop court (min 6 caractères).', 'error'); return;
    }
    if (pwd !== confirmPwd) {
        showMsg(msgEl, 'Les mots de passe ne correspondent pas.', 'error'); return;
    }

    setLoading('reg-submit', true);
    try {
        await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password: pwd })
        });

        showMsg(msgEl, 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success');
        setTimeout(() => { msgEl.innerHTML = ''; }, 2000);

        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-confirm-password').value = '';

        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('login-msg').innerHTML = '';
            setLoading('reg-submit', false);
        }, 1500);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
        setLoading('reg-submit', false);
    }
}

function confirmLogout() {
    document.getElementById('logout-modal').classList.add('open');
}

async function doLogout() {
    closeModal('logout-modal');
    await apiCall('/api/auth/logout', { method: 'POST' }).catch(() => { });
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    toast('À bientôt !', 'info');
}

async function startApp() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'block';
    setLoading('login-submit', false);
    const user = await apiCall('/api/auth/me');

    // Sidebar: username + initials avatar + date
    document.getElementById('sidebar-username').textContent = user.name;
    const initials = user.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initials;
    const now = new Date();
    document.getElementById('sidebar-date').textContent = now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

    buildColorGrid();
    renderAll();
}

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */

function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(name)) n.classList.add('active');
    });
    if (name === 'schedule') renderScheduleGrid();
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

/* ══════════════════════════════════════════════
   SUBJECTS
══════════════════════════════════════════════ */

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
             role="option"
             aria-label="Couleur ${c}"
             aria-selected="${c === selectedColor}"
             style="background:${c}"
             onclick="pickColor('${c}',this)"
             tabindex="0"
             onkeydown="if(event.key==='Enter'||event.key===' ')pickColor('${c}',this)"></div>
    `).join('');
}

function pickColor(c, el) {
    selectedColor = c;
    document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.remove('selected');
        s.setAttribute('aria-selected', 'false');
    });
    el.classList.add('selected');
    el.setAttribute('aria-selected', 'true');
}

function openSubjectModal(id) {
    const modal = document.getElementById('subject-modal');
    document.getElementById('subj-edit-id').value = id || '';
    document.getElementById('subj-msg').innerHTML = '';
    if (id) {
        loadSubjectsForEdit(id);
    } else {
        document.getElementById('subject-modal-title').textContent = 'Ajouter une tâche';
        document.getElementById('subj-name').value = '';
        document.getElementById('subj-type').value = 'Normal';
        selectedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        buildColorGrid();
    }
    modal.classList.add('open');
    requestAnimationFrame(() => document.getElementById('subj-name').focus());
}

async function loadSubjectsForEdit(id) {
    const subjects = await apiCall('/api/subjects');
    const subj = subjects.find(s => s.id === id);
    if (!subj) return;
    document.getElementById('subject-modal-title').textContent = 'Modifier la tâche';
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
    setLoading('subj-save', true);
    try {
        if (id) {
            await apiCall(`/api/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            await apiCall('/api/subjects', { method: 'POST', body: JSON.stringify(payload) });
        }
        closeModal('subject-modal');
        await renderAll();
        toast(id ? 'Tâche modifiée ✓' : 'Tâche ajoutée ✓', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    } finally {
        setLoading('subj-save', false);
    }
}

async function deleteSubject(id) {
    if (!confirm('Supprimer cette tâche ? Les créneaux assignés seront aussi effacés.')) return;
    try {
        await apiCall(`/api/subjects/${id}`, { method: 'DELETE' });
        await renderAll();
        toast('Tâche supprimée', 'info');
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function renderSubjectsPanel() {
    const [subjects, sched] = await Promise.all([
        apiCall('/api/subjects'),
        apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`)
    ]);

    // Stats
    const statsEl = document.getElementById('subj-stats');
    const usedSet = new Set(Object.values(sched));
    const assignedCount = Object.keys(sched).length;
    const usageRate = subjects.length ? Math.round((usedSet.size / subjects.length) * 100) : 0;
    statsEl.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
            <div class="stat-num">${subjects.length}</div>
            <div class="stat-label">Tâches</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="stat-num">${usedSet.size}</div>
            <div class="stat-label">Utilisées</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
            <div class="stat-num">${assignedCount}</div>
            <div class="stat-label">Créneaux assignés</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div class="stat-num">${usageRate}<span style="font-size:1rem;font-weight:400">%</span></div>
            <div class="stat-label">Taux d'utilisation</div>
        </div>
    `;

    const grid = document.getElementById('subjects-grid');
    if (!subjects.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">📚</div>
            <div class="empty-title">Aucune tâche</div>
            <div class="empty-sub">Cliquez sur "Ajouter une tâche" pour commencer</div>
        </div>`;
        return;
    }
    const countMap = {};
    Object.values(sched).forEach(id => countMap[id] = (countMap[id] || 0) + 1);
    const maxCount = Math.max(1, ...Object.values(countMap));
    grid.innerHTML = subjects.map(s => {
        const cnt = countMap[s.id] || 0;
        const pct = Math.round((cnt / maxCount) * 100);
        return `
        <div class="subject-card" style="border-left-color:${s.color}">
            <div class="subject-card-header">
                <div class="subject-card-name" style="color:${s.color}">${s.name}</div>
                <div class="subject-card-actions">
                    <button class="icon-btn" onclick="openSubjectModal('${s.id}')" aria-label="Modifier ${s.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteSubject('${s.id}')" aria-label="Supprimer ${s.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="subject-card-meta">
                <span class="meta-badge">${s.type}</span>
                <span class="meta-badge">${cnt} créneau${cnt !== 1 ? 'x' : ''}</span>
            </div>
            ${cnt > 0 ? `<div class="subject-usage-bar" aria-label="${pct}% d'utilisation"><div class="subject-usage-fill" style="width:${pct}%;background:${s.color}"></div></div>` : ''}
        </div>
    `}).join('');
}

/* ══════════════════════════════════════════════
   PALETTE
══════════════════════════════════════════════ */

async function renderPalette() {
    const subjects = await apiCall('/api/subjects');
    const el = document.getElementById('palette-chips');
    const cellChips = document.getElementById('cell-modal-chips');
    if (!subjects.length) {
        el.innerHTML = `<span style="font-size:0.78rem;color:var(--text-muted)">Aucune tâche — allez dans "Mes Tâches" pour en ajouter</span>`;
        if (cellChips) cellChips.innerHTML = '';
        return;
    }
    const chipHtml = (forModal) => subjects.map(s => `
        <div class="subject-chip ${!forModal && s.id === selectedSubjectId ? 'selected' : ''}"
             style="background:${hexAlpha(s.color, 0.18)};color:${s.color};border-left-color:${s.color}"
             draggable="true"
             role="button"
             tabindex="0"
             aria-label="${s.name}"
             ondragstart="onChipDragStart(event,'${s.id}')"
             onkeydown="if(event.key==='Enter'||event.key===' ')${forModal ? `assignFromModal('${s.id}')` : `selectSubject('${s.id}', this)`}"
             onclick="${forModal ? `assignFromModal('${s.id}')` : `selectSubject('${s.id}', this)`}">
            ${s.name}
        </div>
    `).join('');
    el.innerHTML = chipHtml(false);
    if (cellChips) cellChips.innerHTML = chipHtml(true);
}

function selectSubject(id, el) {
    if (selectedSubjectId === id) {
        selectedSubjectId = null;
        document.querySelectorAll('.subject-chip').forEach(c => c.classList.remove('selected'));
    } else {
        selectedSubjectId = id;
        document.querySelectorAll('#palette-chips .subject-chip').forEach(c => c.classList.remove('selected'));
        el && el.classList.add('selected');
    }
}

function setMode(mode) {
    interactionMode = mode;
    document.getElementById('mode-click').classList.toggle('active', mode === 'click');
    document.getElementById('mode-drag').classList.toggle('active', mode === 'drag');
}

/* ══════════════════════════════════════════════
   SCHEDULE GRID — Day-Card Timeline Layout
══════════════════════════════════════════════ */

const ALL_DAYS_MAP = { 'Dim': 0, 'Lun': 1, 'Mar': 2, 'Mer': 3, 'Jeu': 4, 'Ven': 5, 'Sam': 6 };

function getWeekDays() {
    const days = window.currentActiveDays || ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const today = new Date();
    today.setDate(today.getDate() + currentWeekOffset * 7);
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    return days.map(dayAbbr => {
        const dayIdx = ALL_DAYS_MAP[dayAbbr] || 1;
        const d = new Date(monday);
        d.setDate(monday.getDate() + (dayIdx - 1));
        return { abbr: dayAbbr, date: d, dateStr: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) };
    });
}

function renderScheduleLegend(subjects) {
    const el = document.getElementById('schedule-legend');
    if (!subjects.length) { el.innerHTML = ''; return; }
    el.innerHTML = subjects.map(s => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${s.color}"></div>
            ${s.name}
        </div>
    `).join('');
}

async function renderScheduleGrid() {
    const [timeslots, subjects, sched] = await Promise.all([
        apiCall('/api/timeslots'),
        apiCall('/api/subjects'),
        apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`)
    ]);
    const weekDays = getWeekDays();

    if (weekDays.length) {
        const first = weekDays[0].dateStr;
        const last = weekDays[weekDays.length - 1].dateStr;
        document.getElementById('week-label').textContent = `${first} – ${last}`;
    }

    // Fill progress bar
    // Total slots = sum of timeslots active per day
    const totalSlots = weekDays.reduce((acc, dayObj) => {
        return acc + timeslots.filter(ts => !ts.days || ts.days.length === 0 || ts.days.includes(dayObj.abbr)).length;
    }, 0);
    const assignedSlots = Object.keys(sched).length;
    const fillBarEl = document.getElementById('week-fill-bar');
    const fillTrack = document.getElementById('fill-track-inner');
    const fillLabel = document.getElementById('fill-label');
    if (fillBarEl && totalSlots > 0) {
        fillBarEl.style.display = 'flex';
        const pct = Math.round((assignedSlots / totalSlots) * 100);
        fillTrack.style.width = pct + '%';
        fillTrack.style.background = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--blue)';
        fillLabel.textContent = `${assignedSlots} / ${totalSlots} créneaux assignés (${pct}%)`;
    } else if (fillBarEl) {
        fillBarEl.style.display = 'none';
    }

    renderScheduleLegend(subjects);

    const grid = document.getElementById('schedule-grid');

    if (!timeslots.length) {
        grid.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🕐</div>
            <div class="empty-title">Aucun créneau horaire</div>
            <div class="empty-sub">Allez dans "Créneaux Horaires" pour en ajouter</div>
        </div>`;
        checkConflicts();
        return;
    }

    const todayStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

    let html = '<div class="days-grid">';

    weekDays.forEach(dayObj => {
        const dayAbbr = dayObj.abbr;
        const isToday = dayObj.dateStr === todayStr;

        // Count filled slots for this day (only timeslots active on this day)
        const dayTimeslots = timeslots.filter(ts => !ts.days || ts.days.length === 0 || ts.days.includes(dayAbbr));
        const dayFilled = dayTimeslots.filter(ts => sched[`${currentWeekOffset}_${dayAbbr}_${ts.id}`]).length;
        const dayTotal = dayTimeslots.length;
        const dayDone = dayTimeslots.filter(ts => {
            const doneKey = `done_${currentWeekOffset}_${dayAbbr}_${ts.id}`;
            return localStorage.getItem(doneKey) === '1';
        }).length;

        html += `<div class="day-card ${isToday ? 'day-card-today' : ''}">
            <div class="day-header">
                <span class="day-name">${dayAbbr} <span class="day-date-badge">${dayObj.date.getDate()}</span></span>
                <div class="day-tags">
                    ${isToday ? '<span class="day-tag tag-today">Aujourd\'hui</span>' : ''}
                    <span class="day-fill-chip">${dayFilled}/${dayTotal}</span>
                    ${dayDone > 0 ? `<span class="day-done-chip">✓ ${dayDone}</span>` : ''}
                    <button class="reset-day-btn" title="Réinitialiser la journée" aria-label="Réinitialiser ${dayAbbr}" onclick="resetDayDone('${dayAbbr}')">↺</button>
                </div>
            </div>
            <div class="timeline">`;

        timeslots.filter(ts => !ts.days || ts.days.length === 0 || ts.days.includes(dayAbbr)).forEach(ts => {
            const key = `${currentWeekOffset}_${dayAbbr}_${ts.id}`;
            const subjId = sched[key];
            const subj = subjId ? subjects.find(s => s.id === subjId) : null;
            const doneKey = `done_${currentWeekOffset}_${dayAbbr}_${ts.id}`;
            const isDone = localStorage.getItem(doneKey) === '1';
            const blockId = `blk_${currentWeekOffset}_${dayAbbr}_${ts.id}`;

            html += `<div class="block ${isDone ? 'completed' : ''}" id="${blockId}">
                <div class="block-time">${ts.start}<br>→ ${ts.end}</div>`;

            if (subj) {
                html += `<div class="block-content"
                    style="background:${hexAlpha(subj.color, 0.18)};border-left:3px solid ${subj.color};color:${subj.color}"
                    ondragover="onDragOver(event)"
                    ondragleave="onDragLeave(event)"
                    ondrop="onDrop(event,'${dayAbbr}','${ts.id}')"
                    onclick="handleCellClick('${dayAbbr}','${ts.id}')">
                    <div class="block-content-inner">
                        <span>${subj.name}</span>
                        <span class="sub">${subj.type}</span>
                    </div>
                    <div class="block-actions">
                        <button class="done-btn ${isDone ? 'done' : ''}"
                            onclick="event.stopPropagation();toggleDoneBlock('${currentWeekOffset}','${dayAbbr}','${ts.id}')"
                            aria-label="${isDone ? 'Marquer comme non fait' : 'Marquer comme fait'}"
                            title="Marquer comme fait">${isDone ? '✓' : '○'}</button>
                        <button class="delete-event-btn-inline"
                            onclick="event.stopPropagation();removeEvent('${dayAbbr}','${ts.id}')"
                            aria-label="Supprimer l'événement"
                            title="Supprimer">✕</button>
                    </div>
                </div>`;
            } else {
                html += `<div class="block-content block-empty"
                    ondragover="event.preventDefault();this.classList.add('drag-over')"
                    ondragleave="this.classList.remove('drag-over')"
                    ondrop="this.classList.remove('drag-over');onDrop(event,'${dayAbbr}','${ts.id}')"
                    onclick="handleCellClick('${dayAbbr}','${ts.id}')"
                    role="button"
                    tabindex="0"
                    aria-label="Ajouter une tâche ${dayAbbr} ${ts.start}"
                    onkeydown="if(event.key==='Enter')handleCellClick('${dayAbbr}','${ts.id}')">
                    <span class="empty-slot-hint">+ Assigner</span>
                </div>`;
            }

            html += `</div>`; // .block
        });

        html += `</div></div>`; // .timeline .day-card
    });

    html += '</div>'; // .days-grid
    grid.innerHTML = html;
    checkConflicts();
}

function toggleDoneBlock(weekOffset, day, tsId) {
    const doneKey = `done_${weekOffset}_${day}_${tsId}`;
    const blockId = `blk_${weekOffset}_${day}_${tsId}`;
    const block = document.getElementById(blockId);
    if (!block) return;
    const btn = block.querySelector('.done-btn');
    const isDone = localStorage.getItem(doneKey) === '1';
    if (isDone) {
        localStorage.removeItem(doneKey);
        block.classList.remove('completed');
        if (btn) { btn.classList.remove('done'); btn.textContent = '○'; btn.setAttribute('aria-label', 'Marquer comme fait'); }
    } else {
        localStorage.setItem(doneKey, '1');
        block.classList.add('completed');
        if (btn) { btn.classList.add('done'); btn.textContent = '✓'; btn.setAttribute('aria-label', 'Marquer comme non fait'); }
    }
}

function resetDayDone(dayAbbr) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`done_${currentWeekOffset}_${dayAbbr}_`)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    renderScheduleGrid();
}

async function handleCellClick(day, tsId) {
    if (interactionMode === 'drag') return;
    if (selectedSubjectId) {
        assignSubject(day, tsId, selectedSubjectId);
    } else {
        const ts = await apiCall('/api/timeslots').then(ts => ts.find(t => t.id === tsId));
        document.getElementById('cell-modal-day').value = day;
        document.getElementById('cell-modal-slot').value = tsId;
        document.getElementById('cell-modal-title').textContent = `${day} · ${ts ? ts.start + '–' + ts.end : ''}`;
        renderPalette();
        document.getElementById('cell-modal').classList.add('open');
    }
}

async function assignFromModal(subjId) {
    const day = document.getElementById('cell-modal-day').value;
    const tsId = document.getElementById('cell-modal-slot').value;
    await assignSubject(day, tsId, subjId);
    closeModal('cell-modal');
}

async function removeCellEvent() {
    const day = document.getElementById('cell-modal-day').value;
    const tsId = document.getElementById('cell-modal-slot').value;
    await removeEvent(day, tsId);
    closeModal('cell-modal');
}

async function assignSubject(day, tsId, subjId) {
    try {
        await apiCall('/api/schedule/assign', {
            method: 'POST',
            body: JSON.stringify({ weekOffset: currentWeekOffset, day, timeslotId: tsId, subjectId: subjId })
        });
        await renderScheduleGrid();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function removeEvent(day, tsId) {
    try {
        await apiCall('/api/schedule/remove', {
            method: 'POST',
            body: JSON.stringify({ weekOffset: currentWeekOffset, day, timeslotId: tsId })
        });
        await renderScheduleGrid();
    } catch (e) {
        toast(e.message, 'error');
    }
}

/* ══════════════════════════════════════════════
   DRAG & DROP
══════════════════════════════════════════════ */

let dragSubjId = null;
let dragFromDay = null, dragFromTs = null;

function onChipDragStart(e, subjId) {
    dragSubjId = subjId;
    dragFromDay = null;
    e.dataTransfer.effectAllowed = 'copy';
}

function onEventDragStart(e, day, tsId, subjId) {
    dragSubjId = subjId;
    dragFromDay = day;
    dragFromTs = tsId;
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
}

function onDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'copy';
}

function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

async function onDrop(e, day, tsId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dragSubjId) return;
    if (dragFromDay) {
        await removeEvent(dragFromDay, dragFromTs);
    }
    await assignSubject(day, tsId, dragSubjId);
    dragSubjId = null; dragFromDay = null; dragFromTs = null;
}

function changeWeek(delta) {
    currentWeekOffset += delta;
    renderScheduleGrid();
}

function goToday() {
    currentWeekOffset = 0;
    renderScheduleGrid();
}

async function clearAllSchedule() {
    if (!confirm('Vider tout l\'emploi du temps de cette semaine ?')) return;
    const sched = await apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`);
    // Run all removals in parallel for speed
    const removals = Object.keys(sched).map(key => {
        const parts = key.split('_');
        if (parts.length === 3) {
            return apiCall('/api/schedule/remove', {
                method: 'POST',
                body: JSON.stringify({ weekOffset: currentWeekOffset, day: parts[1], timeslotId: parts[2] })
            });
        }
        return Promise.resolve();
    });
    await Promise.all(removals);
    await renderScheduleGrid();
    toast('Emploi du temps vidé', 'info');
}

function checkConflicts() {
    document.getElementById('conflict-badge').style.display = 'none';
}

/* ══════════════════════════════════════════════
   TIMESLOTS
══════════════════════════════════════════════ */

function openTimeslotModal() {
    document.getElementById('ts-msg').innerHTML = '';
    const activeDays = window.currentActiveDays || ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    document.querySelectorAll('#ts-days-picker input[type=checkbox]').forEach(cb => {
        cb.checked = activeDays.includes(cb.value);
    });
    document.getElementById('timeslot-modal').classList.add('open');
    requestAnimationFrame(() => document.getElementById('ts-start').focus());
}

async function saveTimeslot() {
    const start = document.getElementById('ts-start').value;
    const end = document.getElementById('ts-end').value;
    const msgEl = document.getElementById('ts-msg');
    if (!start || !end) { showMsg(msgEl, 'Remplissez les deux champs.', 'error'); return; }
    if (start >= end) { showMsg(msgEl, 'L\'heure de fin doit être après le début.', 'error'); return; }

    const days = Array.from(document.querySelectorAll('#ts-days-picker input[type=checkbox]:checked'))
        .map(cb => cb.value);
    if (!days.length) { showMsg(msgEl, 'Sélectionnez au moins un jour.', 'error'); return; }

    setLoading('ts-save', true);
    try {
        await apiCall('/api/timeslots', {
            method: 'POST',
            body: JSON.stringify({ start, end, days })
        });
        closeModal('timeslot-modal');
        await Promise.all([renderTimeslots(), renderScheduleGrid()]);
        toast('Créneau ajouté ✓', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    } finally {
        setLoading('ts-save', false);
    }
}

async function deleteTimeslot(id) {
    try {
        await apiCall(`/api/timeslots/${id}`, { method: 'DELETE' });
        await Promise.all([renderTimeslots(), renderScheduleGrid()]);
        toast('Créneau supprimé', 'info');
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function renderTimeslots() {
    const ts = await apiCall('/api/timeslots');
    const el = document.getElementById('timeslots-list');
    const summaryEl = document.getElementById('timeslots-summary');

    if (!ts.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-title">Aucun créneau</div></div>`;
        if (summaryEl) summaryEl.innerHTML = '';
        return;
    }

    const fmtH = m => m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? (m % 60) + 'min' : ''}` : `${m}min`;
    const weeklyMins = ts.reduce((acc, t) => {
        const [sh, sm] = t.start.split(':').map(Number);
        const [eh, em] = t.end.split(':').map(Number);
        const dur = (eh * 60 + em) - (sh * 60 + sm);
        return acc + dur * (t.days ? t.days.length : 0);
    }, 0);
    const totalCells = ts.reduce((acc, t) => acc + (t.days ? t.days.length : 0), 0);
    const uniqueDays = [...new Set(ts.flatMap(t => t.days || []))].length;

    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="ts-summary-grid">
                <div class="ts-stat"><span class="ts-stat-num">${ts.length}</span><span class="ts-stat-label">Créneaux définis</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${totalCells}</span><span class="ts-stat-label">Cellules / semaine</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${fmtH(weeklyMins)}</span><span class="ts-stat-label">Heures / semaine</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${uniqueDays}</span><span class="ts-stat-label">Jours couverts</span></div>
            </div>`;
    }

    el.innerHTML = ts.map((t, i) => {
        const dayTags = (t.days || []).map(d =>
            `<span class="ts-day-tag">${d}</span>`
        ).join('');
        return `
        <div class="timeslot-row">
            <span class="timeslot-index">${i + 1}</span>
            <span class="timeslot-time">${t.start} → ${t.end}</span>
            <span class="meta-badge">${durationStr(t.start, t.end)}</span>
            <div class="ts-day-tags">${dayTags}</div>
            <button class="icon-btn danger" onclick="deleteTimeslot('${t.id}')" aria-label="Supprimer le créneau ${t.start}–${t.end}" style="margin-left:auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
        </div>`;
    }).join('');
}

function durationStr(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + 'm' : ''}` : `${mins}min`;
}

/* ══════════════════════════════════════════════
   DAYS CONFIGURATION
══════════════════════════════════════════════ */

async function renderDaysCheckboxes() {
    const allDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const active = await apiCall('/api/days');
    window.currentActiveDays = active;
    const el = document.getElementById('days-checkboxes');
    el.innerHTML = allDays.map(d => `
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.82rem;padding:0.4rem 0.8rem;background:var(--surface);border:1px solid ${active.includes(d) ? 'var(--gold)' : 'var(--border)'};border-radius:6px;color:${active.includes(d) ? 'var(--gold-light)' : 'var(--text-muted)'}">
            <input type="checkbox" ${active.includes(d) ? 'checked' : ''} onchange="toggleDay('${d}',this)" style="accent-color:var(--gold)">
            ${d}
        </label>
    `).join('');
}

async function toggleDay(day, cb) {
    let active = await apiCall('/api/days');
    if (cb.checked) {
        if (!active.includes(day)) active.push(day);
    } else {
        active = active.filter(d => d !== day);
    }
    const order = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    active.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    await apiCall('/api/days', { method: 'PUT', body: JSON.stringify(active) });
    await Promise.all([renderDaysCheckboxes(), renderScheduleGrid()]);
}

/* ══════════════════════════════════════════════
   AUTO-GENERATE
══════════════════════════════════════════════ */

function updateAutogenTotal() {
    const inputs = document.querySelectorAll('#autogen-grid input[data-subj-id]');
    let total = 0;
    inputs.forEach(inp => { total += parseFloat(inp.value) || 0; });
    const el = document.getElementById('autogen-total-display');
    if (!el) return;
    if (inputs.length === 0) { el.innerHTML = ''; return; }
    const avail = (window.currentActiveDays?.length || 5);
    const tsH = window._timeslotsHoursPerDay || 0;
    const maxH = avail * tsH;
    const over = maxH > 0 && total > maxH;
    el.innerHTML = `
        <div class="autogen-total-inner ${over ? 'autogen-over' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Total demandé : <strong>${total}h / semaine</strong>
            ${maxH > 0 ? `<span class="autogen-capacity ${over ? 'over' : ''}">— capacité : ${maxH}h${over ? ' ⚠ dépassement' : ''}</span>` : ''}
        </div>`;
}

async function renderAutogenGrid() {
    const [subjects, config, timeslots] = await Promise.all([
        apiCall('/api/subjects'),
        apiCall('/api/autogen'),
        apiCall('/api/timeslots')
    ]);

    window._timeslotsHoursPerDay = timeslots.reduce((acc, t) => {
        const [sh, sm] = t.start.split(':').map(Number);
        const [eh, em] = t.end.split(':').map(Number);
        return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }, 0);

    const grid = document.getElementById('autogen-grid');
    if (!subjects.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-title">Aucune tâche définie</div></div>`;
        updateAutogenTotal();
        return;
    }

    grid.innerHTML = subjects.map(s => {
        const hours = config[s.id] || 0;
        return `
            <div class="autogen-row" style="border-left:3px solid ${s.color}">
                <div class="autogen-row-dot" style="background:${s.color}" aria-hidden="true"></div>
                <span class="autogen-row-name" style="color:${s.color}">${s.name}</span>
                <span class="autogen-row-unit">h/sem</span>
                <input class="form-input" type="number" min="0" max="40" step="0.5"
                       value="${hours}"
                       aria-label="Heures par semaine pour ${s.name}"
                       data-subj-id="${s.id}"
                       oninput="updateAutogenTotal()">
            </div>
        `;
    }).join('');

    updateAutogenTotal();
}

async function autoGenerate() {
    const rows = document.querySelectorAll('#autogen-grid .autogen-row');
    const newConfig = {};

    rows.forEach(row => {
        const input = row.querySelector('input[data-subj-id]');
        if (!input) return;
        const subjId = input.dataset.subjId;
        const hours = parseFloat(input.value) || 0;
        if (hours > 0) newConfig[subjId] = hours;
    });

    setLoading('autogen-submit', true);
    try {
        await apiCall('/api/autogen', { method: 'PUT', body: JSON.stringify(newConfig) });

        const result = await apiCall('/api/autogen/generate?weekOffset=' + currentWeekOffset, {
            method: 'POST'
        });

        document.getElementById('autogen-result').textContent =
            `✓ Planning généré : ${result.assigned} créneaux assignés.`;
        toast('Planning généré ✓', 'success');
        showPanel('schedule');
        await renderScheduleGrid();
    } catch (e) {
        toast(e.message, 'error');
    } finally {
        setLoading('autogen-submit', false);
    }
}

/* ══════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════ */

async function exportSchedule() {
    const win = window.open('', '_blank');
    const [subjects, sched, timeslots, days, user] = await Promise.all([
        apiCall('/api/subjects'),
        apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`),
        apiCall('/api/timeslots'),
        apiCall('/api/days'),
        apiCall('/api/auth/me')
    ]);

    let rows = '';
    timeslots.sort((a, b) => a.start.localeCompare(b.start)).forEach(ts => {
        let cells = `<td style="font-family:monospace;font-size:12px;padding:8px;background:#0f1520;color:#637080;white-space:nowrap;">${ts.start}–${ts.end}</td>`;
        days.forEach(d => {
            const key = `${currentWeekOffset}_${d}_${ts.id}`;
            const subjId = sched[key];
            const subj = subjId ? subjects.find(s => s.id === subjId) : null;
            if (subj) {
                cells += `<td style="padding:8px;background:${hexAlpha(subj.color, 0.3)};color:${subj.color};font-weight:600;font-size:13px;border-left:3px solid ${subj.color}">${subj.name}<br><span style="font-size:10px;opacity:0.7">${subj.type}</span></td>`;
            } else {
                cells += `<td style="padding:8px;background:#0f1520;"></td>`;
            }
        });
        rows += `<tr>${cells}</tr>`;
    });

    win.document.write(`<!DOCTYPE html><html><head><title>Emploi du Temps — ${user.name}</title></head>
        <body style="background:#080c12;color:#e8f0f8;font-family:sans-serif;padding:2rem">
        <h2 style="color:#e8b84b;font-family:serif">جدول — ${user.name}</h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #1e2d45">
            <tr style="background:#161e2e"><th style="padding:10px;color:#637080"></th>
            ${days.map(d => `<th style="padding:10px;color:#e8b84b;font-size:14px">${d}</th>`).join('')}
            </tr>${rows}
        </table></body></html>`);
    win.document.close();
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */

function hexAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;

    const text = document.createElement('span');
    text.textContent = msg;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.onclick = () => el.remove();

    el.appendChild(text);
    el.appendChild(closeBtn);
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('toast-hide'), 2700);
    setTimeout(() => el.remove(), 3000);
}

// Close modals with Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(o => o.classList.remove('open'));
    }
});

// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', async () => {
    showLoader();

    // Check for password reset token in URL
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    if (resetToken) {
        window.history.replaceState({}, '', window.location.pathname);
        hideLoader();
        showResetForm(resetToken);
        return;
    }

    try {
        const user = await apiCall('/api/auth/me');
        hideLoader();
        if (user) {
            await startApp();
        } else {
            document.getElementById('auth-page').style.display = 'flex';
            requestAnimationFrame(() => document.getElementById('login-email').focus());
        }
    } catch (e) {
        hideLoader();
        document.getElementById('auth-page').style.display = 'flex';
        requestAnimationFrame(() => document.getElementById('login-email').focus());
    }
});

/* ══════════════════════════════════════════════
   FORGOT / RESET PASSWORD
══════════════════════════════════════════════ */

function showForgotForm(e) {
    if (e) e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('reset-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'flex';
    document.querySelector('.auth-tabs').style.display = 'none';
    document.querySelector('.auth-card-heading h2').textContent = 'Mot de passe oublié';
    document.querySelector('.auth-card-heading p').textContent = 'Nous vous enverrons un lien de réinitialisation';
    document.getElementById('forgot-email').value = '';
    document.getElementById('forgot-msg').innerHTML = '';
    requestAnimationFrame(() => document.getElementById('forgot-email').focus());
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('reset-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'flex';
    document.querySelector('.auth-tabs').style.display = 'flex';
    document.querySelector('.auth-card-heading h2').textContent = 'Bienvenue';
    document.querySelector('.auth-card-heading p').textContent = 'Connectez-vous ou créez votre compte';
    document.querySelectorAll('.auth-tab').forEach((t, i) => {
        t.classList.toggle('active', i === 0);
        t.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    });
    requestAnimationFrame(() => document.getElementById('login-email').focus());
}

function showResetForm(token) {
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('reset-form').style.display = 'flex';
    document.querySelector('.auth-tabs').style.display = 'none';
    document.querySelector('.auth-card-heading h2').textContent = 'Nouveau mot de passe';
    document.querySelector('.auth-card-heading p').textContent = 'Choisissez un nouveau mot de passe sécurisé';
    document.getElementById('reset-token').value = token;
    document.getElementById('reset-password').value = '';
    document.getElementById('reset-confirm').value = '';
    document.getElementById('reset-msg').innerHTML = '';
    requestAnimationFrame(() => document.getElementById('reset-password').focus());
}

async function doForgotPassword() {
    const email = document.getElementById('forgot-email').value.trim().toLowerCase();
    const msgEl = document.getElementById('forgot-msg');
    if (!email) { showMsg(msgEl, 'Entrez votre adresse email.', 'error'); return; }

    setLoading('forgot-submit', true);
    try {
        const res = await apiCall('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        showMsg(msgEl, res.message || 'Si cet email existe, un lien a été envoyé.', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    } finally {
        setLoading('forgot-submit', false);
    }
}

async function doResetPassword() {
    const token = document.getElementById('reset-token').value;
    const pwd = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-confirm').value;
    const msgEl = document.getElementById('reset-msg');
    if (!pwd || !confirm) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }
    if (pwd.length < 6) { showMsg(msgEl, 'Minimum 6 caractères.', 'error'); return; }
    if (pwd !== confirm) { showMsg(msgEl, 'Les mots de passe ne correspondent pas.', 'error'); return; }

    setLoading('reset-submit', true);
    try {
        const res = await apiCall('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password: pwd })
        });
        showMsg(msgEl, res.message || 'Mot de passe mis à jour !', 'success');
        setTimeout(() => showLoginForm(null), 2000);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    } finally {
        setLoading('reset-submit', false);
    }
}

/* ══════════════════════════════════════════════
   RENDER ALL — parallel fetches where possible
══════════════════════════════════════════════ */

async function renderAll() {
    await Promise.all([
        renderSubjectsPanel(),
        renderPalette(),
        renderScheduleGrid(),
        renderTimeslots(),
        renderDaysCheckboxes(),
        renderAutogenGrid()
    ]);
}
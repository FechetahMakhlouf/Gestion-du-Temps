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
    const mobileAvatar = document.getElementById('mobile-avatar');
    if (mobileAvatar) mobileAvatar.textContent = initials;
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
    if (name === 'contact') {
        // Pre-fill name if logged in and field is empty
        const usernameEl = document.getElementById('sidebar-username');
        const nameField = document.getElementById('contact-name');
        if (usernameEl && nameField && !nameField.value && usernameEl.textContent !== '—') {
            nameField.value = usernameEl.textContent;
        }
    }
    // Si on quitte le panel export, on retire export-mode (restaure la sidebar)
    if (name !== 'export') {
        document.body.classList.remove('export-mode');
    }
    // Fermer sidebar sur mobile après navigation
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
                ${s.type ? `<span class="meta-subtitle" style="color:${s.color};opacity:0.85">📝 ${s.type}</span>` : ''}
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
            <span class="chip-name">${s.name}</span>
            ${s.type ? `<span class="chip-subtitle" style="color:${s.color}">${s.type}</span>` : ''}
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

const ALL_DAYS_MAP = { 'Dim': 1, 'Lun': 2, 'Mar': 3, 'Mer': 4, 'Jeu': 5, 'Ven': 6, 'Sam': 7 };

function getWeekDays() {
    const days = window.currentActiveDays || ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const today = new Date();
    today.setDate(today.getDate() + currentWeekOffset * 7);
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);

    return days.map(dayAbbr => {
        const dayIdx = ALL_DAYS_MAP[dayAbbr] || 1;
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + (dayIdx - 1));
        return { abbr: dayAbbr, date: d, dateStr: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) };
    });
}

function renderScheduleLegend(subjects) {
    const el = document.getElementById('schedule-legend');
    if (!subjects.length) { el.innerHTML = ''; return; }
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
                        ${subj.type ? `<span class="block-subtitle" style="color:${subj.color}">${subj.type}</span>` : ''}
                    </div>
                    <div class="block-actions">
                        <button class="done-btn ${isDone ? 'done' : ''}"
                            onclick="event.stopPropagation();toggleDoneBlock('${currentWeekOffset}','${dayAbbr}','${ts.id}')"
                            aria-label="${isDone ? 'Marquer comme non fait' : 'Marquer comme fait'}"
                            title="Marquer comme fait">${isDone ? '✓' : '○'}</button>
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
    const activeDays = window.currentActiveDays || ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
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
    const allDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
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
    const order = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
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

const exportCSS = `:root{--bg:#060a10;--surface:#0d1420;--surface2:#131c2e;--border:#1a2840;--border2:#243650;--text:#e4edf8;--muted:#5a6e85;--dim:#2e3f55;--gold:#c9972a;--gold-l:#e8b84b;}*{margin:0;padding:0;box-sizing:border-box;}body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;}.page{max-width:1000px;margin:0 auto;padding:2rem 1.5rem 4rem;}.export-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;padding-bottom:1.5rem;margin-bottom:1.75rem;border-bottom:1px solid var(--border);}.logo{font-family:'Amiri',serif;font-size:2.4rem;color:var(--gold-l);text-shadow:0 0 40px rgba(232,184,75,.25);line-height:1;}.logo-sub{font-size:.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;margin-top:.3rem;}.gold-line{width:40px;height:1.5px;background:linear-gradient(90deg,var(--gold),transparent);margin:.5rem 0;}.meta-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.75rem;}.meta-chip{background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.2rem .65rem;font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);}.actions{display:flex;flex-direction:column;gap:.5rem;align-items:flex-end;}.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.65rem 1.1rem;border-radius:10px;font-size:.82rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;text-decoration:none;border:none;transition:all .2s;white-space:nowrap;}.btn-gold{background:linear-gradient(135deg,#c9972a,#e8b84b);color:#07090d;box-shadow:0 4px 14px rgba(201,151,42,.28);}.btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(201,151,42,.38);}.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border);}.btn-ghost:hover{border-color:var(--gold);color:var(--gold-l);}.btn svg{flex-shrink:0;}.btn-hint{font-size:.65rem;color:var(--muted);text-align:right;font-family:'JetBrains Mono',monospace;margin-top:.2rem;}.legend{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.5rem;}.legend-item{display:flex;align-items:center;gap:.4rem;font-size:.75rem;color:var(--muted);background:var(--surface);padding:.25rem .6rem;border-radius:6px;border:1px solid var(--border);}.legend-dot{width:9px;height:9px;border-radius:3px;flex-shrink:0;}.days-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;}.day-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;transition:box-shadow .2s;}.day-card:hover{box-shadow:0 4px 24px rgba(0,0,0,.35);}.day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);gap:.5rem;}.day-title{display:flex;align-items:center;gap:.6rem;}.day-abbr{font-weight:700;font-size:1rem;color:var(--text);}.day-date{font-family:'JetBrains Mono',monospace;font-size:.78rem;background:var(--surface2);color:var(--muted);padding:.1rem .4rem;border-radius:5px;border:1px solid var(--border);}.day-actions{display:flex;align-items:center;gap:.4rem;}.day-chip{font-family:'JetBrains Mono',monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:var(--surface2);color:var(--muted);border:1px solid var(--border);}.print-day-btn,.img-day-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.28rem .6rem;border-radius:7px;font-size:.7rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--muted);transition:all .18s;white-space:nowrap;}.print-day-btn:hover{border-color:var(--gold);color:var(--gold-l);}.img-day-btn{border-color:rgba(31,111,235,.3);color:#58a6ff;background:rgba(31,111,235,.08);}.img-day-btn:hover{border-color:#58a6ff;background:rgba(31,111,235,.15);}.timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}.block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}.block-time{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:var(--muted);padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid var(--border);}.block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}.block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.75;margin-top:.1rem;}.block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:rgba(26,40,64,.3)!important;border:1.5px dashed var(--border2)!important;color:var(--dim);font-size:.65rem;display:flex;align-items:center;}.export-footer{margin-top:3rem;text-align:center;font-size:.68rem;color:var(--dim);font-family:'JetBrains Mono',monospace;}@media print{body{background:#fff!important;color:#111!important;}.page{padding:.5rem!important;}.export-header .actions,.btn-hint,.print-day-btn,.img-day-btn{display:none!important;}.export-header{border-bottom:1px solid #ddd!important;}.logo{color:#c9972a!important;text-shadow:none!important;}.gold-line{background:#c9972a!important;}.meta-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.legend-item{background:#f5f5f5!important;border:1px solid #ddd!important;color:#555!important;}.days-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important;gap:.75rem!important;}.day-card{background:#fff!important;border:1px solid #ddd!important;border-radius:10px!important;break-inside:avoid;}.day-header{border-bottom:1px solid #eee!important;}.day-abbr{color:#111!important;}.day-date{background:#f5f5f5!important;border:1px solid #ddd!important;color:#666!important;}.day-chip{background:#f5f5f5!important;border:1px solid #ddd!important;color:#888!important;}.block-time{color:#888!important;border-right:2px solid #ddd!important;}.block-empty{background:#fafafa!important;border:1.5px dashed #ddd!important;color:#bbb!important;}.export-footer{color:#aaa!important;}}@media(max-width:600px){.export-header{flex-direction:column;}.actions{align-items:stretch;width:100%;}.btn-hint{text-align:left;}.days-grid{grid-template-columns:1fr;}.day-actions{flex-wrap:wrap;}}`;

async function exportSchedule() {
    // Ferme la sidebar sur TOUS les écrans (mobile + desktop)
    document.getElementById('sidebar').classList.remove('open');
    document.body.classList.add('export-mode');
    showPanel('export');
    const exportLoading = document.getElementById('export-loading');
    const exportFrame = document.getElementById('export-frame');
    if (exportLoading) { exportLoading.style.display = 'flex'; }
    if (exportFrame) { exportFrame.style.display = 'none'; }
    const [subjects, sched, timeslots, days, user] = await Promise.all([
        apiCall('/api/subjects'),
        apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`),
        apiCall('/api/timeslots'),
        apiCall('/api/days'),
        apiCall('/api/auth/me')
    ]);

    const sortedSlots = timeslots.slice().sort((a, b) => a.start.localeCompare(b.start));

    // Helper: hex to rgba
    function hxAlpha(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // Compute week dates like renderScheduleGrid does
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + currentWeekOffset * 7);
    const dayOrder = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const weekDays = days.map((abbr, i) => {
        const idx = dayOrder.indexOf(abbr);
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + (idx >= 0 ? idx : i));
        const dateNum = d.getDate();
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        return { abbr, dateNum, monthStr: monthNames[d.getMonth()], dateObj: d };
    });

    const exportDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const fileName = `jadwal_${user.name.replace(/\s+/g, '_')}_semaine${currentWeekOffset >= 0 ? '+' : ''}${currentWeekOffset}`;

    // Build day-card HTML for each day
    let dayCardsHtml = '';
    weekDays.forEach(({ abbr, dateNum, monthStr }) => {
        const daySlots = sortedSlots.filter(ts => !ts.days || ts.days.length === 0 || ts.days.includes(abbr));
        if (!daySlots.length) return;

        const filled = daySlots.filter(ts => sched[`${currentWeekOffset}_${abbr}_${ts.id}`]).length;
        const total = daySlots.length;

        let blocks = '';
        daySlots.forEach(ts => {
            const key = `${currentWeekOffset}_${abbr}_${ts.id}`;
            const subjId = sched[key];
            const subj = subjId ? subjects.find(s => s.id === subjId) : null;

            if (subj) {
                blocks += `
                <div class="block">
                    <div class="block-time">${ts.start}<br>→ ${ts.end}</div>
                    <div class="block-content" style="background:${hxAlpha(subj.color, 0.18)};border-left:3px solid ${subj.color};color:${subj.color}">
                        <strong>${subj.name}</strong>
                        ${subj.type ? `<span class="block-sub">${subj.type}</span>` : ''}
                    </div>
                </div>`;
            } else {
                blocks += `
                <div class="block">
                    <div class="block-time">${ts.start}<br>→ ${ts.end}</div>
                    <div class="block-empty">—</div>
                </div>`;
            }
        });

        dayCardsHtml += `
        <div class="day-card" id="day-${abbr}">
            <div class="day-header">
                <div class="day-title">
                    <span class="day-abbr">${abbr}</span>
                    <span class="day-date">${dateNum} ${monthStr}</span>
                </div>
                <div class="day-actions">
                    <span class="day-chip">${filled}/${total}</span>
                    <button class="img-day-btn" onclick="saveAsImage('${abbr}')" title="Sauvegarder en image">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Image
                    </button>
                </div>
            </div>
            <div class="timeline">${blocks}</div>
        </div>`;
    });

    // Build legend from used subjects
    const usedSubjIds = new Set(Object.values(sched));
    const usedSubjects = subjects.filter(s => usedSubjIds.has(s.id));
    const legendHtml = usedSubjects.map(s =>
        ``
    ).join('');

    const exportFrame2 = document.getElementById('export-frame');
    const exportLoading2 = document.getElementById('export-loading');
    if (exportFrame2) {
        exportFrame2.srcdoc = `<!DOCTYPE html>\r\n<html lang="fr">\r\n<head>\r\n<meta charset="UTF-8">\r\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\r\n<title>Emploi du Temps — ${user.name}</title>\r\n<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\r\n<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>\r\n<style>${exportCSS}<\/style>\r\n</head>\r\n<body>\r\n<div class="page">\r\n\r\n  <div class="export-header">\r\n    <div>\r\n      <div class="logo">جدول<\/div>\r\n      <div class="gold-line"><\/div>\r\n      <div class="logo-sub">Jadwal — Emploi du Temps<\/div>\r\n      <div class="meta-row">\r\n        <span class="meta-chip">👤 ${user.name}<\/span>\r\n        <span class="meta-chip">📅 ${exportDate}<\/span>\r\n        <span class="meta-chip">Semaine ${currentWeekOffset >= 0 ? '+' : ''}${currentWeekOffset}<\/span>\r\n      <\/div>\r\n    <\/div>\r\n    <div class="actions">\r\n      <button class="btn btn-gold" onclick="window.print()">\r\n        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"\/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"\/><rect x="6" y="14" width="12" height="8"\/><\/svg>\r\n        Imprimer la semaine\r\n      <\/button>\r\n      <a id="dl-html" class="btn btn-ghost" download="${fileName}.html">\r\n        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"\/><polyline points="7 10 12 15 17 10"\/><line x1="12" y1="15" x2="12" y2="3"\/><\/svg>\r\n        Télécharger HTML\r\n      <\/a>\r\n      <div class="btn-hint">Chaque jour : bouton Imprimer ou Image 👇<\/div>\r\n    <\/div>\r\n  <\/div>\r\n\r\n  ${legendHtml ? `<div class="legend">${legendHtml}<\/div>` : ''}\r\n\r\n  <div class="days-grid">\r\n    ${dayCardsHtml}\r\n  <\/div>\r\n\r\n  <div class="export-footer">Généré par Jadwal · ${exportDate}<\/div>\r\n<\/div>\r\n\r\n<script>\r\n(function() {\r\n  const htmlContent = '<!DOCTYPE html>' + document.documentElement.outerHTML;\r\n  const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });\r\n  document.getElementById('dl-html').href = URL.createObjectURL(htmlBlob);\r\n})();\r\n\r\nfunction printDay(abbr) {\r\n  const card = document.getElementById('day-' + abbr);\r\n  if (!card) return;\r\n  const printWin = window.open('', '_blank', 'width=480,height=700');\r\n  const cardHtml = card.outerHTML;\r\n  printWin.document.write(\`<!DOCTYPE html>\r\n<html><head><meta charset="UTF-8">\r\n<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\r\n<style>\r\n  *{margin:0;padding:0;box-sizing:border-box;}\r\n  body{background:#fff;color:#111;font-family:'DM Sans',sans-serif;padding:1.5rem;}\r\n  .day-card{border:1px solid #ddd;border-radius:12px;overflow:hidden;max-width:400px;margin:0 auto;}\r\n  .day-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee;gap:.5rem;}\r\n  .day-title{display:flex;align-items:center;gap:.6rem;}\r\n  .day-abbr{font-weight:700;font-size:1rem;color:#111;}\r\n  .day-date{font-family:'JetBrains Mono',monospace;font-size:.78rem;background:#f5f5f5;color:#666;padding:.1rem .4rem;border-radius:5px;border:1px solid #ddd;}\r\n  .day-actions{display:none;}\r\n  .day-chip{font-family:'JetBrains Mono',monospace;font-size:.6rem;padding:.1rem .4rem;border-radius:4px;background:#f5f5f5;color:#888;border:1px solid #ddd;}\r\n  .timeline{padding:.65rem;display:flex;flex-direction:column;gap:.3rem;}\r\n  .block{display:grid;grid-template-columns:64px 1fr;gap:.4rem;align-items:start;}\r\n  .block-time{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#888;padding-top:.45rem;line-height:1.35;text-align:right;padding-right:.5rem;border-right:2px solid #eee;}\r\n  .block-content{border-radius:8px;padding:.45rem .65rem;font-size:.8rem;line-height:1.4;font-weight:600;}\r\n  .block-sub{display:block;font-size:.65rem;font-weight:400;opacity:.7;margin-top:.1rem;}\r\n  .block-empty{border-radius:8px;padding:.45rem .65rem;min-height:36px;background:#fafafa;border:1.5px dashed #ddd;color:#ccc;font-size:.65rem;display:flex;align-items:center;}\r\n  .footer{margin-top:1.5rem;text-align:center;font-size:.65rem;color:#bbb;font-family:'JetBrains Mono',monospace;}\r\n<\/style>\r\n<\/head><body>\r\n\${cardHtml}\r\n<div class="footer">Jadwal · \${new Date().toLocaleDateString('fr-FR')}<\/div>\r\n<\/body><\/html>\`);\r\n  printWin.document.close();\r\n  printWin.onload = () => { printWin.focus(); printWin.print(); };\r\n}\r\n\r\nasync function saveAsImage(abbr) {\r\n  const card = document.getElementById('day-' + abbr);\r\n  if (!card) return;\r\n  if (typeof html2canvas === 'undefined') {\r\n    alert('html2canvas non chargé, réessayez dans un instant.');\r\n    return;\r\n  }\r\n  const btn = card.querySelector('.img-day-btn');\r\n  if (btn) { btn.textContent = '…'; btn.disabled = true; }\r\n  try {\r\n    const canvas = await html2canvas(card, { backgroundColor: '#0d1420', scale: 2, useCORS: true, logging: false });\r\n    const link = document.createElement('a');\r\n    link.download = 'jadwal_' + abbr + '_${fileName}.png';\r\n    link.href = canvas.toDataURL('image/png');\r\n    link.click();\r\n  } catch(e) {\r\n    alert('Erreur lors de la capture : ' + e.message);\r\n  } finally {\r\n    if (btn) { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"\/><circle cx="8.5" cy="8.5" r="1.5"\/><polyline points="21 15 16 10 5 21"\/><\/svg> Image'; btn.disabled = false; }\r\n  }\r\n}\r\n<\/script>\r\n<\/body>\r\n<\/html>`;
        exportFrame2.onload = () => {
            if (exportLoading2) exportLoading2.style.display = 'none';
            exportFrame2.style.display = 'block';
        };
    }
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

/* ── Mobile nav helpers ── */
function updateMobileNav(panel) {
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === panel);
    });
}

/* Sync avatar initial from sidebar to mobile top bar */
const _origShowApp = typeof showApp === 'function' ? showApp : null;
function syncMobileAvatar() {
    const sAvatar = document.getElementById('sidebar-avatar');
    const mAvatar = document.getElementById('mobile-avatar');
    if (sAvatar && mAvatar) {
        const observer = new MutationObserver(() => {
            mAvatar.textContent = sAvatar.textContent;
        });
        observer.observe(sAvatar, { childList: true, subtree: true, characterData: true });
        mAvatar.textContent = sAvatar.textContent;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    syncMobileAvatar();
    // Sync bottom nav when sidebar nav changes
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        const origClick = btn.onclick;
        btn.addEventListener('click', () => {
            const panel = btn.getAttribute('onclick')?.match(/showPanel\('(\w+)'\)/)?.[1];
            if (panel) updateMobileNav(panel);
        });
    });
});

/* Close sidebar when tapping outside on mobile */
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const topBar = document.getElementById('mobile-top-bar');
    if (sidebar && sidebar.classList.contains('open') && window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !topBar?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

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
/* ══════════════════════════════════════════════
   GUIDE D'UTILISATION — Données & Logique
══════════════════════════════════════════════ */

const GUIDE_STEPS = [
    {
        id: 'welcome',
        icon: '👋',
        title: 'Bienvenue sur Jadwal !',
        subtitle: 'Votre assistant de planning hebdomadaire — 5 minutes suffisent pour tout configurer.',
        actions: [
            {
                title: 'Qu\'est-ce que Jadwal ?',
                desc: 'Jadwal (جدول = "tableau" en arabe) est une application web de gestion d\'emploi du temps. Elle vous permet de planifier votre semaine : définissez vos matières/tâches, vos créneaux horaires disponibles, puis assignez chaque tâche aux bons moments de la semaine. Chaque utilisateur a son propre compte et son propre planning — tout est sauvegardé automatiquement dans le cloud.'
            },
            {
                title: 'L\'ordre de configuration recommandé',
                desc: 'Pour une première utilisation, suivez cet ordre : ① Configurer vos jours actifs → ② Créer vos créneaux horaires → ③ Ajouter vos tâches/matières → ④ Construire votre emploi du temps (manuellement ou automatiquement). Ce guide vous accompagnera étape par étape.'
            },
            {
                title: 'Vos données sont sauvegardées automatiquement',
                desc: 'Chaque action (ajout, modification, suppression) est immédiatement sauvegardée sur le serveur. Inutile d\'appuyer sur un bouton "Enregistrer" global. Vous pouvez fermer la fenêtre et revenir plus tard : votre planning sera intact.'
            }
        ],
        tip: '<strong>Astuce de départ :</strong> Commencez par les "Créneaux Horaires" avant tout. Sans créneaux définis, il est impossible d\'assigner des tâches dans votre emploi du temps.'
    },
    {
        id: 'days',
        icon: '📅',
        title: 'Étape 1 — Configurer vos jours actifs',
        subtitle: 'Dites à Jadwal quels jours de la semaine vous êtes actif.',
        actions: [
            {
                title: 'Où trouver ce réglage ?',
                desc: 'Dans le panneau "Créneaux Horaires" (accessible depuis la barre de navigation de gauche), vous trouverez une section "Jours actifs de la semaine" avec 7 cases à cocher : Dim, Lun, Mar, Mer, Jeu, Ven, Sam.'
            },
            {
                title: 'Cocher / décocher un jour',
                desc: 'Cliquez simplement sur la case d\'un jour pour l\'activer ou le désactiver. Les jours actifs s\'affichent en doré avec une bordure colorée. Les jours inactifs sont grisés. Cette sélection est immédiatement sauvegardée et affecte l\'affichage de votre emploi du temps.'
            },
            {
                title: 'Effet sur l\'emploi du temps',
                desc: 'Seuls les jours cochés apparaissent dans votre vue "Emploi du Temps". Par exemple, si vous cochez uniquement Lun-Ven, les week-ends n\'apparaissent pas. Vous pouvez changer cette configuration à tout moment — l\'emploi du temps se met à jour instantanément.'
            }
        ],
        tip: '<strong>Exemple :</strong> Un étudiant qui n\'a cours que du Lundi au Vendredi cochera Lun, Mar, Mer, Jeu, Ven. Un étudiant ayant aussi des cours le Samedi matin ajoutera Sam à sa sélection.'
    },
    {
        id: 'timeslots',
        icon: '🕐',
        title: 'Étape 2 — Créer vos créneaux horaires',
        subtitle: 'Les créneaux définissent les plages de temps disponibles dans votre emploi du temps.',
        actions: [
            {
                title: 'Ouvrir le formulaire de création',
                desc: 'Allez dans "Créneaux Horaires" via la navigation de gauche. Cliquez sur le bouton "+ Ajouter un créneau". Un formulaire apparaît avec trois champs : l\'heure de début, l\'heure de fin, et les jours concernés.'
            },
            {
                title: 'Remplir l\'heure de début et de fin',
                desc: 'Cliquez sur le champ "Début" et saisissez l\'heure au format HH:MM (exemple : 08:30). Faites de même pour "Fin" (exemple : 10:00). L\'application vérifie automatiquement que l\'heure de fin est bien après l\'heure de début. La durée calculée s\'affiche dans votre liste (ex: 1h30).'
            },
            {
                title: 'Sélectionner les jours du créneau',
                desc: 'Cochez les jours où ce créneau existe. Un créneau peut s\'appliquer à un seul jour (ex: cours de sport uniquement le Mercredi 14h-16h) ou à plusieurs jours (ex: cours d\'anglais Lun+Mer+Ven 8h-9h). Vous devez cocher au moins un jour pour valider.'
            },
            {
                title: 'Valider et vérifier les conflits',
                desc: 'Cliquez sur "Ajouter". Si le créneau chevauche un créneau existant sur les mêmes jours, un message d\'erreur vous indique exactement le conflit (ex: "Chevauche 08:00-09:30 sur : Lun, Mer"). Dans ce cas, ajustez les horaires ou décochez les jours qui posent problème.'
            }
        ],
        tip: '<strong>Bonne pratique :</strong> Créez un créneau séparé pour chaque plage horaire unique de votre semaine. Par exemple : "08h-10h (Lun, Mar, Jeu)", "10h-12h (Lun, Mer, Ven)", "14h-16h (Mar, Jeu)". Plus vos créneaux sont précis, plus votre planning sera fidèle à la réalité.',
        warn: '<strong>Attention :</strong> Supprimer un créneau efface également toutes les assignations liées à ce créneau dans TOUS vos emplois du temps (toutes les semaines). Cette action est irréversible.'
    },
    {
        id: 'subjects',
        icon: '📚',
        title: 'Étape 3 — Ajouter vos tâches/matières',
        subtitle: 'Les tâches sont les activités que vous souhaitez placer dans votre emploi du temps.',
        actions: [
            {
                title: 'Créer une nouvelle tâche',
                desc: 'Allez dans "Mes Tâches" via la navigation. Cliquez sur "+ Ajouter une tâche". Un modal s\'ouvre avec trois informations à renseigner : le nom, le type, et la couleur.'
            },
            {
                title: 'Donner un nom à votre tâche',
                desc: 'Le nom identifie votre tâche dans l\'emploi du temps. Soyez précis mais concis : "Mathématiques", "Sport", "Anglais", "Projet Python", "Révision Physique", etc. Ce nom apparaîtra dans chaque cellule de l\'emploi du temps où vous l\'assignerez.'
            },
            {
                title: 'Choisir le type',
                desc: 'Le type est une catégorie libre qui apparaît en sous-titre sous le nom de la tâche. Exemples : "Cours magistral", "TD", "TP", "Révision", "Sport", "Projet", "Personnel". Ce champ est optionnel mais aide à distinguer des tâches de même nom (ex: deux cours de Maths de types différents).'
            },
            {
                title: 'Sélectionner une couleur',
                desc: 'Cliquez sur l\'une des 24 couleurs proposées dans la grille. La couleur sélectionnée est mise en évidence avec un contour blanc. Chaque tâche obtient une couleur aléatoire par défaut que vous pouvez modifier. La couleur est utilisée dans l\'emploi du temps pour identifier visuellement la tâche d\'un coup d\'œil.'
            },
            {
                title: 'Consulter les statistiques',
                desc: 'En haut du panneau "Mes Tâches", quatre statistiques s\'affichent : nombre total de tâches, nombre de tâches utilisées cette semaine, nombre de créneaux assignés, et taux d\'utilisation (%). Chaque carte tâche affiche aussi une barre de progression montrant sa fréquence d\'utilisation relative.'
            }
        ],
        tip: '<strong>Conseil de couleur :</strong> Utilisez des couleurs contrastées entre les tâches similaires. Par exemple, utilisez le bleu foncé pour "Maths", le vert pour "SVT", le rouge pour "Physique". Cela rend la lecture de l\'emploi du temps beaucoup plus rapide.'
    },
    {
        id: 'schedule',
        icon: '🗓️',
        title: 'Étape 4 — Construire votre emploi du temps',
        subtitle: 'Assignez vos tâches aux créneaux horaires de chaque jour.',
        actions: [
            {
                title: 'Comprendre la grille',
                desc: 'L\'emploi du temps est organisé en colonnes (une par jour actif) et en lignes (une par créneau horaire). Chaque intersection est une "cellule". Une cellule vide affiche "+ Assigner". Une cellule occupée affiche le nom et le type de la tâche avec sa couleur.'
            },
            {
                title: 'Mode Clic — Assigner en cliquant',
                desc: 'Assurez-vous que le mode "Clic" est actif (bouton en haut du panneau). Sélectionnez d\'abord une tâche dans la palette de gauche (elle s\'entoure d\'un contour doré). Ensuite cliquez sur n\'importe quelle cellule vide — la tâche y est immédiatement assignée. Pour changer une cellule déjà occupée, cliquez dessus et choisissez une nouvelle tâche dans le modal.'
            },
            {
                title: 'Mode Glisser-déposer — Assigner en drag & drop',
                desc: 'Activez le mode "Glisser" via le bouton de bascule. Vous pouvez alors faire glisser une tâche depuis la palette directement vers une cellule de l\'emploi du temps. Vous pouvez aussi faire glisser une tâche déjà placée vers une autre cellule pour la déplacer (l\'ancienne cellule se vide automatiquement).'
            },
            {
                title: 'Supprimer une assignation',
                desc: 'Cliquez sur une cellule occupée. Un modal s\'ouvre avec la liste de vos tâches ET un bouton "Retirer". Cliquez sur "Retirer" pour vider la cellule, ou choisissez une autre tâche pour remplacer.'
            },
            {
                title: 'Marquer une tâche comme accomplie',
                desc: 'Dans chaque cellule occupée, un bouton rond "○" est visible à droite. Cliquez dessus pour marquer la tâche comme faite (il devient "✓" et la cellule s\'assombrit). Ce statut est local à votre navigateur et sert de suivi journalier. Le bouton "↺" en haut de chaque colonne remet tous les statuts de la journée à zéro.'
            }
        ],
        tip: '<strong>Barre de progression :</strong> En haut de la vue Emploi du Temps, une barre colorée indique le taux de remplissage de votre semaine : bleue si < 40%, dorée si 40-80%, verte si > 80%. Visez le vert pour une semaine bien planifiée !',
        warn: '<strong>Note :</strong> Le bouton "Vider l\'emploi du temps" (dans Génération Auto) efface TOUTES les assignations de la semaine en cours. Utilisez-le avec précaution.'
    },
    {
        id: 'weeks',
        icon: '🔄',
        title: 'Étape 5 — Naviguer entre les semaines',
        subtitle: 'Jadwal supporte un planning différent pour chaque semaine.',
        actions: [
            {
                title: 'Les boutons de navigation semaine',
                desc: 'En haut de l\'emploi du temps, vous trouvez : une flèche gauche "← Semaine précédente", un label affichant les dates de la semaine courante (ex: "03/03 – 09/03"), un bouton "Aujourd\'hui" pour revenir à la semaine en cours, et une flèche droite "Semaine suivante →".'
            },
            {
                title: 'Chaque semaine est indépendante',
                desc: 'Votre emploi du temps de la semaine actuelle (offset 0) est complètement séparé de celui de la semaine prochaine (offset +1) ou de la semaine dernière (offset -1). Vous pouvez avoir des plannings totalement différents selon les semaines : idéal pour les emplois du temps qui alternent (semaines A/B par exemple).'
            },
            {
                title: 'Planifier à l\'avance',
                desc: 'Cliquez sur "→" pour aller à la semaine prochaine et construisez votre planning en avance. Les semaines futures commencent vides. Vous pouvez naviguer aussi loin que vous le souhaitez dans le futur ou le passé.'
            },
            {
                title: 'Revenir à aujourd\'hui',
                desc: 'Le bouton "Aujourd\'hui" vous ramène instantanément à la semaine en cours (offset 0), peu importe où vous vous trouviez dans la navigation. Le jour courant est mis en évidence avec un marqueur "Aujourd\'hui" dans sa colonne.'
            }
        ],
        tip: '<strong>Astuce :</strong> Si vous avez toujours le même emploi du temps chaque semaine, construisez-le une fois sur la semaine actuelle, puis reconstruisez-le manuellement ou utilisez la Génération Automatique pour les semaines suivantes.'
    },
    {
        id: 'autogen',
        icon: '⚡',
        title: 'Étape 6 — Génération automatique',
        subtitle: 'Laissez Jadwal construire votre planning à votre place selon un volume horaire cible.',
        actions: [
            {
                title: 'Principe de la génération automatique',
                desc: 'Au lieu d\'assigner manuellement chaque tâche, vous indiquez combien d\'heures par semaine vous souhaitez consacrer à chaque tâche. Jadwal remplit alors automatiquement les créneaux disponibles en respectant ces quotas horaires, dans l\'ordre où les tâches apparaissent.'
            },
            {
                title: 'Définir les heures par tâche',
                desc: 'Dans le panneau "Génération Auto", une ligne s\'affiche pour chaque tâche. Saisissez le nombre d\'heures souhaitées (décimales acceptées : 0.5 = 30min, 1.5 = 1h30, etc.). Laissez à 0 les tâches que vous ne voulez pas inclure dans la génération. Le total s\'affiche en bas en temps réel.'
            },
            {
                title: 'Vérifier la capacité disponible',
                desc: 'La capacité maximale (calculée automatiquement) indique le total d\'heures de créneaux disponibles par semaine. Si le total demandé dépasse la capacité, un avertissement "⚠ dépassement" s\'affiche en rouge. Dans ce cas, réduisez les heures de certaines tâches pour rester dans la capacité.'
            },
            {
                title: 'Lancer la génération',
                desc: 'Cliquez sur "⚡ Générer automatiquement". Jadwal sauvegarde d\'abord votre configuration d\'heures, puis remplit les créneaux libres de la semaine affichée. Un message confirme le nombre de créneaux assignés. L\'application bascule automatiquement vers la vue Emploi du Temps pour que vous voyiez le résultat.'
            },
            {
                title: 'La génération respecte les créneaux existants',
                desc: 'Si votre emploi du temps de la semaine n\'est pas vide, la génération n\'écrase pas les assignations existantes — elle remplit uniquement les cellules encore vides. Pour tout recommencer, utilisez d\'abord le bouton "🗑 Vider l\'emploi du temps" puis relancez la génération.'
            }
        ],
        tip: '<strong>Exemple concret :</strong> Vous voulez 3h de Maths, 2h d\'Anglais et 1h de Sport par semaine. Saisissez ces valeurs, cliquez Générer. Jadwal assignera Maths sur les 3 premiers créneaux disponibles, puis Anglais sur les 2 suivants, puis Sport sur 1 créneau.',
        warn: '<strong>Limitation :</strong> La génération automatique assigne les tâches dans l\'ordre (première tâche en premier). Elle ne prend pas en compte vos préférences de jours ou d\'horaires spécifiques. Pour un contrôle précis, complétez la génération par une assignation manuelle.'
    },
    {
        id: 'export',
        icon: '📤',
        title: 'Étape 7 — Exporter votre emploi du temps',
        subtitle: 'Partagez ou sauvegardez votre planning en dehors de l\'application.',
        actions: [
            {
                title: 'Accéder à l\'export',
                desc: 'Dans le panneau "Emploi du Temps", cliquez sur le bouton "📤 Exporter" (visible dans l\'en-tête du panneau). Une nouvelle fenêtre s\'ouvre avec votre planning de la semaine en cours, mis en forme pour l\'impression ou le téléchargement.'
            },
            {
                title: 'Télécharger en HTML',
                desc: 'Cliquez sur "Télécharger HTML". Un fichier .html est sauvegardé sur votre ordinateur. Vous pouvez l\'ouvrir dans n\'importe quel navigateur sans connexion internet — il contient une version complète et stylisée de votre emploi du temps avec les couleurs de chaque tâche.'
            },
            {
                title: 'Exporter en CSV',
                desc: 'Cliquez sur "Exporter CSV". Un fichier .csv est téléchargé, compatible avec Excel, Google Sheets ou LibreOffice Calc. Les colonnes représentent les jours et les lignes les créneaux horaires. Idéal si vous souhaitez manipuler vos données dans un tableur.'
            },
            {
                title: 'Imprimer',
                desc: 'Cliquez sur "Imprimer" pour ouvrir la boîte de dialogue d\'impression de votre navigateur. La page est optimisée pour l\'impression : fond blanc, couleurs préservées, boutons cachés. Vous pouvez aussi "Imprimer vers PDF" pour créer un fichier PDF sans logiciel supplémentaire.'
            }
        ],
        tip: '<strong>Partage rapide :</strong> Téléchargez le fichier HTML et envoyez-le par email ou WhatsApp. Le destinataire peut l\'ouvrir directement dans son navigateur sans avoir de compte Jadwal.'
    },
    {
        id: 'tips',
        icon: '💡',
        title: 'Astuces & raccourcis',
        subtitle: 'Tout ce qui rend votre expérience plus rapide et plus agréable.',
        shortcuts: [
            { key: 'Échap', desc: 'Fermer n\'importe quel modal ouvert' },
            { key: 'Clic extérieur', desc: 'Fermer un modal en cliquant dehors' },
            { key: 'Entrée', desc: 'Valider un formulaire (login, ajout tâche/créneau)' },
        ],
        actions: [
            {
                title: 'Désélectionner une tâche dans la palette',
                desc: 'Si vous avez sélectionné une tâche (contour doré) et que vous ne voulez plus assigner, cliquez une nouvelle fois sur cette même tâche dans la palette pour la désélectionner. Vous pouvez aussi sélectionner une autre tâche directement.'
            },
            {
                title: 'Modifier une tâche existante',
                desc: 'Dans "Mes Tâches", cliquez sur l\'icône crayon ✏️ d\'une carte pour éditer son nom, type ou couleur. La modification est immédiate dans tout l\'emploi du temps.'
            },
            {
                title: 'Compte oublié ? Réinitialiser le mot de passe',
                desc: 'Sur la page de connexion, cliquez sur "Mot de passe oublié ?" en bas du formulaire. Entrez votre email — un lien de réinitialisation valable 1 heure vous sera envoyé. Cliquez sur le lien dans l\'email pour choisir un nouveau mot de passe.'
            },
            {
                title: 'L\'application est responsive (mobile)',
                desc: 'Jadwal fonctionne sur smartphone et tablette. Sur mobile, la navigation se trouve en bas de l\'écran (barre inférieure). La sidebar est accessible via le bouton menu ☰ en haut à gauche. Le drag & drop fonctionne également sur écran tactile.'
            }
        ],
        tip: '<strong>Performance :</strong> Toutes les données sont chargées en parallèle lors de l\'ouverture de l\'application. Si quelque chose semble ne pas se charger, rafraîchissez la page (F5 ou Ctrl+R) — votre planning est toujours sauvegardé.'
    }
];

let currentGuideStep = 0;
let completedGuideSteps = new Set();

function renderGuideStepsNav() {
    const nav = document.getElementById('guide-steps-nav');
    if (!nav) return;
    nav.innerHTML = GUIDE_STEPS.map((step, i) => `
        <button class="guide-step-pill ${i === currentGuideStep ? 'active' : ''} ${completedGuideSteps.has(i) && i !== currentGuideStep ? 'completed' : ''}"
                onclick="goToGuideStep(${i})"
                aria-label="Étape ${i + 1} : ${step.title}">
            <span class="pill-num">${completedGuideSteps.has(i) && i !== currentGuideStep ? '✓' : i + 1}</span>
            ${step.icon}
            <span style="display:none;font-size:0.7rem">${step.title.split('—')[0].trim()}</span>
        </button>
    `).join('');
}

function renderGuideStepContent() {
    const el = document.getElementById('guide-step-content');
    if (!el) return;
    const step = GUIDE_STEPS[currentGuideStep];

    let bodyHtml = '';

    // Actions list
    if (step.actions && step.actions.length) {
        bodyHtml += `<div class="guide-section-label">Comment faire</div>`;
        bodyHtml += `<div class="guide-actions">`;
        step.actions.forEach((action, i) => {
            bodyHtml += `
                <div class="guide-action">
                    <div class="guide-action-num">${i + 1}</div>
                    <div class="guide-action-content">
                        <div class="guide-action-title">${action.title}</div>
                        <div class="guide-action-desc">${action.desc}</div>
                    </div>
                </div>`;
        });
        bodyHtml += `</div>`;
    }

    // Shortcuts
    if (step.shortcuts && step.shortcuts.length) {
        bodyHtml += `<div class="guide-section-label">Raccourcis clavier</div>`;
        bodyHtml += `<div class="guide-shortcuts">`;
        step.shortcuts.forEach(sc => {
            bodyHtml += `<div class="guide-shortcut"><kbd>${sc.key}</kbd><span>${sc.desc}</span></div>`;
        });
        bodyHtml += `</div>`;
    }

    // Tip
    if (step.tip) {
        bodyHtml += `
            <div class="guide-tip-box">
                <div class="guide-tip-icon">💡</div>
                <div class="guide-tip-text">${step.tip}</div>
            </div>`;
    }

    // Warning
    if (step.warn) {
        bodyHtml += `
            <div class="guide-warn-box">
                <div class="guide-tip-icon">⚠️</div>
                <div class="guide-warn-text">${step.warn}</div>
            </div>`;
    }

    // Last step: quick nav summary
    if (currentGuideStep === GUIDE_STEPS.length - 1) {
        bodyHtml += `
            <div class="guide-section-label" style="margin-top:0.5rem">Accès rapide aux sections</div>
            <div class="guide-summary-grid">
                <div class="guide-summary-card" onclick="showPanel('schedule');updateMobileNav('schedule')">
                    <div class="guide-summary-icon">🗓️</div>
                    <div class="guide-summary-title">Emploi du Temps</div>
                    <div class="guide-summary-desc">Vue semaine, assignation, suivi</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('tasks');updateMobileNav('tasks')">
                    <div class="guide-summary-icon">📚</div>
                    <div class="guide-summary-title">Mes Tâches</div>
                    <div class="guide-summary-desc">Créer et gérer vos matières</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('timeslots');updateMobileNav('timeslots')">
                    <div class="guide-summary-icon">🕐</div>
                    <div class="guide-summary-title">Créneaux Horaires</div>
                    <div class="guide-summary-desc">Plages de temps disponibles</div>
                </div>
                <div class="guide-summary-card" onclick="showPanel('autogen');updateMobileNav('autogen')">
                    <div class="guide-summary-icon">⚡</div>
                    <div class="guide-summary-title">Génération Auto</div>
                    <div class="guide-summary-desc">Planning automatique</div>
                </div>
            </div>`;
    }

    const stepNum = currentGuideStep + 1;
    const totalSteps = GUIDE_STEPS.length;

    el.innerHTML = `
        <div class="guide-step-card">
            <div class="guide-step-header">
                <div class="guide-step-icon">${step.icon}</div>
                <div class="guide-step-meta">
                    <div class="guide-step-num">Étape ${stepNum} / ${totalSteps}</div>
                    <div class="guide-step-title">${step.title}</div>
                    <div class="guide-step-subtitle">${step.subtitle}</div>
                </div>
            </div>
            <div class="guide-step-body">${bodyHtml}</div>
        </div>`;

    // Update nav buttons
    const prevBtn = document.getElementById('guide-prev-btn');
    const nextBtn = document.getElementById('guide-next-btn');
    if (prevBtn) prevBtn.style.display = currentGuideStep === 0 ? 'none' : '';
    if (nextBtn) {
        if (currentGuideStep === GUIDE_STEPS.length - 1) {
            nextBtn.textContent = '✓ Terminer le guide';
            nextBtn.onclick = () => { showPanel('schedule'); updateMobileNav('schedule'); toast('Guide terminé — bon planning ! 🗓️', 'success'); };
        } else {
            nextBtn.textContent = 'Suivant →';
            nextBtn.onclick = guideNext;
        }
    }
}

function goToGuideStep(index) {
    completedGuideSteps.add(currentGuideStep);
    currentGuideStep = index;
    renderGuideStepsNav();
    renderGuideStepContent();
    document.getElementById('guide-step-content')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function guideNext() {
    if (currentGuideStep < GUIDE_STEPS.length - 1) {
        goToGuideStep(currentGuideStep + 1);
    }
}

function guidePrev() {
    if (currentGuideStep > 0) {
        goToGuideStep(currentGuideStep - 1);
    }
}

// ── Invocation overlay for the guide ──────────────────────────────────────
function showGuideInvocation(callback) {
    const overlay = document.createElement('div');
    overlay.id = 'guide-invocation-overlay';
    overlay.innerHTML = `
        <div class="giv-card">
            <div class="giv-bismillah">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</div>
            <div class="giv-dua-block">
                <p class="giv-arabic">رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي</p>
                <p class="giv-transliteration">Rabbish-raḥ lī ṣadrī, wa yassir lī amrī, waḥlul ʿuqdatan min lisānī, yafqahū qawlī.</p>
            </div>
            <div class="giv-separator"><span>✦</span></div>
            <div class="giv-dua-block">
                <p class="giv-arabic">اللَّهُمَّ لاَ سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا، وَأَنْتَ تَجْعَلُ الحَزْنَ إِذَا شِئْتَ سَهْلًا</p>
                <p class="giv-transliteration">Allāhumma lā sahla illā mā jaʿaltahu sahlan, wa anta tajʿalul-ḥazna idhā shiʾta sahlā.</p>
            </div>
            <button class="giv-btn" id="giv-start-btn">Commencer le guide →</button>
        </div>`;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('giv-visible'));

    document.getElementById('giv-start-btn').addEventListener('click', () => {
        overlay.classList.remove('giv-visible');
        overlay.classList.add('giv-hiding');
        setTimeout(() => { overlay.remove(); callback(); }, 500);
    });
}

// Override showPanel to init guide when opened
const _origShowPanel = window.showPanel;
window.showPanel = function (name) {
    _origShowPanel(name);
    if (name === 'guide') {
        currentGuideStep = 0;
        completedGuideSteps = new Set();
        showGuideInvocation(() => {
            renderGuideStepsNav();
            renderGuideStepContent();
        });
    }
};
// ── Contact Panel (EmailJS) ────────────────────────────────────────────────
function sendContactEmail() {
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const msgEl = document.getElementById('contact-msg');
    const btn = document.getElementById('contact-submit');
    const btnText = document.getElementById('contact-btn-text');

    msgEl.innerHTML = '';

    if (!name || !email || !message) {
        msgEl.innerHTML = '<span style="color:var(--danger);font-size:0.83rem;">Veuillez remplir tous les champs.</span>';
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        msgEl.innerHTML = '<span style="color:var(--danger);font-size:0.83rem;">Email invalide.</span>';
        return;
    }

    btn.disabled = true;
    btnText.textContent = 'Envoi en cours…';

    emailjs.send(
        'service_aehzd58',
        'template_gphnkq4',
        { from_name: name, from_email: email, message: message, to_name: 'Fechetah Makhlouf' }
    ).then(() => {
        msgEl.innerHTML = '<span style="color:#22c55e;font-size:0.83rem;">✅ Message envoyé avec succès ! Merci.</span>';
        btnText.textContent = 'Envoyé ✓';
        document.getElementById('contact-message').value = '';
        setTimeout(() => {
            btn.disabled = false;
            btnText.textContent = 'Envoyer →';
            msgEl.innerHTML = '';
        }, 4000);
    }).catch(err => {
        console.error('EmailJS error:', err);
        msgEl.innerHTML = '<span style="color:var(--danger);font-size:0.83rem;">Erreur lors de l\'envoi. Veuillez réessayer.</span>';
        btn.disabled = false;
        btnText.textContent = 'Envoyer →';
    });
}
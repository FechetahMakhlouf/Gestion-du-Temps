let currentWeekOffset = 0;
let selectedSubjectId = null;
let interactionMode = 'click';
let currentActiveDays = [];

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
        setTimeout(() => {
            msgEl.innerHTML = '';
        }, 2000);
        setTimeout(() => {
            startApp();
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        }, 500);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pwd = document.getElementById('reg-password').value;
    const confirmPwd = document.getElementById('reg-confirm-password').value;
    const msgEl = document.getElementById('reg-msg');

    if (!name || !email || !pwd || !confirmPwd) {
        showMsg(msgEl, 'Remplissez tous les champs.', 'error');
        return;
    }
    if (pwd.length < 6) {
        showMsg(msgEl, 'Mot de passe trop court (min 6 caractères).', 'error');
        return;
    }
    if (pwd !== confirmPwd) {
        showMsg(msgEl, 'Les mots de passe ne correspondent pas.', 'error');
        return;
    }

    try {
        await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password: pwd })
        });

        showMsg(msgEl, 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success');

        setTimeout(() => {
            msgEl.innerHTML = '';
        }, 2000);

        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-confirm-password').value = '';

        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('login-msg').innerHTML = '';
        }, 1500);
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

// Palette
async function renderPalette() {
    const subjects = await apiCall('/api/subjects');
    const el = document.getElementById('palette-chips');
    const cellChips = document.getElementById('cell-modal-chips');
    if (!subjects.length) {
        el.innerHTML = `<span style="font-size:0.78rem;color:var(--text-muted)">Aucune matière — allez dans "Mes Matières" pour en ajouter</span>`;
        if (cellChips) cellChips.innerHTML = '';
        return;
    }
    const chipHtml = (forModal) => subjects.map(s => `
        <div class="subject-chip ${!forModal && s.id === selectedSubjectId ? 'selected' : ''}"
             style="background:${hexAlpha(s.color, 0.18)};color:${s.color};border-left-color:${s.color}"
             draggable="true"
             ondragstart="onChipDragStart(event,'${s.id}')"
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

// Schedule Grid — Day-Card Timeline Layout
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
    const timeslots = await apiCall('/api/timeslots');
    const weekDays = getWeekDays();
    const subjects = await apiCall('/api/subjects');
    const sched = await apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`);

    if (weekDays.length) {
        const first = weekDays[0].dateStr;
        const last = weekDays[weekDays.length - 1].dateStr;
        document.getElementById('week-label').textContent = `${first} – ${last}`;
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

        html += `<div class="day-card ${isToday ? 'day-card-today' : ''}">
            <div class="day-header">
                <span class="day-name">${dayAbbr} <span class="day-date-badge">${dayObj.date.getDate()}</span></span>
                <div class="day-tags">
                    ${isToday ? '<span class="day-tag tag-today">Aujourd\'hui</span>' : ''}
                    <button class="reset-day-btn" title="Réinitialiser" onclick="resetDayDone('${dayAbbr}')">↺</button>
                </div>
            </div>
            <div class="timeline">`;

        timeslots.forEach(ts => {
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
                            title="Marquer comme fait">${isDone ? '✓' : '○'}</button>
                        <button class="delete-event-btn-inline"
                            onclick="event.stopPropagation();removeEvent('${dayAbbr}','${ts.id}')"
                            title="Supprimer">✕</button>
                    </div>
                </div>`;
            } else {
                html += `<div class="block-content block-empty"
                    ondragover="event.preventDefault();this.classList.add('drag-over')"
                    ondragleave="this.classList.remove('drag-over')"
                    ondrop="this.classList.remove('drag-over');onDrop(event,'${dayAbbr}','${ts.id}')"
                    onclick="handleCellClick('${dayAbbr}','${ts.id}')">
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
        if (btn) { btn.classList.remove('done'); btn.textContent = '○'; }
    } else {
        localStorage.setItem(doneKey, '1');
        block.classList.add('completed');
        if (btn) { btn.classList.add('done'); btn.textContent = '✓'; }
    }
}

function resetDayDone(dayAbbr) {
    // Remove all done states for this day in current week
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`done_${currentWeekOffset}_${dayAbbr}_`)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    // Re-render to refresh UI
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

// Drag & Drop
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
    for (let key in sched) {
        const parts = key.split('_');
        if (parts.length === 3) {
            await apiCall('/api/schedule/remove', {
                method: 'POST',
                body: JSON.stringify({ weekOffset: currentWeekOffset, day: parts[1], timeslotId: parts[2] })
            });
        }
    }
    await renderScheduleGrid();
    toast('Emploi du temps vidé', 'info');
}

function checkConflicts() {
    document.getElementById('conflict-badge').style.display = 'none';
}

// Timeslots
function openTimeslotModal() {
    document.getElementById('ts-msg').innerHTML = '';
    document.getElementById('timeslot-modal').classList.add('open');
}

async function saveTimeslot() {
    const start = document.getElementById('ts-start').value;
    const end = document.getElementById('ts-end').value;
    const msgEl = document.getElementById('ts-msg');
    if (!start || !end) { showMsg(msgEl, 'Remplissez les deux champs.', 'error'); return; }
    if (start >= end) { showMsg(msgEl, 'L\'heure de fin doit être après le début.', 'error'); return; }
    try {
        await apiCall('/api/timeslots', {
            method: 'POST',
            body: JSON.stringify({ start, end })
        });
        closeModal('timeslot-modal');
        await renderTimeslots();
        await renderScheduleGrid();
        toast('Créneau ajouté ✓', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function deleteTimeslot(id) {
    try {
        await apiCall(`/api/timeslots/${id}`, { method: 'DELETE' });
        await renderTimeslots();
        await renderScheduleGrid();
        toast('Créneau supprimé', 'info');
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function renderTimeslots() {
    const ts = await apiCall('/api/timeslots');
    const el = document.getElementById('timeslots-list');
    if (!ts.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-title">Aucun créneau</div></div>`;
        return;
    }
    el.innerHTML = ts.map(t => `
        <div class="timeslot-row">
            <span class="timeslot-time">${t.start} → ${t.end}</span>
            <span class="meta-badge">${durationStr(t.start, t.end)}</span>
            <button class="icon-btn danger" onclick="deleteTimeslot('${t.id}')">🗑</button>
        </div>
    `).join('');
}

function durationStr(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + 'm' : ''}` : `${mins}min`;
}

// Days configuration
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
    await apiCall('/api/days', {
        method: 'PUT',
        body: JSON.stringify(active)
    });
    await renderDaysCheckboxes();
    await renderScheduleGrid();
}

// Auto-generate – corrected versions

async function renderAutogenGrid() {
    const subjects = await apiCall('/api/subjects');
    const config = await apiCall('/api/autogen');
    const grid = document.getElementById('autogen-grid');
    if (!subjects.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-title">Aucune matière définie</div></div>`;
        return;
    }

    grid.innerHTML = subjects.map(s => {
        const hours = config[s.id] || 0;
        return `
            <div class="autogen-row" style="border-left:3px solid ${s.color}">
                <span style="flex:1; font-size:0.85rem; font-weight:600; color:${s.color}">${s.name}</span>
                <span style="font-size:0.72rem; color:var(--text-muted)">h/sem</span>
                <input class="form-input" type="number" min="0" max="40" step="0.5"
                       value="${hours}"
                       data-subj-id="${s.id}">
            </div>
        `;
    }).join('');

}

async function autoGenerate() {
    const rows = document.querySelectorAll('#autogen-grid .autogen-row');
    const newConfig = {};

    rows.forEach(row => {
        const input = row.querySelector('input[data-subj-id]');
        if (!input) return;
        const subjId = input.dataset.subjId;
        const hours = parseFloat(input.value) || 0;
        if (hours > 0) {
            newConfig[subjId] = hours;
        }
    });

    await apiCall('/api/autogen', {
        method: 'PUT',
        body: JSON.stringify(newConfig)
    });

    const result = await apiCall('/api/autogen/generate?weekOffset=' + currentWeekOffset, {
        method: 'POST'
    });

    document.getElementById('autogen-result').textContent =
        `✓ Planning généré : ${result.assigned} créneaux assignés.`;
    toast('Planning généré ✓', 'success');
    showPanel('schedule');
    await renderScheduleGrid();
}


// Export
async function exportSchedule() {
    const win = window.open('', '_blank');
    const subjects = await apiCall('/api/subjects');
    const sched = await apiCall(`/api/schedule?weekOffset=${currentWeekOffset}`);
    const timeslots = await apiCall('/api/timeslots');
    const days = await apiCall('/api/days');
    const user = await apiCall('/api/auth/me');

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

// Utils
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
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

window.addEventListener('DOMContentLoaded', async () => {
    // Check for password reset token in URL
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    if (resetToken) {
        // Clean URL without reloading
        window.history.replaceState({}, '', window.location.pathname);
        showResetForm(resetToken);
        return;
    }

    try {
        const user = await apiCall('/api/auth/me');
        if (user) {
            await startApp();
        } else {
            document.getElementById('auth-page').style.display = 'flex';
        }
    } catch (e) {
        document.getElementById('auth-page').style.display = 'flex';
    }
});

// ── Forgot / Reset password ──────────────────────────────────────────────────

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
    document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
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
}

async function doForgotPassword() {
    const email = document.getElementById('forgot-email').value.trim().toLowerCase();
    const msgEl = document.getElementById('forgot-msg');
    if (!email) { showMsg(msgEl, 'Entrez votre adresse email.', 'error'); return; }
    try {
        const res = await apiCall('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        showMsg(msgEl, res.message || 'Si cet email existe, un lien a été envoyé.', 'success');
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
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
    try {
        const res = await apiCall('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password: pwd })
        });
        showMsg(msgEl, res.message || 'Mot de passe mis à jour !', 'success');
        setTimeout(() => showLoginForm(null), 2000);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function renderAll() {
    await renderSubjectsPanel();
    await renderPalette();
    await renderScheduleGrid();
    await renderTimeslots();
    await renderDaysCheckboxes();
    await renderAutogenGrid();
}
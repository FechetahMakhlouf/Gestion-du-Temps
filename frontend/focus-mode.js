/* ═══════════════════════════════════════════════════════════════════════
   JADWAL — Focus Mode
   Lets the user concentrate on one task at a time with a distraction-free
   full-screen overlay.

   Public surface (called from index.html / script.js):
     enterFocusMode()      — activate focus overlay
     exitFocusMode()       — deactivate and clean up
     toggleFocusMode()     — toggle (used by button + keyboard shortcut)
     restoreFocusState()   — called on DOMContentLoaded
═══════════════════════════════════════════════════════════════════════ */

/* ── Internal state ─────────────────────────────────────────────────── */

const FM = {
    active: false,           // is the overlay visible?
    paused: false,           // countdown display paused (Space key)
    intervalId: null,        // setInterval handle for countdown
    currentTask: null,       // { subject, timeslot, dayAbbr, date }
    notified5min: false,     // flag: "5 minutes remaining" fired?
    notifiedStart: false,    // flag: "session started" fired?
    shortcutHandler: null,   // reference to keydown listener for cleanup
    STORAGE_KEY: 'jadwal_focus_state',
    PREFS_KEY:   'jadwal_focus_prefs',
};

/* ── Default user preferences ───────────────────────────────────────── */

const FM_DEFAULT_PREFS = {
    darkBackground:  true,
    largeTypography: false,
    hideCountdown:   false,
    ambientGradient: true,
    autoEnter:       false,
};

/* ── Motivational messages ──────────────────────────────────────────── */

const FM_QUOTES = [
    'Restez concentré.',
    'Chaque minute compte.',
    'Vous êtes capable.',
    'Un pas à la fois.',
    'La régularité crée l\'excellence.',
    'Moins de distractions, plus de résultats.',
    'Focalisez-vous sur maintenant.',
    'Le succès est une habitude.',
    'Allez, vous pouvez le faire !',
    'Gardez le cap.',
];

function _randomQuote() {
    return FM_QUOTES[Math.floor(Math.random() * FM_QUOTES.length)];
}

/* ══════════════════════════════════════════════════════════════════════
   PREFERENCES  (localStorage)
══════════════════════════════════════════════════════════════════════ */

function loadFocusPreferences() {
    try {
        const raw = localStorage.getItem(FM.PREFS_KEY);
        return raw ? { ...FM_DEFAULT_PREFS, ...JSON.parse(raw) } : { ...FM_DEFAULT_PREFS };
    } catch {
        return { ...FM_DEFAULT_PREFS };
    }
}

function saveFocusPreferences(prefs) {
    try {
        localStorage.setItem(FM.PREFS_KEY, JSON.stringify(prefs));
    } catch { /* quota exceeded — silently ignore */ }
}

/* ══════════════════════════════════════════════════════════════════════
   TASK RESOLUTION
   Uses the same data the schedule grid already loaded: window.apiCall
   to /api/timeslots, /api/subjects, /api/schedule?weekOffset=0
══════════════════════════════════════════════════════════════════════ */

/**
 * Convert "HH:MM" string to minutes since midnight.
 */
function _timeToMinutes(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
}

/**
 * Return today's abbreviated day name matching the backend convention.
 * Backend uses: Dim Lun Mar Mer Jeu Ven Sam  (JS getDay() 0–6)
 */
function _todayAbbr() {
    const ABBRS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return ABBRS[new Date().getDay()];
}

/**
 * Fetch today's timeslots+schedule entries and return an array of
 * task objects sorted by start time:
 *   { subject, timeslot, dayAbbr, startMin, endMin }
 */
async function _fetchTodayTasks() {
    try {
        const [timeslots, subjects, sched] = await Promise.all([
            window.apiCall('/api/timeslots'),
            window.apiCall('/api/subjects'),
            window.apiCall('/api/schedule?weekOffset=0'),
        ]);

        const todayAbbr = _todayAbbr();

        // Timeslots active today
        const todaySlots = timeslots.filter(ts =>
            !ts.days || ts.days.length === 0 || ts.days.includes(todayAbbr)
        );

        const tasks = [];
        for (const ts of todaySlots) {
            const key     = `0_${todayAbbr}_${ts.id}`;
            const subjId  = sched[key];
            if (!subjId) continue;
            const subject = subjects.find(s => s.id === subjId);
            if (!subject) continue;
            tasks.push({
                subject,
                timeslot:  ts,
                dayAbbr:   todayAbbr,
                startMin:  _timeToMinutes(ts.start),
                endMin:    _timeToMinutes(ts.end),
            });
        }

        // Sort by start time ascending
        tasks.sort((a, b) => a.startMin - b.startMin);
        return tasks;
    } catch {
        return [];
    }
}

/**
 * Return the currently active task (now falls within [start, end)),
 * or null if none is active.
 */
async function getCurrentTask() {
    const tasks  = await _fetchTodayTasks();
    const nowMin = _nowMinutes();
    return tasks.find(t => nowMin >= t.startMin && nowMin < t.endMin) || null;
}

/**
 * Return the next upcoming task after now, or null.
 */
async function getNextTask() {
    const tasks  = await _fetchTodayTasks();
    const nowMin = _nowMinutes();
    return tasks.find(t => t.startMin > nowMin) || null;
}

/** Minutes since midnight for right now. */
function _nowMinutes() {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
}

/* ══════════════════════════════════════════════════════════════════════
   OVERLAY RENDERING
══════════════════════════════════════════════════════════════════════ */

function _formatHHMM(hhmm) {
    // returns "09:00" unchanged — already formatted from API
    return hhmm || '—';
}

/** Format seconds → "HH:MM:SS" */
function _fmtCountdown(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Return elapsed and remaining seconds for the current task. */
function _taskProgress(task) {
    const nowSec     = new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds();
    const startSec   = task.startMin * 60;
    const endSec     = task.endMin   * 60;
    const totalSec   = endSec - startSec;
    const elapsedSec = Math.max(0, nowSec - startSec);
    const remainSec  = Math.max(0, endSec - nowSec);
    const pct        = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;
    return { totalSec, elapsedSec, remainSec, pct };
}

/**
 * Build (or update) the full-screen overlay DOM.
 * Creates the element once, then updateCountdown() patches individual nodes.
 */
function renderFocusOverlay(task, nextTask) {
    // Remove stale overlay if any
    const old = document.getElementById('focus-overlay');
    if (old) old.remove();

    const prefs = loadFocusPreferences();
    const overlay = document.createElement('div');
    overlay.id = 'focus-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Mode Focus');

    // Apply preference classes
    if (prefs.darkBackground)  overlay.classList.add('fm-dark');
    if (prefs.largeTypography) overlay.classList.add('fm-large');
    if (prefs.ambientGradient && task) overlay.classList.add('fm-gradient');

    /* ── Build inner content ── */
    if (!task) {
        // Empty state — no active task
        overlay.innerHTML = _buildEmptyState(nextTask);
    } else {
        const { remainSec, pct } = _taskProgress(task);
        const now = new Date();
        const nowStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        overlay.innerHTML = `
            <div class="fm-inner" role="main">
                <!-- Live clock -->
                <div class="fm-clock" id="fm-clock" aria-live="off">${nowStr}</div>

                <!-- Task info -->
                <div class="fm-task-block">
                    <div class="fm-task-emoji" style="color:${task.subject.color}" aria-hidden="true">
                        ${task.subject.name.match(/^\p{Emoji}/u)?.[0] || '📚'}
                    </div>
                    <div class="fm-task-name" style="border-bottom-color:${task.subject.color}">
                        ${_escHtml(task.subject.name)}
                    </div>
                    <div class="fm-task-type">${_escHtml(task.subject.type || '')}</div>
                    <div class="fm-task-time">
                        <span>${_formatHHMM(task.timeslot.start)}</span>
                        <span class="fm-time-arrow">→</span>
                        <span>${_formatHHMM(task.timeslot.end)}</span>
                    </div>
                </div>

                <!-- Countdown -->
                <div class="fm-countdown-section ${prefs.hideCountdown ? 'fm-hidden' : ''}">
                    <div class="fm-countdown" id="fm-countdown"
                         aria-live="polite" aria-atomic="true">
                        ${_fmtCountdown(remainSec)}
                    </div>
                    <div class="fm-countdown-label">restant</div>
                </div>

                <!-- Progress bar -->
                <div class="fm-progress-wrap" role="progressbar"
                     aria-valuemin="0" aria-valuemax="100"
                     aria-valuenow="${Math.round(pct)}"
                     id="fm-progressbar">
                    <div class="fm-progress-track">
                        <div class="fm-progress-fill" id="fm-progress-fill"
                             style="width:${pct}%; background:${task.subject.color}"></div>
                    </div>
                    <div class="fm-progress-label">
                        <span id="fm-pct">${Math.round(pct)}%</span>
                    </div>
                </div>

                <!-- Motivational quote -->
                <div class="fm-quote" id="fm-quote" aria-live="off">${_randomQuote()}</div>

                <!-- Settings toggle row -->
                <div class="fm-settings-row">
                    <button class="fm-settings-btn" onclick="toggleFocusSettings()"
                            aria-expanded="false" id="fm-settings-toggle"
                            aria-label="Paramètres du mode focus">
                        ⚙ Options
                    </button>
                </div>

                <!-- Settings panel (hidden by default) -->
                <div class="fm-settings-panel" id="fm-settings-panel" hidden>
                    ${_buildSettingsHTML(prefs)}
                </div>

                <!-- Exit button -->
                <button class="fm-exit-btn" onclick="exitFocusMode()"
                        aria-label="Quitter le mode focus">
                    ✕ Quitter le focus
                </button>
            </div>
        `;
    }

    document.body.appendChild(overlay);

    // Trap focus inside overlay (accessibility)
    _trapFocus(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('fm-visible'));
}

function _buildEmptyState(nextTask) {
    let nextHtml = '';
    if (nextTask) {
        nextHtml = `
            <div class="fm-next-task">
                <div class="fm-next-label">Prochaine tâche :</div>
                <div class="fm-next-name" style="color:${nextTask.subject.color}">
                    ${_escHtml(nextTask.subject.name)}
                </div>
                <div class="fm-next-time">à ${_formatHHMM(nextTask.timeslot.start)}</div>
            </div>
        `;
    } else {
        nextHtml = `<div class="fm-free-time">Profitez de votre temps libre !</div>`;
    }

    return `
        <div class="fm-inner fm-empty" role="main">
            <div class="fm-empty-icon" aria-hidden="true">🎉</div>
            <div class="fm-empty-title">Aucune tâche active</div>
            <div class="fm-empty-sub">Vous avez terminé pour le moment.</div>
            ${nextHtml}
            <button class="fm-exit-btn" onclick="exitFocusMode()"
                    aria-label="Quitter le mode focus">
                ✕ Quitter le focus
            </button>
        </div>
    `;
}

function _buildSettingsHTML(prefs) {
    const checkbox = (key, label) => `
        <label class="fm-pref-row">
            <input type="checkbox" class="fm-pref-check"
                   data-pref="${key}"
                   ${prefs[key] ? 'checked' : ''}
                   onchange="applyFocusPref(this)">
            <span>${label}</span>
        </label>
    `;
    return `
        <div class="fm-settings-title">Préférences du focus</div>
        ${checkbox('darkBackground',  '☾ Fond sombre')}
        ${checkbox('largeTypography', '𝐀 Grande typographie')}
        ${checkbox('hideCountdown',   '⏱ Masquer le compte à rebours')}
        ${checkbox('ambientGradient', '✨ Dégradé ambiant')}
        ${checkbox('autoEnter',       '▶ Entrer automatiquement au démarrage d\'une tâche')}
    `;
}

/* ══════════════════════════════════════════════════════════════════════
   LIVE COUNTDOWN
══════════════════════════════════════════════════════════════════════ */

function updateCountdown() {
    if (!FM.active || FM.paused || !FM.currentTask) return;

    const task = FM.currentTask;
    const { remainSec, pct } = _taskProgress(task);

    /* clock */
    const clockEl = document.getElementById('fm-clock');
    if (clockEl) {
        const n = new Date();
        clockEl.textContent = n.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }

    /* countdown */
    const cdEl = document.getElementById('fm-countdown');
    if (cdEl) cdEl.textContent = _fmtCountdown(remainSec);

    /* progress bar */
    const fillEl = document.getElementById('fm-progress-fill');
    const pctEl  = document.getElementById('fm-pct');
    const barEl  = document.getElementById('fm-progressbar');
    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl)  pctEl.textContent  = Math.round(pct) + '%';
    if (barEl)  barEl.setAttribute('aria-valuenow', Math.round(pct));

    /* notifications */
    _checkNotifications(remainSec);

    /* auto-advance when task ends */
    if (remainSec <= 0) {
        _advanceToNextTask();
    }
}

function updateProgress() {
    updateCountdown();  // unified call
}

/**
 * When the current task ends: find the next one and re-render,
 * or show the empty state.
 */
async function _advanceToNextTask() {
    // Stop interval briefly to avoid re-entrancy
    cleanupFocusMode(/* keepOverlay */ true);

    _fireNotification('✅ Tâche terminée !', 'success');

    const next = await getCurrentTask();
    FM.currentTask    = next || null;
    FM.notified5min   = false;
    FM.notifiedStart  = false;

    const upcoming = next ? null : await getNextTask();
    renderFocusOverlay(next, upcoming);

    if (next) {
        _startInterval();
        _fireNotification('▶ Votre session de focus a démarré.', 'info');
    }
}

/* ══════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════════════ */

function _checkNotifications(remainSec) {
    if (!FM.notifiedStart) {
        FM.notifiedStart = true;
        _fireNotification('▶ Votre session de focus a démarré.', 'info');
    }
    if (!FM.notified5min && remainSec <= 300 && remainSec > 0) {
        FM.notified5min = true;
        _fireNotification('⚠ 5 minutes restantes.', 'info');
    }
}

function _fireNotification(msg, type = 'info') {
    // Prefer browser Notification if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
            new Notification('Jadwal · Focus', { body: msg, icon: 'frontend/img/icon-192.png' });
        } catch { /* fallthrough to toast */ }
    }
    // Always also show in-app toast
    if (typeof toast === 'function') toast(msg, type);
}

function _requestNotifPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
}

/* ══════════════════════════════════════════════════════════════════════
   ENTER / EXIT / TOGGLE
══════════════════════════════════════════════════════════════════════ */

async function enterFocusMode() {
    if (FM.active) return;

    _requestNotifPermission();

    FM.active          = true;
    FM.paused          = false;
    FM.notified5min    = false;
    FM.notifiedStart   = false;

    // Hide the rest of the UI
    _hideAppUI();

    // Resolve current task
    FM.currentTask = await getCurrentTask();
    const nextTask = FM.currentTask ? null : await getNextTask();

    // Build overlay
    renderFocusOverlay(FM.currentTask, nextTask);

    // Persist state
    _saveFocusState(true);

    // Register shortcuts
    registerFocusShortcuts();

    // Start live countdown
    if (FM.currentTask) {
        _startInterval();
    }

    // Update toggle button
    _updateToggleBtn(true);
}

async function exitFocusMode() {
    if (!FM.active) return;

    FM.active = false;

    // Stop interval & shortcuts
    cleanupFocusMode();

    // Remove overlay
    const overlay = document.getElementById('focus-overlay');
    if (overlay) {
        overlay.classList.remove('fm-visible');
        setTimeout(() => overlay.remove(), 300);
    }

    // Restore app UI
    _showAppUI();

    // Persist
    _saveFocusState(false);

    // Update button
    _updateToggleBtn(false);
}

async function toggleFocusMode() {
    if (FM.active) {
        await exitFocusMode();
    } else {
        await enterFocusMode();
    }
}

/* ══════════════════════════════════════════════════════════════════════
   UI HIDE / RESTORE
══════════════════════════════════════════════════════════════════════ */

function _hideAppUI() {
    document.body.classList.add('focus-mode-active');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.setAttribute('aria-hidden', 'true');
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) mobileNav.setAttribute('aria-hidden', 'true');
}

function _showAppUI() {
    document.body.classList.remove('focus-mode-active');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.removeAttribute('aria-hidden');
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) mobileNav.removeAttribute('aria-hidden');
}

/* ══════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════════════════ */

function registerFocusShortcuts() {
    // Remove previous listener if any
    if (FM.shortcutHandler) {
        document.removeEventListener('keydown', FM.shortcutHandler);
    }
    FM.shortcutHandler = (e) => {
        // Don't fire when the user is typing in an input
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

        if (e.key === 'Escape' && FM.active) {
            exitFocusMode();
        } else if (e.key === ' ' && FM.active) {
            e.preventDefault();
            FM.paused = !FM.paused;
            const cd = document.getElementById('fm-countdown');
            if (cd) cd.classList.toggle('fm-paused', FM.paused);
        } else if ((e.key === 'f' || e.key === 'F') && !FM.active) {
            toggleFocusMode();
        }
    };
    document.addEventListener('keydown', FM.shortcutHandler);
}

/* ══════════════════════════════════════════════════════════════════════
   CLEANUP
══════════════════════════════════════════════════════════════════════ */

/**
 * Stop interval and unregister keyboard listeners.
 * @param {boolean} keepOverlay  If true, do NOT remove the listener
 *                               (called when auto-advancing tasks).
 */
function cleanupFocusMode(keepOverlay = false) {
    if (FM.intervalId) {
        clearInterval(FM.intervalId);
        FM.intervalId = null;
    }
    if (!keepOverlay && FM.shortcutHandler) {
        document.removeEventListener('keydown', FM.shortcutHandler);
        FM.shortcutHandler = null;
    }
}

function _startInterval() {
    cleanupFocusMode(/* keepOverlay */ true);
    FM.intervalId = setInterval(updateCountdown, 1000);
}

/* ══════════════════════════════════════════════════════════════════════
   PERSISTENCE
══════════════════════════════════════════════════════════════════════ */

function _saveFocusState(active) {
    try {
        localStorage.setItem(FM.STORAGE_KEY, JSON.stringify({ active }));
    } catch { /* quota exceeded */ }
}

/**
 * Called from script.js after the app is initialised.
 * If Focus Mode was active before a page reload, re-enter automatically.
 */
async function restoreFocusState() {
    try {
        const raw = localStorage.getItem(FM.STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (state?.active) {
            await enterFocusMode();
        }
    } catch { /* ignore */ }
}

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS PANEL (in-overlay)
══════════════════════════════════════════════════════════════════════ */

function toggleFocusSettings() {
    const panel  = document.getElementById('fm-settings-panel');
    const toggle = document.getElementById('fm-settings-toggle');
    if (!panel) return;
    const hidden = panel.hidden;
    panel.hidden = !hidden;
    if (toggle) toggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
}

function applyFocusPref(checkbox) {
    const key    = checkbox.dataset.pref;
    const prefs  = loadFocusPreferences();
    prefs[key]   = checkbox.checked;
    saveFocusPreferences(prefs);

    const overlay = document.getElementById('focus-overlay');
    if (!overlay) return;

    // Re-apply classes that don't require a full re-render
    if (key === 'darkBackground')  overlay.classList.toggle('fm-dark',     prefs.darkBackground);
    if (key === 'largeTypography') overlay.classList.toggle('fm-large',    prefs.largeTypography);
    if (key === 'ambientGradient') overlay.classList.toggle('fm-gradient', prefs.ambientGradient);
    if (key === 'hideCountdown') {
        const cdSec = overlay.querySelector('.fm-countdown-section');
        if (cdSec) cdSec.classList.toggle('fm-hidden', prefs.hideCountdown);
    }
    // autoEnter is passive — no live effect needed
}

/* ══════════════════════════════════════════════════════════════════════
   FOCUS TRAP  (accessibility)
══════════════════════════════════════════════════════════════════════ */

function _trapFocus(container) {
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const handler = (e) => {
        if (e.key !== 'Tab') return;
        const els   = [...container.querySelectorAll(focusable)].filter(el => !el.disabled);
        if (!els.length) return;
        const first = els[0];
        const last  = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    };
    container.addEventListener('keydown', handler);
    // Focus the first focusable element
    setTimeout(() => {
        const first = container.querySelector(focusable);
        if (first) first.focus();
    }, 100);
}

/* ══════════════════════════════════════════════════════════════════════
   FOCUS BUTTON (injected into the schedule panel header)
══════════════════════════════════════════════════════════════════════ */

function _updateToggleBtn(active) {
    const btn = document.getElementById('focus-mode-btn');
    if (!btn) return;
    btn.textContent = active ? '✕ Focus' : '⏱ Focus';
    btn.classList.toggle('fm-btn-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

/**
 * Inject the Focus Mode button into the schedule panel header.
 * Called once after the app initialises (from script.js).
 */
function injectFocusButton() {
    if (document.getElementById('focus-mode-btn')) return; // already injected

    const btn = document.createElement('button');
    btn.id          = 'focus-mode-btn';
    btn.className   = 'btn-secondary focus-mode-toggle-btn';
    btn.textContent = '⏱ Focus';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label',   'Activer le mode focus');
    btn.setAttribute('title',        'Mode Focus (raccourci : F)');
    btn.onclick     = () => toggleFocusMode();

    // Insert into the schedule panel header button group
    const headerBtnGroup = document.querySelector('#panel-schedule .panel-header > div:last-child');
    if (headerBtnGroup) {
        headerBtnGroup.insertBefore(btn, headerBtnGroup.firstChild);
    }
}

/* ══════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════ */

function _escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════════════════════
   EXPOSE to global scope so index.html onclick attributes can reach them
══════════════════════════════════════════════════════════════════════ */

window.enterFocusMode       = enterFocusMode;
window.exitFocusMode        = exitFocusMode;
window.toggleFocusMode      = toggleFocusMode;
window.restoreFocusState    = restoreFocusState;
window.injectFocusButton    = injectFocusButton;
window.toggleFocusSettings  = toggleFocusSettings;
window.applyFocusPref       = applyFocusPref;
window.getCurrentTask       = getCurrentTask;
window.getNextTask          = getNextTask;

/* tasks.js — free tasks (tasks without a timeslot)
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   FREE TASKS — Tasks without a timeslot (no chrono)
══════════════════════════════════════════════ */

const FREE_TASK_SWATCHES = [
  'var(--primary)', 'var(--primary-light)', 'var(--success)', 'var(--info)',
  'var(--danger)', '#A78BFA', '#FB923C', '#4ADE80',
];

let _freeTaskDay = null;
let _freeTaskWeekOffset = 0;
let _selectedFreeTaskColor = 'var(--primary)';

function _freeTaskColorValue(color) {
  if (!color.startsWith('var(')) return color;
  const token = color.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

/** Render the color swatches inside the Free Task modal */
function _renderFreeTaskSwatches() {
  const container = document.getElementById('free-task-color-swatches');
  if (!container) return;
  container.innerHTML = FREE_TASK_SWATCHES.map(c => `
    <div class="free-task-swatch${c === _selectedFreeTaskColor ? ' selected' : ''}"
         style="background:${c}"
         title="${c}"
         onclick="selectFreeTaskColor('${c}')"></div>
  `).join('');
  const native = document.getElementById('free-task-color-input');
  if (native) native.value = _freeTaskColorValue(_selectedFreeTaskColor);
}

/** Pick a color from swatches */
function selectFreeTaskColor(color) {
  _selectedFreeTaskColor = color;
  _renderFreeTaskSwatches();
}

/** Sync native color input → selected color */
function _initFreeTaskNativeColor() {
  const native = document.getElementById('free-task-color-input');
  if (!native) return;
  native.addEventListener('input', () => {
    _selectedFreeTaskColor = native.value;
    _renderFreeTaskSwatches();
  });
}

/**
 * Open the Free Task modal for a given day and week offset.
 * @param {string} dayAbbr  e.g. 'Lun'
 * @param {number} weekOffset
 */
async function openFreeTaskModal(dayAbbr, weekOffset) {
  ensureModal('free-task-modal');
  _freeTaskDay = dayAbbr || null;
  _freeTaskWeekOffset = weekOffset !== undefined ? weekOffset : currentWeekOffset;

  const label = document.getElementById('free-task-modal-day-label');
  if (label) label.textContent = dayAbbr ? `Tâches libres — ${dayAbbr}` : 'Tâches libres';

  const titleInput = document.getElementById('free-task-new-title');
  if (titleInput) { titleInput.value = ''; }

  const msgEl = document.getElementById('free-task-msg');
  if (msgEl) msgEl.innerHTML = '';

  _selectedFreeTaskColor = FREE_TASK_SWATCHES[0];
  _renderFreeTaskSwatches();

  document.getElementById('free-task-modal').classList.add('open');
  await renderFreeTaskModalList();
  setTimeout(() => titleInput && titleInput.focus(), 80);
}

/** Render the list of free tasks inside the modal */
async function renderFreeTaskModalList() {
  const listEl = document.getElementById('free-task-list');
  if (!listEl) return;

  let tasks = [];
  try {
    tasks = await Store.getFreeTasks(_freeTaskWeekOffset, _freeTaskDay);
  } catch (_) {
    tasks = [];
  }

  if (!tasks.length) {
    listEl.innerHTML = `<div class="free-task-modal-empty">Aucune tâche libre — ajoutez-en une ci-dessus.</div>`;
    return;
  }

  listEl.innerHTML = tasks.map(ft => `
    <div class="free-task-modal-item${ft.done ? ' done' : ''}" id="ftm-${ft.id}">
      <div class="free-task-modal-color-dot" style="background:${ft.color}"></div>
      <span class="free-task-modal-title" id="ftm-title-${ft.id}">${escHtml(ft.title)}</span>
      <div class="free-task-modal-actions">
        <button class="free-task-modal-done-btn${ft.done ? ' done' : ''}"
          onclick="toggleFreeTaskDone(${ft.id})"
          title="${ft.done ? 'Marquer comme non fait' : 'Marquer comme fait'}">
          ${ft.done ? '✓' : '○'}
        </button>
        <button class="free-task-modal-del-btn"
          onclick="deleteFreeTask(${ft.id})"
          title="Supprimer">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/** Add a free task from the modal */
async function addFreeTaskFromModal() {
  const titleInput = document.getElementById('free-task-new-title');
  const msgEl = document.getElementById('free-task-msg');
  const title = (titleInput?.value || '').trim();

  if (!title) {
    if (msgEl) showMsg(msgEl, 'Veuillez saisir un titre.', 'error');
    return;
  }

  try {
    await apiCall('/api/free-tasks', {
      method: 'POST',
      body: JSON.stringify({
        title,
        color: _selectedFreeTaskColor,
        day: _freeTaskDay,
        week_offset: _freeTaskWeekOffset,
      }),
    });
    Store.invalidateFreeTasks(_freeTaskWeekOffset, _freeTaskDay);
    if (titleInput) titleInput.value = '';
    if (msgEl) msgEl.innerHTML = '';
    await renderFreeTaskModalList();
    // Refresh the day card section in the schedule grid
    await _refreshFreeTasksInGrid(_freeTaskDay);
  } catch (err) {
    if (msgEl) showMsg(msgEl, 'Erreur lors de l\'ajout.', 'error');
  }
}

/** Toggle done state for a free task */
async function toggleFreeTaskDone(taskId) {
  const item = document.getElementById(`ftm-${taskId}`);
  const isDone = item && item.classList.contains('done');
  try {
    await apiCall(`/api/free-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ done: !isDone }),
    });
    Store.invalidateFreeTasks(_freeTaskWeekOffset, _freeTaskDay);
    Store.invalidateFreeTasks(currentWeekOffset, _freeTaskDay);
    await renderFreeTaskModalList();
    await _refreshFreeTasksInGrid(_freeTaskDay);
  } catch (_) {}
}

/** Delete a free task */
async function deleteFreeTask(taskId) {
  try {
    await apiCall(`/api/free-tasks/${taskId}`, { method: 'DELETE' });
    Store.invalidateFreeTasks(_freeTaskWeekOffset, _freeTaskDay);
    Store.invalidateFreeTasks(currentWeekOffset, _freeTaskDay);
    await renderFreeTaskModalList();
    await _refreshFreeTasksInGrid(_freeTaskDay);
  } catch (_) {}
}

/**
 * Re-render only the free-tasks section of a specific day card in the grid,
 * without re-fetching everything.
 */
async function _refreshFreeTasksInGrid(dayAbbr) {
  if (!dayAbbr) return;
  const sectionId = `free-tasks-section-${dayAbbr}`;
  const section = DOM.get(sectionId);
  if (!section) return;
  try {
    const tasks = await Store.getFreeTasks(currentWeekOffset, dayAbbr);
    section.innerHTML = _buildFreeTasksSectionHTML(dayAbbr, tasks);
    // Refresh chip count in header
    const chip = DOM.get(`free-chip-${dayAbbr}`);
    if (chip) {
      if (tasks.length > 0) {
        chip.textContent = `✎ ${tasks.length}`;
        chip.style.display = '';
      } else {
        chip.style.display = 'none';
      }
    }
  } catch (_) {}
}

/**
 * Build the inner HTML of the free-tasks-section for a day card.
 * @param {string} dayAbbr
 * @param {Array}  tasks
 */
function _buildFreeTasksSectionHTML(dayAbbr, tasks) {
  const items = tasks.length
    ? tasks.map(ft => `
      <div class="free-task-item${ft.done ? ' done' : ''}" id="ft-card-${ft.id}">
        <div class="free-task-color-dot" style="background:${ft.color}"></div>
        <span class="free-task-title">${escHtml(ft.title)}</span>
        <button class="free-task-done-btn${ft.done ? ' done' : ''}"
          onclick="event.stopPropagation();toggleFreeTaskDoneInCard(${ft.id},'${dayAbbr}')"
          title="${ft.done ? 'Marquer non fait' : 'Marquer fait'}">
          ${ft.done ? '✓' : '○'}
        </button>
        <button class="free-task-del-btn"
          onclick="event.stopPropagation();deleteFreeTaskInCard(${ft.id},'${dayAbbr}')"
          title="Supprimer">✕</button>
      </div>
    `).join('')
    : `<div class="free-tasks-empty">Aucune</div>`;

  return `
    <div class="free-tasks-header">
      <span class="free-tasks-label">📝 Tâches libres</span>
      <button class="free-tasks-add-btn"
        onclick="event.stopPropagation();openFreeTaskModal('${dayAbbr}',${currentWeekOffset})"
        title="Gérer les tâches libres de ${dayAbbr}">
        + Gérer
      </button>
    </div>
    ${items}
  `;
}

/** Toggle done directly from the day-card (without opening modal) */
async function toggleFreeTaskDoneInCard(taskId, dayAbbr) {
  const item = document.getElementById(`ft-card-${taskId}`);
  const isDone = item && item.classList.contains('done');
  try {
    await apiCall(`/api/free-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ done: !isDone }),
    });
    Store.invalidateFreeTasks(currentWeekOffset, dayAbbr);
    await _refreshFreeTasksInGrid(dayAbbr);
  } catch (_) {}
}

/** Delete directly from the day-card */
async function deleteFreeTaskInCard(taskId, dayAbbr) {
  try {
    await apiCall(`/api/free-tasks/${taskId}`, { method: 'DELETE' });
    Store.invalidateFreeTasks(currentWeekOffset, dayAbbr);
    await _refreshFreeTasksInGrid(dayAbbr);
  } catch (_) {}
}

// Initialise native color picker listener once DOM is ready

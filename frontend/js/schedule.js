/* schedule.js — week grid, drag & drop, timeslots, active days
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

let currentWeekOffset = 0;
let selectedSubjectId = null;
let interactionMode = "click";
let currentActiveDays = [];
let mobileScheduleDay = null;

/* ══════════════════════════════════════════════
   SCHEDULE GRID — Day-Card Timeline Layout
══════════════════════════════════════════════ */

const ALL_DAYS_MAP = { Dim: 1, Lun: 2, Mar: 3, Mer: 4, Jeu: 5, Ven: 6, Sam: 7 };

function getWeekDays() {
  const days = window.currentActiveDays || [
    "Dim",
    "Lun",
    "Mar",
    "Mer",
    "Jeu",
    "Ven",
    "Sam",
  ];
  const today = new Date();
  today.setDate(today.getDate() + currentWeekOffset * 7);
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);

  return days.map((dayAbbr) => {
    const dayIdx = ALL_DAYS_MAP[dayAbbr] || 1;
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + (dayIdx - 1));
    return {
      abbr: dayAbbr,
      date: d,
      dateStr: d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  });
}

function _isMobileSchedule() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function _defaultMobileDay(weekDays) {
  if (!weekDays.length) return null;
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
  return weekDays.find((day) => day.dateStr === today)?.abbr || weekDays[0].abbr;
}

function _visibleScheduleDays(weekDays) {
  if (!_isMobileSchedule()) return weekDays;
  if (!weekDays.some((day) => day.abbr === mobileScheduleDay)) {
    mobileScheduleDay = _defaultMobileDay(weekDays);
  }
  return weekDays.filter((day) => day.abbr === mobileScheduleDay);
}

function changeMobileScheduleDay(delta) {
  const allWeekDays = getWeekDays();
  const weekDays = _visibleScheduleDays(allWeekDays);
  if (!weekDays.length) return;
  const currentIndex = Math.max(
    0,
    weekDays.findIndex((day) => day.abbr === mobileScheduleDay),
  );
  const nextIndex = (currentIndex + delta + weekDays.length) % weekDays.length;
  mobileScheduleDay = weekDays[nextIndex].abbr;
  renderScheduleGrid();
}

function _mobileDayControlsHTML(weekDays) {
  if (!_isMobileSchedule() || weekDays.length < 2) return "";
  const index = weekDays.findIndex((day) => day.abbr === mobileScheduleDay);
  const selected = weekDays[index < 0 ? 0 : index];
  return `<div class="mobile-day-nav" role="group" aria-label="Navigation par jour">
    <button class="mobile-day-btn" onclick="changeMobileScheduleDay(-1)" aria-label="Jour précédent">←</button>
    <div class="mobile-day-label"><strong>${selected.abbr}</strong><span>${selected.dateStr}</span></div>
    <button class="mobile-day-btn" onclick="changeMobileScheduleDay(1)" aria-label="Jour suivant">→</button>
  </div>`;
}

function renderScheduleLegend(subjects) {
  const el = DOM.scheduleLegend;
  if (!subjects.length) {
    el.innerHTML = "";
    return;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   SCHEDULE RENDERING  —  granular / incremental  (Phase 2)
   ----------------------------------------------------------------------
   The old code had ONE giant renderScheduleGrid() that refetched
   everything and rewrote grid.innerHTML on every single change.

   It is now split into small units:

     renderSchedule()                  full rebuild (panel open, week
                                       change, timeslot/day changes)
     renderScheduleCell(...)           returns the HTML of ONE block
     updateScheduleCell(day, tsId)     repaints ONE block in place
     removeScheduleCell(day, tsId)     turns ONE block back to "empty"
     updateDayHeaderChips(day)         refreshes just a day's counters
     updateWeekFillBar()               refreshes just the progress bar

   Mutations (assign / remove / subtasks / done) touch only the affected
   element — no refetch, no full innerHTML replacement.

   renderScheduleGrid() is kept as a thin alias so existing callers and
   the productivity hook keep working.
   ══════════════════════════════════════════════════════════════════════ */

/* ── small helpers ─────────────────────────────────────────────────── */

const _cellKey = (day, tsId) => `${currentWeekOffset}_${day}_${tsId}`;
const _cellId = (day, tsId) => `blk_${currentWeekOffset}_${day}_${tsId}`;
const _doneKey = (day, tsId) => `done_${currentWeekOffset}_${day}_${tsId}`;

function _isCellDone(day, tsId) {
  return localStorage.getItem(_doneKey(day, tsId)) === "1";
}

/** Timeslots that are active on a given day. */
function _timeslotsForDay(timeslots, dayAbbr) {
  return timeslots.filter(
    (ts) => !ts.days || ts.days.length === 0 || ts.days.includes(dayAbbr),
  );
}

/* ══════════════════════════════════════════════
   CELL LEVEL
══════════════════════════════════════════════ */

/**
 * Inner markup of one block (everything after .block-time).
 * Pure function — no DOM access, no network.
 */
function _buildCellContentHTML(dayAbbr, ts, subj, blockSubtasks, isDone) {
  if (!subj) {
    return `<div class="block-content block-empty"
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

  const subtasks = blockSubtasks || [];
  const subtasksHtml = subtasks.length
    ? `<div class="block-subtasks">${subtasks
        .map(
          (st) =>
            `<span class="block-subtask-item" style="color:${subj.color}">• ${st.title}</span>`,
        )
        .join("")}</div>`
    : "";

  return `<div class="block-content"
                    style="background:${hexAlpha(subj.color, 0.18)};border-left:3px solid ${subj.color};color:${subj.color}"
                    ondragover="onDragOver(event)"
                    ondragleave="onDragLeave(event)"
                    ondrop="onDrop(event,'${dayAbbr}','${ts.id}')"
                    onclick="handleCellClick('${dayAbbr}','${ts.id}')">
                    <div class="block-content-inner">
                        <span>${subj.name}</span>
                        ${subtasksHtml}
                    </div>
                    <div class="block-actions">
                        <button class="subtask-mgr-btn"
                            onclick="event.stopPropagation();openSubtaskModal('${subj.id}','${subj.name.replace(/'/g, "\\'")}','${subj.color}','${dayAbbr}')"
                            aria-label="Gérer les sous-titres"
                            title="Sous-titres (${subtasks.length})">≡</button>
                        <button class="done-btn ${isDone ? "done" : ""}"
                            onclick="event.stopPropagation();toggleDoneBlock('${currentWeekOffset}','${dayAbbr}','${ts.id}')"
                            aria-label="${isDone ? "Marquer comme non fait" : "Marquer comme fait"}"
                            title="Marquer comme fait">${isDone ? "✓" : "○"}</button>
                    </div>
                </div>`;
}

/**
 * Full markup of one schedule block (used by the full render).
 * Pure function.
 */
function renderScheduleCell(dayAbbr, ts, subj, blockSubtasks, isDone) {
  return `<div class="block ${isDone ? "completed" : ""}" id="${_cellId(dayAbbr, ts.id)}">
                <div class="block-time">${ts.start}<br>→ ${ts.end}</div>
                ${_buildCellContentHTML(dayAbbr, ts, subj, blockSubtasks, isDone)}
            </div>`;
}

/**
 * Repaint ONE cell in place — the only DOM write is the block's
 * .block-content child.  Nothing else in the grid is touched.
 *
 * @param {string} day    day abbreviation, e.g. "Lun"
 * @param {string|number} tsId
 */
async function updateScheduleCell(day, tsId) {
  const block = DOM.cell(currentWeekOffset, day, tsId);
  if (!block) return; // grid not rendered / different week — nothing to do

  const timeslots = await Store.getTimeslots();
  const ts = timeslots.find((t) => String(t.id) === String(tsId));
  if (!ts) return;

  const sched = await Store.getSchedule(currentWeekOffset);
  const subjId = sched[_cellKey(day, tsId)];
  const subj = subjId
    ? appState.subjects.find((s) => String(s.id) === String(subjId))
    : null;

  let subtasks = [];
  if (subj) {
    try {
      subtasks = (await Store.getSubtasks(subj.id, day)) || [];
    } catch (_) {
      subtasks = [];
    }
  }

  const isDone = _isCellDone(day, tsId);
  block.classList.toggle("completed", isDone);

  const content = block.querySelector(".block-content");
  const html = _buildCellContentHTML(day, ts, subj, subtasks, isDone);
  if (content) {
    content.outerHTML = html;
  } else {
    block.insertAdjacentHTML("beforeend", html);
  }

  updateDayHeaderChips(day, timeslots, sched);
  updateWeekFillBar(timeslots, sched);
}

/**
 * Turn ONE cell back into its empty state.  The schedule cache must
 * already have the record removed (Store.patchScheduleRecord(..., null)).
 */
async function removeScheduleCell(day, tsId) {
  return updateScheduleCell(day, tsId);
}

/**
 * Repaint every visible cell that shows a given subject on a given day.
 * Used after subtask add / edit / delete / reorder so the block list
 * updates without rebuilding the grid.
 *
 * @param {string|number} subjectId
 * @param {string|null}   day  null → all days of the current week
 */
async function updateScheduleCellsForSubject(subjectId, day) {
  if (!DOM.scheduleGrid) return;
  const [timeslots, sched] = await Promise.all([
    Store.getTimeslots(),
    Store.getSchedule(currentWeekOffset),
  ]);

  const targets = [];
  Object.entries(sched).forEach(([key, sid]) => {
    if (String(sid) !== String(subjectId)) return;
    const parts = key.split("_"); // "<week>_<day>_<tsId>"
    if (parts.length !== 3) return;
    if (day && parts[1] !== day) return;
    targets.push([parts[1], parts[2]]);
  });

  await Promise.all(targets.map(([d, tsId]) => updateScheduleCell(d, tsId)));
  void timeslots;
}

/* ══════════════════════════════════════════════
   DAY / WEEK LEVEL (counters only — no rebuild)
══════════════════════════════════════════════ */

/** Refresh the "x/y" and "✓ n" chips of one day header. */
function updateDayHeaderChips(day, timeslots, sched) {
  const fillChip = DOM.get(`fill-chip-${day}`);
  const doneChip = DOM.get(`done-chip-${day}`);
  if (!fillChip && !doneChip) return;

  const dayTimeslots = _timeslotsForDay(timeslots, day);
  const filled = dayTimeslots.filter(
    (ts) => sched[`${currentWeekOffset}_${day}_${ts.id}`],
  ).length;
  const done = dayTimeslots.filter((ts) => _isCellDone(day, ts.id)).length;

  if (fillChip) fillChip.textContent = `${filled}/${dayTimeslots.length}`;
  if (doneChip) {
    doneChip.textContent = `✓ ${done}`;
    doneChip.style.display = done > 0 ? "" : "none";
  }
}

/** Refresh the week progress bar only. */
function updateWeekFillBar(timeslots, sched) {
  const fillBarEl = DOM.weekFillBar;
  const fillTrack = DOM.fillTrackInner;
  const fillLabel = DOM.fillLabel;
  if (!fillBarEl) return;

  const weekDays = getWeekDays();
  const totalSlots = weekDays.reduce(
    (acc, d) => acc + _timeslotsForDay(timeslots, d.abbr).length,
    0,
  );
  const assignedSlots = Object.keys(sched).length;

  if (totalSlots > 0) {
    fillBarEl.style.display = "flex";
    const pct = Math.round((assignedSlots / totalSlots) * 100);
    if (fillTrack) {
      fillTrack.style.width = pct + "%";
      fillTrack.style.background =
        pct >= 80 ? "var(--success)" : pct >= 40 ? "var(--primary)" : "var(--info)";
    }
    if (fillLabel)
      fillLabel.textContent = `${assignedSlots} / ${totalSlots} créneaux assignés (${pct}%)`;
  } else {
    fillBarEl.style.display = "none";
  }
}

/* ══════════════════════════════════════════════
   PRODUCTIVITY — decoupled from schedule rendering
   ----------------------------------------------
   Rendering the grid never touches /api/productivity.  The score is
   cached in appState.productivity (per week inside Store) and is only
   invalidated by writes that affect it: schedule entries, timeslots,
   subjects.  Done-toggles and subtasks do NOT affect the score.

   refreshProductivity() is a no-op when the card already shows the
   current, still-valid data.  When the cache holds the week's data it
   repaints without a request; otherwise it performs ONE fetch.
══════════════════════════════════════════════ */
let _prodShownKey = null;   // "<week>:<version>" currently painted
let _prodRefreshTimer = null;

async function refreshProductivity({ force = false } = {}) {
  const key = `${currentWeekOffset}:${Store.productivityVersion()}`;
  if (!force && key === _prodShownKey && Store.hasProductivity(currentWeekOffset)) {
    return; // card is up to date — nothing changed
  }
  if (force) Store.invalidateProductivity(currentWeekOffset);
  await renderProductivityCard();
  // Only remember the key if the data is now cached (fetch succeeded).
  _prodShownKey = Store.hasProductivity(currentWeekOffset)
    ? `${currentWeekOffset}:${Store.productivityVersion()}`
    : null;
}

/** Debounced variant for bursts of writes (e.g. drag & drop). */
function refreshProductivitySoon() {
  clearTimeout(_prodRefreshTimer);
  _prodRefreshTimer = setTimeout(() => refreshProductivity(), 250);
}

/* ══════════════════════════════════════════════
   FULL RENDER (only when the structure changes)
══════════════════════════════════════════════ */

async function renderSchedule() {
  const finishScheduleMeasure = window.appPerformance.span("schedule-rendering");
  // appState.subjects is always populated after bootstrap — read it directly.
  // Timeslots and schedule still need cache-or-fetch via Store.
  const subjects = appState.subjects;
  let timeslots, sched;
  try {
    [timeslots, sched] = await Promise.all([
      Store.getTimeslots(),
      Store.getSchedule(currentWeekOffset),
    ]);
  } catch (err) {
    // Obsolete week request — a newer render is already on its way.
    if (Store.isAbortError(err)) {
      finishScheduleMeasure();
      return;
    }
    throw err;
  }

  const allWeekDays = getWeekDays();
  const weekDays = _visibleScheduleDays(allWeekDays);

  // Pre-fetch free tasks for ALL displayed days in ONE request
  // (/api/free-tasks?weekOffset=…&days=Lun,Mar,…), then slice into
  // per-day buckets. Never one request per day.
  let _bulkFT = {};
  try {
    _bulkFT = await Store.getFreeTasksForDays(
      currentWeekOffset,
      weekDays.map((d) => d.abbr),
    );
  } catch (err) {
    // The week changed mid-flight: this render is obsolete, a newer one runs.
    if (Store.isAbortError(err)) {
      finishScheduleMeasure();
      return;
    }
    throw err;
  }
  const freeTasksByDay = {};
  weekDays.forEach((dayObj) => {
    freeTasksByDay[dayObj.abbr] =
      _bulkFT[`${currentWeekOffset}::${dayObj.abbr}`] || [];
  });

  // Pre-fetch subtasks: one request per distinct day (not per pair).
  const _dayToSubjectIds = {};
  const visibleDayNames = new Set(weekDays.map((day) => day.abbr));
  Object.entries(sched).forEach(([key, sid]) => {
    const dayAbbr = key.split("_")[1];
    if (!dayAbbr || !visibleDayNames.has(dayAbbr)) return;
    (_dayToSubjectIds[dayAbbr] = _dayToSubjectIds[dayAbbr] || new Set()).add(
      Number(sid),
    );
  });

  const subtasksCache = {};
  await Promise.all(
    Object.entries(_dayToSubjectIds).map(async ([dayAbbr, sidSet]) => {
      const daySubjects = [...sidSet].map((id) => ({ id }));
      const bulk = await Store.getAllSubtasks(daySubjects, dayAbbr);
      Object.assign(subtasksCache, bulk);
    }),
  );

  if (allWeekDays.length && DOM.weekLabel) {
    DOM.weekLabel.textContent = `${allWeekDays[0].dateStr} – ${allWeekDays[allWeekDays.length - 1].dateStr}`;
  }

  updateWeekFillBar(timeslots, sched);
  renderScheduleLegend(subjects);

  const grid = DOM.scheduleGrid;
  if (!grid) {
    finishScheduleMeasure();
    return;
  }

  if (!timeslots.length) {
    grid.innerHTML = `<div class="empty-state">
            <div class="empty-icon">🕐</div>
            <div class="empty-title">Aucun créneau horaire</div>
            <div class="empty-sub">Allez dans "Créneaux Horaires" pour en ajouter</div>
        </div>`;
    DOM.invalidateDynamic();
    checkConflicts();
    finishScheduleMeasure();
    return;
  }

  const todayStr = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });

  const cards = weekDays.map((dayObj) => {
    const dayAbbr = dayObj.abbr;
    const isToday = dayObj.dateStr === todayStr;

    const dayTimeslots = _timeslotsForDay(timeslots, dayAbbr);
    const dayFilled = dayTimeslots.filter(
      (ts) => sched[`${currentWeekOffset}_${dayAbbr}_${ts.id}`],
    ).length;
    const dayDone = dayTimeslots.filter((ts) =>
      _isCellDone(dayAbbr, ts.id),
    ).length;
    const dayFreeTasks = freeTasksByDay[dayAbbr] || [];
    const dayFreeCount = dayFreeTasks.length;

    const blocks = dayTimeslots
      .map((ts) => {
        const subjId = sched[`${currentWeekOffset}_${dayAbbr}_${ts.id}`];
        const subj = subjId ? subjects.find((s) => s.id === subjId) : null;
        const blockSubtasks = subj
          ? subtasksCache[`${subj.id}::${dayAbbr}`] || []
          : [];
        return renderScheduleCell(
          dayAbbr,
          ts,
          subj,
          blockSubtasks,
          _isCellDone(dayAbbr, ts.id),
        );
      })
      .join("");

    return `<div class="day-card ${isToday ? "day-card-today" : ""}" id="day-card-${dayAbbr}">
            <div class="day-header">
                <span class="day-name">${dayAbbr} <span class="day-date-badge">${dayObj.date.getDate()}</span></span>
                <div class="day-tags">
                    ${isToday ? '<span class="day-tag tag-today">Aujourd\'hui</span>' : ""}
                    <span class="day-fill-chip" id="fill-chip-${dayAbbr}">${dayFilled}/${dayTimeslots.length}</span>
                    <span class="day-done-chip" id="done-chip-${dayAbbr}" ${dayDone === 0 ? 'style="display:none"' : ""}>✓ ${dayDone}</span>
                    <span class="day-free-chip" id="free-chip-${dayAbbr}" ${dayFreeCount === 0 ? 'style="display:none"' : ""}>✎ ${dayFreeCount}</span>
                    <button class="reset-day-btn" title="Réinitialiser la journée" aria-label="Réinitialiser ${dayAbbr}" onclick="resetDayDone('${dayAbbr}')">↺</button>
                </div>
            </div>
            <div class="timeline">${blocks}</div>
            <div class="free-tasks-section" id="free-tasks-section-${dayAbbr}">
              ${_buildFreeTasksSectionHTML(dayAbbr, dayFreeTasks)}
            </div>
        </div>`;
  });

  // Single write for the whole structure — then never again until the
  // structure itself (week, timeslots, days) changes.
  grid.innerHTML = `${_mobileDayControlsHTML(allWeekDays)}<div class="days-grid">${cards.join("")}</div>`;
  finishScheduleMeasure();

  // Every previously memoised day card / block node is now detached.
  DOM.invalidateDynamic();
  checkConflicts();
}

/** Full rebuild, then a productivity refresh that only hits the network
    when the cached score for this week is missing or invalidated. */
async function renderScheduleGrid() {
  const result = await renderSchedule();
  refreshProductivity();
  return result;
}

function toggleDoneBlock(weekOffset, day, tsId) {
  const doneKey = `done_${weekOffset}_${day}_${tsId}`;
  const blockId = `blk_${weekOffset}_${day}_${tsId}`;
  const block = DOM.get(blockId);
  if (!block) return;
  const btn = block.querySelector(".done-btn");
  const isDone = localStorage.getItem(doneKey) === "1";
  if (isDone) {
    localStorage.removeItem(doneKey);
    block.classList.remove("completed");
    if (btn) {
      btn.classList.remove("done");
      btn.textContent = "○";
      btn.setAttribute("aria-label", "Marquer comme fait");
    }
  } else {
    localStorage.setItem(doneKey, "1");
    block.classList.add("completed");
    if (btn) {
      btn.classList.add("done");
      btn.textContent = "✓";
      btn.setAttribute("aria-label", "Marquer comme non fait");
    }
  }
  // Granular: refresh only this day's counters. Done-state is not part of
  // the productivity score, so no productivity refresh is needed.
  Promise.all([Store.getTimeslots(), Store.getSchedule(currentWeekOffset)])
    .then(([timeslots, sched]) => updateDayHeaderChips(day, timeslots, sched))
    .catch(() => {});
}

function resetDayDone(dayAbbr) {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`done_${currentWeekOffset}_${dayAbbr}_`))
      keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  // Granular: only this day's blocks changed.
  Promise.all([Store.getTimeslots(), Store.getSchedule(currentWeekOffset)])
    .then(async ([timeslots, sched]) => {
      const dayTs = _timeslotsForDay(timeslots, dayAbbr);
      await Promise.all(dayTs.map((ts) => updateScheduleCell(dayAbbr, ts.id)));
      updateDayHeaderChips(dayAbbr, timeslots, sched);
    })
    .catch(() => {});
}

async function handleCellClick(day, tsId) {
  ensureModal("cell-modal");
  const ts = await Store.getTimeslot(tsId);
  document.getElementById("cell-modal-day").value = day;
  document.getElementById("cell-modal-slot").value = tsId;
  document.getElementById("cell-modal-title").textContent =
    `${day} · ${ts ? ts.start + "–" + ts.end : ""}`;
  renderPalette();
  document.getElementById("cell-modal").classList.add("open");
}

async function assignFromModal(subjId) {
  const day = document.getElementById("cell-modal-day").value;
  const tsId = document.getElementById("cell-modal-slot").value;
  await assignSubject(day, tsId, subjId);
  closeModal("cell-modal");
}

async function removeCellEvent() {
  const day = document.getElementById("cell-modal-day").value;
  const tsId = document.getElementById("cell-modal-slot").value;
  await removeEvent(day, tsId);
  closeModal("cell-modal");
}

async function assignSubject(day, tsId, subjId) {
  try {
    await apiCall("/api/schedule/assign", {
      method: "POST",
      body: JSON.stringify({
        weekOffset: currentWeekOffset,
        day,
        timeslotId: tsId,
        subjectId: subjId,
      }),
    });
    // Patch only the changed record — no full refetch needed.
    Store.patchScheduleRecord(
      currentWeekOffset,
      `${currentWeekOffset}_${day}_${tsId}`,
      subjId
    );
    // Granular: repaint only the changed cell; patchScheduleRecord has
    // invalidated this week's productivity, so refresh it.
    await updateScheduleCell(day, tsId);
    refreshProductivitySoon();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function removeEvent(day, tsId) {
  try {
    await apiCall("/api/schedule/remove", {
      method: "POST",
      body: JSON.stringify({
        weekOffset: currentWeekOffset,
        day,
        timeslotId: tsId,
      }),
    });
    // Patch only the removed record — no full refetch needed.
    Store.patchScheduleRecord(
      currentWeekOffset,
      `${currentWeekOffset}_${day}_${tsId}`,
      null
    );
    // Granular: reset only the emptied cell.
    await removeScheduleCell(day, tsId);
    refreshProductivitySoon();
  } catch (e) {
    toast(e.message, "error");
  }
}

/* ══════════════════════════════════════════════
   DRAG & DROP
══════════════════════════════════════════════ */

let dragSubjId = null;
let dragFromDay = null,
  dragFromTs = null;

function onChipDragStart(e, subjId) {
  dragSubjId = subjId;
  dragFromDay = null;
  e.dataTransfer.effectAllowed = "copy";
}

function onEventDragStart(e, day, tsId, subjId) {
  dragSubjId = subjId;
  dragFromDay = day;
  dragFromTs = tsId;
  e.dataTransfer.effectAllowed = "move";
  e.stopPropagation();
}

function onDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
  e.dataTransfer.dropEffect = "copy";
}

function onDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

async function onDrop(e, day, tsId) {
  // Drag & drop assignment is disabled
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
}

async function changeWeek(delta) {
  const previousOffset = currentWeekOffset;
  currentWeekOffset += delta;

  // Rapid clicking on ‹ / › cancels the requests of the week we just left,
  // so an outdated response can never overwrite the grid.
  Store.newWeekGeneration();
  const requestedOffset = currentWeekOffset;

  try {
    // Check if new week is empty — if so, copy from previous week
    const newSched = await Store.getSchedule(currentWeekOffset);
    const isEmpty = !newSched || Object.keys(newSched).length === 0;

    if (isEmpty) {
      const prevSched = await Store.getSchedule(previousOffset);
      if (prevSched && Object.keys(prevSched).length > 0) {
        // Copy all assignments from previous week to new week
        const assigns = [];
        // Build the copied schedule map to write directly into cache
        const copiedSched = {};
        for (const key of Object.keys(prevSched)) {
          const parts = key.split("_");
          if (parts.length >= 3) {
            const day = parts[1];
            const tsId = parts.slice(2).join("_");
            const subjId = prevSched[key];
            const newKey = `${currentWeekOffset}_${day}_${tsId}`;
            copiedSched[newKey] = subjId;
            assigns.push(
              apiCall("/api/schedule/assign", {
                method: "POST",
                body: JSON.stringify({
                  weekOffset: currentWeekOffset,
                  day,
                  timeslotId: tsId,
                  subjectId: subjId,
                }),
              }).catch(() => {}),
            );
          }
        }
        await Promise.all(assigns);
        // Seed the new week in the cache directly — no refetch needed.
        Store.setScheduleWeek(currentWeekOffset, copiedSched);
        toast("Planning copié depuis la semaine précédente ✓", "success");
      }
    }
  } catch (err) {
    // Aborted because the user moved on to another week — nothing to do.
    if (Store.isAbortError(err)) return;
    throw err;
  }

  // The user navigated again while we were loading — let the newest call win.
  if (requestedOffset !== currentWeekOffset) return;

  renderScheduleGrid();
}

function goToday() {
  currentWeekOffset = 0;
  Store.newWeekGeneration();
  renderScheduleGrid();
}

async function clearAllSchedule() {
  if (!confirm("Vider tout l'emploi du temps de cette semaine ?")) return;
  const sched = await Store.getSchedule(currentWeekOffset);
  // Run all removals in parallel for speed
  const removals = Object.keys(sched).map((key) => {
    const parts = key.split("_");
    if (parts.length === 3) {
      return apiCall("/api/schedule/remove", {
        method: "POST",
        body: JSON.stringify({
          weekOffset: currentWeekOffset,
          day: parts[1],
          timeslotId: parts[2],
        }),
      });
    }
    return Promise.resolve();
  });
  await Promise.all(removals);
  // Replace the entire week in the cache with an empty map — no refetch.
  Store.setScheduleWeek(currentWeekOffset, {});
  await renderScheduleGrid();
  toast("Emploi du temps vidé", "info");
}

function checkConflicts() {
  if (DOM.conflictBadge) DOM.conflictBadge.style.display = "none";
}

/* ══════════════════════════════════════════════
   TIMESLOTS
══════════════════════════════════════════════ */

function openTimeslotModal() {
  ensureModal("timeslot-modal");
  document.getElementById("ts-msg").innerHTML = "";
  const activeDays = window.currentActiveDays || [
    "Dim",
    "Lun",
    "Mar",
    "Mer",
    "Jeu",
    "Ven",
    "Sam",
  ];
  document
    .querySelectorAll("#ts-days-picker input[type=checkbox]")
    .forEach((cb) => {
      cb.checked = activeDays.includes(cb.value);
    });
  document.getElementById("timeslot-modal").classList.add("open");
  fillTimeSelects();
  requestAnimationFrame(() => document.getElementById("ts-start-h").focus());
}

// Populate the 24-hour (00-23) time selects. No AM/PM anywhere.
function fillTimeSelects() {
  const pad = (n) => String(n).padStart(2, "0");
  const defaults = {
    "ts-start-h": "08",
    "ts-start-m": "00",
    "ts-end-h": "10",
    "ts-end-m": "00",
  };
  Object.keys(defaults).forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.filled === "1") return;
    const count = id.endsWith("-h") ? 24 : 60;
    el.innerHTML = Array.from(
      { length: count },
      (_, i) => `<option value="${pad(i)}">${pad(i)}</option>`,
    ).join("");
    el.value = defaults[id];
    el.dataset.filled = "1";
  });
}

function readTime24(prefix) {
  const h = document.getElementById(`${prefix}-h`);
  const m = document.getElementById(`${prefix}-m`);
  if (!h || !m || !h.value || !m.value) return "";
  return `${h.value}:${m.value}`;
}

async function saveTimeslot() {
  const start = readTime24("ts-start");
  const end = readTime24("ts-end");
  const msgEl = document.getElementById("ts-msg");
  if (!start || !end) {
    showMsg(msgEl, "Remplissez les deux champs.", "error");
    return;
  }
  if (start >= end) {
    showMsg(msgEl, "L'heure de fin doit être après le début.", "error");
    return;
  }

  const days = Array.from(
    document.querySelectorAll("#ts-days-picker input[type=checkbox]:checked"),
  ).map((cb) => cb.value);
  if (!days.length) {
    showMsg(msgEl, "Sélectionnez au moins un jour.", "error");
    return;
  }

  setLoading("ts-save", true);
  try {
    const result = await apiCall("/api/timeslots", {
      method: "POST",
      body: JSON.stringify({ start, end, days }),
    });
    // Patch the timeslots cache with the new slot — no refetch needed.
    // The server returns { id } so we build the full object from form data.
    Store.addTimeslot({ id: result.id, start, end, days });
    // Schedule cells for this timeslot are all empty on every existing week,
    // so no schedule cache patch is needed — the grid will show empty cells.
    closeModal("timeslot-modal");
    await Promise.all([renderTimeslots(), renderScheduleGrid()]);
    toast("Créneau ajouté ✓", "success");
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  } finally {
    setLoading("ts-save", false);
  }
}

async function deleteTimeslot(id) {
  try {
    await apiCall(`/api/timeslots/${id}`, { method: "DELETE" });
    // Remove the slot from the timeslots cache in place.
    Store.removeTimeslot(id);
    // Remove every schedule entry that referenced this timeslot from all
    // loaded week caches so the grid reflects the deletion immediately.
    const idStr = String(id);
    // (Store.removeTimeslot already invalidated productivity.)
    Object.keys(appState.schedule).forEach((wk) => {
      const weekSched = appState.schedule[wk];
      if (!weekSched) return;
      Object.keys(weekSched).forEach((key) => {
        // key format: "<wk>_<day>_<tsId>"
        const tsIdPart = key.split("_").slice(2).join("_");
        if (tsIdPart === idStr) {
          delete weekSched[key];
        }
      });
    });
    await Promise.all([renderTimeslots(), renderScheduleGrid()]);
    toast("Créneau supprimé", "info");
  } catch (e) {
    toast(e.message, "error");
  }
}

async function renderTimeslots() {
  const ts = await Store.getTimeslots();
  const el = document.getElementById("timeslots-list");
  const summaryEl = document.getElementById("timeslots-summary");

  if (!ts.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-title">Aucun créneau</div></div>`;
    if (summaryEl) summaryEl.innerHTML = "";
    return;
  }

  const fmtH = (m) =>
    m >= 60
      ? `${Math.floor(m / 60)}h${m % 60 ? (m % 60) + "min" : ""}`
      : `${m}min`;
  const weeklyMins = ts.reduce((acc, t) => {
    const [sh, sm] = t.start.split(":").map(Number);
    const [eh, em] = t.end.split(":").map(Number);
    const dur = eh * 60 + em - (sh * 60 + sm);
    return acc + dur * (t.days ? t.days.length : 0);
  }, 0);
  const totalCells = ts.reduce(
    (acc, t) => acc + (t.days ? t.days.length : 0),
    0,
  );
  const uniqueDays = [...new Set(ts.flatMap((t) => t.days || []))].length;

  if (summaryEl) {
    summaryEl.innerHTML = `
            <div class="ts-summary-grid">
                <div class="ts-stat"><span class="ts-stat-num">${ts.length}</span><span class="ts-stat-label">Créneaux définis</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${totalCells}</span><span class="ts-stat-label">Cellules / semaine</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${fmtH(weeklyMins)}</span><span class="ts-stat-label">Heures / semaine</span></div>
                <div class="ts-stat"><span class="ts-stat-num">${uniqueDays}</span><span class="ts-stat-label">Jours couverts</span></div>
            </div>`;
  }

  el.innerHTML = ts
    .map((t, i) => {
      const dayTags = (t.days || [])
        .map((d) => `<span class="ts-day-tag">${d}</span>`)
        .join("");
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
    })
    .join("");
}

function durationStr(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 ? (mins % 60) + "m" : ""}`
    : `${mins}min`;
}

/* ══════════════════════════════════════════════
   DAYS CONFIGURATION
══════════════════════════════════════════════ */

async function renderDaysCheckboxes() {
  const allDays = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const active = await Store.getDays();
  window.currentActiveDays = active;
  const el = document.getElementById("days-checkboxes");
  el.innerHTML = allDays
    .map(
      (d) => `
        <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;font-size:0.82rem;padding:0.4rem 0.8rem;background:var(--surface);border:1px solid ${active.includes(d) ? "var(--primary)" : "var(--border)"};border-radius:6px;color:${active.includes(d) ? "var(--primary-light)" : "var(--text-muted)"}">
            <input type="checkbox" ${active.includes(d) ? "checked" : ""} onchange="toggleDay('${d}',this)" style="accent-color:var(--primary)">
            ${d}
        </label>
    `,
    )
    .join("");
}

async function toggleDay(day, cb) {
  let active = (await Store.getDays()).slice();
  if (cb.checked) {
    if (!active.includes(day)) active.push(day);
  } else {
    active = active.filter((d) => d !== day);
  }
  const order = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  active.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  await apiCall("/api/days", { method: "PUT", body: JSON.stringify(active) });
  // Write the new days list directly into the cache — no refetch needed.
  Store.setDays(active);
  await Promise.all([renderDaysCheckboxes(), renderScheduleGrid()]);
}

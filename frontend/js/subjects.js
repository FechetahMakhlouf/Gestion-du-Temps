/* subjects.js — colour wheel, subjects CRUD, subtasks, palette
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   SUBJECTS
══════════════════════════════════════════════ */

let selectedColor = "var(--info)";

/* ── Color Wheel Picker ─────────────────────────── */
const _wheel = {
  hue: 210,
  sat: 0.82,
  bri: 0.85, // HSB state
  draggingWheel: false,
  draggingBar: false,
};

function _clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function _hsbToRgb(h, s, b) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return b - b * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [
    Math.round(f(5) * 255),
    Math.round(f(3) * 255),
    Math.round(f(1) * 255),
  ];
}

function _rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => _clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function _hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function _rgbToHsb(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max ? d / max : 0, max];
}

function _drawWheel(canvas) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2,
    cy = canvas.height / 2,
    r = cx - 1;
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - cx,
        dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) {
        img.data[(y * canvas.width + x) * 4 + 3] = 0;
        continue;
      }
      const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const sat = dist / r;
      const [rr, gg, bb] = _hsbToRgb(hue, sat, 1);
      const i = (y * canvas.width + x) * 4;
      img.data[i] = rr;
      img.data[i + 1] = gg;
      img.data[i + 2] = bb;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function _drawBrightnessBar(canvas, hue, sat) {
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  const [r1, g1, b1] = _hsbToRgb(hue, sat, 1);
  grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grad.addColorStop(1, "#000");
  ctx.fillStyle = grad;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 5);
  ctx.fill();
}

function _drawWheelCursor(canvas, hue, sat) {
  const ctx = canvas.getContext("2d");
  _drawWheel(canvas);
  const cx = canvas.width / 2,
    cy = canvas.height / 2,
    r = cx - 1;
  const ang = (hue * Math.PI) / 180;
  const px = cx + Math.cos(ang) * sat * r;
  const py = cy + Math.sin(ang) * sat * r;
  ctx.beginPath();
  ctx.arc(px, py, 7, 0, Math.PI * 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function _drawBarCursor(canvas, bri) {
  const ctx = canvas.getContext("2d");
  _drawBrightnessBar(canvas, _wheel.hue, _wheel.sat);
  const y = (1 - bri) * canvas.height;
  ctx.beginPath();
  ctx.rect(0, y - 2, canvas.width, 4);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.rect(0, y - 3, canvas.width, 6);
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function _syncWheelFromHsb() {
  const [r, g, b] = _hsbToRgb(_wheel.hue, _wheel.sat, _wheel.bri);
  const hex = _rgbToHex(r, g, b);
  selectedColor = hex;
  const preview = document.getElementById("wheel-preview");
  const hexInput = document.getElementById("wheel-hex");
  if (preview) preview.style.background = hex;
  if (hexInput) hexInput.value = hex.toUpperCase();
  _redrawWheel();
}

function _redrawWheel() {
  const wCanvas = document.getElementById("color-wheel");
  const bCanvas = document.getElementById("brightness-bar");
  if (wCanvas) _drawWheelCursor(wCanvas, _wheel.hue, _wheel.sat);
  if (bCanvas) _drawBarCursor(bCanvas, _wheel.bri);
}

function _initColorWheel() {
  const wCanvas = document.getElementById("color-wheel");
  const bCanvas = document.getElementById("brightness-bar");
  if (!wCanvas || !bCanvas) return;

  _drawWheelCursor(wCanvas, _wheel.hue, _wheel.sat);
  _drawBarCursor(bCanvas, _wheel.bri);

  const getWheelHSFromEvent = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2,
      cy = canvas.height / 2,
      r = cx - 1;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = (clientX - rect.left) * scaleX - cx;
    const dy = (clientY - rect.top) * scaleY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(dist / r, 1);
    return [hue, sat];
  };

  const getBarBriFromEvent = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = canvas.height / rect.height;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const y = _clamp((clientY - rect.top) * scaleY, 0, canvas.height);
    return 1 - y / canvas.height;
  };

  const onWheelMove = (e) => {
    if (!_wheel.draggingWheel) return;
    e.preventDefault();
    const [h, s] = getWheelHSFromEvent(e, wCanvas);
    _wheel.hue = h;
    _wheel.sat = s;
    _syncWheelFromHsb();
  };
  const onBarMove = (e) => {
    if (!_wheel.draggingBar) return;
    e.preventDefault();
    _wheel.bri = getBarBriFromEvent(e, bCanvas);
    _syncWheelFromHsb();
  };

  wCanvas.addEventListener("mousedown", (e) => {
    _wheel.draggingWheel = true;
    const [h, s] = getWheelHSFromEvent(e, wCanvas);
    _wheel.hue = h;
    _wheel.sat = s;
    _syncWheelFromHsb();
  });
  bCanvas.addEventListener("mousedown", (e) => {
    _wheel.draggingBar = true;
    _wheel.bri = getBarBriFromEvent(e, bCanvas);
    _syncWheelFromHsb();
  });
  wCanvas.addEventListener(
    "touchstart",
    (e) => {
      _wheel.draggingWheel = true;
      const [h, s] = getWheelHSFromEvent(e, wCanvas);
      _wheel.hue = h;
      _wheel.sat = s;
      _syncWheelFromHsb();
    },
    { passive: false },
  );
  bCanvas.addEventListener(
    "touchstart",
    (e) => {
      _wheel.draggingBar = true;
      _wheel.bri = getBarBriFromEvent(e, bCanvas);
      _syncWheelFromHsb();
    },
    { passive: false },
  );

  document.addEventListener("mousemove", onWheelMove);
  document.addEventListener("mousemove", onBarMove);
  document.addEventListener("touchmove", onWheelMove, { passive: false });
  document.addEventListener("touchmove", onBarMove, { passive: false });
  document.addEventListener("mouseup", () => {
    _wheel.draggingWheel = false;
    _wheel.draggingBar = false;
  });
  document.addEventListener("touchend", () => {
    _wheel.draggingWheel = false;
    _wheel.draggingBar = false;
  });

  _syncWheelFromHsb();
}

function onWheelHexInput(val) {
  const normalized = val.startsWith("#") ? val : "#" + val;
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    const [r, g, b] = _hexToRgb(normalized);
    const [h, s, bri] = _rgbToHsb(r, g, b);
    _wheel.hue = h;
    _wheel.sat = s;
    _wheel.bri = bri;
    selectedColor = normalized;
    const preview = document.getElementById("wheel-preview");
    if (preview) preview.style.background = normalized;
    _redrawWheel();
  }
}

function onWheelHexBlur() {
  const hexInput = document.getElementById("wheel-hex");
  if (hexInput && !/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
    hexInput.value = selectedColor.toUpperCase();
  }
}

function buildColorGrid() {
  // Sync wheel state from selectedColor
  const [r, g, b] = _hexToRgb(selectedColor);
  const [h, s, bri] = _rgbToHsb(r, g, b);
  _wheel.hue = h;
  _wheel.sat = s;
  _wheel.bri = bri;

  requestAnimationFrame(() => {
    _initColorWheel();
  });
}

function pickColor(c) {
  selectedColor = c;
  const [r, g, b] = _hexToRgb(c);
  const [h, s, bri] = _rgbToHsb(r, g, b);
  _wheel.hue = h;
  _wheel.sat = s;
  _wheel.bri = bri;
  _syncWheelFromHsb();
}

function openSubjectModal(id) {
  const modal = ensureModal("subject-modal");
  ensureModal("emoji-picker");
  document.getElementById("subj-edit-id").value = id || "";
  document.getElementById("subj-msg").innerHTML = "";
  if (id) {
    loadSubjectsForEdit(id);
  } else {
    document.getElementById("subject-modal-title").textContent =
      "Ajouter une tâche";
    document.getElementById("subj-name").value = "";
    const randHue = Math.floor(Math.random() * 360);
    const [rr, gg, bb] = _hsbToRgb(randHue, 0.8, 0.85);
    selectedColor = _rgbToHex(rr, gg, bb);
    buildColorGrid();
  }
  modal.classList.add("open");
  requestAnimationFrame(() => document.getElementById("subj-name").focus());
}

async function loadSubjectsForEdit(id) {
  // appState.subjects is always populated after bootstrap — read it directly.
  const subjects = appState.subjects;
  const subj = subjects.find((s) => s.id === id);
  if (!subj) return;
  document.getElementById("subject-modal-title").textContent =
    "Modifier la tâche";
  document.getElementById("subj-name").value = subj.name;
  selectedColor = subj.color;
  buildColorGrid();
}

async function saveSubject() {
  const name = document.getElementById("subj-name").value.trim();
  const id = document.getElementById("subj-edit-id").value;
  const msgEl = document.getElementById("subj-msg");
  if (!name) {
    showMsg(msgEl, "Le nom est requis.", "error");
    return;
  }

  const payload = { name, color: selectedColor };
  setLoading("subj-save", true);
  try {
    if (id) {
      await apiCall(`/api/subjects/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiCall("/api/subjects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    // Subjects changed: invalidate then immediately refresh the cache so
    // renderAll() reads appState.subjects without any additional network call.
    Store.invalidateSubjects();
    Store.invalidateSchedule();
    await Store.refreshSubjects();
    closeModal("subject-modal");
    await renderAll();
    toast(id ? "Tâche modifiée ✓" : "Tâche ajoutée ✓", "success");
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  } finally {
    setLoading("subj-save", false);
  }
}

async function deleteSubject(id) {
  if (
    !confirm(
      "Supprimer cette tâche ? Les créneaux assignés seront aussi effacés.",
    )
  )
    return;
  try {
    await apiCall(`/api/subjects/${id}`, { method: "DELETE" });
    // Subjects changed: invalidate then immediately refresh the cache so
    // renderAll() reads appState.subjects without any additional network call.
    Store.invalidateSubjects();
    Store.invalidateSchedule();
    await Store.refreshSubjects();
    await renderAll();
    toast("Tâche supprimée", "info");
  } catch (e) {
    toast(e.message, "error");
  }
}

/* ══════════════════════════════════════════════
   SUBTASK MANAGEMENT
══════════════════════════════════════════════ */

let _subtaskDragId = null;
let _subtaskSubjectId = null;
let _subtaskDay = null;

async function openSubtaskModal(subjectId, subjectName, subjectColor, day) {
  const modal = ensureModal("subtask-modal");
  if (!modal) {
    console.error("Subtask modal template is unavailable.");
    toast("Impossible d’ouvrir la gestion des sous-titres.", "error");
    return;
  }
  _subtaskSubjectId = subjectId;
  _subtaskDay = day || null;
  const subjectIdEl = modal.querySelector("#subtask-subject-id");
  const dayEl = modal.querySelector("#subtask-day");
  const nameEl = modal.querySelector("#subtask-modal-subject-name");
  const titleInput = modal.querySelector("#subtask-new-title");
  const msgEl = modal.querySelector("#subtask-msg");
  if (!subjectIdEl || !dayEl || !nameEl || !titleInput || !msgEl) {
    console.error("Subtask modal is missing required controls.");
    toast("La fenêtre des sous-titres est incomplète.", "error");
    return;
  }
  subjectIdEl.value = subjectId;
  dayEl.value = day || "";
  nameEl.textContent = subjectName;
  nameEl.style.color = subjectColor;
  titleInput.value = "";
  msgEl.innerHTML = "";
  await renderSubtaskList(subjectId, subjectColor, day);
  modal.classList.add("open");
  requestAnimationFrame(() => titleInput.focus());
}

async function renderSubtaskList(subjectId, color, day) {
  const listEl = document.getElementById("subtask-list");
  if (!listEl) {
    console.error("Subtask list element is unavailable.");
    return;
  }
  let subtasks = [];
  try {
    subtasks = await Store.getSubtasks(subjectId, day);
  } catch (_) {
    subtasks = [];
  }

  if (!subtasks.length) {
    listEl.innerHTML = `<div class="subtask-empty">Aucun sous-titre — ajoutez-en un ci-dessus.</div>`;
    return;
  }

  listEl.innerHTML = subtasks
    .map(
      (st, idx) => `
        <div class="subtask-row" draggable="true" data-id="${st.id}"
             ondragstart="onSubtaskDragStart(event,${st.id})"
             ondragover="onSubtaskDragOver(event)"
             ondragleave="onSubtaskDragLeave(event)"
             ondrop="onSubtaskDrop(event,${st.id})">
            <span class="subtask-drag-handle" aria-hidden="true" title="Réordonner">⠿</span>
            <span class="subtask-row-title" id="st-title-${st.id}">${escHtml(st.title)}</span>
            <div class="subtask-row-actions">
                <button class="icon-btn" onclick="editSubtaskInline(${st.id},'${escApos(st.title)}')" aria-label="Modifier" title="Modifier">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn danger" onclick="deleteSubtask(${st.id})" aria-label="Supprimer" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>
    `,
    )
    .join("");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escApos(str) {
  return String(str).replace(/'/g, "\\'");
}

async function addSubtaskFromModal() {
  const subjectId = document.getElementById("subtask-subject-id").value;
  const day = document.getElementById("subtask-day").value || null;
  const titleInput = document.getElementById("subtask-new-title");
  const title = titleInput.value.trim();
  const msgEl = document.getElementById("subtask-msg");
  if (!title) {
    showMsg(msgEl, "Le titre est requis.", "error");
    return;
  }
  try {
    const body = { title };
    if (day) body.day = day;
    await apiCall(`/api/subjects/${subjectId}/subtasks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    Store.invalidateSubtasks(subjectId, day);
    titleInput.value = "";
    msgEl.innerHTML = "";
    const color = document.getElementById("subtask-modal-subject-name").style
      .color;
    await renderSubtaskList(subjectId, color, day);
    // Granular: only the blocks showing this subject need repainting.
    await updateScheduleCellsForSubject(subjectId, day);
    await renderSubjectsPanel();
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  }
}

async function deleteSubtask(subtaskId) {
  const subjectId = document.getElementById("subtask-subject-id").value;
  const day = document.getElementById("subtask-day").value || null;
  try {
    await apiCall(`/api/subjects/${subjectId}/subtasks/${subtaskId}`, {
      method: "DELETE",
    });
    Store.invalidateSubtasks(subjectId, day);
    const color = document.getElementById("subtask-modal-subject-name").style
      .color;
    await renderSubtaskList(subjectId, color, day);
    await updateScheduleCellsForSubject(subjectId, day);
    await renderSubjectsPanel();
    toast("Sous-titre supprimé", "info");
  } catch (e) {
    toast(e.message, "error");
  }
}

function editSubtaskInline(subtaskId, currentTitle) {
  const titleEl = document.getElementById(`st-title-${subtaskId}`);
  if (!titleEl) return;
  const row = titleEl.closest(".subtask-row");
  // Replace title span with an input
  titleEl.outerHTML = `<input class="subtask-inline-input" id="st-input-${subtaskId}" value="${escHtml(currentTitle)}"
        onkeydown="if(event.key==='Enter')saveSubtaskInline(${subtaskId});if(event.key==='Escape')cancelSubtaskInline(${subtaskId},'${escApos(currentTitle)}')"
        onblur="saveSubtaskInline(${subtaskId})" />`;
  const inp = document.getElementById(`st-input-${subtaskId}`);
  if (inp) {
    inp.focus();
    inp.select();
  }
}

async function saveSubtaskInline(subtaskId) {
  const inp = document.getElementById(`st-input-${subtaskId}`);
  if (!inp) return;
  const newTitle = inp.value.trim();
  const subjectId = document.getElementById("subtask-subject-id").value;
  const day = document.getElementById("subtask-day").value || null;
  if (!newTitle) {
    // Restore
    inp.outerHTML = `<span class="subtask-row-title" id="st-title-${subtaskId}">${escHtml(inp.defaultValue)}</span>`;
    return;
  }
  try {
    await apiCall(`/api/subjects/${subjectId}/subtasks/${subtaskId}`, {
      method: "PUT",
      body: JSON.stringify({ title: newTitle }),
    });
    Store.invalidateSubtasks(subjectId, day);
    const color = document.getElementById("subtask-modal-subject-name").style
      .color;
    await renderSubtaskList(subjectId, color, day);
    await updateScheduleCellsForSubject(subjectId, day);
    await renderSubjectsPanel();
  } catch (e) {
    toast(e.message, "error");
  }
}

function cancelSubtaskInline(subtaskId, originalTitle) {
  const inp = document.getElementById(`st-input-${subtaskId}`);
  if (!inp) return;
  inp.outerHTML = `<span class="subtask-row-title" id="st-title-${subtaskId}">${escHtml(originalTitle)}</span>`;
}

/* ── Subtask drag-to-reorder ── */
function onSubtaskDragStart(e, id) {
  _subtaskDragId = id;
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("subtask-dragging");
}

function onSubtaskDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("subtask-drag-over");
}

function onSubtaskDragLeave(e) {
  e.currentTarget.classList.remove("subtask-drag-over");
}

async function onSubtaskDrop(e, targetId) {
  e.preventDefault();
  e.currentTarget.classList.remove("subtask-drag-over");
  if (_subtaskDragId === null || _subtaskDragId === targetId) return;
  const subjectId = document.getElementById("subtask-subject-id").value;

  // Build new order from DOM
  const rows = [...document.querySelectorAll(".subtask-row")];
  const ids = rows.map((r) => parseInt(r.dataset.id));
  const dragIdx = ids.indexOf(_subtaskDragId);
  const targetIdx = ids.indexOf(targetId);
  if (dragIdx === -1 || targetIdx === -1) return;
  ids.splice(dragIdx, 1);
  ids.splice(targetIdx, 0, _subtaskDragId);
  _subtaskDragId = null;

  const day = document.getElementById("subtask-day").value || null;
  try {
    await apiCall(`/api/subjects/${subjectId}/subtasks/reorder`, {
      method: "POST",
      body: JSON.stringify({ order: ids }),
    });
    Store.invalidateSubtasks(subjectId, day);
    const color = document.getElementById("subtask-modal-subject-name").style
      .color;
    await renderSubtaskList(subjectId, color, day);
    await updateScheduleCellsForSubject(subjectId, day);
  } catch (e) {
    toast(e.message, "error");
  }
}

async function renderSubjectsPanel() {
  if (!DOM.subjStats || !DOM.subjectsGrid) return;
  const finishSubjectsMeasure = window.appPerformance.span("subjects-rendering");
  // appState.subjects is always populated after bootstrap; only the schedule
  // needs a network hop (it varies per week offset).
  const subjects = appState.subjects;
  const sched = await Store.getSchedule(currentWeekOffset);

  // Stats
  const statsEl = DOM.subjStats;
  const usedSet = new Set(Object.values(sched));
  const assignedCount = Object.keys(sched).length;
  const usageRate = subjects.length
    ? Math.round((usedSet.size / subjects.length) * 100)
    : 0;
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

  const grid = DOM.subjectsGrid;
  if (!subjects.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">📚</div>
            <div class="empty-title">Aucune tâche</div>
            <div class="empty-sub">Cliquez sur "Ajouter une tâche" pour commencer</div>
        </div>`;
    finishSubjectsMeasure();
    return;
  }
  const countMap = {};
  Object.values(sched).forEach(
    (id) => (countMap[id] = (countMap[id] || 0) + 1),
  );
  const maxCount = Math.max(1, ...Object.values(countMap));

  // Fetch all subtasks for all subjects in ONE request (no day filter →
  // "all" bucket) and build a subjectId → list map for the card renderer.
  const _bulkSubtasks = await Store.getAllSubtasks(subjects);
  const subtasksMap = {};
  subjects.forEach((s) => {
    const k = `${s.id}::all`;
    subtasksMap[s.id] = _bulkSubtasks[k] || [];
  });

  grid.innerHTML = subjects
    .map((s) => {
      const cnt = countMap[s.id] || 0;
      const pct = Math.round((cnt / maxCount) * 100);
      const stCount = (subtasksMap[s.id] || []).length;
      return `
        <div class="subject-card" style="border-left-color:${s.color}">
            <div class="subject-card-header">
                <div class="subject-card-name" style="color:${s.color}">${s.name}</div>
                <div class="subject-card-actions">
                    <button class="icon-btn" onclick="openSubtaskModal('${s.id}','${s.name.replace(/'/g, "\\'")}','${s.color}')" aria-label="Gérer les sous-titres de ${s.name}" title="Gérer les sous-titres">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </button>
                    <button class="icon-btn" onclick="openSubjectModal('${s.id}')" aria-label="Modifier ${s.name}" title="Modifier la tâche">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="icon-btn danger" onclick="deleteSubject('${s.id}')" aria-label="Supprimer ${s.name}" title="Supprimer la tâche">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                </div>
            </div>
            <div class="subject-card-meta">
                ${stCount > 0 ? `<span class="meta-subtitle" style="color:${s.color};opacity:0.85">📋 ${stCount} sous-titre${stCount > 1 ? "s" : ""}</span>` : ""}
                <span class="meta-badge">${cnt} créneau${cnt !== 1 ? "x" : ""}</span>
            </div>
            ${cnt > 0 ? `<div class="subject-usage-bar" aria-label="${pct}% d'utilisation"><div class="subject-usage-fill" style="width:${pct}%;background:${s.color}"></div></div>` : ""}
        </div>
    `;
    })
    .join("");
  finishSubjectsMeasure();
}

/* ══════════════════════════════════════════════
   PALETTE
══════════════════════════════════════════════ */

async function renderPalette() {
  // appState.subjects is always populated after bootstrap — read it directly.
  const subjects = appState.subjects;
  const el = DOM.paletteChips;
  const cellChips = DOM.cellModalChips;
  if (!subjects.length) {
    if (el)
      el.innerHTML = `<span style="font-size:0.78rem;color:var(--text-muted)">Aucune tâche — allez dans "Mes Tâches" pour en ajouter</span>`;
    if (cellChips) cellChips.innerHTML = "";
    return;
  }
  const chipHtml = (forModal) =>
    subjects
      .map(
        (s) => `
        <div class="subject-chip ${!forModal && s.id === selectedSubjectId ? "selected" : ""}"
             style="background:${hexAlpha(s.color, 0.18)};color:${s.color};border-left-color:${s.color}"
             role="button"
             tabindex="0"
             aria-label="${s.name}"
             onkeydown="if(event.key==='Enter'||event.key===' ')${forModal ? `assignFromModal('${s.id}')` : `selectSubject('${s.id}', this)`}"
             onclick="${forModal ? `assignFromModal('${s.id}')` : `selectSubject('${s.id}', this)`}">
            <span class="chip-name">${s.name}</span>
        </div>
    `,
      )
      .join("");
  if (el) el.innerHTML = chipHtml(false);
  if (cellChips) cellChips.innerHTML = chipHtml(true);
}

function selectSubject(id, el) {
  if (selectedSubjectId === id) {
    selectedSubjectId = null;
    document
      .querySelectorAll(".subject-chip")
      .forEach((c) => c.classList.remove("selected"));
  } else {
    selectedSubjectId = id;
    document
      .querySelectorAll("#palette-chips .subject-chip")
      .forEach((c) => c.classList.remove("selected"));
    el && el.classList.add("selected");
  }
}

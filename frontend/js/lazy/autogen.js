/* lazy/autogen.js — loaded on first visit to the Auto-generation panel
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   AUTO-GENERATE
══════════════════════════════════════════════ */

function updateAutogenTotal() {
  const inputs = document.querySelectorAll("#autogen-grid input[data-subj-id]");
  let total = 0;
  inputs.forEach((inp) => {
    total += parseFloat(inp.value) || 0;
  });
  const el = document.getElementById("autogen-total-display");
  if (!el) return;
  if (inputs.length === 0) {
    el.innerHTML = "";
    return;
  }
  const avail = window.currentActiveDays?.length || 5;
  const tsH = window._timeslotsHoursPerDay || 0;
  const maxH = avail * tsH;
  const over = maxH > 0 && total > maxH;
  el.innerHTML = `
        <div class="autogen-total-inner ${over ? "autogen-over" : ""}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Total demandé : <strong>${total}h / semaine</strong>
            ${maxH > 0 ? `<span class="autogen-capacity ${over ? "over" : ""}">— capacité : ${maxH}h${over ? " ⚠ dépassement" : ""}</span>` : ""}
        </div>`;
}

async function renderAutogenGrid() {
  // appState.subjects is always populated after bootstrap — read it directly.
  const subjects = appState.subjects;
  const [config, timeslots] = await Promise.all([
    Store.getAutogen(),
    Store.getTimeslots(),
  ]);

  window._timeslotsHoursPerDay = timeslots.reduce((acc, t) => {
    const [sh, sm] = t.start.split(":").map(Number);
    const [eh, em] = t.end.split(":").map(Number);
    return acc + (eh * 60 + em - (sh * 60 + sm)) / 60;
  }, 0);

  const grid = document.getElementById("autogen-grid");
  if (!subjects.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-title">Aucune tâche définie</div></div>`;
    updateAutogenTotal();
    return;
  }

  grid.innerHTML = subjects
    .map((s) => {
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
    })
    .join("");

  updateAutogenTotal();
}

async function autoGenerate() {
  const rows = document.querySelectorAll("#autogen-grid .autogen-row");
  const newConfig = {};

  rows.forEach((row) => {
    const input = row.querySelector("input[data-subj-id]");
    if (!input) return;
    const subjId = input.dataset.subjId;
    const hours = parseFloat(input.value) || 0;
    if (hours > 0) newConfig[subjId] = hours;
  });

  setLoading("autogen-submit", true);
  try {
    await apiCall("/api/autogen", {
      method: "PUT",
      body: JSON.stringify(newConfig),
    });
    Store.invalidateAutogen();

    const result = await apiCall(
      "/api/autogen/generate?weekOffset=" + currentWeekOffset,
      {
        method: "POST",
      },
    );

    Store.invalidateSchedule(currentWeekOffset);
    document.getElementById("autogen-result").textContent =
      `✓ Planning généré : ${result.assigned} créneaux assignés.`;
    toast("Planning généré ✓", "success");
    showPanel("schedule");
    await renderScheduleGrid();
  } catch (e) {
    toast(e.message, "error");
  } finally {
    setLoading("autogen-submit", false);
  }
}

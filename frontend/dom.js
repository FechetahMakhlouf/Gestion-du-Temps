/* ══════════════════════════════════════════════════════════════════════
   CACHED DOM REFERENCES  —  frontend/js/dom.js
   ----------------------------------------------------------------------
   Phase 2 optimisation.

   Instead of calling document.getElementById(...) / querySelector(...)
   over and over for the same handful of long-lived elements, resolve
   each one ONCE and keep the reference.

   Usage:
       DOM.scheduleGrid.innerHTML = ...
       DOM.weekLabel.textContent  = ...
       DOM.get('some-dynamic-id')          // memoised lookup
       DOM.cell('Lun', 12)                 // one schedule block
       DOM.invalidate('schedule-grid')     // drop one entry
       DOM.invalidateDynamic()             // drop all per-render entries

   IMPORTANT
   ---------
   Only elements that live for the whole session (they exist in
   index.html and are never replaced) get a permanent named getter.
   Everything created inside a render pass (day cards, blocks, free-task
   rows…) is looked up through DOM.get()/DOM.cell(), whose cache is
   cleared by DOM.invalidateDynamic() after each full grid rebuild.

   Load order in index.html:  api.js → dom.js → state.js → ui.js → … (see index.html)
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Permanent elements: id → property name ───────────────────────── */
  const STATIC_IDS = {
    // shell / layout
    appLoader: "app-loader",
    authPage: "auth-page",
    appPage: "app-page",
    sidebar: "sidebar",
    sidebarUsername: "sidebar-username",
    sidebarAvatar: "sidebar-avatar",
    sidebarDate: "sidebar-date",
    mobileAvatar: "mobile-avatar",

    // schedule panel
    scheduleGrid: "schedule-grid",
    scheduleLegend: "schedule-legend",
    weekLabel: "week-label",
    weekFillBar: "week-fill-bar",
    fillTrackInner: "fill-track-inner",
    fillLabel: "fill-label",
    conflictBadge: "conflict-badge",

    // other panels
    subjectsGrid: "subjects-grid",
    subjStats: "subj-stats",
    paletteChips: "palette-chips",
    cellModalChips: "cell-modal-chips",

    // modals / inputs read on every mutation
    cellModal: "cell-modal",
    cellModalDay: "cell-modal-day",
    cellModalSlot: "cell-modal-slot",
    cellModalTitle: "cell-modal-title",
    subtaskModal: "subtask-modal",
    subtaskList: "subtask-list",
    subtaskSubjectId: "subtask-subject-id",
    subtaskDay: "subtask-day",
    subtaskModalSubjectName: "subtask-modal-subject-name",
    subtaskNewTitle: "subtask-new-title",
    subtaskMsg: "subtask-msg",
    freeTaskModal: "free-task-modal",
    freeTaskList: "free-task-list",
  };

  /** memo for ad-hoc / dynamic lookups */
  const dynamic = new Map();
  /** memo for the static getters */
  const statics = new Map();

  const DOM = {
    /**
     * Memoised document.getElementById.
     * A null result is NOT cached, so elements created later still
     * resolve on the next call.
     */
    get(id) {
      let el = dynamic.get(id);
      if (el && el.isConnected) return el;
      el = document.getElementById(id);
      if (el) dynamic.set(id, el);
      return el;
    },

    /** Memoised querySelector (scoped to document). */
    query(selector) {
      const key = "sel::" + selector;
      let el = dynamic.get(key);
      if (el && el.isConnected) return el;
      el = document.querySelector(selector);
      if (el) dynamic.set(key, el);
      return el;
    },

    /** The `.block` element of one schedule cell. */
    cell(weekOffset, day, tsId) {
      return DOM.get(`blk_${weekOffset}_${day}_${tsId}`);
    },

    /** The `.day-card` wrapper for a day. */
    dayCard(day) {
      return DOM.get(`day-card-${day}`);
    },

    /** Drop one cached entry (static or dynamic). */
    invalidate(idOrName) {
      dynamic.delete(idOrName);
      statics.delete(idOrName);
    },

    /**
     * Drop every dynamic entry.  Call right after a full grid rebuild:
     * all previously cached day cards / blocks are now detached nodes.
     */
    invalidateDynamic() {
      dynamic.clear();
    },

    /** Drop everything (used on logout / full re-mount). */
    invalidateAll() {
      dynamic.clear();
      statics.clear();
    },
  };

  /* Define a lazy, self-caching getter for each permanent element. */
  Object.entries(STATIC_IDS).forEach(([prop, id]) => {
    Object.defineProperty(DOM, prop, {
      enumerable: true,
      get() {
        let el = statics.get(prop);
        if (el && el.isConnected) return el;
        el = document.getElementById(id);
        if (el) statics.set(prop, el);
        return el;
      },
    });
  });

  window.DOM = DOM;
})();

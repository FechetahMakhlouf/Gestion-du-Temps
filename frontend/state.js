/* ══════════════════════════════════════════════════════════════════════
   CENTRALIZED APPLICATION STATE  —  frontend/state.js
   ----------------------------------------------------------------------
   Single source of truth for every piece of server data used by the UI.

   On startup, ONE call to /api/bootstrap seeds subjects, timeslots, days,
   schedule (week 0), subtasks, free-tasks (week 0) and autogen in a
   single round-trip.  Subsequent reads for other week offsets or
   day-scoped data still go through the individual endpoints — the Store
   getters handle that transparently.

   UI functions must read through `Store.*` getters instead of calling
   `apiCall()` directly for reads. Each getter:

     1. returns the cached value from `appState` when it is already loaded
     2. otherwise performs ONE request (concurrent callers share the same
        in-flight promise — no duplicate network calls)
     3. stores the result in `appState` and returns it

   Any write (POST/PUT/DELETE) must invalidate the slices it affects via
   `Store.invalidate*()` so the next read refetches fresh data.

   Load order in index.html:  config.js → state.js → script.js
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── The one and only application state ───────────────────────────── */
  const appState = {
    user: null,
    subjects: [],
    timeslots: [],
    days: [],
    schedule: {},      // { [weekOffset]: { "off_Day_tsId": subjectId } }
    subtasks: {},      // { "subjectId::day|all": [subtask] }
    freeTasks: {},     // { "weekOffset::day|all": [task] }
    autogen: {},       // { [subjectId]: hours }
    productivity: null // last loaded productivity payload
  };

  /* ── Internal bookkeeping (what is loaded / what is in flight) ─────── */
  const loaded = {
    user: false,
    subjects: false,
    timeslots: false,
    days: false,
    autogen: false,
    schedule: {},     // { [weekOffset]: true }
    subtasks: {},     // { [key]: true }
    freeTasks: {},    // { [key]: true }
    productivity: {}  // { [weekOffset]: data }
  };

  const inflight = {}; // { [cacheKey]: Promise }

  /** Deduplicate concurrent requests for the same cache key. */
  function once(key, fn) {
    if (inflight[key]) return inflight[key];
    const p = Promise.resolve()
      .then(fn)
      .finally(() => {
        delete inflight[key];
      });
    inflight[key] = p;
    return p;
  }

  const stKey = (subjectId, day) => `${subjectId}::${day || "all"}`;
  const ftKey = (weekOffset, day) => `${weekOffset}::${day || "all"}`;

  const api = (endpoint, options) => window.apiCall(endpoint, options);

  /* ══════════════════════════════════════════════════════════════════
     BOOTSTRAP  —  seeds all slices in one request
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Call /api/bootstrap and populate every appState slice from the
   * single response.  Already-loaded slices are left untouched so that
   * a second call (e.g. after autogen generation) refreshes everything.
   *
   * The promise is deduplicated: concurrent callers receive the same
   * in-flight request.
   */
  function bootstrapOnce() {
    return once("bootstrap", async () => {
      const data = await api("/api/bootstrap");

      // user
      if (data.user) {
        appState.user = data.user;
        loaded.user = true;
      }

      // subjects
      if (Array.isArray(data.subjects)) {
        appState.subjects = data.subjects;
        loaded.subjects = true;
      }

      // timeslots
      if (Array.isArray(data.timeslots)) {
        appState.timeslots = data.timeslots;
        loaded.timeslots = true;
      }

      // days
      if (Array.isArray(data.days)) {
        appState.days = data.days;
        loaded.days = true;
        window.currentActiveDays = appState.days;
      }

      // schedule (week 0)
      if (data.schedule && typeof data.schedule === "object") {
        appState.schedule[0] = data.schedule;
        loaded.schedule[0] = true;
      }

      // subtasks keyed as "<subjectId>::all"
      if (data.subtasks && typeof data.subtasks === "object") {
        Object.entries(data.subtasks).forEach(([key, list]) => {
          appState.subtasks[key] = list;
          loaded.subtasks[key] = true;
        });
      }

      // free tasks keyed as "<weekOffset>::all"
      if (data.freeTasks && typeof data.freeTasks === "object") {
        Object.entries(data.freeTasks).forEach(([key, list]) => {
          appState.freeTasks[key] = list;
          loaded.freeTasks[key] = true;
        });
      }

      // autogen
      if (data.autogen && typeof data.autogen === "object") {
        appState.autogen = data.autogen;
        loaded.autogen = true;
      }

      return data;
    });
  };

  /* ══════════════════════════════════════════════
     READ ACCESSORS — the only way the UI gets data
  ══════════════════════════════════════════════ */

  const Store = {
    state: appState,

    /** Seed all slices in one round-trip.  Call once on startup. */
    bootstrap: bootstrapOnce,

    /* ── user ── */
    async getUser(force) {
      if (loaded.user && !force) return appState.user;
      return once("user", async () => {
        appState.user = await api("/api/auth/me");
        loaded.user = true;
        return appState.user;
      });
    },

    /* ── subjects ── */
    async getSubjects(force) {
      if (loaded.subjects && !force) return appState.subjects;
      return once("subjects", async () => {
        appState.subjects = (await api("/api/subjects")) || [];
        loaded.subjects = true;
        return appState.subjects;
      });
    },

    async getSubject(id) {
      const subjects = await Store.getSubjects();
      return subjects.find((s) => String(s.id) === String(id)) || null;
    },

    /* ── timeslots ── */
    async getTimeslots(force) {
      if (loaded.timeslots && !force) return appState.timeslots;
      return once("timeslots", async () => {
        appState.timeslots = (await api("/api/timeslots")) || [];
        loaded.timeslots = true;
        return appState.timeslots;
      });
    },

    async getTimeslot(id) {
      const ts = await Store.getTimeslots();
      return ts.find((t) => String(t.id) === String(id)) || null;
    },

    /* ── days ── */
    async getDays(force) {
      if (loaded.days && !force) return appState.days;
      return once("days", async () => {
        appState.days = (await api("/api/days")) || [];
        loaded.days = true;
        window.currentActiveDays = appState.days;
        return appState.days;
      });
    },

    /* ── schedule (per week offset) ── */
    async getSchedule(weekOffset, force) {
      const wk = Number(weekOffset) || 0;
      if (loaded.schedule[wk] && !force) return appState.schedule[wk];
      return once("schedule:" + wk, async () => {
        appState.schedule[wk] = (await api(`/api/schedule?weekOffset=${wk}`)) || {};
        loaded.schedule[wk] = true;
        return appState.schedule[wk];
      });
    },

    /* ── subtasks (per subject, optionally per day) ── */
    async getSubtasks(subjectId, day, force) {
      const key = stKey(subjectId, day);
      if (loaded.subtasks[key] && !force) return appState.subtasks[key];
      return once("subtasks:" + key, async () => {
        const q = day ? `?day=${encodeURIComponent(day)}` : "";
        try {
          appState.subtasks[key] =
            (await api(`/api/subjects/${subjectId}/subtasks${q}`)) || [];
        } catch (_) {
          appState.subtasks[key] = [];
        }
        loaded.subtasks[key] = true;
        return appState.subtasks[key];
      });
    },

    /* ── free tasks (per week offset, optionally per day) ── */
    async getFreeTasks(weekOffset, day, force) {
      const wk = Number(weekOffset) || 0;
      const key = ftKey(wk, day);
      if (loaded.freeTasks[key] && !force) return appState.freeTasks[key];
      return once("freeTasks:" + key, async () => {
        const params = new URLSearchParams({ weekOffset: wk });
        if (day) params.set("day", day);
        try {
          appState.freeTasks[key] = (await api(`/api/free-tasks?${params}`)) || [];
        } catch (_) {
          appState.freeTasks[key] = [];
        }
        loaded.freeTasks[key] = true;
        return appState.freeTasks[key];
      });
    },

    /* ── autogen config ── */
    async getAutogen(force) {
      if (loaded.autogen && !force) return appState.autogen;
      return once("autogen", async () => {
        appState.autogen = (await api("/api/autogen")) || {};
        loaded.autogen = true;
        return appState.autogen;
      });
    },

    /* ── productivity (per week offset) ── */
    async getProductivity(weekOffset, force) {
      const wk = Number(weekOffset) || 0;
      if (loaded.productivity[wk] !== undefined && !force) {
        appState.productivity = loaded.productivity[wk];
        return appState.productivity;
      }
      return once("productivity:" + wk, async () => {
        const data = await api(`/api/productivity/${wk}`);
        loaded.productivity[wk] = data;
        appState.productivity = data;
        return data;
      });
    },

    /* ══════════════════════════════════════════════
       INVALIDATION — call after every write
    ══════════════════════════════════════════════ */

    invalidateUser() {
      loaded.user = false;
    },

    invalidateSubjects() {
      loaded.subjects = false;
      Store.invalidateSubtasks();
    },

    invalidateTimeslots() {
      loaded.timeslots = false;
    },

    invalidateDays() {
      loaded.days = false;
    },

    invalidateAutogen() {
      loaded.autogen = false;
    },

    /** No arg → every week. */
    invalidateSchedule(weekOffset) {
      if (weekOffset === undefined || weekOffset === null) {
        loaded.schedule = {};
        appState.schedule = {};
      } else {
        const wk = Number(weekOffset) || 0;
        delete loaded.schedule[wk];
        delete appState.schedule[wk];
      }
      Store.invalidateProductivity();
    },

    /** No arg → every subject/day pair. */
    invalidateSubtasks(subjectId, day) {
      if (subjectId === undefined || subjectId === null) {
        loaded.subtasks = {};
        appState.subtasks = {};
        return;
      }
      const prefix = `${subjectId}::`;
      Object.keys(loaded.subtasks).forEach((k) => {
        if (k.startsWith(prefix) && (day === undefined || k === stKey(subjectId, day))) {
          delete loaded.subtasks[k];
          delete appState.subtasks[k];
        }
      });
      // A day-scoped change also affects the "all days" list.
      delete loaded.subtasks[stKey(subjectId, null)];
      delete appState.subtasks[stKey(subjectId, null)];
    },

    /** No arg → every week/day pair. */
    invalidateFreeTasks(weekOffset, day) {
      if (weekOffset === undefined || weekOffset === null) {
        loaded.freeTasks = {};
        appState.freeTasks = {};
        return;
      }
      const wk = Number(weekOffset) || 0;
      [ftKey(wk, day), ftKey(wk, null)].forEach((k) => {
        delete loaded.freeTasks[k];
        delete appState.freeTasks[k];
      });
    },

    invalidateProductivity(weekOffset) {
      if (weekOffset === undefined || weekOffset === null) {
        loaded.productivity = {};
        appState.productivity = null;
      } else {
        delete loaded.productivity[Number(weekOffset) || 0];
      }
    },

    /** Everything is stale (e.g. after autogen generation). */
    invalidateAll() {
      loaded.user = false;
      loaded.subjects = false;
      loaded.timeslots = false;
      loaded.days = false;
      loaded.autogen = false;
      loaded.schedule = {};
      loaded.subtasks = {};
      loaded.freeTasks = {};
      loaded.productivity = {};
    },

    /** Full wipe — used on logout / account deletion. */
    reset() {
      Store.invalidateAll();
      appState.user = null;
      appState.subjects = [];
      appState.timeslots = [];
      appState.days = [];
      appState.schedule = {};
      appState.subtasks = {};
      appState.freeTasks = {};
      appState.autogen = {};
      appState.productivity = null;
      window.currentActiveDays = [];
    }
  };

  window.appState = appState;
  window.Store = Store;
})();

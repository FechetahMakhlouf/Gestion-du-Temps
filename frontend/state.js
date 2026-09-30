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

   SUBJECTS CACHE STRATEGY:
   - appState.subjects is populated once by /api/bootstrap on startup.
   - Rendering functions call Store.getSubjects() which returns the cached
     array synchronously (no network hop) when loaded.subjects is true.
   - The cache is refreshed ONLY when subjects actually change: after a
     successful POST, PUT, or DELETE to /api/subjects the write handler
     calls Store.refreshSubjects() which fetches fresh data and stores it.
   - No rendering function ever calls /api/subjects directly.

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

  const isAbort = (err) =>
    typeof window.isAbortError === "function"
      ? window.isAbortError(err)
      : !!err && err.name === "AbortError";

  /* ── obsolete-request cancellation ────────────────────────────────
     Week-scoped reads (schedule, free tasks, productivity) attach the
     signal of the "week" abort group. Calling Store.newWeekGeneration()
     — done by the week navigation handlers — cancels every still
     pending request of the previous week so an outdated response can
     never land in the cache or the DOM. ─────────────────────────── */
  const weekSignal = () =>
    typeof window.apiAbortSignal === "function"
      ? window.apiAbortSignal("week")
      : undefined;

  const weekOpts = () => {
    const signal = weekSignal();
    return signal ? { signal } : {};
  };

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

      // free tasks — bootstrap now returns both "<weekOffset>::all" and
      // "<weekOffset>::<day>" keys, so we store them all in one pass.
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

    /**
     * Start a new week/day/filter "generation": every still-pending
     * week-scoped request (schedule, free tasks, productivity) from the
     * previous generation is aborted so outdated responses are dropped.
     * Call this at the top of any rapid navigation handler.
     */
    newWeekGeneration() {
      if (typeof window.apiAbortGroup === "function") {
        window.apiAbortGroup("week");
      }
    },

    /** Cancel pending week-scoped requests without opening a generation. */
    cancelWeekRequests() {
      if (typeof window.apiAbortCancel === "function") {
        window.apiAbortCancel("week");
      }
    },

    /** True when an error comes from an aborted (obsolete) request. */
    isAbortError: (err) => isAbort(err),

    /* ── user ── */
    async getUser(force) {
      if (loaded.user && !force) return appState.user;
      return once("user", async () => {
        appState.user = await api("/api/auth/me");
        loaded.user = true;
        return appState.user;
      });
    },

    /* ── subjects ──────────────────────────────────────────────────────
       Cache strategy:
         • appState.subjects is populated by bootstrap on startup.
         • getSubjects() returns the cached array instantly when loaded.
         • refreshSubjects() is the ONLY function that hits /api/subjects
           over the network — call it only after a successful write
           (POST / PUT / DELETE).  Never call it during rendering.
       ──────────────────────────────────────────────────────────────── */

    /**
     * Return subjects from cache.  Falls back to /api/subjects only on
     * the very first call (before bootstrap has run) or after an explicit
     * invalidateSubjects() + refreshSubjects() cycle triggered by a write.
     */
    async getSubjects(force) {
      if (loaded.subjects && !force) return appState.subjects;
      return once("subjects", async () => {
        appState.subjects = (await api("/api/subjects")) || [];
        loaded.subjects = true;
        return appState.subjects;
      });
    },

    /**
     * Fetch fresh subjects from /api/subjects and update the cache.
     * Call this ONLY after a successful write (POST / PUT / DELETE) so
     * the cache reflects the server's new state.  All subsequent reads
     * via getSubjects() will return the updated cached array without
     * any additional network request.
     */
    async refreshSubjects() {
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
        appState.schedule[wk] =
          (await api(`/api/schedule?weekOffset=${wk}`, weekOpts())) || {};
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

    /**
     * Bulk-load subtasks for an array of subjects in ONE request.
     * Seeds the cache so subsequent Store.getSubtasks(id, day) calls are
     * instant — eliminating the classic N+1 pattern:
     *
     *   // Before (N requests):
     *   await Promise.all(subjects.map(s => Store.getSubtasks(s.id, day)));
     *
     *   // After (1 request):
     *   await Store.getAllSubtasks(subjects, day);
     *
     * @param {Array}  subjects  — array of subject objects (must have .id)
     * @param {string} [day]     — optional day abbreviation filter
     * @param {boolean}[force]   — bypass cache
     * @returns {Object}  { "<subjectId>::<day|all>": [...], ... }
     */
    async getAllSubtasks(subjects, day, force) {
      if (!subjects || !subjects.length) return {};

      const bucketSuffix = day || "all";

      // Filter to subjects whose cache entry is missing or stale
      const missing = force
        ? subjects
        : subjects.filter((s) => !loaded.subtasks[stKey(s.id, day)]);

      if (!missing.length) {
        // Everything is already cached — assemble from cache
        const result = {};
        subjects.forEach((s) => {
          const k = stKey(s.id, day);
          result[k] = appState.subtasks[k] || [];
        });
        return result;
      }

      const ids = missing.map((s) => s.id).join(",");
      const cacheKey = `subtasksBulk:${ids}:${bucketSuffix}`;

      return once(cacheKey, async () => {
        let bulk = {};
        try {
          const params = new URLSearchParams({ subjectIds: ids });
          if (day) params.set("day", day);
          bulk = (await api(`/api/subtasks?${params}`)) || {};
        } catch (_) {
          // fall back to empty lists for each missing subject
          missing.forEach((s) => {
            bulk[stKey(s.id, day)] = [];
          });
        }

        // Seed the cache for every returned bucket
        Object.entries(bulk).forEach(([key, list]) => {
          appState.subtasks[key] = list;
          loaded.subtasks[key] = true;
        });

        // Return a map covering ALL requested subjects (cached + newly fetched)
        const result = {};
        subjects.forEach((s) => {
          const k = stKey(s.id, day);
          result[k] = appState.subtasks[k] || [];
        });
        return result;
      });
    },

    /**
     * Bulk-load free tasks for all days of a given week in ONE request.
     * Seeds "<weekOffset>::<day>" cache entries so each day column's
     * subsequent Store.getFreeTasks(wk, day) call is a cache hit.
     *
     *   // Before (N requests — one per day):
     *   await Promise.all(days.map(d => Store.getFreeTasks(wk, d.abbr)));
     *
     *   // After (1 request):
     *   await Store.getAllFreeTasks(weekOffset);   // seeds every day bucket
     *
     * @param {number}  weekOffset
     * @param {boolean} [force]
     * @returns {Object}  { "<weekOffset>::<day>": [...], ... }
     */
    async getAllFreeTasks(weekOffset, force) {
      const wk = Number(weekOffset) || 0;
      const allKey = ftKey(wk, null); // "<wk>::all"

      // If the "all" bucket is already loaded, derive day buckets from it
      // without hitting the network.
      if (loaded.freeTasks[allKey] && !force) {
        const allTasks = appState.freeTasks[allKey] || [];
        const byDay = {};
        allTasks.forEach((ft) => {
          if (ft.day) {
            const k = ftKey(wk, ft.day);
            (byDay[k] = byDay[k] || []).push(ft);
          }
        });
        // Seed cache for any day bucket that isn't already loaded
        Object.entries(byDay).forEach(([k, list]) => {
          if (!loaded.freeTasks[k]) {
            appState.freeTasks[k] = list;
            loaded.freeTasks[k] = true;
          }
        });
        return byDay;
      }

      return once(`freeTasksBulk:${wk}`, async () => {
        let allTasks = [];
        try {
          const params = new URLSearchParams({ weekOffset: wk });
          allTasks = (await api(`/api/free-tasks?${params}`, weekOpts())) || [];
        } catch (err) {
          if (isAbort(err)) throw err; // obsolete week — keep cache untouched
        }

        // Populate the "all" bucket
        appState.freeTasks[allKey] = allTasks;
        loaded.freeTasks[allKey] = true;

        // Populate per-day buckets
        const byDay = {};
        allTasks.forEach((ft) => {
          if (ft.day) {
            const k = ftKey(wk, ft.day);
            (byDay[k] = byDay[k] || []).push(ft);
            appState.freeTasks[k] = byDay[k];
            loaded.freeTasks[k] = true;
          }
        });
        return byDay;
      });
    },

    /**
     * Load the free tasks of SEVERAL days in ONE request.
     *
     *   // Before (N requests — one per day):
     *   /api/free-tasks?day=Lun  /api/free-tasks?day=Mar  …
     *
     *   // After (1 request):
     *   /api/free-tasks?weekOffset=0&days=Lun,Mar,Mer,Jeu,Ven
     *
     * Only the days that are not already cached are requested; when every
     * day is cached the function resolves from memory with no network hop.
     *
     * @param {number}   weekOffset
     * @param {string[]} days    — day abbreviations
     * @param {boolean} [force]  — bypass cache
     * @returns {Object} { "<weekOffset>::<day>": [...], ... }
     */
    async getFreeTasksForDays(weekOffset, days, force) {
      const wk = Number(weekOffset) || 0;
      const list = (days || []).filter(Boolean);
      if (!list.length) return {};

      const collect = () => {
        const out = {};
        list.forEach((d) => {
          out[ftKey(wk, d)] = appState.freeTasks[ftKey(wk, d)] || [];
        });
        return out;
      };

      const missing = force
        ? list
        : list.filter((d) => !loaded.freeTasks[ftKey(wk, d)]);
      if (!missing.length) return collect();

      return once(`freeTasksDays:${wk}:${missing.join(",")}`, async () => {
        const params = new URLSearchParams({ weekOffset: wk, days: missing.join(",") });
        let buckets = {};
        try {
          buckets = (await api(`/api/free-tasks?${params}`, weekOpts())) || {};
        } catch (err) {
          if (isAbort(err)) throw err; // obsolete week — keep cache untouched
          buckets = {};
        }
        missing.forEach((d) => {
          const k = ftKey(wk, d);
          appState.freeTasks[k] = buckets[d] || [];
          loaded.freeTasks[k] = true;
        });
        return collect();
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
          appState.freeTasks[key] =
            (await api(`/api/free-tasks?${params}`, weekOpts())) || [];
        } catch (err) {
          if (isAbort(err)) throw err; // obsolete request — do not cache
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
        const data = await api(`/api/productivity/${wk}`, weekOpts());
        loaded.productivity[wk] = data;
        appState.productivity = data;
        return data;
      });
    },

    /* ══════════════════════════════════════════════
       PATCH HELPERS — update cache without refetch
       ══════════════════════════════════════════════
       Use these after successful writes to avoid a
       full invalidate + re-fetch round-trip.  Each
       helper mutates the relevant appState slice in
       place so the next Store.get*() call returns
       the new value from cache without hitting the
       network.
    ══════════════════════════════════════════════ */

    /**
     * Update a single schedule record in the cache.
     *
     * @param {number} weekOffset
     * @param {string} key   — schedule key: "<wk>_<day>_<tsId>"
     * @param {number|null} subjectId — null to remove the record
     */
    patchScheduleRecord(weekOffset, key, subjectId) {
      const wk = Number(weekOffset) || 0;
      if (!appState.schedule[wk]) appState.schedule[wk] = {};
      if (subjectId === null || subjectId === undefined) {
        delete appState.schedule[wk][key];
      } else {
        appState.schedule[wk][key] = subjectId;
      }
      // Ensure the week is marked as loaded
      loaded.schedule[wk] = true;
    },

    /**
     * Replace the entire schedule for one week in the cache.
     *
     * @param {number} weekOffset
     * @param {Object} scheduleMap — complete { key: subjectId } map
     */
    setScheduleWeek(weekOffset, scheduleMap) {
      const wk = Number(weekOffset) || 0;
      appState.schedule[wk] = scheduleMap || {};
      loaded.schedule[wk] = true;
    },

    /**
     * Add a newly created timeslot to the cache without refetching.
     *
     * @param {Object} timeslot — the timeslot object returned by the server
     */
    addTimeslot(timeslot) {
      if (!timeslot) return;
      appState.timeslots = [...appState.timeslots, timeslot];
      loaded.timeslots = true;
    },

    /**
     * Remove a timeslot from the cache by id without refetching.
     *
     * @param {string|number} id
     */
    removeTimeslot(id) {
      appState.timeslots = appState.timeslots.filter(
        (t) => String(t.id) !== String(id)
      );
      // Keep loaded.timeslots = true so the next getTimeslots() is a cache hit
    },

    /**
     * Replace the active-days list in the cache without refetching.
     *
     * @param {string[]} days — ordered array of day abbreviations
     */
    setDays(days) {
      appState.days = days || [];
      loaded.days = true;
      window.currentActiveDays = appState.days;
    },

    /* ══════════════════════════════════════════════
       INVALIDATION — call after every write
    ══════════════════════════════════════════════ */

    invalidateUser() {
      loaded.user = false;
    },

    /**
     * Mark subjects cache as stale.  After calling this you MUST call
     * Store.refreshSubjects() (not Store.getSubjects()) to fetch fresh
     * data, so the cache is repopulated before any rendering function
     * reads appState.subjects.
     *
     * Typical write flow:
     *   await apiCall('/api/subjects', { method: 'POST', ... });
     *   Store.invalidateSubjects();
     *   await Store.refreshSubjects();   // ← one network call, then cached
     *   await renderAll();               // reads appState.subjects — no fetch
     */
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
      Store.cancelWeekRequests();
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

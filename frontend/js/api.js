window.API_BASE = 'https://jadwal-backend-n52u.onrender.com';

/* Performance timeline helpers.  These are intentionally no-ops when the
   Performance API is unavailable so telemetry never affects app behavior. */
window.appPerformance = (() => {
    let sequence = 0;

    const mark = (name) => {
        if (typeof performance === 'undefined' || !performance.mark) return;
        performance.mark(name);
    };

    const measure = (name, start, end) => {
        if (typeof performance === 'undefined' || !performance.measure) return;
        try {
            performance.measure(name, start, end);
        } catch (_) {
            // A missing mark should never break application startup.
        }
    };

    const measureAsync = async (name, operation) => {
        const id = ++sequence;
        const start = `${name}-start-${id}`;
        const end = `${name}-end-${id}`;
        mark(start);
        try {
            return await operation();
        } finally {
            mark(end);
            measure(name, start, end);
        }
    };

    const span = (name) => {
        const id = ++sequence;
        const start = `${name}-start-${id}`;
        const end = `${name}-end-${id}`;
        mark(start);
        return () => {
            mark(end);
            measure(name, start, end);
        };
    };

    return { mark, measure, measureAsync, span };
})();

/* ══════════════════════════════════════════════════════════════════════
   REQUEST CANCELLATION (AbortController)
   ----------------------------------------------------------------------
   When the user rapidly changes the week / day / filter, the responses of
   the previous selection are useless. Instead of letting them finish (and
   possibly overwrite the cache with outdated data), each navigation opens
   a new "abort group" and cancels the previous one.

   Usage:
     const signal = window.apiAbortGroup('week');   // cancels previous group
     apiCall('/api/schedule?weekOffset=2', { signal });

   Aborted requests reject with an error carrying `.aborted === true`, so
   callers can ignore them silently.
   ══════════════════════════════════════════════════════════════════════ */

const _abortGroups = Object.create(null);

/**
 * Abort every in-flight request of `name` and return a fresh signal for
 * the new generation of requests.
 * @param {string} name
 * @returns {AbortSignal}
 */
window.apiAbortGroup = (name) => {
    const previous = _abortGroups[name];
    if (previous) {
        try { previous.abort(); } catch (_) { /* already aborted */ }
    }
    const controller = new AbortController();
    _abortGroups[name] = controller;
    return controller.signal;
};

/** Return the current signal of a group without cancelling anything. */
window.apiAbortSignal = (name) =>
    _abortGroups[name] ? _abortGroups[name].signal : undefined;

/** Abort a group without opening a new one (e.g. on logout). */
window.apiAbortCancel = (name) => {
    const controller = _abortGroups[name];
    if (controller) {
        try { controller.abort(); } catch (_) { /* noop */ }
        delete _abortGroups[name];
    }
};

/** True when the error comes from an aborted (obsolete) request. */
window.isAbortError = (err) =>
    !!err && (err.aborted === true || err.name === 'AbortError');

window.apiCall = async (endpoint, options = {}) => {
    const url = window.API_BASE + endpoint;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const requestStart = `api-request-start-${requestId}`;
    const requestEnd = `api-request-end-${requestId}`;
    window.appPerformance.mark(requestStart);
    const finishRequestMeasure = () => {
        window.appPerformance.mark(requestEnd);
        window.appPerformance.measure('api-latency', requestStart, requestEnd);
    };

    let res;
    try {
        res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        });
    } catch (e) {
        if (e && (e.name === 'AbortError' || options.signal?.aborted)) {
            const abortErr = new Error('Requête annulée');
            abortErr.name = 'AbortError';
            abortErr.aborted = true;
            finishRequestMeasure();
            throw abortErr;
        }
        finishRequestMeasure();
        throw e;
    }

    let data;
    try {
        data = await res.json();
    } catch (e) {
        finishRequestMeasure();
        throw new Error('Réponse invalide du serveur');
    }

    if (!res.ok) {
        finishRequestMeasure();
        throw new Error(data.message || 'Erreur ' + res.status);
    }

    finishRequestMeasure();
    return data.data !== undefined ? data.data : data;
};

/* ui.js — lazy-module loader, navigation, toasts, contact, app boot.
   Loaded first among app scripts (all scripts use `defer`, so they run in
   order after parsing and before DOMContentLoaded). */

/* ══════════════════════════════════════════════
   LAZY MODULE LOADER
   Secondary features live in js/lazy/*.js and are fetched on first use.
══════════════════════════════════════════════ */

const _LAZY_BASE = document.currentScript.src.replace(/ui\.js(\?.*)?$/, "lazy/");
const _lazyModules = Object.create(null);

function loadModule(name) {
  return (_lazyModules[name] ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = _LAZY_BASE + name + ".js";
    s.onload = resolve;
    s.onerror = () => {
      delete _lazyModules[name];
      reject(new Error("Impossible de charger le module " + name));
    };
    document.head.appendChild(s);
  }));
}

function isModuleLoaded(name) {
  return !!_lazyModules[name];
}

function ensurePanel(name) {
  const id = "panel-" + name;
  let panel = document.getElementById(id);
  if (panel) return panel;
  const template = document.getElementById("secondary-panels-template");
  const source = template?.content.querySelector("#" + id);
  if (!source) return null;
  panel = source.cloneNode(true);
  document.querySelector(".main-content").appendChild(panel);
  return panel;
}

/** Define global stubs that load `mod` then forward the call to the real
    function (the module's own declaration replaces the stub). */
function lazyStub(mod, names) {
  names.forEach((n) => {
    const stub = (...args) =>
      loadModule(mod).then(() => {
        if (window[n] === stub) throw new Error(`${n} missing in ${mod}.js`);
        return window[n](...args);
      }).catch((e) => { if (!/missing in/.test(e.message)) toast(e.message, "error"); else console.error(e); });
    window[n] = stub;
  });
}

lazyStub("autogen", ["renderAutogenGrid", "updateAutogenTotal", "autoGenerate"]);
lazyStub("export", ["exportSchedule"]);
lazyStub("guide", ["openGuide", "goToGuideStep", "guideNext", "guidePrev"]);
lazyStub("productivity", ["renderProductivityCard"]);
lazyStub("focus-mode", ["toggleFocusMode", "enterFocusMode", "exitFocusMode",
  "toggleFocusSettings", "applyFocusPref", "restoreFocusState"]);

/* Emoji picker: needs the original event's currentTarget, which is gone
   once the module has loaded asynchronously — capture it first. */
window.toggleEmojiPicker = function (event, inputId) {
  event.stopPropagation();
  const target = event.currentTarget;
  loadModule("emoji").then(() =>
    window.toggleEmojiPicker({ stopPropagation() {}, currentTarget: target }, inputId),
  );
};
window.closeEmojiPicker = () => {}; // nothing to close until loaded

/* Focus button lives in the schedule header from the start; the 700-line
   focus module itself is only fetched when the button (or a restore) needs it. */
function injectFocusButton() {
  if (document.getElementById("focus-mode-btn")) return;
  const btn = document.createElement("button");
  btn.id = "focus-mode-btn";
  btn.className = "btn-secondary focus-mode-toggle-btn";
  btn.textContent = "⏱ Focus";
  btn.setAttribute("aria-pressed", "false");
  btn.setAttribute("aria-label", "Activer le mode focus");
  btn.title = "Mode Focus (raccourci : F)";
  btn.onclick = () => toggleFocusMode();
  const group = document.querySelector("#panel-schedule .panel-header > div:last-child");
  if (group) group.insertBefore(btn, group.firstChild);
}

/** Only pull in focus-mode.js if a session was active before reload. */
function restoreFocusIfNeeded() {
  try {
    if (JSON.parse(localStorage.getItem("jadwal_focus_state"))?.active) restoreFocusState();
  } catch { /* ignore */ }
}

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */

function showPanel(name) {
  const panel = ensurePanel(name);
  if (!panel) return;
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  panel.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    if (n.getAttribute("onclick") && n.getAttribute("onclick").includes(name))
      n.classList.add("active");
  });
  if (name === "schedule") renderScheduleGrid();
  if (name === "tasks") Promise.all([renderSubjectsPanel(), renderPalette()]);
  if (name === "timeslots") Promise.all([renderTimeslots(), renderDaysCheckboxes()]);
  if (name === "autogen") renderAutogenGrid();
  if (name === "guide") openGuide();
  if (name === "contact") {
    // Pre-fill name if logged in and field is empty
    const usernameEl = document.getElementById("sidebar-username");
    const nameField = document.getElementById("contact-name");
    if (
      usernameEl &&
      nameField &&
      !nameField.value &&
      usernameEl.textContent !== "—"
    ) {
      nameField.value = usernameEl.textContent;
    }
  }
  // Si on quitte le panel export, on retire export-mode (restaure la sidebar)
  if (name !== "export") {
    document.body.classList.remove("export-mode");
  }
  // Fermer sidebar sur mobile après navigation
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

function updateMobileNav(panel) {
  document.querySelectorAll(".mobile-bottom-nav .nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.panel === panel);
  });
}

/* Close sidebar when tapping outside on mobile */
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const topBar = document.getElementById("mobile-top-bar");
  if (sidebar?.classList.contains("open") && window.innerWidth <= 768 &&
      !sidebar.contains(e.target) && !topBar?.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

/* ══════════════════════════════════════════════
   RENDER ALL — parallel; lazy panels refresh only once loaded
══════════════════════════════════════════════ */

async function renderAll() {
  await renderScheduleGrid();
}

/* ══════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════ */

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;

  const text = document.createElement("span");
  text.textContent = msg;

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.innerHTML = "×";
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.onclick = () => el.remove();

  el.appendChild(text);
  el.appendChild(closeBtn);
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.classList.add("toast-hide"), 2700);
  setTimeout(() => el.remove(), 3000);
}

// ── Contact Panel (Backend API) ─────────────────────────────────────────────
function sendContactEmail() {
  const name = document.getElementById("contact-name").value.trim();
  const email = document.getElementById("contact-email").value.trim();
  const message = document.getElementById("contact-message").value.trim();
  const msgEl = document.getElementById("contact-msg");
  const btn = document.getElementById("contact-submit");
  const btnText = document.getElementById("contact-btn-text");

  msgEl.innerHTML = "";

  if (!name || !email || !message) {
    msgEl.innerHTML =
      '<span style="color:var(--danger);font-size:0.83rem;">Veuillez remplir tous les champs.</span>';
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    msgEl.innerHTML =
      '<span style="color:var(--danger);font-size:0.83rem;">Email invalide.</span>';
    return;
  }

  btn.disabled = true;
  btnText.textContent = "Envoi en cours…";

  apiCall("/api/contact", {
    method: "POST",
    body: JSON.stringify({ name, email, message }),
  })
    .then(() => {
      msgEl.innerHTML =
        '<span style="color:#22c55e;font-size:0.83rem;">✅ Message envoyé avec succès ! Merci.</span>';
      btnText.textContent = "Envoyé ✓";
      document.getElementById("contact-message").value = "";
      setTimeout(() => {
        btn.disabled = false;
        btnText.textContent = "Envoyer →";
        msgEl.innerHTML = "";
      }, 4000);
    })
    .catch((err) => {
      console.error("Contact API error:", err);
      msgEl.innerHTML = `<span style="color:var(--danger);font-size:0.83rem;">${err.message || "Erreur lors de l'envoi. Veuillez réessayer."}</span>`;
      btn.disabled = false;
      btnText.textContent = "Envoyer →";
    });
}

/* ══════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════ */

window.addEventListener("DOMContentLoaded", async () => {
  // Keep bottom nav in sync with sidebar navigation
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.getAttribute("onclick")?.match(/showPanel\('(\w+)'\)/)?.[1];
      if (panel) updateMobileNav(panel);
    });
  });
  _initFreeTaskNativeColor();
  showLoader();

  // Check for password reset token in URL
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset_token");
  if (resetToken) {
    window.history.replaceState({}, "", window.location.pathname);
    hideLoader();
    showResetForm(resetToken);
    return;
  }

  try {
    // /api/bootstrap seeds all slices in one request (subjects, timeslots,
    // days, schedule, subtasks, freeTasks, autogen) and also returns user.
    // If it resolves, the user is authenticated; if it rejects (401), we
    // fall back to the login form exactly as before.
    const bootstrapData = await Store.bootstrap();
    const user = bootstrapData && bootstrapData.user
      ? bootstrapData.user
      : await Store.getUser();
    hideLoader();
    if (user) {
      await startApp();
    } else {
      document.getElementById("auth-page").style.display = "flex";
      requestAnimationFrame(() =>
        document.getElementById("login-email").focus(),
      );
    }
  } catch (e) {
    hideLoader();
    document.getElementById("auth-page").style.display = "flex";
    requestAnimationFrame(() => document.getElementById("login-email").focus());
  }
});

/* auth.js — login/register, session start, password reset, account settings
   Classic script: top-level functions stay global so index.html onclick="…" handlers keep working. */

/* ══════════════════════════════════════════════
   UTILS — Loading states, password toggle
══════════════════════════════════════════════ */

function setLoading(btnId, isLoading) {
  const btn =
    typeof btnId === "string" ? document.getElementById(btnId) : btnId;
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn._origText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn._origText || btn.innerHTML;
  }
}

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  btn.classList.toggle("active", isPassword);
  // Swap eye / eye-off icon
  btn.innerHTML = isPassword
    ? `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
               <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
    : `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
               <circle cx="12" cy="12" r="3"/>
           </svg>`;
}

function showLoader() {
  const l = document.getElementById("app-loader");
  if (l) l.classList.add("visible");
}
function hideLoader() {
  const l = document.getElementById("app-loader");
  if (l) l.classList.remove("visible");
}

/* ══════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════ */

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    const isActive =
      (i === 0 && tab === "login") || (i === 1 && tab === "register");
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", isActive);
  });
  document.getElementById("login-form").style.display =
    tab === "login" ? "flex" : "none";
  document.getElementById("register-form").style.display =
    tab === "register" ? "flex" : "none";
  // Auto-focus first field
  requestAnimationFrame(() => {
    const first = document.querySelector(
      `#${tab === "login" ? "login-email" : "reg-name"}`,
    );
    if (first) first.focus();
  });
}

function showMsg(el, msg, type) {
  el.innerHTML = `<div class="auth-msg ${type}">${msg}</div>`;
}

async function doLogin() {
  const email = document
    .getElementById("login-email")
    .value.trim()
    .toLowerCase();
  const pwd = document.getElementById("login-password").value;
  const msgEl = document.getElementById("login-msg");
  if (!email || !pwd) {
    showMsg(msgEl, "Remplissez tous les champs.", "error");
    return;
  }

  setLoading("login-submit", true);
  try {
    await apiCall("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pwd }),
    });
    showMsg(msgEl, "Connexion réussie", "success");
    setTimeout(() => {
      msgEl.innerHTML = "";
    }, 2000);
    setTimeout(async () => {
      // Prime the bootstrap cache right after login so startApp
      // finds all slices already populated (no extra round-trips).
      try { await Store.bootstrap(); } catch (_) {}
      startApp();
      document.getElementById("login-email").value = "";
      document.getElementById("login-password").value = "";
    }, 500);
  } catch (e) {
    showMsg(msgEl, e.message, "error");
    setLoading("login-submit", false);
  }
}

async function doRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const pwd = document.getElementById("reg-password").value;
  const confirmPwd = document.getElementById("reg-confirm-password").value;
  const msgEl = document.getElementById("reg-msg");

  if (!name || !email || !pwd || !confirmPwd) {
    showMsg(msgEl, "Remplissez tous les champs.", "error");
    return;
  }
  if (pwd.length < 6) {
    showMsg(msgEl, "Mot de passe trop court (min 6 caractères).", "error");
    return;
  }
  if (pwd !== confirmPwd) {
    showMsg(msgEl, "Les mots de passe ne correspondent pas.", "error");
    return;
  }

  setLoading("reg-submit", true);
  try {
    await apiCall("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password: pwd }),
    });

    showMsg(
      msgEl,
      "Compte créé avec succès ! Vous pouvez maintenant vous connecter.",
      "success",
    );
    setTimeout(() => {
      msgEl.innerHTML = "";
    }, 2000);

    document.getElementById("reg-name").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";
    document.getElementById("reg-confirm-password").value = "";

    setTimeout(() => {
      switchAuthTab("login");
      document.getElementById("login-email").value = "";
      document.getElementById("login-password").value = "";
      document.getElementById("login-msg").innerHTML = "";
      setLoading("reg-submit", false);
    }, 1500);
  } catch (e) {
    showMsg(msgEl, e.message, "error");
    setLoading("reg-submit", false);
  }
}

function confirmLogout() {
  ensureModal("logout-modal");
  document.getElementById("logout-modal").classList.add("open");
}

async function doLogout() {
  closeModal("logout-modal");
  await apiCall("/api/auth/logout", { method: "POST" }).catch(() => {});
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_USER_DATA" });
  Store.reset();
  document.getElementById("auth-page").style.display = "flex";
  document.getElementById("app-page").style.display = "none";
  toast("À bientôt !", "info");
}

async function startApp() {
  document.getElementById("auth-page").style.display = "none";
  document.getElementById("app-page").style.display = "block";
  setLoading("login-submit", false);
  const user = await Store.getUser();

  // Sidebar: username + initials avatar + date
  document.getElementById("sidebar-username").textContent = user.name;
  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  document.getElementById("sidebar-avatar").textContent = initials;
  const mobileAvatar = document.getElementById("mobile-avatar");
  if (mobileAvatar) mobileAvatar.textContent = initials;
  const now = new Date();
  document.getElementById("sidebar-date").textContent = now.toLocaleDateString(
    "fr-FR",
    { weekday: "short", day: "numeric", month: "short" },
  );

  renderAll();

  // ── Focus Mode integration ──────────────────────────────────────────
  // Inject the ⏱ Focus button into the schedule panel header, then
  // restore focus state if the user reloaded during an active session.
  injectFocusButton();
  restoreFocusIfNeeded();
}


/* ══════════════════════════════════════════════
   FORGOT / RESET PASSWORD
══════════════════════════════════════════════ */

function showForgotForm(e) {
  if (e) e.preventDefault();
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("reset-form").style.display = "none";
  document.getElementById("forgot-form").style.display = "flex";
  document.querySelector(".auth-tabs").style.display = "none";
  document.querySelector(".auth-card-heading h2").textContent =
    "Mot de passe oublié";
  document.querySelector(".auth-card-heading p").textContent =
    "Nous vous enverrons un lien de réinitialisation";
  document.getElementById("forgot-email").value = "";
  document.getElementById("forgot-msg").innerHTML = "";
  requestAnimationFrame(() => document.getElementById("forgot-email").focus());
}

function showLoginForm(e) {
  if (e) e.preventDefault();
  document.getElementById("forgot-form").style.display = "none";
  document.getElementById("reset-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("login-form").style.display = "flex";
  document.querySelector(".auth-tabs").style.display = "flex";
  document.querySelector(".auth-card-heading h2").textContent = "Bienvenue";
  document.querySelector(".auth-card-heading p").textContent =
    "Connectez-vous ou créez votre compte";
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    t.classList.toggle("active", i === 0);
    t.setAttribute("aria-selected", i === 0 ? "true" : "false");
  });
  requestAnimationFrame(() => document.getElementById("login-email").focus());
}

function showResetForm(token) {
  document.getElementById("auth-page").style.display = "flex";
  document.getElementById("app-page").style.display = "none";
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "none";
  document.getElementById("forgot-form").style.display = "none";
  document.getElementById("reset-form").style.display = "flex";
  document.querySelector(".auth-tabs").style.display = "none";
  document.querySelector(".auth-card-heading h2").textContent =
    "Nouveau mot de passe";
  document.querySelector(".auth-card-heading p").textContent =
    "Choisissez un nouveau mot de passe sécurisé";
  document.getElementById("reset-token").value = token;
  document.getElementById("reset-password").value = "";
  document.getElementById("reset-confirm").value = "";
  document.getElementById("reset-msg").innerHTML = "";
  requestAnimationFrame(() =>
    document.getElementById("reset-password").focus(),
  );
}

async function doForgotPassword() {
  const email = document
    .getElementById("forgot-email")
    .value.trim()
    .toLowerCase();
  const msgEl = document.getElementById("forgot-msg");
  if (!email) {
    showMsg(msgEl, "Entrez votre adresse email.", "error");
    return;
  }

  setLoading("forgot-submit", true);
  try {
    const res = await apiCall("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    showMsg(
      msgEl,
      res.message || "Si cet email existe, un lien a été envoyé.",
      "success",
    );
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  } finally {
    setLoading("forgot-submit", false);
  }
}

async function doResetPassword() {
  const token = document.getElementById("reset-token").value;
  const pwd = document.getElementById("reset-password").value;
  const confirm = document.getElementById("reset-confirm").value;
  const msgEl = document.getElementById("reset-msg");
  if (!pwd || !confirm) {
    showMsg(msgEl, "Remplissez tous les champs.", "error");
    return;
  }
  if (pwd.length < 6) {
    showMsg(msgEl, "Minimum 6 caractères.", "error");
    return;
  }
  if (pwd !== confirm) {
    showMsg(msgEl, "Les mots de passe ne correspondent pas.", "error");
    return;
  }

  setLoading("reset-submit", true);
  try {
    const res = await apiCall("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: pwd }),
    });
    showMsg(msgEl, res.message || "Mot de passe mis à jour !", "success");
    setTimeout(() => showLoginForm(null), 2000);
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  } finally {
    setLoading("reset-submit", false);
  }
}

/* ══════════════════════════════════════════════
   ACCOUNT SETTINGS — change password / delete account
══════════════════════════════════════════════ */

async function doChangePassword() {
  const currentPwd = document.getElementById("settings-current-password").value;
  const newPwd = document.getElementById("settings-new-password").value;
  const confirmPwd = document.getElementById("settings-confirm-password").value;
  const msgEl = document.getElementById("settings-password-msg");

  if (!currentPwd || !newPwd || !confirmPwd) {
    showMsg(msgEl, "Remplissez tous les champs.", "error");
    return;
  }
  if (newPwd.length < 6) {
    showMsg(
      msgEl,
      "Nouveau mot de passe trop court (min 6 caractères).",
      "error",
    );
    return;
  }
  if (newPwd !== confirmPwd) {
    showMsg(msgEl, "Les mots de passe ne correspondent pas.", "error");
    return;
  }

  setLoading("settings-password-submit", true);
  try {
    const res = await apiCall("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: currentPwd,
        newPassword: newPwd,
      }),
    });
    showMsg(
      msgEl,
      res.message || "Mot de passe modifié avec succès !",
      "success",
    );
    document.getElementById("settings-current-password").value = "";
    document.getElementById("settings-new-password").value = "";
    document.getElementById("settings-confirm-password").value = "";
    toast("Mot de passe modifié", "success");
  } catch (e) {
    showMsg(msgEl, e.message, "error");
  } finally {
    setLoading("settings-password-submit", false);
  }
}

function openDeleteAccountModal() {
  ensureModal("delete-account-modal");
  document.getElementById("delete-account-password").value = "";
  document.getElementById("delete-account-msg").innerHTML = "";
  document.getElementById("delete-account-modal").classList.add("open");
  requestAnimationFrame(() =>
    document.getElementById("delete-account-password").focus(),
  );
}

async function doDeleteAccount() {
  const pwd = document.getElementById("delete-account-password").value;
  const msgEl = document.getElementById("delete-account-msg");
  if (!pwd) {
    showMsg(msgEl, "Entrez votre mot de passe.", "error");
    return;
  }

  setLoading("delete-account-submit", true);
  try {
    await apiCall("/api/auth/account", {
      method: "DELETE",
      body: JSON.stringify({ password: pwd }),
    });
    Store.reset();
    closeModal("delete-account-modal");
    document.getElementById("app-page").style.display = "none";
    document.getElementById("auth-page").style.display = "flex";
    toast("Votre compte a été supprimé", "info");
  } catch (e) {
    showMsg(msgEl, e.message, "error");
    setLoading("delete-account-submit", false);
  }
}

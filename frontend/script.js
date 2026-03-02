// Auth
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register')));
    document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
}

function showMsg(el, msg, type) {
    el.innerHTML = `<div class="auth-msg ${type}">${msg}</div>`;
}
async function doLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pwd = document.getElementById('login-password').value;
    const msgEl = document.getElementById('login-msg');
    if (!email || !pwd) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }
    try {
        const data = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pwd })
        });
        showMsg(msgEl, 'Connexion réussie', 'success');
        setTimeout(startApp, 500);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function doRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pwd = document.getElementById('reg-password').value;
    const msgEl = document.getElementById('reg-msg');
    if (!name || !email || !pwd) { showMsg(msgEl, 'Remplissez tous les champs.', 'error'); return; }
    if (pwd.length < 6) { showMsg(msgEl, 'Mot de passe trop court (min 6 chars).', 'error'); return; }
    try {
        const data = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password: pwd })
        });
        showMsg(msgEl, 'Compte créé ! Connexion...', 'success');
        setTimeout(startApp, 800);
    } catch (e) {
        showMsg(msgEl, e.message, 'error');
    }
}

async function doLogout() {
    await apiCall('/api/auth/logout', { method: 'POST' }).catch(() => { });
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('app-page').style.display = 'none';
    toast('À bientôt !', 'info');
}

async function startApp() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'block';
    const user = await apiCall('/api/auth/me');
    document.getElementById('sidebar-username').textContent = user.name;
    buildColorGrid();
    renderAll();
}
// Navigation
function showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(name)) n.classList.add('active');
    });
    if (name === 'schedule') renderScheduleGrid();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}
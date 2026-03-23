// js/auth.js — Logique login page (index.html)

window.handleLogin = async function() {
  const studentId = document.getElementById('studentId').value.trim();
  const password  = document.getElementById('password').value;
  const btn       = document.getElementById('loginBtn');
  const errorDiv  = document.getElementById('error-msg');
  const attDiv    = document.getElementById('attempts-left');

  errorDiv.style.display = 'none';
  attDiv.style.display   = 'none';
  errorDiv.textContent   = '';

  if (!studentId || !password) {
    showError('Veuillez remplir tous les champs.');
    return;
  }

  btn.disabled     = true;
  btn.textContent  = 'Connexion...';

  try {
    const data = await Api.login(studentId, password);
    window.location.href = data.user.isAdmin
      ? '/pages/admin.html'
      : '/pages/inbox.html';

  } catch (err) {
    showError(err.message);
    const match = err.message.match(/(\d+) tentative/);
    if (match) {
      attDiv.textContent   = `⚠ ${match[0]} avant blocage temporaire`;
      attDiv.style.display = 'block';
    }
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Se connecter';
  }
};

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent   = msg;
  el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  // Rediriger si déjà connecté
  if (Api.isLoggedIn()) {
    const user = Api.getUser();
    window.location.href = (user && user.isAdmin)
      ? '/pages/admin.html'
      : '/pages/inbox.html';
    return;
  }

  // Bouton login
  document.getElementById('loginBtn').addEventListener('click', window.handleLogin);

  // Touche Entrée
  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleLogin();
  });
  document.getElementById('studentId').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('password').focus();
  });
});


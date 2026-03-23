// js/compose.js — Logique page de composition
// Utilise window.Api (global depuis api.js)

(function() {
  'use strict';

  let allUsers = [];
  let selectedRecipient = null;

  function init() {
    if (!Api.isLoggedIn()) {
      window.location.href = '/pages/index.html';
      return;
    }

    const user = Api.getUser();
    if (!user) { Api.logout(); return; }

    // Sidebar user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userId').textContent = user.studentId;
    document.getElementById('userDept').textContent = user.department || '';

    // Déconnexion
    document.getElementById('btnLogout').addEventListener('click', (e) => {
      e.preventDefault();
      Api.logout();
    });

    // Charger les utilisateurs
    loadUsers();

    // Recipient search
    const searchInput = document.getElementById('recipientSearch');
    const suggestionsDiv = document.getElementById('userSuggestions');

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (query.length < 1) {
        suggestionsDiv.classList.remove('show');
        return;
      }
      const filtered = allUsers.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.studentId.toLowerCase().includes(query) ||
        (u.department || '').toLowerCase().includes(query)
      );
      renderSuggestions(filtered);
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 1) {
        suggestionsDiv.classList.add('show');
      }
    });

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.user-dropdown')) {
        suggestionsDiv.classList.remove('show');
      }
    });

    // Send button
    document.getElementById('btnSend').addEventListener('click', sendMessage);

    // Pre-fill recipient from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const replyTo = urlParams.get('to');
    if (replyTo) {
      // Will be set after users load
      waitForUsersAndSelect(replyTo);
    }
    const replySubject = urlParams.get('subject');
    if (replySubject) {
      document.getElementById('subject').value = replySubject;
    }
  }

  async function loadUsers() {
    try {
      const data = await Api.searchUsers();
      allUsers = data.students || [];
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  function waitForUsersAndSelect(studentId) {
    const interval = setInterval(() => {
      if (allUsers.length > 0) {
        clearInterval(interval);
        const user = allUsers.find(u => u.studentId === studentId);
        if (user) selectRecipient(user);
      }
    }, 200);
    // Timeout after 5s
    setTimeout(() => clearInterval(interval), 5000);
  }

  function renderSuggestions(users) {
    const suggestionsDiv = document.getElementById('userSuggestions');
    if (users.length === 0) {
      suggestionsDiv.innerHTML = '<div class="user-option" style="color:var(--color-text-muted);">Aucun résultat</div>';
      suggestionsDiv.classList.add('show');
      return;
    }

    suggestionsDiv.innerHTML = users.map(u => `
      <div class="user-option" data-sid="${escapeHtml(u.studentId)}">
        <span>
          <span class="opt-name">${escapeHtml(u.name)}</span>
          <span class="opt-info"> · ${escapeHtml(u.studentId)}</span>
        </span>
        <span class="opt-info">${escapeHtml(u.department || '')}</span>
      </div>
    `).join('');

    suggestionsDiv.classList.add('show');

    // Bind click
    suggestionsDiv.querySelectorAll('.user-option[data-sid]').forEach(opt => {
      opt.addEventListener('click', () => {
        const user = allUsers.find(u => u.studentId === opt.dataset.sid);
        if (user) selectRecipient(user);
      });
    });
  }

  function selectRecipient(user) {
    selectedRecipient = user;
    const searchInput = document.getElementById('recipientSearch');
    const suggestionsDiv = document.getElementById('userSuggestions');
    const selectedDiv = document.getElementById('selectedRecipient');

    searchInput.value = '';
    searchInput.style.display = 'none';
    suggestionsDiv.classList.remove('show');

    selectedDiv.innerHTML = `
      <div class="selected-user">
        ${escapeHtml(user.name)} (${escapeHtml(user.studentId)})
        <span class="remove-user" id="removeRecipient">✕</span>
      </div>`;

    document.getElementById('removeRecipient').addEventListener('click', () => {
      selectedRecipient = null;
      selectedDiv.innerHTML = '';
      searchInput.style.display = '';
      searchInput.focus();
    });
  }

  async function sendMessage() {
    const errorBox = document.getElementById('errorBox');
    const successBanner = document.getElementById('successBanner');
    const sendBtn = document.getElementById('btnSend');

    errorBox.style.display = 'none';
    successBanner.style.display = 'none';

    if (!selectedRecipient) {
      showError('Veuillez sélectionner un destinataire.');
      return;
    }

    const subject = document.getElementById('subject').value.trim();
    const body = document.getElementById('msgBody').value.trim();

    if (!subject) { showError('Le sujet est requis.'); return; }
    if (!body) { showError('Le message ne peut pas être vide.'); return; }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Envoi en cours...';

    try {
      await Api.sendMessage({
        receiverStudentId: selectedRecipient.studentId,
        subject,
        body,
      });

      successBanner.style.display = 'block';
      // Reset form
      document.getElementById('subject').value = '';
      document.getElementById('msgBody').value = '';
      selectedRecipient = null;
      document.getElementById('selectedRecipient').innerHTML = '';
      document.getElementById('recipientSearch').style.display = '';

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/pages/inbox.html#sent';
      }, 1500);

    } catch (err) {
      showError(err.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '📨 Envoyer';
    }
  }

  function showError(msg) {
    const errorBox = document.getElementById('errorBox');
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();

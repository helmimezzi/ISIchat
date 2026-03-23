// js/inbox.js — Logique boîte de réception & messages envoyés
// Utilise window.Api (global depuis api.js)

(function() {
  'use strict';

  let currentView = 'inbox'; // 'inbox' | 'sent'
  let currentPage = 1;

  // ── Auth guard ──────────────────────────────────────────
  function init() {
    if (!Api.isLoggedIn()) {
      window.location.href = '/pages/index.html';
      return;
    }

    const user = Api.getUser();
    if (!user) { Api.logout(); return; }

    // Remplir sidebar user
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userId').textContent = user.studentId;
    document.getElementById('userDept').textContent = user.department || '';

    // Déconnexion
    document.getElementById('btnLogout').addEventListener('click', (e) => {
      e.preventDefault();
      Api.logout();
    });

    // Navigation tabs
    document.getElementById('navInbox').addEventListener('click', (e) => {
      e.preventDefault();
      switchView('inbox');
    });
    document.getElementById('navSent').addEventListener('click', (e) => {
      e.preventDefault();
      switchView('sent');
    });

    // Déterminer la vue à partir du hash
    const hash = window.location.hash.replace('#', '');
    if (hash === 'sent') {
      switchView('sent');
    } else {
      switchView('inbox');
    }
  }

  function switchView(view) {
    currentView = view;
    currentPage = 1;

    // Update active nav
    document.getElementById('navInbox').classList.toggle('active', view === 'inbox');
    document.getElementById('navSent').classList.toggle('active', view === 'sent');

    // Update title
    document.getElementById('pageTitle').textContent =
      view === 'inbox' ? 'Boîte de réception' : 'Messages envoyés';

    window.location.hash = view;
    loadMessages();
  }

  async function loadMessages() {
    const container = document.getElementById('mainContent');
    container.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

    try {
      const data = currentView === 'inbox'
        ? await Api.getInbox(currentPage)
        : await Api.getSent(currentPage);

      const messages = data.messages || [];

      // Mettre à jour le badge non lus
      if (data.unread !== undefined) {
        const badge = document.getElementById('unreadBadge');
        if (data.unread > 0) {
          badge.textContent = data.unread;
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
      }

      if (messages.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">${currentView === 'inbox' ? '📭' : '📤'}</div>
            <h3>${currentView === 'inbox' ? 'Aucun message reçu' : 'Aucun message envoyé'}</h3>
            <p>${currentView === 'inbox'
              ? 'Votre boîte de réception est vide.'
              : 'Vous n\'avez pas encore envoyé de message.'}</p>
            <a href="/pages/compose.html" class="btn-primary"
               style="display:inline-block;margin-top:16px;text-decoration:none;">
              ✏️ Envoyer un message
            </a>
          </div>`;
        return;
      }

      let html = '<div class="message-list">';
      for (const msg of messages) {
        const isUnread = currentView === 'inbox' && !msg.is_read;
        const name = currentView === 'inbox'
          ? (msg.sender_name || msg.sender_sid)
          : (msg.receiver_name || msg.receiver_sid);
        const initials = getInitials(name);
        const date = formatDate(msg.sent_at);

        html += `
          <a class="message-item${isUnread ? ' unread' : ''}"
             href="/pages/message.html?id=${msg.id}">
            <div class="msg-avatar">${initials}</div>
            <div class="msg-main">
              <div class="msg-from">${escapeHtml(name)}</div>
              <div class="msg-subject">${escapeHtml(msg.subject)}</div>
            </div>
            <div class="msg-meta">
              <div class="msg-date">${date}</div>
              ${isUnread ? '<span class="badge badge-blue" style="margin-top:4px;">Nouveau</span>' : ''}
            </div>
          </a>`;
      }
      html += '</div>';

      // Pagination
      if (messages.length >= 20) {
        html += `
          <div style="text-align:center;margin-top:20px;">
            <button class="btn-ghost" id="btnLoadMore">Charger plus →</button>
          </div>`;
      }

      container.innerHTML = html;

      // Bind load more
      const loadMoreBtn = document.getElementById('btnLoadMore');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
          currentPage++;
          loadMessages();
        });
      }

    } catch (err) {
      container.innerHTML = `
        <div class="alert-box error" style="max-width:500px;">
          ❌ Erreur : ${escapeHtml(err.message)}
        </div>`;
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Start ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();

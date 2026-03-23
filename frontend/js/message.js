// js/message.js — Logique vue détail d'un message
// Utilise window.Api (global depuis api.js)

(function() {
  'use strict';

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

    // Charger le message
    const urlParams = new URLSearchParams(window.location.search);
    const messageId = urlParams.get('id');

    if (!messageId) {
      showError('Aucun message spécifié.');
      return;
    }

    loadMessage(messageId);
  }

  async function loadMessage(id) {
    const container = document.getElementById('mainContent');

    try {
      const data = await Api.getMessage(id);
      const msg = data.message;

      if (!msg) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>Message introuvable</h3>
            <p>Ce message n'existe pas ou vous n'y avez pas accès.</p>
            <a href="/pages/inbox.html" class="btn-primary"
               style="display:inline-block;margin-top:16px;text-decoration:none;">
              ← Retour à la boîte
            </a>
          </div>`;
        return;
      }

      const user = Api.getUser();
      const isSender = msg.sender_id === user.id;
      const otherName = isSender ? msg.receiver_name : msg.sender_name;
      const otherSid = isSender ? msg.receiver_sid : msg.sender_sid;

      document.title = `CampusMsg — ${msg.subject}`;

      container.innerHTML = `
        <div class="card msg-detail">
          <div class="msg-header">
            <h2>${escapeHtml(msg.subject)}</h2>
            <div class="msg-meta-grid">
              <span class="meta-label">De :</span>
              <span class="meta-value">${escapeHtml(msg.sender_name)} (${escapeHtml(msg.sender_sid)})</span>

              <span class="meta-label">À :</span>
              <span class="meta-value">${escapeHtml(msg.receiver_name)} (${escapeHtml(msg.receiver_sid)})</span>

              <span class="meta-label">Date :</span>
              <span class="meta-value">${formatDateFull(msg.sent_at)}</span>

              <span class="meta-label">Statut :</span>
              <span class="meta-value">
                ${msg.is_read
                  ? '<span class="badge badge-success">Lu</span>'
                  : '<span class="badge badge-blue">Non lu</span>'}
              </span>
            </div>
          </div>

          <div class="msg-body-content">${escapeHtml(msg.body)}</div>

          <div class="msg-actions">
            ${!isSender ? `
              <a href="/pages/compose.html?to=${encodeURIComponent(msg.sender_sid)}&subject=${encodeURIComponent('Re: ' + msg.subject)}"
                 class="btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
                ↩️ Répondre
              </a>
            ` : ''}
            <a href="/pages/inbox.html" class="btn-ghost" style="text-decoration:none;display:inline-flex;align-items:center;">
              ← Retour
            </a>
          </div>
        </div>`;

    } catch (err) {
      showError(err.message);
    }
  }

  function showError(msg) {
    const container = document.getElementById('mainContent');
    container.innerHTML = `
      <div class="alert-box error" style="max-width:500px;">
        ❌ Erreur : ${escapeHtml(msg)}
      </div>
      <a href="/pages/inbox.html" class="btn-ghost" style="display:inline-block;margin-top:12px;text-decoration:none;">
        ← Retour
      </a>`;
  }

  function formatDateFull(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);
})();

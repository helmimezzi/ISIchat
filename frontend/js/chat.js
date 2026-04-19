// js/chat.js — Logique de l'interface Messenger-style
// Utilise window.Api (global depuis api.js)

(function () {
  'use strict';

  let currentUser = null;
  let activeOtherUserId = null;
  let allUsers = [];
  let editingMessageId = null;
  let currentImageData = null;

  // DOM Elements
  const els = {
    convList: document.getElementById('conversationsList'),
    chatIntro: document.getElementById('chatIntro'),
    chatContainer: document.getElementById('chatContainer'),
    chatTitle: document.getElementById('chatTitle'),
    chatHistory: document.getElementById('chatHistory'),
    chatInput: document.getElementById('chatInput'),
    chatSubject: document.getElementById('chatSubject'),
    btnSend: document.getElementById('btnSend'),
    btnAttach: document.getElementById('btnAttach'),
    imageInput: document.getElementById('imageInput'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    imagePreviewThumb: document.getElementById('imagePreviewThumb'),
    btnRemoveImage: document.getElementById('btnRemoveImage'),
    btnCancelEdit: document.getElementById('btnCancelEdit'),
    searchOverlay: document.getElementById('searchOverlay'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults'),
    btnLogout: document.getElementById('btnLogout'),
    btnNewChat: document.getElementById('btnNewChat'),
    btnCloseSearch: document.getElementById('btnCloseSearch'),
  };

  function init() {
    if (!Api.isLoggedIn()) {
      window.location.href = '/pages/index.html';
      return;
    }

    currentUser = Api.getUser();
    if (!currentUser) { Api.logout(); return; }

    // Sidebar user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userId').textContent = currentUser.studentId;
    document.getElementById('userDept').textContent = currentUser.department || '';

    // Déconnexion
    els.btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      Api.logout();
    });

    // Clicks and inputs
    els.btnNewChat.addEventListener('click', openSearch);
    els.btnCloseSearch.addEventListener('click', closeSearch);
    els.searchInput.addEventListener('input', handleSearch);

    // Auto-resize textarea
    els.chatInput.addEventListener('input', updateSendButtonState);

    els.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    els.btnSend.addEventListener('click', sendMessage);
    els.btnCancelEdit.addEventListener('click', cancelEdit);

    // Image attachment
    els.btnAttach.addEventListener('click', () => els.imageInput.click());
    els.imageInput.addEventListener('change', handleImageSelection);
    els.btnRemoveImage.addEventListener('click', removeImage);

    // Initial load
    loadConversations();
    loadSearchUsers();
  }

  // ── Conversations List ───────────────────────────────────
  async function loadConversations() {
    try {
      const data = await Api.getConversations();
      renderConversations(data.conversations || []);
    } catch (err) {
      els.convList.innerHTML = `<div class="alert-box error" style="margin:10px;font-size:12px;">Erreur chargement</div>`;
    }
  }

  function renderConversations(convs) {
    if (convs.length === 0) {
      els.convList.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:13px;">Aucune discussion</div>`;
      return;
    }

    let html = '';
    convs.forEach(c => {
      const initials = getInitials(c.name);
      const isUnread = c.is_read === 0 && c.last_sender !== currentUser.id;
      const amI_Sender = c.last_sender === currentUser.id;
      const preview = c.last_msg ? (amI_Sender ? 'Vous: ' : '') + c.last_msg : 'Nouvelle conversation';
      const timeStr = c.last_time ? formatTimeShort(c.last_time) : '';
      const isActive = activeOtherUserId === c.user_id ? ' active' : '';

      html += `
        <div class="conv-item${isActive}" data-id="${c.user_id}" data-sid="${escapeHtml(c.student_id)}" data-name="${escapeHtml(c.name)}">
          <div class="conv-avatar">${initials}</div>
          <div class="conv-main">
            <div class="conv-name" style="${isUnread ? 'color:var(--text-primary);font-weight:700;' : ''}">${escapeHtml(c.name)}</div>
            <div class="conv-preview" style="${isUnread ? 'color:var(--text-primary);font-weight:600;' : ''}">${escapeHtml(preview)}</div>
          </div>
          <div class="conv-meta">
            <span class="conv-time">${timeStr}</span>
            ${isUnread ? '<div class="conv-unread"></div>' : ''}
          </div>
        </div>
      `;
    });

    els.convList.innerHTML = html;

    // Bind clicks
    els.convList.querySelectorAll('.conv-item').forEach(el => {
      el.addEventListener('click', () => {
        openChat(parseInt(el.dataset.id), el.dataset.name, el.dataset.sid);
      });
    });
  }

  // ── Open Chat View ───────────────────────────────────────
  async function openChat(otherUserId, name, studentId) {
    activeOtherUserId = otherUserId;
    closeSearch();

    // Update UI state
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.querySelector(`.conv-item[data-id="${otherUserId}"]`);
    if (activeEl) activeEl.classList.add('active');

    els.chatIntro.style.display = 'none';
    els.chatContainer.style.display = 'flex';
    els.chatTitle.textContent = name;

    // Clear current chat
    els.chatHistory.innerHTML = '<div style="margin:auto;"><div class="spinner"></div></div>';

    try {
      const data = await Api.getConversationHistory(otherUserId);
      renderChatHistory(data.messages || []);
      // Refresh conversation list to clear unread badge
      loadConversations();
    } catch (err) {
      els.chatHistory.innerHTML = `<div class="alert-box error" style="margin:auto;">Erreur: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderChatHistory(messages) {
    if (messages.length === 0) {
      els.chatHistory.innerHTML = `<div style="margin:auto;color:var(--text-tertiary);text-align:center;">Envoyez le premier message !</div>`;
      return;
    }

    let html = '';
    const now = new Date();
    
    messages.forEach(m => {
      const isMe = m.sender_id === currentUser.id;
      const safeDateStr = m.sent_at.includes('T') ? m.sent_at : m.sent_at.replace(' ', 'T') + 'Z';
      const sentDate = new Date(safeDateStr);
      const diffMin = (now - sentDate) / 60000;
      const canEdit = isMe && diffMin <= 10;
      const editedBadge = m.is_edited ? ' <span style="font-size:11px;opacity:0.7;font-style:italic;">(modifié)</span>' : '';
      const imgHtml = m.image_data ? `<img src="${m.image_data}" class="attached-image">` : '';
      
      const actionsHtml = canEdit ? `
        <div class="msg-actions">
          <button class="btn-msg-action edit" data-id="${m.id}" data-body="${escapeHtml(m.body)}" title="Modifier">✏️</button>
          <button class="btn-msg-action delete" data-id="${m.id}" title="Supprimer">🗑️</button>
        </div>` : '';

      html += `
        <div class="chat-bubble-wrapper ${isMe ? 'me' : 'them'}">
          <div class="chat-bubble">
            ${linkify(escapeHtml(m.body)).replace(/\\n/g, '<br>')}
            ${imgHtml}
            ${actionsHtml}
          </div>
          <div class="chat-time">${formatTimeShort(m.sent_at)}${editedBadge}</div>
        </div>
      `;
    });

    els.chatHistory.innerHTML = html;
    scrollToBottom();
    bindMsgActions();
  }

  function bindMsgActions() {
    document.querySelectorAll('.btn-msg-action.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        editingMessageId = parseInt(btn.dataset.id);
        els.chatInput.value = unescapeHtml(btn.dataset.body);
        els.chatInput.style.height = 'auto';
        els.chatInput.style.height = els.chatInput.scrollHeight + 'px';
        els.chatInput.focus();
        els.btnCancelEdit.style.display = 'flex';
        els.btnSend.innerHTML = '✓';
        els.btnSend.classList.remove('disabled');
      });
    });

    document.querySelectorAll('.btn-msg-action.delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce message pour tout le monde ?')) return;
        try {
          await Api.deleteMessage(btn.dataset.id);
          // Refresh
          const data = await Api.getConversationHistory(activeOtherUserId);
          renderChatHistory(data.messages || []);
          loadConversations(); // refresh sidebar snippet
        } catch(err) {
          alert("Erreur de suppression: " + err.message);
        }
      });
    });
  }

  function cancelEdit() {
    editingMessageId = null;
    els.chatInput.value = '';
    els.btnCancelEdit.style.display = 'none';
    els.btnSend.innerHTML = '➤';
    els.chatInput.style.height = 'auto'; // reset height
    if (els.chatInput.value.trim() === '') els.btnSend.classList.add('disabled');
  }

  // ── Sending Messages & Images ────────────────────────────
  function updateSendButtonState() {
    els.chatInput.style.height = 'auto';
    els.chatInput.style.height = (els.chatInput.scrollHeight) + 'px';
    
    if (els.chatInput.value.trim().length > 0 || currentImageData !== null) {
      els.btnSend.classList.remove('disabled');
    } else {
      els.btnSend.classList.add('disabled');
    }
  }

  function handleImageSelection(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 5MB)");
      els.imageInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      currentImageData = ev.target.result;
      els.imagePreviewThumb.src = currentImageData;
      els.imagePreviewContainer.classList.add('show');
      updateSendButtonState();
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    currentImageData = null;
    els.imageInput.value = '';
    els.imagePreviewContainer.classList.remove('show');
    updateSendButtonState();
  }

  async function sendMessage() {
    if (!activeOtherUserId) return;
    const text = els.chatInput.value.trim();
    if (!text && !currentImageData) return;

    if (els.btnSend.classList.contains('disabled')) return;

    els.btnSend.classList.add('disabled');
    const prevText = els.chatInput.value;
    const prevImage = currentImageData;

    els.chatInput.value = '';
    removeImage(); // clears currentImageData and hides preview
    els.chatInput.style.height = 'auto'; // reset height

    // Find student ID
    const activeEl = document.querySelector(`.conv-item[data-id="${activeOtherUserId}"]`);
    if (!activeEl) return;
    const receiverSid = activeEl.dataset.sid;

    try {
      if (editingMessageId) {
        await Api.editMessage(editingMessageId, text);
        cancelEdit();
      } else {
        const payload = {
          receiverStudentId: receiverSid,
          subject: els.chatSubject.value,
          body: text
        };
        if (prevImage) payload.imageData = prevImage;
        
        await Api.sendMessage(payload);
        
        // Refresh conversations first to get real ID if -1
        await loadConversations();

        if (activeOtherUserId === -1) {
          const freshEl = document.querySelector(`.conv-item[data-sid="${receiverSid}"]`);
          if (freshEl) activeOtherUserId = parseInt(freshEl.dataset.id);
        }
      }

      // Refresh chat
      if (activeOtherUserId !== -1) {
        const data = await Api.getConversationHistory(activeOtherUserId);
        renderChatHistory(data.messages || []);
      }
    } catch (err) {
      els.chatInput.value = prevText;
      if (prevImage) {
        currentImageData = prevImage;
        els.imagePreviewThumb.src = currentImageData;
        els.imagePreviewContainer.classList.add('show');
      }
      alert("Erreur d'envoi : " + err.message);
    } finally {
      if (els.chatInput.value.trim().length > 0 || currentImageData) els.btnSend.classList.remove('disabled');
    }
  }

  // ── Search & New Chat ────────────────────────────────────
  async function loadSearchUsers() {
    try {
      const data = await Api.searchUsers();
      allUsers = data.students || [];
    } catch (e) { }
  }

  function openSearch() {
    els.searchOverlay.classList.add('show');
    els.searchInput.focus();
    els.searchInput.value = '';
    renderSearchResults(allUsers);
  }

  function closeSearch() {
    els.searchOverlay.classList.remove('show');
  }

  function handleSearch() {
    const query = els.searchInput.value.trim().toLowerCase();
    if (!query) return renderSearchResults(allUsers);

    const filtered = allUsers.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.studentId.toLowerCase().includes(query) ||
      (u.department || '').toLowerCase().includes(query)
    );
    renderSearchResults(filtered);
  }

  function renderSearchResults(users) {
    if (users.length === 0) {
      els.searchResults.innerHTML = `<div style="padding:15px;text-align:center;color:var(--text-tertiary);font-size:13px;">Aucun étudiant trouvé</div>`;
      return;
    }

    let html = '';
    users.forEach(u => {
      html += `
        <div class="conv-item" data-sid="${escapeHtml(u.studentId)}" data-name="${escapeHtml(u.name)}" style="border-radius:0;border-bottom:1px solid var(--border-dim);padding:10px 14px;">
          <div class="conv-avatar" style="width:34px;height:34px;font-size:12px;">${getInitials(u.name)}</div>
          <div class="conv-main">
            <div class="conv-name" style="font-size:13px;">${escapeHtml(u.name)}</div>
            <div class="conv-preview" style="font-size:11px;">${escapeHtml(u.studentId)} · ${escapeHtml(u.department || '')}</div>
          </div>
        </div>
      `;
    });
    els.searchResults.innerHTML = html;

    els.searchResults.querySelectorAll('.conv-item').forEach(el => {
      el.addEventListener('click', async () => {
        // Need to find user ID. Our search API currently only returns studentId.
        // For a new chat, we can just create a dummy item in the convList or redirect after sending.
        // Wait, the API returns students but not their database ID in searchUsers().
        // Let's modify the backend search route momentarily or just send a first message.
        // Oh right, sending a message uses Student ID. 
        // We can just add it to convList as a new active item.
        startNewConversation(el.dataset.sid, el.dataset.name);
      });
    });
  }

  function startNewConversation(studentId, name) {
    closeSearch();
    // Use a negative ID for unsaved new conversation wrapper
    activeOtherUserId = -1;

    // Unselect others
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));

    // Prepend a temporary item to the sidebar
    const initials = getInitials(name);
    const tempHtml = `
      <div class="conv-item active" data-id="-1" data-sid="${escapeHtml(studentId)}" data-name="${escapeHtml(name)}">
        <div class="conv-avatar">${initials}</div>
        <div class="conv-main">
          <div class="conv-name">${escapeHtml(name)}</div>
          <div class="conv-preview">Nouvelle conversation</div>
        </div>
      </div>
    `;
    els.convList.insertAdjacentHTML('afterbegin', tempHtml);

    els.chatIntro.style.display = 'none';
    els.chatContainer.style.display = 'flex';
    els.chatTitle.textContent = name;
    els.chatHistory.innerHTML = `<div style="margin:auto;color:var(--text-tertiary);text-align:center;">Dites bonjour !</div>`;
    els.chatInput.focus();
  }

  // ── Helpers ──────────────────────────────────────────────
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  function formatTimeShort(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  function scrollToBottom() {
    els.chatHistory.scrollTop = els.chatHistory.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function unescapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent;
  }

  function linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#60A5FA;text-decoration:underline;word-break:break-all;">${url}</a>`;
    });
  }

  // ── Start ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();

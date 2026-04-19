// js/api.js — Client HTTP centralisé
// Toutes les requêtes API passent par ce fichier

const API_BASE = '/api';

window.Api = {

  // ── Token JWT ────────────────────────────────────────────
  getToken()        { return localStorage.getItem('cm_token'); },
  setToken(t)       { localStorage.setItem('cm_token', t); },
  removeToken()     { localStorage.removeItem('cm_token'); },

  getUser()         { 
    try { return JSON.parse(localStorage.getItem('cm_user')); } 
    catch { return null; }
  },
  setUser(u)        { localStorage.setItem('cm_user', JSON.stringify(u)); },
  removeUser()      { localStorage.removeItem('cm_user'); },

  isLoggedIn()      { return !!this.getToken(); },

  // ── Requête générique ─────────────────────────────────────
  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      // Token expiré → rediriger vers login
      this.removeToken();
      this.removeUser();
      if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.href = '/pages/index.html';
      }
      throw new Error(data.error || 'Non authentifié');
    }

    if (!res.ok) {
      throw new Error(data.error || data.errors?.[0]?.msg || 'Erreur serveur');
    }

    return data;
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path)         { return this.request('DELETE', path); },

  // ── Auth ─────────────────────────────────────────────────
  async login(studentId, password) {
    const data = await this.post('/auth/login', { studentId, password });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async logout() {
    try { await this.post('/auth/logout'); } catch {}
    this.removeToken();
    this.removeUser();
    window.location.href = '/pages/index.html';
  },

  // ── Messages ──────────────────────────────────────────────
  getInbox(page = 1)           { return this.get(`/messages/inbox?page=${page}`); },
  getSent(page = 1)            { return this.get(`/messages/sent?page=${page}`); },
  getMessage(id)               { return this.get(`/messages/${id}`); },
  sendMessage(data)            { return this.post('/messages', data); },
  editMessage(id, body)        { return this.patch(`/messages/${id}`, { body }); },
  deleteMessage(id)            { return this.del(`/messages/${id}`); },
  searchUsers()                { return this.get('/messages/users/search'); },
  getConversations()           { return this.get('/messages/conversations'); },
  getConversationHistory(id)   { return this.get(`/messages/conversations/${id}`); },

  // ── Admin ─────────────────────────────────────────────────
  getDashboard()               { return this.get('/admin/dashboard'); },
  getAlerts()                  { return this.get('/admin/alerts'); },
  resolveAlert(id)             { return this.patch(`/admin/alerts/${id}/resolve`); },
  getSuspiciousIps()           { return this.get('/admin/suspicious-ips'); },
  getStudents()                { return this.get('/admin/students'); },
};

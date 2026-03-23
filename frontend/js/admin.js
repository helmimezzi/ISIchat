// js/admin.js — Logique dashboard admin
// Utilise window.Api (global depuis api.js)

(function() {
  'use strict';

  let currentSection = 'dashboard'; // 'dashboard' | 'alerts' | 'suspicious' | 'students'

  function init() {
    if (!Api.isLoggedIn()) {
      window.location.href = '/pages/index.html';
      return;
    }

    const user = Api.getUser();
    if (!user || !user.isAdmin) {
      window.location.href = '/pages/inbox.html';
      return;
    }

    // Sidebar user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userId').textContent = user.studentId;

    // Déconnexion
    document.getElementById('btnLogout').addEventListener('click', (e) => {
      e.preventDefault();
      Api.logout();
    });

    // Refresh
    document.getElementById('btnRefresh').addEventListener('click', () => {
      loadSection(currentSection);
    });

    // Nav items
    const navMap = {
      navDashboard: 'dashboard',
      navAlerts: 'alerts',
      navSuspicious: 'suspicious',
      navStudents: 'students',
    };
    for (const [id, section] of Object.entries(navMap)) {
      document.getElementById(id).addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(section);
      });
    }

    // Hash-based navigation
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'alerts', 'suspicious', 'students'].includes(hash)) {
      switchSection(hash);
    } else {
      loadSection('dashboard');
    }
  }

  function switchSection(section) {
    currentSection = section;
    window.location.hash = section;

    // Update active nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    const navId = 'nav' + section.charAt(0).toUpperCase() + section.slice(1);
    const navEl = document.getElementById(navId);
    if (navEl) navEl.classList.add('active');

    const titles = {
      dashboard: 'Dashboard Admin',
      alerts: 'Alertes de sécurité',
      suspicious: 'IPs suspectes',
      students: 'Liste des étudiants',
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Admin';

    loadSection(section);
  }

  async function loadSection(section) {
    const container = document.getElementById('mainContent');
    container.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

    try {
      switch (section) {
        case 'dashboard': await renderDashboard(container); break;
        case 'alerts':    await renderAlerts(container); break;
        case 'suspicious': await renderSuspicious(container); break;
        case 'students':  await renderStudents(container); break;
      }
    } catch (err) {
      container.innerHTML = `<div class="alert-box error">❌ Erreur : ${escapeHtml(err.message)}</div>`;
    }
  }

  // ── Dashboard ──────────────────────────────────────────
  async function renderDashboard(container) {
    const data = await Api.getDashboard();

    const totalStudents = data.students?.total || 0;
    const activeStudents = data.students?.active || 0;
    const msgToday = data.messages?.count || 0;
    const loginSuccess = data.loginStats?.successes || 0;
    const loginFail = data.loginStats?.failures || 0;
    const uniqueIps = data.loginStats?.unique_ips || 0;
    const alertCount = data.alerts?.count || 0;

    // Update badge
    const badge = document.getElementById('alertsBadge');
    if (alertCount > 0) {
      badge.textContent = alertCount;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    let html = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">👥 Étudiants</div>
          <div class="stat-value">${activeStudents}</div>
          <div class="stat-sub">${totalStudents} inscrits au total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💬 Messages aujourd'hui</div>
          <div class="stat-value">${msgToday}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🔐 Connexions (24h)</div>
          <div class="stat-value">${loginSuccess}</div>
          <div class="stat-sub">${loginFail} échecs · ${uniqueIps} IPs unique(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">🚨 Alertes actives</div>
          <div class="stat-value" style="color:${alertCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'}">
            ${alertCount}
          </div>
        </div>
      </div>`;

    // Suspicious IPs summary
    const suspicious = data.suspicious || [];
    if (suspicious.length > 0) {
      html += `
        <h3 style="font-size:15px;font-weight:600;margin-bottom:12px;">🔍 Activité suspecte récente</h3>
        <div style="margin-bottom:24px;">`;
      for (const s of suspicious.slice(0, 5)) {
        html += `
          <div class="alert-row severity-medium">
            <div>
              <div class="alert-msg">
                <strong>${escapeHtml(s.ip_address)}</strong>
                ${s.student_id ? `→ ID: ${escapeHtml(s.student_id)}` : ''}
                — ${s.attempts} tentative(s) échouée(s)
              </div>
              <div class="alert-time">${formatDate(s.last_attempt)}</div>
            </div>
          </div>`;
      }
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // ── Alerts ─────────────────────────────────────────────
  async function renderAlerts(container) {
    const data = await Api.getAlerts();
    const alerts = data.alerts || [];

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h3>Aucune alerte active</h3>
          <p>Tout est en ordre.</p>
        </div>`;
      return;
    }

    let html = '';
    for (const a of alerts) {
      const severityClass = `severity-${a.severity || 'medium'}`;
      html += `
        <div class="alert-row ${severityClass}" id="alert-${a.id}">
          <div style="flex:1;">
            <div class="alert-msg">
              <span class="badge badge-${a.severity === 'high' ? 'danger' : 'warning'}">${a.severity}</span>
              &nbsp;${escapeHtml(a.message)}
            </div>
            <div class="alert-time">
              ${a.target_ip ? 'IP: ' + escapeHtml(a.target_ip) : ''}
              ${a.target_student_id ? ' · ID: ' + escapeHtml(a.target_student_id) : ''}
              · ${formatDate(a.created_at)}
            </div>
          </div>
          <button class="btn-ghost btn-resolve" data-id="${a.id}">✓ Résoudre</button>
        </div>`;
    }

    container.innerHTML = html;

    // Bind resolve buttons
    container.querySelectorAll('.btn-resolve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await Api.resolveAlert(id);
          const row = document.getElementById('alert-' + id);
          if (row) {
            row.style.opacity = '0.4';
            row.style.transition = 'opacity .3s';
            setTimeout(() => row.remove(), 400);
          }
        } catch (err) {
          alert('Erreur: ' + err.message);
          btn.disabled = false;
          btn.textContent = '✓ Résoudre';
        }
      });
    });
  }

  // ── Suspicious IPs ─────────────────────────────────────
  async function renderSuspicious(container) {
    const data = await Api.getSuspiciousIps();
    const ips = data.ips || [];

    if (ips.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🛡️</div>
          <h3>Aucune IP suspecte</h3>
          <p>Aucune activité suspecte détectée dans la dernière heure.</p>
        </div>`;
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:var(--color-bg);border-bottom:2px solid var(--color-border);">
            <th style="padding:10px 14px;text-align:left;font-weight:600;">Adresse IP</th>
            <th style="padding:10px 14px;text-align:left;font-weight:600;">Student ID</th>
            <th style="padding:10px 14px;text-align:center;font-weight:600;">Tentatives</th>
            <th style="padding:10px 14px;text-align:right;font-weight:600;">Dernière tentative</th>
          </tr>
        </thead>
        <tbody>`;

    for (const ip of ips) {
      html += `
        <tr style="border-bottom:1px solid var(--color-border);">
          <td style="padding:10px 14px;font-family:var(--font-mono);font-weight:600;">
            ${escapeHtml(ip.ip_address)}
          </td>
          <td style="padding:10px 14px;">${escapeHtml(ip.student_id || '—')}</td>
          <td style="padding:10px 14px;text-align:center;">
            <span class="badge badge-danger">${ip.attempts}</span>
          </td>
          <td style="padding:10px 14px;text-align:right;color:var(--color-text-muted);">
            ${formatDate(ip.last_attempt)}
          </td>
        </tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ── Students ───────────────────────────────────────────
  async function renderStudents(container) {
    const data = await Api.getStudents();
    const students = data.students || [];

    if (students.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>Aucun étudiant</h3></div>';
      return;
    }

    let html = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:var(--color-bg);border-bottom:2px solid var(--color-border);">
            <th style="padding:10px 14px;text-align:left;font-weight:600;">Student ID</th>
            <th style="padding:10px 14px;text-align:left;font-weight:600;">Nom complet</th>
            <th style="padding:10px 14px;text-align:left;font-weight:600;">Département</th>
          </tr>
        </thead>
        <tbody>`;

    for (const s of students) {
      html += `
        <tr style="border-bottom:1px solid var(--color-border);">
          <td style="padding:10px 14px;font-family:var(--font-mono);font-weight:600;">
            ${escapeHtml(s.student_id)}
          </td>
          <td style="padding:10px 14px;">${escapeHtml(s.full_name)}</td>
          <td style="padding:10px 14px;color:var(--color-text-muted);">${escapeHtml(s.department || '—')}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ── Helpers ────────────────────────────────────────────
  function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
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

// =============================================================
// config/index.js — Configuration Centralisée
// Modifiez ici pour Phase 2 sans toucher aux autres fichiers
// =============================================================
require('dotenv').config();

module.exports = {

  // ── Serveur ──────────────────────────────────────────────
  server: {
    port: process.env.PORT || 3000,
    env:  process.env.NODE_ENV || 'development',
  },

  // ── Base de données ───────────────────────────────────────
  database: {
    path: process.env.DB_PATH || '../database/campusmsg.db',
    // PHASE 2: remplacer par config PostgreSQL
    // host, port, name, user, password
  },

  // ── JWT ───────────────────────────────────────────────────
  jwt: {
    secret:     process.env.JWT_SECRET || 'change_this_in_production_!',
    expiresIn:  process.env.JWT_EXPIRES || '8h',
    // PHASE 2: refresh tokens, rotation
  },

  // ── Sécurité — Brute Force (Phase 1) ─────────────────────
  bruteForce: {
    maxAttempts:  5,           // tentatives avant blocage
    windowMinutes: 15,         // fenêtre de temps
    blockDurationMinutes: 30,  // durée de blocage
    // PHASE 2: déclencher analyse comportementale ici
  },

  // ── Rate Limiting ─────────────────────────────────────────
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000,  // 15 min
      max: 20,                    // requêtes max par fenêtre
    },
    api: {
      windowMs: 60 * 1000,
      max: 100,
    },
  },

  // ── Alertes Admin ─────────────────────────────────────────
  alerts: {
    bruteForceThreshold: 3,     // alerter après N IPs suspectes
    // PHASE 2: webhooks Slack, email notifications
  },

  // ── PHASE 2: modules futurs (désactivés) ─────────────────
  // totp: { issuer: 'CampusMsg', digits: 6, period: 30 },
  // encryption: { algorithm: 'aes-256-gcm' },
  // anomaly: { model: 'isolation_forest', threshold: 0.85 },
};

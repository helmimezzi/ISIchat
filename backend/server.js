// server.js — Point d'entrée principal CampusMsg
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const config  = require('./config');

const app = express();

// ── CORS ──────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Logging ───────────────────────────────────────────────
app.use(morgan('dev'));

// ── Fichiers statiques (frontend) ────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes API ────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin',    require('./routes/admin'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', phase: 1 });
});

// ── SPA fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// ── Gestion erreurs globale ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Démarrage ─────────────────────────────────────────────
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  CampusMsg v1.0 — Phase 1 (Core)      ║
║  Serveur : http://localhost:${PORT}       ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = app;

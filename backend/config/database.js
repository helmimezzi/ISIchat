// config/database.js — Connexion SQLite (sqlite3 pure JS)
// PHASE 2: remplacer par PostgreSQL (pg)
const sqlite3  = require('sqlite3').verbose();
const path     = require('path');
const config   = require('./index');
const fs       = require('fs');

let db;

function getDb() {
  if (db) return db;

  const dbPath     = path.resolve(__dirname, config.database.path);
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

  // S'assurer que le dossier database/ existe
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new sqlite3.Database(dbPath);

  // Activer foreign keys + WAL via run synchrone au démarrage
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema, (err) => {
        if (err) console.error('[DB] Schema error:', err.message);
      });
    }
  });

  console.log(`[DB] Connecté : ${dbPath}`);
  return db;
}

// ── Wrappers synchrones (même API que before) ─────────────
// sqlite3 est async par défaut — on expose get/all/run synchrones
// via une petite surcouche basée sur mieux-sqlite3-like API

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
  });
}

function closeDb() {
  if (db) { db.close(); db = null; }
}

module.exports = { getDb, closeDb, dbGet, dbAll, dbRun };

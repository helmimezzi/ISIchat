-- =============================================================
-- CampusMsg — Schéma Base de Données
-- Phase 1 : Core | Extensible Phase 2
-- =============================================================

-- Table principale des étudiants (pré-remplie par l'admin)
CREATE TABLE IF NOT EXISTS students (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    VARCHAR(20) UNIQUE NOT NULL,   -- ex: "21CS042"
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150),
  department    VARCHAR(80),
  year          INTEGER DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt
  is_active     BOOLEAN DEFAULT 1,
  is_admin      BOOLEAN DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME
  -- PHASE 2: ajouter totp_secret, public_key, failed_attempts_total
);

-- Messages entre étudiants
CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    INTEGER NOT NULL REFERENCES students(id),
  receiver_id  INTEGER NOT NULL REFERENCES students(id),
  subject      VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  -- PHASE 2: body_encrypted TEXT, iv TEXT, signature TEXT
  is_read      BOOLEAN DEFAULT 0,
  is_deleted_sender   BOOLEAN DEFAULT 0,
  is_deleted_receiver BOOLEAN DEFAULT 0,
  sent_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suivi des tentatives de connexion (brute-force detection)
CREATE TABLE IF NOT EXISTS login_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  VARCHAR(20),                      -- peut être NULL si ID inconnu
  ip_address  VARCHAR(45) NOT NULL,
  success     BOOLEAN NOT NULL,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent  VARCHAR(300)
  -- PHASE 2: ajouter geo_country, risk_score
);

-- Sessions JWT actives
CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL REFERENCES students(id),
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  ip_address  VARCHAR(45),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  revoked     BOOLEAN DEFAULT 0
);

-- Alertes admin
CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        VARCHAR(50) NOT NULL,             -- 'brute_force', 'suspicious', etc.
  severity    VARCHAR(10) DEFAULT 'medium',     -- low | medium | high | critical
  message     TEXT NOT NULL,
  target_ip   VARCHAR(45),
  target_student_id VARCHAR(20),
  is_resolved BOOLEAN DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER REFERENCES students(id)
  -- PHASE 2: ajouter ml_confidence, raw_features (JSON)
);

-- =============================================================
-- Index pour performances
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_attempts_ip       ON login_attempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_student  ON login_attempts(student_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(is_resolved, severity);

-- =============================================================
-- Données de test (seed)
-- =============================================================
INSERT OR IGNORE INTO students (student_id, full_name, email, department, year, password_hash, is_admin)
VALUES
  ('ADMIN001', 'Admin Système',   'admin@campus.tn',   'IT',          0, '$2b$10$placeholder_hash_admin', 1),
  ('21CS042',  'Ahmed Ben Ali',   'ahmed@campus.tn',   'Informatique', 3, '$2b$10$placeholder_hash_1',    0),
  ('22EL017',  'Sarra Mansouri',  'sarra@campus.tn',   'Électronique', 2, '$2b$10$placeholder_hash_2',    0),
  ('23ME008',  'Yassine Trabelsi','yassine@campus.tn', 'Mécanique',    1, '$2b$10$placeholder_hash_3',    0);
-- Note: Les vrais hashes sont générés via le script seed.js

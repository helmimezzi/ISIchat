# ISIchat — Messagerie Interne ISI

## Architecture Modulaire (Phase 1 → Phase 2)

```
ISIchat/
├── backend/
│   ├── config/         ← Configuration (DB, sécurité, env)
│   ├── models/         ← Modèles de données (User, Message, Log)
│   ├── routes/         ← Routes API (auth, messages, admin)
│   ├── middleware/      ← Auth JWT, rate-limit, logs
│   ├── services/       ← Logique métier (bruteforce, alertes)
│   └── utils/          ← Helpers (hash, tokens, validateurs)
├── frontend/
│   ├── pages/          ← Login, inbox, admin
│   ├── components/     ← Header, sidebar, message-card
│   ├── styles/         ← CSS modulaire par page
│   └── js/             ← Logique frontend par module
└── database/
    └── schema.sql      ← Schéma complet + seed data
```

## Phases

### Phase 1 — Core (ACTUELLE)
- [x] Authentification par Student ID
- [x] Messagerie send/receive
- [x] Détection brute-force basique
- [x] Dashboard admin simple

### Phase 2 — Sécurité Avancée (À VENIR)
- [ ] 2FA
- [ ] Chiffrement E2E des messages
- [ ] Détection d'anomalies comportementales
- [ ] Audit trail complet (journalisation)
- [ ] Rate limiting avancé par IP + user
- [ ] Gestion complète des étudiants (Ajout/Suppression) via le panneau Admin

## Stack Technique
- **Backend** : Node.js + Express
- **DB** : SQLite  → PostgreSQL
- **Auth** : JWT + bcrypt
- **Frontend** : HTML/CSS/JS



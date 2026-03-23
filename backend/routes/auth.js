// routes/auth.js — Authentification par Student ID
const express   = require('express');
const bcrypt    = require('bcrypt');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router          = express.Router();
const Student         = require('../models/Student');
const BruteForce      = require('../services/bruteForce');
const { generateToken, requireAuth } = require('../middleware/auth');
const config          = require('../config');

// Rate limit spécifique auth
const authLimiter = rateLimit({
  ...config.rateLimit.auth,
  message: { error: 'Trop de requêtes. Patientez 15 minutes.' },
});

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login',
  authLimiter,
  BruteForce.checkBlockedMiddleware.bind(BruteForce),
  [
    body('studentId').trim().notEmpty().withMessage('Student ID requis'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, password } = req.body;
    const ip        = req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      const student = await Student.findByStudentId(studentId);

      if (!student) {
        // Enregistrer l'échec même si l'ID n'existe pas
        await BruteForce.recordAndCheck({ ip, studentId, success: false, userAgent });
        // Message générique pour ne pas révéler si l'ID existe
        return res.status(401).json({ error: 'Identifiants incorrects' });
      }

      const passwordMatch = await bcrypt.compare(password, student.password_hash);

      const result = await BruteForce.recordAndCheck({
        ip,
        studentId,
        success: passwordMatch,
        userAgent,
      });

      if (!passwordMatch) {
        const msg = result.blocked
          ? result.reason
          : `Identifiants incorrects. ${result.attemptsLeft ?? ''} tentative(s) restante(s).`;
        return res.status(401).json({ error: msg });
      }

      // Succès
      await Student.updateLastLogin(student.id);
      const token = generateToken(student);

      return res.json({
        token,
        user: {
          id:         student.id,
          studentId:  student.student_id,
          name:       student.full_name,
          department: student.department,
          isAdmin:    student.is_admin,
        },
      });

    } catch (err) {
      console.error('[AUTH] Erreur login:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

// ── GET /api/auth/me — Profil connecté ───────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  // Phase 1: stateless JWT, juste confirmer côté client
  // PHASE 2: révoquer le token en base (table sessions)
  res.json({ message: 'Déconnecté avec succès' });
});

module.exports = router;

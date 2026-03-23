// middleware/auth.js — Vérification JWT
const jwt     = require('jsonwebtoken');
const config  = require('../config');
const Student = require('../models/Student');

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const student = await Student.findById(payload.id);
    if (!student) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = student;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// Middleware admin uniquement
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Accès admin requis' });
  }
  next();
}

// Générer un token
function generateToken(student) {
  return jwt.sign(
    { id: student.id, studentId: student.student_id, isAdmin: student.is_admin },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = { requireAuth, requireAdmin, generateToken };

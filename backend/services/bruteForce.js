// services/bruteForce.js — Détection brute-force Phase 1
// PHASE 2: remplacer par analyse ML comportementale
const config                   = require('../config');
const { LoginAttempt, Alert }  = require('../models/Security');

const { maxAttempts, blockDurationMinutes } = config.bruteForce;

// Cache mémoire des IPs bloquées (simple, Phase 1)
// PHASE 2: migrer vers Redis pour scalabilité multi-instance
const blockedIPs = new Map(); // ip → expiry timestamp

const BruteForceService = {

  // Vérifier si une IP est bloquée
  isBlocked(ip) {
    const expiry = blockedIPs.get(ip);
    if (!expiry) return false;
    if (Date.now() > expiry) {
      blockedIPs.delete(ip);
      return false;
    }
    return true;
  },

  async recordAndCheck({ ip, studentId, success, userAgent }) {
    await LoginAttempt.record({ studentId, ip, success, userAgent });

    if (success) return { blocked: false };

    const [byIp, bySid] = await Promise.all([
      LoginAttempt.countRecentFailsByIp(ip),
      studentId ? LoginAttempt.countRecentFailsByStudentId(studentId) : Promise.resolve({ count: 0 }),
    ]);

    const shouldBlock = byIp.count >= maxAttempts || bySid.count >= maxAttempts;

    if (shouldBlock) {
      const expiry = Date.now() + blockDurationMinutes * 60 * 1000;
      blockedIPs.set(ip, expiry);
      await Alert.create({
        type: 'brute_force',
        severity: byIp.count >= maxAttempts * 2 ? 'high' : 'medium',
        message: `Brute force détecté : ${byIp.count} échecs depuis ${ip}${studentId ? ` (ID: ${studentId})` : ''}`,
        targetIp: ip,
        targetStudentId: studentId,
      });
      return { blocked: true, reason: 'Trop de tentatives échouées. Réessayez dans 30 minutes.', retryAfter: blockDurationMinutes * 60 };
    }

    return { blocked: false, attemptsLeft: maxAttempts - Math.max(byIp.count, bySid.count) };
  },

  // Middleware Express : bloque avant même de tenter le login
  checkBlockedMiddleware(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    if (BruteForceService.isBlocked(ip)) {
      return res.status(429).json({
        error: 'IP temporairement bloquée suite à trop de tentatives.',
        retryAfter: blockDurationMinutes * 60,
      });
    }
    next();
  },
};

module.exports = BruteForceService;

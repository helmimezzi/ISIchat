// models/Security.js
const { dbGet, dbAll, dbRun } = require('../config/database');
const config = require('../config');

const LoginAttempt = {

  record: ({ studentId, ip, success, userAgent }) =>
    dbRun('INSERT INTO login_attempts (student_id, ip_address, success, user_agent) VALUES (?, ?, ?, ?)',
      [studentId || null, ip, success ? 1 : 0, userAgent || null]),

  countRecentFailsByIp: (ip) => {
    const { windowMinutes } = config.bruteForce;
    return dbGet(
      `SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND success = 0
       AND attempted_at >= datetime('now', '-${windowMinutes} minutes')`, [ip]);
  },

  countRecentFailsByStudentId: (studentId) => {
    const { windowMinutes } = config.bruteForce;
    return dbGet(
      `SELECT COUNT(*) as count FROM login_attempts WHERE student_id = ? AND success = 0
       AND attempted_at >= datetime('now', '-${windowMinutes} minutes')`, [studentId]);
  },

  getRecentSuspicious: (limit = 50) =>
    dbAll(`
      SELECT ip_address, student_id, COUNT(*) as attempts, MAX(attempted_at) as last_attempt
      FROM login_attempts
      WHERE success = 0 AND attempted_at >= datetime('now', '-1 hour')
      GROUP BY ip_address, student_id HAVING COUNT(*) >= 3
      ORDER BY attempts DESC LIMIT ?
    `, [limit]),

  getStats24h: () =>
    dbGet(`
      SELECT
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM login_attempts WHERE attempted_at >= datetime('now', '-24 hours')
    `, []),
};

const Alert = {
  create: ({ type, severity = 'medium', message, targetIp, targetStudentId }) =>
    dbRun('INSERT INTO alerts (type, severity, message, target_ip, target_student_id) VALUES (?, ?, ?, ?, ?)',
      [type, severity, message, targetIp || null, targetStudentId || null]),

  getActive: (limit = 30) =>
    dbAll('SELECT * FROM alerts WHERE is_resolved = 0 ORDER BY severity DESC, created_at DESC LIMIT ?', [limit]),

  resolve: (alertId, adminId) =>
    dbRun('UPDATE alerts SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?',
      [adminId, alertId]),

  countActive: () =>
    dbGet('SELECT COUNT(*) as count FROM alerts WHERE is_resolved = 0', []),
};

module.exports = { LoginAttempt, Alert };

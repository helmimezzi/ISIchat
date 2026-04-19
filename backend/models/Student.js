// models/Student.js
const { dbGet, dbAll, dbRun } = require('../config/database');

const Student = {
  findByStudentId: (studentId) =>
    dbGet('SELECT * FROM students WHERE student_id = ? AND is_active = 1', [studentId]),

  findById: (id) =>
    dbGet('SELECT id, student_id, full_name, email, department, year, is_admin, last_login FROM students WHERE id = ?', [id]),

  listActive: () =>
    dbAll(`SELECT s.id, s.student_id, s.full_name, s.email, s.department,
           (SELECT la.ip_address FROM login_attempts la
            WHERE la.student_id = s.student_id AND la.success = 1
            ORDER BY la.attempted_at DESC LIMIT 1) AS last_ip
           FROM students s
           WHERE s.is_active = 1 AND s.is_admin = 0
           ORDER BY s.full_name`, []),

  updateLastLogin: (id) =>
    dbRun('UPDATE students SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]),

  countAll: () =>
    dbGet('SELECT COUNT(*) as total, SUM(is_active) as active FROM students WHERE is_admin = 0', []),
  // PHASE 2: updatePassword, storeTotpSecret, storePublicKey
};

module.exports = Student;

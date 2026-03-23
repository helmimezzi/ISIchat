// models/Message.js
const { dbGet, dbAll, dbRun } = require('../config/database');

const Message = {

  create: ({ senderId, receiverId, subject, body }) =>
    dbRun('INSERT INTO messages (sender_id, receiver_id, subject, body) VALUES (?, ?, ?, ?)',
      [senderId, receiverId, subject, body]),

  getInbox: (userId, { page = 1, limit = 20 } = {}) =>
    dbAll(`
      SELECT m.id, m.subject, m.is_read, m.sent_at,
             s.full_name AS sender_name, s.student_id AS sender_sid, s.department AS sender_dept
      FROM messages m JOIN students s ON s.id = m.sender_id
      WHERE m.receiver_id = ? AND m.is_deleted_receiver = 0
      ORDER BY m.sent_at DESC LIMIT ? OFFSET ?
    `, [userId, limit, (page - 1) * limit]),

  getSent: (userId, { page = 1, limit = 20 } = {}) =>
    dbAll(`
      SELECT m.id, m.subject, m.sent_at,
             r.full_name AS receiver_name, r.student_id AS receiver_sid
      FROM messages m JOIN students r ON r.id = m.receiver_id
      WHERE m.sender_id = ? AND m.is_deleted_sender = 0
      ORDER BY m.sent_at DESC LIMIT ? OFFSET ?
    `, [userId, limit, (page - 1) * limit]),

  getOne: (messageId, userId) =>
    dbGet(`
      SELECT m.*, s.full_name AS sender_name, s.student_id AS sender_sid,
             r.full_name AS receiver_name, r.student_id AS receiver_sid
      FROM messages m
      JOIN students s ON s.id = m.sender_id
      JOIN students r ON r.id = m.receiver_id
      WHERE m.id = ? AND (m.sender_id = ? OR m.receiver_id = ?)
    `, [messageId, userId, userId]),

  markAsRead: (messageId, userId) =>
    dbRun('UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?', [messageId, userId]),

  countUnread: (userId) =>
    dbGet('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0 AND is_deleted_receiver = 0', [userId]),

  countToday: () =>
    dbGet("SELECT COUNT(*) as count FROM messages WHERE date(sent_at) = date('now')", []),
};

module.exports = Message;

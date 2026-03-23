// routes/messages.js — API Messagerie
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router  = express.Router();
const Message = require('../models/Message');
const Student = require('../models/Student');
const { requireAuth } = require('../middleware/auth');
const config  = require('../config');

// Toutes les routes nécessitent auth
router.use(requireAuth);

// Rate limit envoi de messages (anti-spam)
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Limite d\'envoi atteinte. Attendez 1 minute.' },
});

// ── IMPORTANT: routes statiques AVANT /:id ───────────────
router.get('/users/search', async (req, res) => {
  try {
    const all = await Student.listActive();
    const students = all
      .filter(s => s.id !== req.user.id)
      .map(s => ({ studentId: s.student_id, name: s.full_name, department: s.department }));
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/inbox', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const [messages, unread] = await Promise.all([
      Message.getInbox(req.user.id, { page }),
      Message.countUnread(req.user.id),
    ]);
    res.json({ messages, unread: unread.count, page });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/sent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const messages = await Message.getSent(req.user.id, { page });
    res.json({ messages, page });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/:id',
  param('id').isInt().withMessage('ID invalide'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const message = await Message.getOne(parseInt(req.params.id), req.user.id);
      if (!message) return res.status(404).json({ error: 'Message introuvable' });
      if (message.receiver_id === req.user.id && !message.is_read) {
        await Message.markAsRead(message.id, req.user.id);
        message.is_read = 1;
      }
      res.json({ message });
    } catch (err) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

router.post('/',
  sendLimiter,
  [
    body('receiverStudentId').trim().notEmpty().withMessage('Destinataire requis'),
    body('subject').trim().notEmpty().isLength({ max: 200 }).withMessage('Sujet requis (max 200 cars)'),
    body('body').trim().notEmpty().isLength({ max: 5000 }).withMessage('Corps requis (max 5000 cars)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { receiverStudentId, subject, body: msgBody } = req.body;
    try {
      const receiver = await Student.findByStudentId(receiverStudentId);
      if (!receiver) return res.status(404).json({ error: 'Destinataire introuvable' });
      if (receiver.id === req.user.id) return res.status(400).json({ error: 'Impossible de s\'envoyer un message à soi-même' });

      const result = await Message.create({ senderId: req.user.id, receiverId: receiver.id, subject, body: msgBody });
      res.status(201).json({ message: 'Message envoyé', id: result.lastInsertRowid });
    } catch (err) {
      console.error('[MSG] send:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
);

module.exports = router;

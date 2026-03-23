// routes/admin.js — Dashboard Admin
const express = require('express');
const router  = express.Router();

const Student      = require('../models/Student');
const Message      = require('../models/Message');
const { LoginAttempt, Alert } = require('../models/Security');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const [students, messages, loginStats, alerts, suspicious] = await Promise.all([
      Student.countAll(),
      Message.countToday(),
      LoginAttempt.getStats24h(),
      Alert.countActive(),
      LoginAttempt.getRecentSuspicious(10),
    ]);
    res.json({ students, messages, loginStats, alerts, suspicious });
  } catch (err) {
    console.error('[ADMIN] dashboard:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.getActive();
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    await Alert.resolve(parseInt(req.params.id), req.user.id);
    res.json({ message: 'Alerte résolue' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const students = await Student.listActive();
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/suspicious-ips', async (req, res) => {
  try {
    const ips = await LoginAttempt.getRecentSuspicious(50);
    res.json({ ips });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

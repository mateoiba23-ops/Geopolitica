const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// GET /api/payment/status/:paymentId
router.get('/status/:paymentId', authMiddleware, (req, res) => {
  const payments = db.readAll('payments');
  const payment = payments[req.params.paymentId];

  if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
  if (payment.playerId !== req.player.id && req.player.role !== 'admin') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  res.json({ payment });
});

module.exports = router;

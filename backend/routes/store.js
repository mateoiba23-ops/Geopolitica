const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// POST /api/store/submit-payment
router.post('/submit-payment', authMiddleware, (req, res) => {
  const { itemId, type, usdAmount, itemName, txHash, playerNickname } = req.body;
  const player = req.player;

  if (!itemId || !usdAmount || !type) {
    return res.status(400).json({ error: 'Faltan datos del pago' });
  }

  const paymentId = uuidv4();
  const payment = {
    id: paymentId,
    playerId: player.id,
    playerNickname: player.nickname,
    itemId,
    itemName: itemName || itemId,
    type,
    usdAmount: parseFloat(usdAmount),
    txHash: txHash || '',
    status: 'pending',
    createdAt: Date.now()
  };

  const payments = db.readAll('payments');
  payments[paymentId] = payment;
  db.write('payments', payments);

  // Notify admin via chat
  db.addChatMessage('global', {
    id: uuidv4(),
    type: 'system',
    text: `💳 PAGO PENDIENTE: ${player.nickname} reportó pago de $${usdAmount} USD por "${itemName}". ID: ${paymentId.slice(0, 8)}`,
    timestamp: Date.now()
  });

  res.json({ success: true, paymentId, message: 'Pago notificado. El admin verificará en breve.' });
});

// POST /api/store/submit-donation
router.post('/submit-donation', authMiddleware, (req, res) => {
  const { usdAmount, txHash } = req.body;
  const player = req.player;

  if (!usdAmount || usdAmount < 0.5) {
    return res.status(400).json({ error: 'Monto inválido (mínimo $0.50)' });
  }

  const donationId = uuidv4();
  const donation = {
    id: donationId,
    playerId: player.id,
    playerNickname: player.nickname,
    itemName: `Donación de ${player.nickname}`,
    usdAmount: parseFloat(usdAmount),
    txHash: txHash || '',
    bonusGold: Math.floor(parseFloat(usdAmount) * 50),
    status: 'pending',
    createdAt: Date.now()
  };

  const donations = db.readAll('donations');
  donations[donationId] = donation;
  db.write('donations', donations);

  db.addChatMessage('global', {
    id: uuidv4(),
    type: 'system',
    text: `💛 DONACIÓN: ${player.nickname} donó $${usdAmount} USD. ¡Gracias! ID: ${donationId.slice(0, 8)}`,
    timestamp: Date.now()
  });

  res.json({ success: true, donationId, message: '¡Gracias! El admin verificará tu donación.' });
});

// GET /api/store/my-purchases
router.get('/my-purchases', authMiddleware, (req, res) => {
  const player = req.player;

  const payments = Object.values(db.readAll('payments'))
    .filter(p => p.playerId === player.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const donations = Object.values(db.readAll('donations'))
    .filter(d => d.playerId === player.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json({ purchases: payments, donations });
});

// GET /api/store/packages - public catalog
router.get('/packages', (req, res) => {
  res.json({
    gold: [
      { id: 'starter', name: 'Paquete Inicio', gold: 500, bonus: 0, usd: 1.99 },
      { id: 'explorer', name: 'Explorador', gold: 1200, bonus: 200, usd: 4.99 },
      { id: 'commander', name: 'Comandante', gold: 2500, bonus: 750, usd: 9.99 },
      { id: 'general', name: 'General', gold: 5500, bonus: 2000, usd: 19.99 },
      { id: 'president', name: 'Presidente', gold: 12000, bonus: 6000, usd: 39.99 }
    ],
    premium: [
      { id: 'premium_30', name: 'Premium 30 días', days: 30, usd: 2.99 },
      { id: 'premium_90', name: 'Premium 90 días', days: 90, usd: 7.99 },
      { id: 'premium_365', name: 'Premium 1 año', days: 365, usd: 24.99 }
    ]
  });
});

module.exports = router;

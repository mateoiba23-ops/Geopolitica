const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { calcWarehouseLimit } = require('../utils/constants');

// ─── Tipos de transacción ─────────────────────────────────────────────────────
const TX_LABELS = {
  transfer_money:    { label: 'Transferencia',     icon: '💸' },
  transfer_resource: { label: 'Transferencia',     icon: '📦' },
  salary:            { label: 'Salario',           icon: '💼' },
  market_buy:        { label: 'Compra mercado',    icon: '🛒' },
  market_sell:       { label: 'Venta mercado',     icon: '📤' },
  tax:               { label: 'Impuesto',          icon: '🏛️' },
  mining_reward:     { label: 'Minería',           icon: '⛏️' },
  admin_gift:        { label: 'Regalo admin',      icon: '👑' },
  premium:           { label: 'Premium',           icon: '⭐' },
  factory_created:   { label: 'Fábrica creada',   icon: '🏭' },
  factory_upgrade:   { label: 'Mejora fábrica',   icon: '⬆️' },
  skill_train:       { label: 'Entrenamiento',     icon: '🎯' },
  move_region:       { label: 'Mudanza',           icon: '📍' },
  donation:          { label: 'Donación',          icon: '💛' },
  payment:           { label: 'Compra tienda',     icon: '🛍️' }
};

// ─── GET /api/transactions/history ───────────────────────────────────────────
// Historial propio con filtros opcionales
router.get('/history', authMiddleware, async (req, res) => {
  const { type, currency, limit = 50, page = 1 } = req.query;
  const player = req.player;

  let txs = await db.getPlayerTransactionsAsync(player.id, 500);

  if (type)     txs = txs.filter(t => t.type === type);
  if (currency) txs = txs.filter(t => t.currency === currency);

  const total    = txs.length;
  const pageSize = parseInt(limit);
  const pageNum  = parseInt(page);
  const pageTxs  = txs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  // Enriquecer con labels
  const enriched = pageTxs.map(tx => ({
    ...tx,
    label: TX_LABELS[tx.type]?.label || tx.type,
    icon:  TX_LABELS[tx.type]?.icon  || '💰',
    isIncoming: tx.toId === player.id
  }));

  // Calcular balance del período
  const balance = calcBalance(txs, player.id);

  res.json({ transactions: enriched, total, page: pageNum, balance });
});

// ─── GET /api/transactions/summary ───────────────────────────────────────────
// Resumen financiero compacto para el perfil
router.get('/summary', authMiddleware, async (req, res) => {
  const player = req.player;
  const txs    = await db.getPlayerTransactionsAsync(player.id, 500);
  const now    = Date.now();
  const day    = 86400000;

  const today   = txs.filter(t => t.timestamp > now - day);
  const week    = txs.filter(t => t.timestamp > now - 7 * day);

  res.json({
    today:   calcBalance(today,  player.id),
    week:    calcBalance(week,   player.id),
    allTime: calcBalance(txs,    player.id),
    byType:  groupByType(txs, player.id)
  });
});

// ─── POST /api/transactions/send-money ───────────────────────────────────────
router.post('/send-money', authMiddleware, (req, res) => {
  const { toNickname, amount, note } = req.body;
  const sender = req.player;

  if (!toNickname || !amount) {
    return res.status(400).json({ error: 'Destinatario y cantidad requeridos' });
  }

  const qty = parseInt(amount);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  if (qty < 10) {
    return res.status(400).json({ error: 'Mínimo $10 por transferencia' });
  }

  const receiver = db.getPlayerByNickname(toNickname);
  if (!receiver) {
    return res.status(404).json({ error: `Jugador "${toNickname}" no encontrado` });
  }
  if (receiver.id === sender.id) {
    return res.status(400).json({ error: 'No puedes enviarte dinero a ti mismo' });
  }

  const fee    = Math.floor(qty * 0.02); // 2% de comisión
  const total  = qty + fee;

  if (sender.money < total) {
    return res.status(400).json({ error: `Necesitas $${total} (incluye 2% comisión: $${fee})` });
  }

  sender.money   -= total;
  receiver.money += qty;

  const txId = uuidv4();
  const tx = {
    id: txId,
    type: 'transfer_money',
    fromId: sender.id,
    toId:   receiver.id,
    fromNickname: sender.nickname,
    toNickname:   receiver.nickname,
    amount: qty,
    fee,
    currency: 'money',
    description: note ? `Transferencia: ${note}` : `Transferencia de ${sender.nickname}`,
    timestamp: Date.now()
  };

  db.addTransaction(tx);
  db.savePlayer(sender);
  db.savePlayer(receiver);

  // Notificar al receptor
  if (!receiver.notifications) receiver.notifications = [];
  receiver.notifications.unshift({
    id: uuidv4(), type: 'transfer_money',
    text: `💸 Recibiste $${qty} de ${sender.nickname}${note ? `: "${note}"` : ''}`,
    read: false, timestamp: Date.now()
  });
  db.savePlayer(receiver);

  const safe = { ...sender };
  delete safe.password;

  res.json({
    success: true,
    player: safe,
    message: `✅ Enviaste $${qty} a ${receiver.nickname} (comisión: $${fee})`,
    transaction: tx
  });
});

// ─── POST /api/transactions/send-gold ────────────────────────────────────────
router.post('/send-gold', authMiddleware, (req, res) => {
  const { toNickname, amount, note } = req.body;
  const sender = req.player;

  const qty = parseInt(amount);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  if (qty < 1)                 return res.status(400).json({ error: 'Mínimo 1 ⚱️' });

  const receiver = db.getPlayerByNickname(toNickname);
  if (!receiver)               return res.status(404).json({ error: `"${toNickname}" no encontrado` });
  if (receiver.id === sender.id) return res.status(400).json({ error: 'No puedes enviarte oro a ti mismo' });

  if (sender.gold < qty) {
    return res.status(400).json({ error: `No tienes suficiente oro (tienes ${sender.gold})` });
  }

  sender.gold   -= qty;
  receiver.gold += qty;

  const tx = {
    id: uuidv4(),
    type: 'transfer_money',
    fromId: sender.id,
    toId:   receiver.id,
    fromNickname: sender.nickname,
    toNickname:   receiver.nickname,
    amount: qty,
    fee: 0,
    currency: 'gold',
    description: note ? `Oro: ${note}` : `Oro de ${sender.nickname}`,
    timestamp: Date.now()
  };

  db.addTransaction(tx);
  db.savePlayer(sender);

  if (!receiver.notifications) receiver.notifications = [];
  receiver.notifications.unshift({
    id: uuidv4(), type: 'transfer_money',
    text: `⚱️ Recibiste ${qty} oro de ${sender.nickname}${note ? `: "${note}"` : ''}`,
    read: false, timestamp: Date.now()
  });
  db.savePlayer(receiver);

  const safe = { ...sender };
  delete safe.password;

  res.json({
    success: true,
    player: safe,
    message: `✅ Enviaste ${qty} ⚱️ a ${receiver.nickname}`,
    transaction: tx
  });
});

// ─── POST /api/transactions/send-resource ────────────────────────────────────
router.post('/send-resource', authMiddleware, (req, res) => {
  const { toNickname, resourceType, amount, note } = req.body;
  const sender = req.player;

  const qty = parseInt(amount);
  if (!resourceType || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  const receiver = db.getPlayerByNickname(toNickname);
  if (!receiver)               return res.status(404).json({ error: `"${toNickname}" no encontrado` });
  if (receiver.id === sender.id) return res.status(400).json({ error: 'No puedes enviarte recursos a ti mismo' });

  const senderHas = (sender.warehouse || {})[resourceType] || 0;
  if (senderHas < qty) {
    return res.status(400).json({ error: `No tienes suficiente ${resourceType} (tienes ${senderHas})` });
  }

  // Verificar espacio en almacén receptor
  const receiverLimit = calcWarehouseLimit(receiver);
  const receiverTotal = Object.values(receiver.warehouse || {}).reduce((a, b) => a + b, 0);
  if (receiverTotal + qty > receiverLimit) {
    return res.status(400).json({ error: `El almacén de ${toNickname} no tiene espacio` });
  }

  sender.warehouse[resourceType]   -= qty;
  if (!receiver.warehouse) receiver.warehouse = {};
  receiver.warehouse[resourceType] = (receiver.warehouse[resourceType] || 0) + qty;

  const tx = {
    id: uuidv4(),
    type: 'transfer_resource',
    fromId: sender.id,
    toId:   receiver.id,
    fromNickname: sender.nickname,
    toNickname:   receiver.nickname,
    amount: qty,
    fee: 0,
    currency: 'resource',
    resource: resourceType,
    description: note ? `${resourceType}: ${note}` : `${resourceType} de ${sender.nickname}`,
    timestamp: Date.now()
  };

  db.addTransaction(tx);
  db.savePlayer(sender);

  if (!receiver.notifications) receiver.notifications = [];
  receiver.notifications.unshift({
    id: uuidv4(), type: 'transfer_resource',
    text: `📦 Recibiste ${qty} ${resourceType} de ${sender.nickname}${note ? `: "${note}"` : ''}`,
    read: false, timestamp: Date.now()
  });
  db.savePlayer(receiver);

  const safe = { ...sender };
  delete safe.password;

  res.json({
    success: true,
    player: safe,
    message: `✅ Enviaste ${qty} ${resourceType} a ${receiver.nickname}`,
    transaction: tx
  });
});

// ─── GET /api/transactions/player/:nickname ───────────────────────────────────
// Ver historial público de otro jugador (solo cantidades, sin detalles privados)
router.get('/player/:nickname', authMiddleware, async (req, res) => {
  const target = db.getPlayerByNickname(req.params.nickname);
  if (!target) return res.status(404).json({ error: 'Jugador no encontrado' });

  const txs = (await db.getPlayerTransactionsAsync(target.id, 30)).map(tx => ({
    id:          tx.id,
    type:        tx.type,
    label:       TX_LABELS[tx.type]?.label || tx.type,
    icon:        TX_LABELS[tx.type]?.icon  || '💰',
    amount:      tx.amount,
    currency:    tx.currency,
    resource:    tx.resource,
    isIncoming:  tx.toId === target.id,
    timestamp:   tx.timestamp
  }));

  res.json({ transactions: txs });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcBalance(txs, playerId) {
  let moneyIn = 0, moneyOut = 0, goldIn = 0, goldOut = 0;
  txs.forEach(tx => {
    if (tx.currency === 'money') {
      if (tx.toId   === playerId) moneyIn  += tx.amount;
      if (tx.fromId === playerId) moneyOut += (tx.amount + (tx.fee || 0));
    }
    if (tx.currency === 'gold') {
      if (tx.toId   === playerId) goldIn  += tx.amount;
      if (tx.fromId === playerId) goldOut += tx.amount;
    }
  });
  return {
    moneyIn, moneyOut, moneyNet: moneyIn - moneyOut,
    goldIn,  goldOut,  goldNet:  goldIn  - goldOut
  };
}

function groupByType(txs, playerId) {
  const groups = {};
  txs.forEach(tx => {
    const key = tx.type;
    if (!groups[key]) groups[key] = { count: 0, moneyIn: 0, moneyOut: 0 };
    groups[key].count++;
    if (tx.currency === 'money') {
      if (tx.toId   === playerId) groups[key].moneyIn  += tx.amount;
      if (tx.fromId === playerId) groups[key].moneyOut += tx.amount;
    }
  });
  return groups;
}

module.exports = router;
module.exports.TX_LABELS  = TX_LABELS;
module.exports.addTx      = (tx) => db.addTransaction(tx);

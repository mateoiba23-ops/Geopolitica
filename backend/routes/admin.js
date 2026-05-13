const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { adminMiddleware } = require('../utils/auth');
const { FACTORY_TYPES } = require('../utils/constants');

// GET /api/admin/stats
router.get('/stats', adminMiddleware, (req, res) => {
  const players = db.getAllPlayers();
  const factories = db.getAllFactories();
  const regions = db.getAllRegions();
  const economy = db.getEconomy();
  const market = db.getMarket();
  const payments = db.readAll('payments');
  const donations = db.readAll('donations');

  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const oneWeekAgo = now - 7 * 86400000;

  const totalRevenue = Object.values(payments)
    .filter(p => p.status === 'approved')
    .reduce((sum, p) => sum + (p.usdAmount || 0), 0);

  const totalDonated = Object.values(donations)
    .filter(d => d.status === 'approved')
    .reduce((sum, d) => sum + (d.usdAmount || 0), 0);

  res.json({
    players: players.filter(p => p.role !== 'admin').length,
    activePlayers24h: players.filter(p => p.lastSeen > oneDayAgo && p.role !== 'admin').length,
    activePlayers7d: players.filter(p => p.lastSeen > oneWeekAgo && p.role !== 'admin').length,
    premiumPlayers: players.filter(p => p.premium && p.role !== 'admin').length,
    bannedPlayers: players.filter(p => p.banned).length,
    factories: factories.length,
    activeFactories: factories.filter(f => f.active).length,
    regions: regions.length,
    economy,
    marketListings: (market.listings || []).length,
    totalRevenue,
    totalDonated,
    pendingPayments: Object.values(payments).filter(p => p.status === 'pending').length,
    pendingDonations: Object.values(donations).filter(d => d.status === 'pending').length,
    serverUptime: Math.floor(process.uptime())
  });
});

// GET /api/admin/players
router.get('/players', adminMiddleware, (req, res) => {
  const players = db.getAllPlayers()
    .filter(p => p.role !== 'admin')
    .sort((a, b) => b.registeredAt - a.registeredAt)
    .map(p => { const s = { ...p }; delete s.password; return s; });
  res.json({ players });
});

// POST /api/admin/ban
router.post('/ban', adminMiddleware, (req, res) => {
  const { playerId, reason } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  if (player.role === 'admin') return res.status(403).json({ error: 'No puedes banear al admin' });
  player.banned = true;
  player.banReason = reason || 'Violación de normas';
  player.bannedAt = Date.now();
  db.savePlayer(player);
  db.addChatMessage('global', { id: uuidv4(), type: 'system', text: `🔨 ${player.nickname} ha sido suspendido.`, timestamp: Date.now() });
  res.json({ success: true, message: `${player.nickname} baneado` });
});

// POST /api/admin/unban
router.post('/unban', adminMiddleware, (req, res) => {
  const { playerId } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  player.banned = false;
  delete player.banReason;
  delete player.bannedAt;
  db.savePlayer(player);
  res.json({ success: true, message: `${player.nickname} desbaneado` });
});

// POST /api/admin/give-gold
router.post('/give-gold', adminMiddleware, (req, res) => {
  const { playerId, amount } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  const qty = parseInt(amount);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  player.gold += qty;
  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({ id: uuidv4(), type: 'admin_gift', text: `👑 El administrador te otorgó ${qty} ⚱️ de oro.`, read: false, timestamp: Date.now() });
  db.savePlayer(player);
  res.json({ success: true, message: `+${qty} oro a ${player.nickname}` });
});

// POST /api/admin/give-money
router.post('/give-money', adminMiddleware, (req, res) => {
  const { playerId, amount } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  const qty = parseInt(amount);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  player.money += qty;
  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({ id: uuidv4(), type: 'admin_gift', text: `👑 El administrador te otorgó $${qty} de dinero.`, read: false, timestamp: Date.now() });
  db.savePlayer(player);
  res.json({ success: true, message: `+$${qty} a ${player.nickname}` });
});

// POST /api/admin/give-premium
router.post('/give-premium', adminMiddleware, (req, res) => {
  const { playerId, days } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  const d = parseInt(days) || 30;
  player.premium = true;
  player.premiumUntil = Date.now() + d * 86400000;
  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({ id: uuidv4(), type: 'premium', text: `⭐ ¡Se te activó PREMIUM por ${d} días!`, read: false, timestamp: Date.now() });
  db.savePlayer(player);
  res.json({ success: true, message: `Premium ${d} días a ${player.nickname}` });
});

// POST /api/admin/set-level
router.post('/set-level', adminMiddleware, (req, res) => {
  const { playerId, level } = req.body;
  const player = db.getPlayer(playerId);
  if (!player) return res.status(404).json({ error: 'Jugador no encontrado' });
  player.level = Math.max(1, parseInt(level));
  db.savePlayer(player);
  res.json({ success: true, message: `Nivel de ${player.nickname} → ${player.level}` });
});

// POST /api/admin/region-update
router.post('/region-update', adminMiddleware, (req, res) => {
  const { regionId, updates } = req.body;
  const region = db.getRegion(regionId);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });
  const allowed = ['medicine', 'education', 'industrial', 'infrastructure', 'taxes'];
  allowed.forEach(key => { if (updates[key] !== undefined) region[key] = updates[key]; });
  db.saveRegion(region);
  res.json({ success: true, region, message: 'Región actualizada' });
});

// POST /api/admin/create-factory
router.post('/create-factory', adminMiddleware, (req, res) => {
  const { type, regionId, level, name } = req.body;
  if (!FACTORY_TYPES[type]) return res.status(400).json({ error: 'Tipo inválido' });
  const region = db.getRegion(regionId);
  if (!region) return res.status(400).json({ error: 'Región inválida' });
  const admin = req.player;
  const typeInfo = FACTORY_TYPES[type];
  const lvl = Math.max(1, parseInt(level) || 1);
  const factory = {
    id: uuidv4(), ownerId: admin.id, regionId, type,
    name: name || `${typeInfo.name} - ${region.name}`,
    level: lvl, xp: 0, xpToNext: typeInfo.xpPerLevel(lvl),
    workers: [], maxWorkers: typeInfo.maxWorkersPerLevel * lvl,
    salary: typeInfo.baseSalary, warehouse: {},
    warehouseLimit: typeInfo.warehousePerLevel * lvl,
    production: 0, efficiency: 100, taxes: region.taxes.factory,
    active: true, createdAt: Date.now()
  };
  db.saveFactory(factory);
  admin.factories.push(factory.id);
  db.savePlayer(admin);
  res.json({ success: true, factory, message: `Fábrica ${factory.name} creada` });
});

// POST /api/admin/distribute-gold
router.post('/distribute-gold', adminMiddleware, (req, res) => {
  const { distributeGold } = require('../systems/economy_engine');
  distributeGold();
  res.json({ success: true, message: 'Distribución de oro ejecutada' });
});

// POST /api/admin/broadcast
router.post('/broadcast', adminMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });
  db.addChatMessage('global', { id: uuidv4(), type: 'system', text: `📢 ADMIN: ${message}`, timestamp: Date.now() });
  res.json({ success: true, message: 'Mensaje enviado al chat global' });
});

// GET /api/admin/payments
router.get('/payments', adminMiddleware, (req, res) => {
  const payments = Object.values(db.readAll('payments')).sort((a, b) => b.createdAt - a.createdAt);
  res.json({ payments });
});

// POST /api/admin/approve-payment
router.post('/approve-payment', adminMiddleware, (req, res) => {
  const { paymentId } = req.body;
  const payments = db.readAll('payments');
  const payment = payments[paymentId];
  if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
  if (payment.status === 'approved') return res.status(400).json({ error: 'Ya aprobado' });
  payment.status = 'approved';
  payment.approvedAt = Date.now();
  payments[paymentId] = payment;
  db.write('payments', payments);
  const { deliverPayment } = require('../systems/payment_engine');
  deliverPayment(payment);
  res.json({ success: true, message: `Pago aprobado y entregado a ${payment.playerNickname}` });
});

// POST /api/admin/reject-payment
router.post('/reject-payment', adminMiddleware, (req, res) => {
  const { paymentId, reason } = req.body;
  const payments = db.readAll('payments');
  const payment = payments[paymentId];
  if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
  payment.status = 'rejected';
  payment.rejectedAt = Date.now();
  payment.rejectReason = reason || 'No verificado';
  payments[paymentId] = payment;
  db.write('payments', payments);
  const player = db.getPlayer(payment.playerId);
  if (player) {
    if (!player.notifications) player.notifications = [];
    player.notifications.unshift({ id: uuidv4(), type: 'payment_rejected', text: `❌ Tu pago #${paymentId.slice(0,8)} fue rechazado: ${payment.rejectReason}`, read: false, timestamp: Date.now() });
    db.savePlayer(player);
  }
  res.json({ success: true, message: 'Pago rechazado' });
});

// GET /api/admin/donations
router.get('/donations', adminMiddleware, (req, res) => {
  const donations = Object.values(db.readAll('donations')).sort((a, b) => b.createdAt - a.createdAt);
  const totalDonated = donations.filter(d => d.status === 'approved').reduce((s, d) => s + (d.usdAmount || 0), 0);
  res.json({ donations, totalDonated });
});

// POST /api/admin/approve-donation
router.post('/approve-donation', adminMiddleware, (req, res) => {
  const { donationId } = req.body;
  const donations = db.readAll('donations');
  const donation = donations[donationId];
  if (!donation) return res.status(404).json({ error: 'Donación no encontrada' });
  donation.status = 'approved';
  donation.approvedAt = Date.now();
  donations[donationId] = donation;
  db.write('donations', donations);
  const player = db.getPlayer(donation.playerId);
  if (player) {
    const bonusGold = Math.floor((donation.usdAmount || 0) * 50);
    player.gold += bonusGold;
    if (!player.notifications) player.notifications = [];
    player.notifications.unshift({ id: uuidv4(), type: 'donation_approved', text: `💛 ¡Gracias por donar $${donation.usdAmount} USD! Bonus: +${bonusGold} ⚱️`, read: false, timestamp: Date.now() });
    db.savePlayer(player);
  }
  res.json({ success: true, message: 'Donación aprobada y bonus entregado' });
});

// POST /api/admin/reject-donation
router.post('/reject-donation', adminMiddleware, (req, res) => {
  const { donationId, reason } = req.body;
  const donations = db.readAll('donations');
  const donation = donations[donationId];
  if (!donation) return res.status(404).json({ error: 'Donación no encontrada' });
  donation.status = 'rejected';
  donation.rejectReason = reason || 'No verificado';
  donations[donationId] = donation;
  db.write('donations', donations);
  res.json({ success: true, message: 'Donación rechazada' });
});

module.exports = router;

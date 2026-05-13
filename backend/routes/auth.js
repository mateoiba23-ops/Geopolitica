const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { MAX_ENERGY_BASE, XP_PER_LEVEL, WORK_XP_TO_NEXT, calcMaxEnergy, calcWarehouseLimit } = require('../utils/constants');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, nickname, regionId } = req.body;

  if (!email || !password || !nickname || !regionId) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (nickname.length < 3 || nickname.length > 20) {
    return res.status(400).json({ error: 'El nickname debe tener entre 3 y 20 caracteres' });
  }

  if (!/^[a-zA-Z0-9_\-]+$/.test(nickname)) {
    return res.status(400).json({ error: 'El nickname solo puede contener letras, números, _ y -' });
  }

  // Check if email exists
  const existingEmail = db.getPlayerByEmail(email);
  if (existingEmail) {
    return res.status(409).json({ error: 'Este email ya está registrado' });
  }

  // Check if nickname exists
  const existingNick = db.getPlayerByNickname(nickname);
  if (existingNick) {
    return res.status(409).json({ error: 'Este nickname ya está en uso' });
  }

  // Validate region
  const region = db.getRegion(regionId);
  if (!region) {
    return res.status(400).json({ error: 'Región inválida' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const player = {
    id: uuidv4(),
    email: email.toLowerCase(),
    password: hashedPassword,
    nickname,
    role: 'player',
    regionId,
    money: 1000, // Starting money
    gold: 5,     // Starting gold
    energy: MAX_ENERGY_BASE,
    maxEnergy: MAX_ENERGY_BASE,
    xp: 0,
    level: 1,
    xpToNext: XP_PER_LEVEL(1),
    skills: {
      strength: 1,
      education: 1,
      endurance: 1
    },
    workXp: 0,
    workLevel: 1,
    workXpToNext: WORK_XP_TO_NEXT(1),
    inventory: {},
    warehouse: {},
    warehouseLimit: 55,
    factories: [],
    premium: false,
    premiumUntil: null,
    registeredAt: Date.now(),
    lastSeen: Date.now(),
    lastEnergyRegen: Date.now(),
    banned: false,
    notifications: []
  };

  db.savePlayer(player);

  // Create session token
  const token = uuidv4();
  db.saveSession(token, player.id);

  // Add welcome message to chat
  db.addChatMessage('global', {
    id: uuidv4(),
    type: 'system',
    text: `🌟 ${nickname} se ha unido desde ${region.name}!`,
    timestamp: Date.now()
  });

  const safePlayer = { ...player };
  delete safePlayer.password;

  res.json({ success: true, token, player: safePlayer });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const player = db.getPlayerByEmail(email);
  if (!player) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = bcrypt.compareSync(password, player.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (player.banned) {
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida' });
  }

  player.lastSeen = Date.now();
  db.savePlayer(player);

  const token = uuidv4();
  db.saveSession(token, player.id);

  const safePlayer = { ...player };
  delete safePlayer.password;

  res.json({ success: true, token, player: safePlayer });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  const token = req.headers['x-auth-token'] || req.headers['authorization'];
  db.deleteSession(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const player = { ...req.player };
  delete player.password;
  res.json({ player });
});

module.exports = router;

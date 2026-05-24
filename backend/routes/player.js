const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const {
  SKILLS, calcMaxEnergy, calcWarehouseLimit,
  calcWorkLevelCap, XP_PER_LEVEL, WORK_XP_TO_NEXT,
  SKILL_XP_TO_NEXT, addSkillXp
} = require('../utils/constants');

// ─── GET /api/player/profile ──────────────────────────────────────────────────
router.get('/profile', authMiddleware, (req, res) => {
  const player = { ...req.player };
  delete player.password;
  player.maxEnergy      = calcMaxEnergy(player);
  player.warehouseLimit = calcWarehouseLimit(player);
  player.workLevelCap   = calcWorkLevelCap(player);

  // Enrich skill XP info
  if (!player.skillXp) player.skillXp = { strength:0, education:0, endurance:0 };
  player.skillXpToNext = {
    strength:  SKILL_XP_TO_NEXT(player.skills.strength  || 1),
    education: SKILL_XP_TO_NEXT(player.skills.education || 1),
    endurance: SKILL_XP_TO_NEXT(player.skills.endurance || 1)
  };

  res.json({ player });
});

// ─── GET /api/player/leaderboard/top ─────────────────────────────────────────
router.get('/leaderboard/top', authMiddleware, (req, res) => {
  const players = db.getAllPlayers()
    .filter(p => p.role !== 'admin')
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 50)
    .map(p => ({
      nickname:   p.nickname,
      level:      p.level,
      xp:         p.xp,
      regionId:   p.regionId,
      workLevel:  p.workLevel,
      skills:     p.skills,
      premium:    p.premium,
      money:      p.money,
      gold:       p.gold,
      factories:  (p.factories || []).length
    }));
  res.json({ leaderboard: players });
});

// ─── GET /api/player/notifications/list ──────────────────────────────────────
router.get('/notifications/list', authMiddleware, (req, res) => {
  res.json({ notifications: req.player.notifications || [] });
});

// ─── POST /api/player/notifications/mark-read ────────────────────────────────
router.post('/notifications/mark-read', authMiddleware, (req, res) => {
  const player = req.player;
  if (player.notifications) {
    player.notifications = player.notifications.map(n => ({ ...n, read: true }));
    db.savePlayer(player);
  }
  res.json({ success: true });
});

// ─── POST /api/player/train-skill ────────────────────────────────────────────
router.post('/train-skill', authMiddleware, (req, res) => {
  const { skill } = req.body;
  const player     = req.player;

  if (!SKILLS[skill]) {
    return res.status(400).json({ error: 'Habilidad inválida' });
  }

  const skillDef    = SKILLS[skill];
  if (!player.skillXp) player.skillXp = { strength:0, education:0, endurance:0 };
  const currentLvl  = player.skills[skill] || 1;
  const goldCost    = skillDef.trainGoldCost(currentLvl);
  const energyCost  = skillDef.trainEnergyCost;

  if (player.gold < goldCost) {
    return res.status(400).json({ error: `Necesitas ${goldCost} ⚱️ de oro` });
  }
  if (player.energy < energyCost) {
    return res.status(400).json({ error: `Necesitas ${energyCost} ⚡ de energía` });
  }

  player.gold              -= goldCost;
  player.energy            -= energyCost;
  player.skills[skill]      = currentLvl + 1;

  // Recalcular derivados inmediatamente
  player.maxEnergy      = calcMaxEnergy(player);
  player.warehouseLimit = calcWarehouseLimit(player);

  // Notificación interna
  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({
    id: uuidv4(), type: 'skill_up',
    text: `${skillDef.icon} ${skillDef.name} subió al nivel ${player.skills[skill]}`,
    read: false, timestamp: Date.now()
  });

  db.savePlayer(player);

  const safe = { ...player };
  delete safe.password;

  res.json({
    success: true,
    player: safe,
    message: `${skillDef.name} subió al nivel ${player.skills[skill]}`,
    effects: getSkillEffectsDescription(skill, player.skills[skill])
  });
});

// ─── POST /api/player/move-region ────────────────────────────────────────────
// Mudarse cambia tu región física y energía de regen
// La residencia (para votar/política) es un sistema separado
router.post('/move-region', authMiddleware, (req, res) => {
  const { regionId } = req.body;
  const player       = req.player;

  const region = db.getRegion(regionId);
  if (!region) return res.status(400).json({ error: 'Región inválida' });

  if (player.regionId === regionId) {
    return res.status(400).json({ error: 'Ya estás en esa región' });
  }

  const moveCost = 50;
  if (player.money < moveCost) {
    return res.status(400).json({ error: `Necesitas $${moveCost} para mudarte` });
  }

  const oldRegion = player.regionId;
  player.money   -= moveCost;
  player.regionId = regionId;

  // Resetear acumulador de energía al cambiar región
  // (la medicina de la nueva región aplica desde ahora)
  player.energyAccum = 0;

  // Si la nueva región no tiene estado → residencia automática
  if (!player.residencies) player.residencies = {};
  if (!player.residencies[regionId]) {
    const states = db.getAllStates();
    const hasState = states.some(s => (s.regions||[]).includes(regionId));
    if (!hasState) {
      player.residencies[regionId] = {
        status:      'approved',
        requestedAt: Date.now(),
        approvedAt:  Date.now(),
        approvedBy:  'auto'
      };
    }
  }

  db.savePlayer(player);
  db.addTransaction({
    id: uuidv4(), type: 'move_region',
    fromId: player.id, toId: regionId,
    fromNickname: player.nickname, toNickname: region.name,
    amount: moveCost, fee: 0, currency: 'money',
    description: `Mudanza de ${db.getRegion(oldRegion)?.name||oldRegion} a ${region.name}`,
    timestamp: Date.now()
  });

  const safe = { ...player }; delete safe.password;
  res.json({ success: true, message: `Te mudaste a ${region.name}`, regionId, player: safe });
});

// ─── GET /api/player/:nickname ────────────────────────────────────────────────
// Debe ir AL FINAL para no interceptar /leaderboard/top ni /notifications/list
router.get('/:nickname', authMiddleware, (req, res) => {
  const target = db.getPlayerByNickname(req.params.nickname);
  if (!target) return res.status(404).json({ error: 'Jugador no encontrado' });

  res.json({
    player: {
      id:          target.id,
      nickname:    target.nickname,
      level:       target.level,
      xp:          target.xp,
      regionId:    target.regionId,
      skills:      target.skills,
      workLevel:   target.workLevel,
      workLevelCap: calcWorkLevelCap(target),
      factories:   (target.factories || []).length,
      registeredAt: target.registeredAt,
      lastSeen:    target.lastSeen,
      premium:     target.premium,
      role:        target.role
    }
  });
});

// ─── Helpers exportados ───────────────────────────────────────────────────────

function addNotification(playerId, notification) {
  const player = db.getPlayer(playerId);
  if (!player) return;
  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({ ...notification, id: uuidv4(), read: false, timestamp: Date.now() });
  if (player.notifications.length > 100) player.notifications = player.notifications.slice(0, 100);
  db.savePlayer(player);
}

function getSkillEffectsDescription(skill, level) {
  switch (skill) {
    case 'strength':
      return [
        `+${(level * 0.5).toFixed(1)}% daño militar`,
        `+${(level * 0.2).toFixed(1)}% producción general`
      ];
    case 'education':
      return [
        `+${(level * 2).toFixed(0)}% XP laboral`,
        `+${(level * 1.5).toFixed(1)}% producción minas de oro`,
        `+${(level * 1).toFixed(0)}% salario neto`,
        `Nivel laboral máximo: ${10 + level * 2}`
      ];
    case 'endurance':
      return [
        `+${level * 3} energía máxima`,
        `-${(level * 0.5).toFixed(1)}% costo energía (máx -40%)`,
        `+${level * 5} slots almacén`
      ];
    default: return [];
  }
}

module.exports = router;
module.exports.calcMaxEnergy   = calcMaxEnergy;
module.exports.addNotification = addNotification;

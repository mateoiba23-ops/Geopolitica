'use strict';
// ─── SISTEMA DE GUERRAS ────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// ─── Constantes ───────────────────────────────────────────────────────────────
const ATTACK_ENERGY_COST   = 30;    // Energía por ataque
const ATTACK_COOLDOWN_MS   = 60000; // 1 minuto entre ataques del mismo jugador
const WAR_XP_STRENGTH      = 2.0;   // XP de Fuerza por ronda de combate
const WAR_XP_ENDURANCE     = 1.0;   // XP de Aguante por ronda de combate
const LOOT_PERCENT         = 0.05;  // 5% del dinero del defensor como botín
const MAX_LOOT             = 5000;  // Máximo botín por ataque

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWars()       { return db.readAll('wars') || {}; }
function saveWars(wars)  { db.write('wars', wars); }

function getActiveWar(attackerStateId, defenderStateId) {
  const wars = getWars();
  return Object.values(wars).find(w =>
    w.status === 'active' &&
    ((w.attackerStateId === attackerStateId && w.defenderStateId === defenderStateId) ||
     (w.attackerStateId === defenderStateId && w.defenderStateId === attackerStateId))
  ) || null;
}

function isAtWar(stateId1, stateId2) {
  return !!getActiveWar(stateId1, stateId2);
}

function calcAttackDamage(attacker) {
  const strength = (attacker.skills && attacker.skills.strength) || 1;
  // Daño base: 10-30, escalado por Fuerza
  const base   = 10 + Math.floor(Math.random() * 20);
  const bonus  = 1 + (strength * 0.005);
  return Math.floor(base * bonus);
}

function calcDefenseBonus(defender) {
  const endurance = (defender.skills && defender.skills.endurance) || 1;
  return Math.min(endurance * 0.01, 0.40); // Max 40% reducción de daño
}

// ─── GET /api/war/list ────────────────────────────────────────────────────────
router.get('/list', authMiddleware, (req, res) => {
  const wars = Object.values(getWars())
    .filter(w => w.status === 'active')
    .sort((a, b) => b.startedAt - a.startedAt);
  res.json({ wars });
});

// ─── GET /api/war/my-state ────────────────────────────────────────────────────
router.get('/my-state', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.stateId) return res.json({ wars: [], atWar: false });

  const wars = Object.values(getWars()).filter(w =>
    w.status === 'active' &&
    (w.attackerStateId === player.stateId || w.defenderStateId === player.stateId)
  );
  res.json({ wars, atWar: wars.length > 0 });
});

// ─── GET /api/war/:warId ──────────────────────────────────────────────────────
router.get('/:warId', authMiddleware, (req, res) => {
  const wars = getWars();
  const war  = wars[req.params.warId];
  if (!war) return res.status(404).json({ error: 'Guerra no encontrada' });
  res.json({ war });
});

// ─── POST /api/war/attack ─────────────────────────────────────────────────────
// Atacar a un jugador del estado enemigo
router.post('/attack', authMiddleware, (req, res) => {
  const { targetNickname } = req.body;
  const attacker = req.player;

  // Verificaciones básicas
  if (!attacker.stateId) {
    return res.status(403).json({ error: 'Debes pertenecer a un estado para atacar' });
  }
  if (attacker.energy < ATTACK_ENERGY_COST) {
    return res.status(400).json({ error: `Necesitas ${ATTACK_ENERGY_COST}⚡ para atacar` });
  }

  // Cooldown
  const now         = Date.now();
  const lastAttack  = attacker.lastAttack || 0;
  if (now - lastAttack < ATTACK_COOLDOWN_MS) {
    const wait = Math.ceil((ATTACK_COOLDOWN_MS - (now - lastAttack)) / 1000);
    return res.status(429).json({ error: `Espera ${wait}s antes de atacar de nuevo` });
  }

  const defender = db.getPlayerByNickname(targetNickname);
  if (!defender) return res.status(404).json({ error: 'Jugador no encontrado' });
  if (defender.id === attacker.id) return res.status(400).json({ error: 'No puedes atacarte a ti mismo' });
  if (!defender.stateId) return res.status(400).json({ error: 'El jugador no pertenece a ningún estado' });
  if (defender.stateId === attacker.stateId) return res.status(400).json({ error: 'No puedes atacar a un aliado de tu estado' });

  // Verificar estado de guerra
  const attackerState = db.getState(attacker.stateId);
  const defenderState = db.getState(defender.stateId);
  if (!attackerState || !defenderState) return res.status(404).json({ error: 'Estado no encontrado' });

  const war = getActiveWar(attacker.stateId, defender.stateId);
  if (!war) {
    return res.status(403).json({
      error: `Tu estado no está en guerra con ${defenderState.name}. Declara la guerra primero mediante una ley.`
    });
  }

  // Calcular combate
  const attackDmg     = calcAttackDamage(attacker);
  const defReduction  = calcDefenseBonus(defender);
  const finalDmg      = Math.floor(attackDmg * (1 - defReduction));

  // Botín si el ataque tiene éxito (daño > 15)
  let loot = 0;
  let lootMsg = '';
  if (finalDmg > 15 && defender.money > 0) {
    loot    = Math.min(Math.floor(defender.money * LOOT_PERCENT), MAX_LOOT);
    loot    = Math.max(0, Math.min(loot, defender.money));
    if (loot > 0) {
      defender.money  -= loot;
      attacker.money  += loot;
      lootMsg = ` y saqueaste $${formatNum(loot)}`;
    }
  }

  // Gastar energía y actualizar cooldown
  attacker.energy     -= ATTACK_ENERGY_COST;
  attacker.lastAttack  = now;

  // XP de habilidades de combate
  const { addSkillXp } = require('../utils/constants');
  const strMsgs = addSkillXp(attacker, 'strength', WAR_XP_STRENGTH);
  const endMsgs = addSkillXp(attacker, 'endurance', WAR_XP_ENDURANCE);

  // Registrar en el log de guerra
  const wars    = getWars();
  const warData = wars[war.id];
  if (!warData.log) warData.log = [];
  warData.log.unshift({
    id:         uuidv4(),
    ts:         now,
    attackerId: attacker.id,
    attackerNickname: attacker.nickname,
    attackerState: attackerState.name,
    defenderId: defender.id,
    defenderNickname: defender.nickname,
    defenderState: defenderState.name,
    damage:     finalDmg,
    loot,
    reduction:  Math.floor(defReduction * 100)
  });
  // Máx 100 entradas en el log
  warData.log = warData.log.slice(0, 100);
  warData.attackCount = (warData.attackCount || 0) + 1;

  // Actualizar estadísticas del estado en guerra
  const side = warData.attackerStateId === attacker.stateId ? 'attacker' : 'defender';
  warData[side + 'Damage'] = (warData[side + 'Damage'] || 0) + finalDmg;
  warData[side + 'Loot']   = (warData[side + 'Loot']   || 0) + loot;

  wars[war.id] = warData;
  saveWars(wars);

  // Guardar jugadores
  db.savePlayer(attacker);
  db.savePlayer(defender);

  // Transacción de botín
  if (loot > 0) {
    db.addTransaction({
      id: uuidv4(), type: 'war_loot',
      fromId: defender.id, toId: attacker.id,
      fromNickname: defender.nickname, toNickname: attacker.nickname,
      amount: loot, fee: 0, currency: 'money',
      description: `Botín de guerra: ${attacker.nickname} saqueó a ${defender.nickname}`,
      timestamp: now
    });
  }

  // Notificar al defensor
  if (!defender.notifications) defender.notifications = [];
  defender.notifications.unshift({
    id: uuidv4(), type: 'war_attack',
    text: `⚔️ ${attacker.nickname} (${attackerState.name}) te atacó. Daño: ${finalDmg}${loot>0?lootMsg:''}`,
    read: false, timestamp: now
  });
  db.savePlayer(defender);

  const safe = { ...attacker }; delete safe.password;
  res.json({
    success: true,
    attacker: safe,
    result: {
      damage:      finalDmg,
      loot,
      reduction:   Math.floor(defReduction * 100),
      energyLeft:  Math.floor(attacker.energy),
      skillMsgs:   [...strMsgs, ...endMsgs]
    },
    message: `⚔️ Atacaste a ${defender.nickname} por ${finalDmg} de daño${lootMsg}`
  });
});

// ─── POST /api/war/surrender ──────────────────────────────────────────────────
// El líder del estado puede rendirse (terminar la guerra)
router.post('/surrender', authMiddleware, (req, res) => {
  const { warId } = req.body;
  const player    = req.player;

  const wars = getWars();
  const war  = wars[warId];
  if (!war) return res.status(404).json({ error: 'Guerra no encontrada' });
  if (war.status !== 'active') return res.status(400).json({ error: 'Esta guerra ya terminó' });

  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  if (state.leaderId !== player.id) return res.status(403).json({ error: 'Solo el líder puede rendirse' });

  const isAttacker = war.attackerStateId === player.stateId;
  const isDefender = war.defenderStateId === player.stateId;
  if (!isAttacker && !isDefender) return res.status(403).json({ error: 'Tu estado no participa en esta guerra' });

  war.status   = 'ended';
  war.endedAt  = Date.now();
  war.endedBy  = 'surrender';
  war.surrenderStateId = player.stateId;
  wars[warId] = war;
  saveWars(wars);

  // Limpiar enemigos entre estados
  const attackerState = db.getState(war.attackerStateId);
  const defenderState = db.getState(war.defenderStateId);
  if (attackerState) {
    attackerState.enemies = (attackerState.enemies||[]).filter(id => id !== war.defenderStateId);
    db.saveState(attackerState);
  }
  if (defenderState) {
    defenderState.enemies = (defenderState.enemies||[]).filter(id => id !== war.attackerStateId);
    db.saveState(defenderState);
  }

  const surrenderingState = isAttacker ? attackerState : defenderState;
  const winningState      = isAttacker ? defenderState : attackerState;

  db.addChatMessage('guerra', {
    id: uuidv4(), type: 'system',
    text: `🏳️ ${surrenderingState?.name} se rindió. ${winningState?.name} gana la guerra.`,
    timestamp: Date.now()
  });

  res.json({ success: true, message: 'Te rendiste. La guerra ha terminado.' });
});

// ─── POST /api/war/start (interno — llamado desde executeLaw de politics.js) ──
// También accesible directamente para admin
router.post('/start', authMiddleware, (req, res) => {
  const { defenderStateId } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(403).json({ error: 'Sin estado' });
  const attackerState = db.getState(player.stateId);
  const defenderState = db.getState(defenderStateId);

  if (!attackerState || !defenderState) return res.status(404).json({ error: 'Estado no encontrado' });
  if (attackerState.id === defenderState.id) return res.status(400).json({ error: 'No puedes declararte guerra a ti mismo' });
  if (attackerState.leaderId !== player.id && player.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el líder puede declarar la guerra' });
  }
  if (isAtWar(attackerState.id, defenderState.id)) {
    return res.status(400).json({ error: 'Ya están en guerra' });
  }

  const warId = uuidv4();
  const now   = Date.now();
  const war = {
    id:              warId,
    attackerStateId: attackerState.id,
    attackerName:    attackerState.name,
    defenderStateId: defenderState.id,
    defenderName:    defenderState.name,
    status:          'active',
    startedAt:       now,
    endedAt:         null,
    attackCount:     0,
    attackerDamage:  0,
    defenderDamage:  0,
    attackerLoot:    0,
    defenderLoot:    0,
    log:             []
  };

  const wars = getWars();
  wars[warId] = war;
  saveWars(wars);

  // Marcar como enemigos
  if (!attackerState.enemies) attackerState.enemies = [];
  if (!defenderState.enemies) defenderState.enemies = [];
  if (!attackerState.enemies.includes(defenderState.id)) attackerState.enemies.push(defenderState.id);
  if (!defenderState.enemies.includes(attackerState.id)) defenderState.enemies.push(attackerState.id);
  db.saveState(attackerState);
  db.saveState(defenderState);

  // Notificar a todos los miembros del estado defensor
  defenderState.members.forEach(m => {
    const p = db.getPlayer(m.id);
    if (!p) return;
    if (!p.notifications) p.notifications = [];
    p.notifications.unshift({
      id: uuidv4(), type: 'war_declared',
      text: `⚔️ ¡${attackerState.name} te declaró la guerra a ${defenderState.name}!`,
      read: false, timestamp: now
    });
    db.savePlayer(p);
  });

  db.addChatMessage('guerra', {
    id: uuidv4(), type: 'system',
    text: `⚔️ ¡${attackerState.name} declaró la guerra a ${defenderState.name}!`,
    timestamp: now
  });

  res.json({ success: true, war, message: `Guerra declarada contra ${defenderState.name}` });
});

// ─── Helper numérico local ────────────────────────────────────────────────────
function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return String(n);
}

module.exports = router;
module.exports.getActiveWar = getActiveWar;
module.exports.isAtWar      = isAtWar;

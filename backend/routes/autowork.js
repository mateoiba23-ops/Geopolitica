const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const {
  WORK_ENERGY_COST, WORK_XP_BASE, WORK_XP_PREMIUM,
  GOLD_MINE_RATIO, FACTORY_TYPES,
  calcMaxEnergy, calcWarehouseLimit, calcEnergyCostReduction,
  calcWorkXpBonus, calcGoldProductionBonus, calcSalaryBonus,
  checkLevelUp, checkWorkLevelUp,
  addSkillXp, calcWorkSkillXpGain
} = require('../utils/constants');

// ─── GET /api/autowork/status ─────────────────────────────────────────────────
router.get('/status', authMiddleware, (req, res) => {
  const player = req.player;

  if (!player.premium) {
    return res.json({ active: false, premium: false });
  }

  const aw = db.getAutoworkByPlayer(player.id);
  res.json({
    active:       aw ? aw.active : false,
    premium:      true,
    factoryId:    aw ? aw.factoryId : null,
    factoryName:  aw ? aw.factoryName : null,
    startedAt:    aw ? aw.startedAt : null,
    totalEarned:  aw ? aw.totalEarned : 0,
    totalXp:      aw ? aw.totalXp : 0,
    totalCycles:  aw ? aw.totalCycles : 0,
    lastCycleAt:  aw ? aw.lastCycleAt : null
  });
});

// ─── POST /api/autowork/start ─────────────────────────────────────────────────
router.post('/start', authMiddleware, (req, res) => {
  const { factoryId } = req.body;
  const player = req.player;

  if (!player.premium) {
    return res.status(403).json({ error: 'El trabajo automático es exclusivo de Premium ⭐' });
  }

  const factory = db.getFactory(factoryId);
  if (!factory)        return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (!factory.active) return res.status(400).json({ error: 'Fábrica inactiva' });

  if (player.energy < WORK_ENERGY_COST) {
    return res.status(400).json({ error: `Necesitas al menos ${WORK_ENERGY_COST}⚡ para iniciar` });
  }

  // Registrar como trabajador si no lo está
  if (!factory.workers.includes(player.id)) {
    if (factory.workers.length >= factory.maxWorkers) {
      return res.status(400).json({ error: 'Fábrica llena de trabajadores' });
    }
    factory.workers.push(player.id);
    db.saveFactory(factory);
  }

  db.setAutowork(player.id, {
    active:      true,
    factoryId,
    factoryName: factory.name,
    startedAt:   Date.now(),
    totalEarned: 0,
    totalXp:     0,
    totalCycles: 0,
    lastCycleAt: null
  });

  res.json({
    success: true,
    message: `✅ Trabajo automático iniciado en ${factory.name}`
  });
});

// ─── POST /api/autowork/stop ──────────────────────────────────────────────────
router.post('/stop', authMiddleware, (req, res) => {
  const player = req.player;
  const aw     = db.getAutoworkByPlayer(player.id);

  if (!aw || !aw.active) {
    return res.status(400).json({ error: 'No tienes trabajo automático activo' });
  }

  // Remove from factory workers
  if (aw.factoryId) {
    const factory = db.getFactory(aw.factoryId);
    if (factory) {
      factory.workers = factory.workers.filter(id => id !== player.id);
      db.saveFactory(factory);
    }
  }

  const summary = {
    totalEarned: aw.totalEarned,
    totalXp:     aw.totalXp,
    totalCycles: aw.totalCycles,
    duration:    Date.now() - aw.startedAt
  };

  db.setAutowork(player.id, null);

  res.json({
    success: true,
    message: `⏹️ Trabajo automático detenido`,
    summary
  });
});

// ─── POST /api/autowork/tick ──────────────────────────────────────────────────
// Llamado por el scheduler cada 10 minutos para ejecutar ciclos automáticos
router.post('/tick', (req, res) => {
  const results = processAutoworkTick();
  res.json({ processed: results.length, results });
});

// ─── Lógica interna del tick ──────────────────────────────────────────────────

function processAutoworkTick() {
  const allAw   = db.getAutowork();
  const results = [];

  Object.entries(allAw).forEach(([playerId, aw]) => {
    if (!aw || !aw.active) return;

    const player = db.getPlayer(playerId);
    if (!player || !player.premium) {
      // Si perdió premium, detener autowork
      db.setAutowork(playerId, null);
      return;
    }

    const factory = db.getFactory(aw.factoryId);
    if (!factory || !factory.active) {
      db.setAutowork(playerId, { ...aw, active: false });
      if (!player.notifications) player.notifications = [];
      player.notifications.unshift({
        id: uuidv4(), type: 'autowork',
        text: `⚙️ Trabajo automático detenido: la fábrica ${aw.factoryName} ya no está disponible`,
        read: false, timestamp: Date.now()
      });
      db.savePlayer(player);
      return;
    }

    // Verificar energía
    if (player.energy < WORK_ENERGY_COST) {
      // Sin energía — esperar a que se regenere, no detener
      return;
    }

    // Ejecutar ciclo de trabajo
    const energyToSpend = Math.min(player.energy, 100);
    const result        = executeWorkCycle(player, factory, energyToSpend);

    if (result) {
      // Actualizar stats del autowork
      aw.totalEarned  = (aw.totalEarned  || 0) + result.netSalary;
      aw.totalXp      = (aw.totalXp      || 0) + result.xpGain;
      aw.totalCycles  = (aw.totalCycles  || 0) + 1;
      aw.lastCycleAt  = Date.now();
      db.setAutowork(playerId, aw);

      results.push({ playerId, nickname: player.nickname, ...result });
    }
  });

  return results;
}

function executeWorkCycle(player, factory, energyToSpend) {
  try {
    const region   = db.getRegion(factory.regionId);
    const typeInfo = FACTORY_TYPES[factory.type];
    if (!typeInfo) return null;

    const reduction    = calcEnergyCostReduction(player);
    const actualEnergy = Math.max(Math.floor(energyToSpend * (1 - reduction)), WORK_ENERGY_COST);
    player.energy     -= actualEnergy;

    const workUnits = Math.floor(energyToSpend / WORK_ENERGY_COST);

    // Producción
    let production = workUnits * (typeInfo.baseProduction + (factory.level - 1) * 2);
    const strBonus = 1 + ((player.skills.strength || 1) * 0.002);
    production     = Math.floor(production * strBonus);
    if (typeInfo.isGoldMine) {
      production = Math.floor(production * (1 + calcGoldProductionBonus(player)));
    }
    production = Math.floor(production * (factory.efficiency / 100));

    // Salario
    const taxRate    = region ? (region.taxes.income / 100) : 0.10;
    const gross      = factory.salary * workUnits;
    const taxes      = Math.floor(gross * taxRate);
    const salBonus   = calcSalaryBonus(player);
    const netSalary  = Math.floor((gross - taxes) * (1 + salBonus));
    player.money    += netSalary;

    // XP
    const xpBase   = WORK_XP_PREMIUM; // Premium siempre usa XP premium
    const wXpBonus = calcWorkXpBonus(player);
    const xpGain   = Math.floor(workUnits * xpBase);
    const workXpG  = Math.floor(workUnits * xpBase * (1 + wXpBonus));
    player.xp     += xpGain;
    player.workXp += workXpG;

    checkLevelUp(player);
    checkWorkLevelUp(player);

    // XP de habilidades por trabajo automático (mismo sistema)
    const skillXp = calcWorkSkillXpGain(workUnits);
    addSkillXp(player, 'education', skillXp.education);
    addSkillXp(player, 'endurance', skillXp.endurance);

    // Almacén
    if (!factory.warehouse) factory.warehouse = {};
    if (!typeInfo.isGoldMine) {
      const cur = factory.warehouse[factory.type] || 0;
      const can = Math.min(production, factory.warehouseLimit - cur);
      if (can > 0) factory.warehouse[factory.type] = cur + can;
    }
    factory.production = (factory.production || 0) + production;

    // Minería oro
    if (typeInfo.isGoldMine) {
      const miningUnits = Math.floor(energyToSpend / GOLD_MINE_RATIO);
      const eco = db.getEconomy();
      eco.globalMining = (eco.globalMining || 0) + miningUnits;
      db.saveEconomy(eco);
      factory.warehouse.goldMining = (factory.warehouse.goldMining || 0) + miningUnits;
    }

    // Tesoro regional
    if (region && gross > 0) {
      region.treasury = (region.treasury || 0) + Math.floor(gross * ((factory.taxes || 10) / 100));
      db.saveRegion(region);
    }

    // Transacción
    db.addTransaction({
      id: uuidv4(), type: 'salary',
      fromId: factory.ownerId, toId: player.id,
      fromNickname: factory.name, toNickname: player.nickname,
      amount: netSalary, fee: taxes, currency: 'money',
      description: `[AUTO] Salario x${workUnits} turnos en ${factory.name}`,
      timestamp: Date.now()
    });

    player.maxEnergy      = calcMaxEnergy(player);
    player.warehouseLimit = calcWarehouseLimit(player);
    db.saveFactory(factory);
    db.savePlayer(player);

    return { netSalary, xpGain, workXpG, production, energySpent: actualEnergy };
  } catch (e) {
    console.error('[AutoWork] Error en ciclo:', e.message);
    return null;
  }
}

module.exports = router;
module.exports.processAutoworkTick = processAutoworkTick;

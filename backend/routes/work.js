const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { addTransaction, TX_LABELS } = require('./transactions');
const {
  WORK_ENERGY_COST, WORK_XP_BASE, WORK_XP_PREMIUM,
  GOLD_MINE_RATIO, FACTORY_TYPES,
  calcMaxEnergy, calcWarehouseLimit, calcEnergyCostReduction,
  calcWorkXpBonus, calcGoldProductionBonus, calcSalaryBonus,
  checkLevelUp, checkWorkLevelUp
} = require('../utils/constants');

// ─── GET /api/work/available ──────────────────────────────────────────────────
router.get('/available', authMiddleware, (req, res) => {
  const player = req.player;
  const allFactories = db.getAllFactories();

  const jobs = allFactories
    .filter(f => f.active && f.workers.length < f.maxWorkers)
    .map(f => {
      const owner    = db.getPlayer(f.ownerId);
      const region   = db.getRegion(f.regionId);
      const typeInfo = FACTORY_TYPES[f.type];
      const isLocal  = f.regionId === player.regionId;
      return {
        factoryId:      f.id,
        factoryName:    f.name,
        type:           f.type,
        icon:           typeInfo ? typeInfo.icon : '🏭',
        level:          f.level,
        regionId:       f.regionId,
        regionName:     region ? region.name : 'Desconocida',
        ownerNickname:  owner ? owner.nickname : 'Desconocido',
        salary:         f.salary,
        workers:        f.workers.length,
        maxWorkers:     f.maxWorkers,
        efficiency:     f.efficiency,
        isLocal,
        salaryMode:     f.salaryMode || 'fixed'
      };
    });

  res.json({ jobs });
});

// ─── POST /api/work/work ──────────────────────────────────────────────────────
router.post('/work', authMiddleware, (req, res) => {
  const { factoryId, energyAmount } = req.body;
  const player = req.player;

  if (!factoryId || !energyAmount) {
    return res.status(400).json({ error: 'factoryId y energyAmount requeridos' });
  }

  const requested = parseInt(energyAmount);
  if (isNaN(requested) || requested < WORK_ENERGY_COST) {
    return res.status(400).json({ error: `Mínimo ${WORK_ENERGY_COST} ⚡ por acción` });
  }

  // Clamp a 100 por acción
  const energyToSpend = Math.min(requested, 100);

  if (player.energy < energyToSpend) {
    return res.status(400).json({ error: `Energía insuficiente (tienes ${player.energy} ⚡)` });
  }

  const factory = db.getFactory(factoryId);
  if (!factory)         return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (!factory.active)  return res.status(400).json({ error: 'Fábrica inactiva' });

  const alreadyWorking = factory.workers.includes(player.id);
  if (!alreadyWorking && factory.workers.length >= factory.maxWorkers) {
    return res.status(400).json({ error: 'Fábrica llena' });
  }
  if (!alreadyWorking) factory.workers.push(player.id);

  const region   = db.getRegion(factory.regionId);
  const typeInfo = FACTORY_TYPES[factory.type];
  if (!typeInfo) return res.status(400).json({ error: 'Tipo de fábrica inválido' });

  // ── 1. Energía gastada (reducida por Aguante) ────────────────────────────
  const reduction      = calcEnergyCostReduction(player);
  const actualEnergy   = Math.max(Math.floor(energyToSpend * (1 - reduction)), WORK_ENERGY_COST);
  player.energy       -= actualEnergy;

  const workUnits = Math.floor(energyToSpend / WORK_ENERGY_COST);

  // ── 2. Producción ────────────────────────────────────────────────────────
  let production = workUnits * (typeInfo.baseProduction + (factory.level - 1) * 2);

  // Fuerza: +0.2% producción por punto (pequeño bonus pasivo)
  const strengthBonus = 1 + ((player.skills.strength || 1) * 0.002);
  production = Math.floor(production * strengthBonus);

  // Educación: bonus en minas de oro
  if (typeInfo.isGoldMine) {
    const goldBonus = 1 + calcGoldProductionBonus(player);
    production = Math.floor(production * goldBonus);
  }

  // Eficiencia de la fábrica
  production = Math.floor(production * (factory.efficiency / 100));

  // ── 3. Salario ───────────────────────────────────────────────────────────
  const taxRate    = region ? (region.taxes.income / 100) : 0.10;
  const salaryMode = factory.salaryMode || 'fixed';
  let grossSalary, netSalary, taxes;

  if (salaryMode === 'fixed') {
    grossSalary = factory.salary * workUnits;
    taxes       = Math.floor(grossSalary * taxRate);
    // Educación: +% al salario neto
    const salaryBonus = calcSalaryBonus(player);
    netSalary   = Math.floor((grossSalary - taxes) * (1 + salaryBonus));
  } else {
    // Porcentual: trabajador recibe % de recursos, dueño el resto
    grossSalary = 0;
    taxes       = 0;
    netSalary   = 0;
    // El recurso se distribuye al retirar (lógica simplificada por ahora)
  }

  player.money += netSalary;

  // ── 4. XP ────────────────────────────────────────────────────────────────
  const xpBase       = player.premium ? WORK_XP_PREMIUM : WORK_XP_BASE;
  const workXpBonus  = calcWorkXpBonus(player); // Educación: +% XP laboral
  const xpGain       = Math.floor(workUnits * xpBase);
  const workXpGain   = Math.floor(workUnits * xpBase * (1 + workXpBonus));

  player.xp    += xpGain;
  player.workXp += workXpGain;

  // ── 5. Level ups ─────────────────────────────────────────────────────────
  const levelMsgs    = checkLevelUp(player);
  const workLvlMsgs  = checkWorkLevelUp(player);

  // ── 6. Almacén de fábrica ────────────────────────────────────────────────
  if (!factory.warehouse) factory.warehouse = {};

  if (!typeInfo.isGoldMine) {
    const res_type = factory.type;
    const current  = factory.warehouse[res_type] || 0;
    const storable = Math.min(production, factory.warehouseLimit - current);
    if (storable > 0) factory.warehouse[res_type] = current + storable;
  }

  factory.production = (factory.production || 0) + production;

  // ── 7. Minería de oro ────────────────────────────────────────────────────
  if (typeInfo.isGoldMine) {
    const miningUnits = Math.floor(energyToSpend / GOLD_MINE_RATIO);
    const economy = db.getEconomy();
    economy.globalMining = (economy.globalMining || 0) + miningUnits;
    db.saveEconomy(economy);
    factory.warehouse.goldMining = (factory.warehouse.goldMining || 0) + miningUnits;
  }

  // ── 8. Tesorería regional ────────────────────────────────────────────────
  if (region && grossSalary > 0) {
    const factoryTax = Math.floor(grossSalary * ((factory.taxes || 10) / 100));
    region.treasury  = (region.treasury || 0) + factoryTax;
    db.saveRegion(region);
  }

  // ── 9. Registrar transacción de salario ─────────────────────────────────
  if (netSalary > 0) {
    const { v4: uuidv4tx } = require('uuid');
    db.addTransaction({
      id: uuidv4tx(),
      type: 'salary',
      fromId: factory.ownerId,
      toId: player.id,
      fromNickname: factory.name,
      toNickname: player.nickname,
      amount: netSalary,
      fee: taxes,
      currency: 'money',
      description: `Salario x${workUnits} turnos en ${factory.name}`,
      timestamp: Date.now()
    });
  }

  // ── 10. Guardar ──────────────────────────────────────────────────────────
  player.maxEnergy      = calcMaxEnergy(player);
  player.warehouseLimit = calcWarehouseLimit(player);
  db.saveFactory(factory);
  db.savePlayer(player);

  const safe = { ...player };
  delete safe.password;

  res.json({
    success: true,
    player: safe,
    result: {
      energySpent:      actualEnergy,
      energyReduction:  `${(reduction * 100).toFixed(1)}%`,
      production,
      grossSalary,
      taxes,
      netSalary,
      xpGain,
      workXpGain,
      workXpBonus:      `+${(calcWorkXpBonus(player) * 100).toFixed(0)}%`,
      levelMessages:    levelMsgs,
      workLevelMessages: workLvlMsgs
    }
  });
});

// ─── POST /api/work/resign ────────────────────────────────────────────────────
router.post('/resign', authMiddleware, (req, res) => {
  const { factoryId } = req.body;
  const factory = db.getFactory(factoryId);
  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  factory.workers = factory.workers.filter(id => id !== req.player.id);
  db.saveFactory(factory);
  res.json({ success: true, message: 'Has renunciado al trabajo' });
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { FACTORY_TYPES, FACTORY_CREATION_COST, calcWarehouseLimit } = require('../utils/constants');

// ─── GET /api/factory/my ──────────────────────────────────────────────────────
router.get('/my', authMiddleware, (req, res) => {
  const factories = db.getFactoriesByOwner(req.player.id).map(enrich);
  res.json({ factories });
});

// ─── GET /api/factory/region/:regionId ───────────────────────────────────────
router.get('/region/:regionId', authMiddleware, (req, res) => {
  const factories = db.getFactoriesByRegion(req.params.regionId).map(enrich);
  res.json({ factories });
});

// ─── GET /api/factory/all/list ────────────────────────────────────────────────
router.get('/all/list', authMiddleware, (req, res) => {
  const factories = db.getAllFactories().map(f => {
    const ti     = FACTORY_TYPES[f.type];
    const region = db.getRegion(f.regionId);
    const owner  = db.getPlayer(f.ownerId);
    return {
      id: f.id, name: f.name, type: f.type,
      icon: ti ? ti.icon : '🏭',
      level: f.level, regionId: f.regionId,
      regionName: region ? region.name : '?',
      ownerNickname: owner ? owner.nickname : '?',
      salary: f.salary, workers: f.workers.length,
      maxWorkers: f.maxWorkers, active: f.active,
      salaryMode: f.salaryMode || 'fixed'
    };
  });
  res.json({ factories });
});

// ─── GET /api/factory/:id ─────────────────────────────────────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const factory = db.getFactory(req.params.id);
  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  res.json({ factory: enrich(factory) });
});

// ─── POST /api/factory/create ─────────────────────────────────────────────────
router.post('/create', authMiddleware, (req, res) => {
  const { type, regionId, name } = req.body;
  const player = req.player;

  const typeInfo = FACTORY_TYPES[type];
  if (!typeInfo) return res.status(400).json({ error: 'Tipo de fábrica inválido' });

  const region = db.getRegion(regionId);
  if (!region)  return res.status(400).json({ error: 'Región inválida' });

  const cost = FACTORY_CREATION_COST[type];
  if (player.money < cost.money) {
    return res.status(400).json({ error: `Necesitas $${cost.money} de dinero` });
  }
  if (player.gold < cost.gold) {
    return res.status(400).json({ error: `Necesitas ${cost.gold} ⚱️ de oro` });
  }

  const factory = {
    id:            uuidv4(),
    ownerId:       player.id,
    regionId,
    type,
    name:          name || `${typeInfo.name} de ${player.nickname}`,
    level:         1,
    xp:            0,
    xpToNext:      typeInfo.xpPerLevel(1),
    workers:       [],
    maxWorkers:    typeInfo.maxWorkersPerLevel,
    salary:        typeInfo.baseSalary,
    salaryMode:    'fixed',
    warehouse:     {},
    warehouseLimit: typeInfo.warehousePerLevel,
    production:    0,
    efficiency:    100,
    taxes:         region.taxes.factory,
    active:        true,
    createdAt:     Date.now()
  };

  player.money -= cost.money;
  player.gold  -= cost.gold;
  if (!player.factories) player.factories = [];
  player.factories.push(factory.id);

  db.saveFactory(factory);
  db.savePlayer(player);

  const safe = { ...player };
  delete safe.password;

  res.json({ success: true, factory: enrich(factory), player: safe, message: `¡${factory.name} creada!` });
});

// ─── POST /api/factory/upgrade ────────────────────────────────────────────────
router.post('/upgrade', authMiddleware, (req, res) => {
  const { factoryId } = req.body;
  const player  = req.player;
  const factory = db.getFactory(factoryId);

  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (factory.ownerId !== player.id && player.role !== 'admin') {
    return res.status(403).json({ error: 'No eres el dueño' });
  }

  const typeInfo  = FACTORY_TYPES[factory.type];
  const xpNeeded  = factory.xpToNext || typeInfo.xpPerLevel(factory.level);
  const goldCost  = typeInfo.goldCostPerLevel(factory.level);

  if (factory.xp < xpNeeded) {
    return res.status(400).json({ error: `Faltan ${xpNeeded - factory.xp} XP de fábrica` });
  }
  if (player.gold < goldCost) {
    return res.status(400).json({ error: `Necesitas ${goldCost} ⚱️ de oro` });
  }

  factory.xp            -= xpNeeded;
  factory.level         += 1;
  factory.xpToNext       = typeInfo.xpPerLevel(factory.level);
  factory.maxWorkers     = typeInfo.maxWorkersPerLevel * factory.level;
  factory.warehouseLimit = typeInfo.warehousePerLevel * factory.level;
  player.gold           -= goldCost;

  db.saveFactory(factory);
  db.savePlayer(player);

  const safe = { ...player };
  delete safe.password;

  res.json({ success: true, factory: enrich(factory), player: safe, message: `¡Fábrica subida a nivel ${factory.level}!` });
});

// ─── POST /api/factory/set-salary ────────────────────────────────────────────
router.post('/set-salary', authMiddleware, (req, res) => {
  const { factoryId, salary, salaryMode } = req.body;
  const player  = req.player;
  const factory = db.getFactory(factoryId);

  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (factory.ownerId !== player.id && player.role !== 'admin') {
    return res.status(403).json({ error: 'No eres el dueño' });
  }

  if (salary !== undefined)    factory.salary     = Math.max(0, parseInt(salary));
  if (salaryMode !== undefined) factory.salaryMode = ['fixed','percent'].includes(salaryMode) ? salaryMode : 'fixed';

  db.saveFactory(factory);
  res.json({ success: true, message: 'Salario actualizado' });
});

// ─── POST /api/factory/toggle-active ─────────────────────────────────────────
router.post('/toggle-active', authMiddleware, (req, res) => {
  const { factoryId } = req.body;
  const player  = req.player;
  const factory = db.getFactory(factoryId);

  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (factory.ownerId !== player.id && player.role !== 'admin') {
    return res.status(403).json({ error: 'No eres el dueño' });
  }

  factory.active = !factory.active;
  if (!factory.active) factory.workers = []; // Desconectar trabajadores
  db.saveFactory(factory);

  res.json({ success: true, active: factory.active, message: factory.active ? 'Fábrica activada' : 'Fábrica desactivada' });
});

// ─── POST /api/factory/withdraw ───────────────────────────────────────────────
router.post('/withdraw', authMiddleware, (req, res) => {
  const { factoryId, resourceType, amount } = req.body;
  const player  = req.player;
  const factory = db.getFactory(factoryId);

  if (!factory) return res.status(404).json({ error: 'Fábrica no encontrada' });
  if (factory.ownerId !== player.id && player.role !== 'admin') {
    return res.status(403).json({ error: 'No eres el dueño' });
  }

  const available  = factory.warehouse[resourceType] || 0;
  const toWithdraw = Math.min(parseInt(amount), available);
  if (toWithdraw <= 0) return res.status(400).json({ error: 'No hay suficientes recursos' });

  const warehouseLimit = calcWarehouseLimit(player);
  const currentTotal   = Object.values(player.warehouse || {}).reduce((a, b) => a + b, 0);
  if (currentTotal + toWithdraw > warehouseLimit) {
    return res.status(400).json({ error: `Almacén personal lleno (${currentTotal}/${warehouseLimit})` });
  }

  factory.warehouse[resourceType] -= toWithdraw;
  if (!player.warehouse) player.warehouse = {};
  player.warehouse[resourceType] = (player.warehouse[resourceType] || 0) + toWithdraw;

  db.saveFactory(factory);
  db.savePlayer(player);

  res.json({ success: true, message: `Retiraste ${toWithdraw} de ${resourceType}` });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function enrich(f) {
  const ti     = FACTORY_TYPES[f.type];
  const region = db.getRegion(f.regionId);
  const owner  = db.getPlayer(f.ownerId);
  return {
    ...f,
    typeName:      ti ? ti.name : f.type,
    icon:          ti ? ti.icon : '🏭',
    color:         ti ? ti.color : '#888',
    isGoldMine:    ti ? ti.isGoldMine : false,
    regionName:    region ? region.name : '?',
    ownerNickname: owner ? owner.nickname : '?'
  };
}

module.exports = router;

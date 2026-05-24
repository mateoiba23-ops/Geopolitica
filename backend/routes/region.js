const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// ─── GET /api/region/all ──────────────────────────────────────────────────────
// Público — usado en registro y mapa
router.get('/all', (req, res) => {
  const regions  = db.getAllRegions();
  const players  = db.getAllPlayers();
  const states   = db.getAllStates();

  // Mapa regionId → estado
  const regionStateMap = {};
  states.forEach(s => (s.regions || []).forEach(rId => { regionStateMap[rId] = s; }));

  const enriched = regions.map(r => {
    const regionPlayers = players.filter(p => p.regionId === r.id && p.role !== 'admin');
    const factories     = db.getFactoriesByRegion(r.id);
    const state         = regionStateMap[r.id] || null;
    return {
      ...r,
      playerCount:     regionPlayers.length,
      factoryCount:    factories.length,
      activeFactories: factories.filter(f => f.active).length,
      stateId:         state ? state.id   : null,
      stateName:       state ? state.name : null,
      stateShield:     state ? state.shield : null,
      stateColor:      state ? state.color  : null,
      hasState:        !!state
    };
  });

  res.json({ regions: enriched });
});

// ─── GET /api/region/my — info completa de la región del jugador ──────────────
router.get('/my', authMiddleware, (req, res) => {
  const player = req.player;
  const region = db.getRegion(player.regionId);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  const players   = db.getAllPlayers().filter(p => p.regionId === region.id && p.role !== 'admin');
  const factories = db.getFactoriesByRegion(region.id);
  const states    = db.getAllStates();
  const state     = states.find(s => (s.regions||[]).includes(region.id)) || null;

  // Residentes (jugadores con residencia aprobada en la región)
  const residents = players.filter(p => {
    const res = (p.residencies || {})[region.id];
    return res && res.status === 'approved';
  });

  const topPlayers = [...players]
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)
    .map(p => ({ nickname: p.nickname, level: p.level, workLevel: p.workLevel }));

  // Solicitudes de residencia pendientes (solo visible si es líder/ministro)
  const myRole = player.stateId && state && state.id === player.stateId ? player.stateRole : null;
  const canManageResidency = ['leader', 'minister_exterior'].includes(myRole) || player.role === 'admin';

  const pendingResidencies = canManageResidency
    ? players.filter(p => {
        const res = (p.residencies || {})[region.id];
        return res && res.status === 'pending';
      }).map(p => ({ id: p.id, nickname: p.nickname, level: p.level, requestedAt: (p.residencies||{})[region.id]?.requestedAt }))
    : [];

  res.json({
    region: {
      ...region,
      playerCount:        players.length,
      residentCount:      residents.length,
      factoryCount:       factories.length,
      activeFactories:    factories.filter(f => f.active).length,
      stateId:            state ? state.id     : null,
      stateName:          state ? state.name   : null,
      stateShield:        state ? state.shield : null,
      stateColor:         state ? state.color  : null,
      hasState:           !!state,
      topPlayers,
      pendingResidencies,
      canManageResidency,
      // Fábricas de la región (para trabajar)
      factories: factories.map(f => ({
        id: f.id, name: f.name, type: f.type, level: f.level,
        salary: f.salary, workers: f.workers.length,
        maxWorkers: f.maxWorkers, active: f.active,
        salaryMode: f.salaryMode || 'fixed'
      }))
    }
  });
});

// ─── GET /api/region/:id — info pública de otra región ───────────────────────
router.get('/:id', authMiddleware, (req, res) => {
  const region = db.getRegion(req.params.id);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  const players   = db.getAllPlayers().filter(p => p.regionId === region.id && p.role !== 'admin');
  const factories = db.getFactoriesByRegion(region.id);
  const states    = db.getAllStates();
  const state     = states.find(s => (s.regions||[]).includes(region.id)) || null;

  const topPlayers = [...players]
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)
    .map(p => ({ nickname: p.nickname, level: p.level, workLevel: p.workLevel }));

  res.json({
    region: {
      ...region,
      playerCount:  players.length,
      factoryCount: factories.length,
      stateId:      state ? state.id     : null,
      stateName:    state ? state.name   : null,
      stateShield:  state ? state.shield : null,
      stateColor:   state ? state.color  : null,
      hasState:     !!state,
      topPlayers,
      // NO se muestran fábricas de regiones ajenas — para eso debes estar ahí
      factories: []
    }
  });
});

// ─── POST /api/region/request-residency ──────────────────────────────────────
// Solicitar residencia en la región actual del jugador
router.post('/request-residency', authMiddleware, (req, res) => {
  const player = req.player;
  const regionId = player.regionId;
  const region   = db.getRegion(regionId);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  if (!player.residencies) player.residencies = {};

  // Ya tiene residencia aprobada
  if (player.residencies[regionId]?.status === 'approved') {
    return res.status(400).json({ error: 'Ya tienes residencia aprobada en esta región' });
  }
  // Ya tiene solicitud pendiente
  if (player.residencies[regionId]?.status === 'pending') {
    return res.status(400).json({ error: 'Ya tienes una solicitud pendiente en esta región' });
  }

  const states = db.getAllStates();
  const state  = states.find(s => (s.regions||[]).includes(regionId)) || null;

  if (!state) {
    // Región sin estado — aprobación automática
    player.residencies[regionId] = {
      status:      'approved',
      requestedAt: Date.now(),
      approvedAt:  Date.now(),
      approvedBy:  'auto'
    };
    db.savePlayer(player);

    const safe = { ...player }; delete safe.password;
    return res.json({
      success: true,
      autoApproved: true,
      message: `✅ Residencia en ${region.name} aprobada automáticamente`,
      player: safe
    });
  }

  // Región con estado — solicitud pendiente
  player.residencies[regionId] = {
    status:      'pending',
    requestedAt: Date.now()
  };
  db.savePlayer(player);

  // Notificar al líder y ministro de relaciones exteriores del estado
  state.members
    .filter(m => ['leader','minister_exterior'].includes(m.role))
    .forEach(m => {
      const target = db.getPlayer(m.id);
      if (!target) return;
      if (!target.notifications) target.notifications = [];
      target.notifications.unshift({
        id: uuidv4(), type: 'residency_request',
        text: `📋 ${player.nickname} solicita residencia en ${region.name}`,
        read: false, timestamp: Date.now(),
        data: { playerId: player.id, regionId }
      });
      db.savePlayer(target);
    });

  const safe = { ...player }; delete safe.password;
  res.json({
    success: true,
    autoApproved: false,
    message: `📋 Solicitud enviada al estado ${state.name}. Espera aprobación.`,
    player: safe
  });
});

// ─── POST /api/region/approve-residency ──────────────────────────────────────
router.post('/approve-residency', authMiddleware, (req, res) => {
  const { playerId, regionId, approve } = req.body;
  const manager = req.player;

  // Verificar que el manager tiene permisos en esa región
  const states  = db.getAllStates();
  const state   = states.find(s => (s.regions||[]).includes(regionId));

  const hasPermission =
    manager.role === 'admin' ||
    (state && state.id === manager.stateId &&
     ['leader','minister_exterior'].includes(manager.stateRole));

  if (!hasPermission) {
    return res.status(403).json({ error: 'No tienes permiso para gestionar residencias aquí' });
  }

  const target = db.getPlayer(playerId);
  if (!target) return res.status(404).json({ error: 'Jugador no encontrado' });

  if (!target.residencies) target.residencies = {};
  if (!target.residencies[regionId] || target.residencies[regionId].status !== 'pending') {
    return res.status(400).json({ error: 'No hay solicitud pendiente de este jugador' });
  }

  const region = db.getRegion(regionId);

  if (approve) {
    target.residencies[regionId] = {
      status:      'approved',
      requestedAt: target.residencies[regionId].requestedAt,
      approvedAt:  Date.now(),
      approvedBy:  manager.nickname
    };
    if (!target.notifications) target.notifications = [];
    target.notifications.unshift({
      id: uuidv4(), type: 'residency_approved',
      text: `✅ Tu solicitud de residencia en ${region?.name || regionId} fue aprobada por ${manager.nickname}`,
      read: false, timestamp: Date.now()
    });
  } else {
    delete target.residencies[regionId];
    if (!target.notifications) target.notifications = [];
    target.notifications.unshift({
      id: uuidv4(), type: 'residency_rejected',
      text: `❌ Tu solicitud de residencia en ${region?.name || regionId} fue rechazada`,
      read: false, timestamp: Date.now()
    });
  }

  db.savePlayer(target);
  res.json({
    success: true,
    message: approve
      ? `✅ Residencia aprobada para ${target.nickname}`
      : `❌ Residencia rechazada para ${target.nickname}`
  });
});

// ─── GET /api/region/:id/stats ────────────────────────────────────────────────
router.get('/:id/stats', authMiddleware, (req, res) => {
  const region    = db.getRegion(req.params.id);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  const players   = db.getAllPlayers().filter(p => p.regionId === region.id);
  const factories = db.getFactoriesByRegion(region.id);
  const totalProduction = factories.reduce((sum, f) => sum + (f.production||0), 0);
  const avgLevel = players.length
    ? Math.floor(players.reduce((sum, p) => sum + p.level, 0) / players.length)
    : 0;

  res.json({
    stats: {
      regionId: region.id, regionName: region.name,
      population: region.population, players: players.length,
      factories: factories.length, totalProduction,
      avgPlayerLevel: avgLevel, treasury: region.treasury || 0,
      taxes: region.taxes, resources: region.resources,
      medicine: region.medicine, education: region.education,
      industrial: region.industrial, infrastructure: region.infrastructure
    }
  });
});

module.exports = router;

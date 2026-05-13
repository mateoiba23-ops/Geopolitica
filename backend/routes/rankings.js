const express = require('express');
const router  = express.Router();
const db      = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// ─── GET /api/rankings/players ────────────────────────────────────────────────
router.get('/players', authMiddleware, (req, res) => {
  const { by = 'level', limit = 50 } = req.query;
  const players = db.getAllPlayers().filter(p => p.role !== 'admin' && !p.banned);

  const sorters = {
    level:     (a, b) => b.level - a.level || b.xp - a.xp,
    money:     (a, b) => b.money - a.money,
    gold:      (a, b) => b.gold - a.gold,
    worklevel: (a, b) => b.workLevel - a.workLevel,
    strength:  (a, b) => (b.skills?.strength||0) - (a.skills?.strength||0),
    education: (a, b) => (b.skills?.education||0) - (a.skills?.education||0),
    endurance: (a, b) => (b.skills?.endurance||0) - (a.skills?.endurance||0),
    factories: (a, b) => (b.factories?.length||0) - (a.factories?.length||0)
  };

  const sorted = [...players]
    .sort(sorters[by] || sorters.level)
    .slice(0, parseInt(limit))
    .map((p, i) => ({
      rank:        i + 1,
      nickname:    p.nickname,
      level:       p.level,
      workLevel:   p.workLevel,
      money:       p.money,
      gold:        p.gold,
      skills:      p.skills,
      regionId:    p.regionId,
      stateId:     p.stateId || null,
      factories:   (p.factories || []).length,
      premium:     p.premium,
      lastSeen:    p.lastSeen,
      registeredAt: p.registeredAt
    }));

  res.json({ rankings: sorted, by, total: players.length });
});

// ─── GET /api/rankings/states ─────────────────────────────────────────────────
router.get('/states', authMiddleware, (req, res) => {
  const { by = 'members' } = req.query;
  const states  = db.getAllStates().filter(s => s.active);
  const players = db.getAllPlayers();

  const enriched = states.map(s => {
    const members    = players.filter(p => p.stateId === s.id);
    const totalMoney = members.reduce((sum, p) => sum + (p.money || 0), 0);
    const totalGold  = members.reduce((sum, p) => sum + (p.gold  || 0), 0);
    const avgLevel   = members.length
      ? Math.floor(members.reduce((sum, p) => sum + p.level, 0) / members.length)
      : 0;
    return {
      id:           s.id,
      name:         s.name,
      shield:       s.shield,
      color:        s.color,
      systemName:   s.politicalSystem,
      leaderNickname: s.leaderNickname,
      memberCount:  members.length,
      regionCount:  (s.regions || []).length,
      treasury:     s.treasury || 0,
      totalMoney,
      totalGold,
      avgLevel,
      foundedAt:    s.foundedAt
    };
  });

  const sorters = {
    members:   (a, b) => b.memberCount - a.memberCount,
    treasury:  (a, b) => b.treasury - a.treasury,
    regions:   (a, b) => b.regionCount - a.regionCount,
    wealth:    (a, b) => b.totalMoney - a.totalMoney,
    avglevel:  (a, b) => b.avgLevel - a.avgLevel,
    age:       (a, b) => a.foundedAt - b.foundedAt
  };

  const sorted = enriched
    .sort(sorters[by] || sorters.members)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  res.json({ rankings: sorted, by });
});

// ─── GET /api/rankings/factories ─────────────────────────────────────────────
router.get('/factories', authMiddleware, (req, res) => {
  const { by = 'level', type } = req.query;
  let factories = db.getAllFactories().filter(f => f.active);
  if (type) factories = factories.filter(f => f.type === type);

  const sorters = {
    level:      (a, b) => b.level - a.level,
    production: (a, b) => (b.production||0) - (a.production||0),
    workers:    (a, b) => b.workers.length - a.workers.length
  };

  const sorted = factories
    .sort(sorters[by] || sorters.level)
    .slice(0, 50)
    .map((f, i) => {
      const owner  = db.getPlayer(f.ownerId);
      const region = db.getRegion(f.regionId);
      return {
        rank:          i + 1,
        id:            f.id,
        name:          f.name,
        type:          f.type,
        level:         f.level,
        production:    f.production || 0,
        workers:       f.workers.length,
        maxWorkers:    f.maxWorkers,
        ownerNickname: owner  ? owner.nickname  : '?',
        regionName:    region ? region.name     : '?',
        salary:        f.salary
      };
    });

  res.json({ rankings: sorted, by });
});

// ─── GET /api/rankings/regions ────────────────────────────────────────────────
router.get('/regions', authMiddleware, (req, res) => {
  const { by = 'players' } = req.query;
  const regions = db.getAllRegions();
  const players = db.getAllPlayers();
  const factories = db.getAllFactories();

  const enriched = regions.map(r => {
    const regionPlayers   = players.filter(p => p.regionId === r.id && p.role !== 'admin');
    const regionFactories = factories.filter(f => f.regionId === r.id);
    const totalProduction = regionFactories.reduce((sum, f) => sum + (f.production||0), 0);
    return {
      id:           r.id,
      name:         r.name,
      capital:      r.capital,
      playerCount:  regionPlayers.length,
      factoryCount: regionFactories.length,
      totalProduction,
      medicine:     r.medicine,
      education:    r.education,
      industrial:   r.industrial,
      infrastructure: r.infrastructure,
      treasury:     r.treasury || 0
    };
  });

  const sorters = {
    players:    (a, b) => b.playerCount - a.playerCount,
    factories:  (a, b) => b.factoryCount - a.factoryCount,
    production: (a, b) => b.totalProduction - a.totalProduction,
    medicine:   (a, b) => b.medicine - a.medicine,
    education:  (a, b) => b.education - a.education,
    industrial: (a, b) => b.industrial - a.industrial,
    treasury:   (a, b) => b.treasury - a.treasury
  };

  const sorted = enriched
    .sort(sorters[by] || sorters.players)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  res.json({ rankings: sorted, by });
});

module.exports = router;

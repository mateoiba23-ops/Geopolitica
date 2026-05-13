const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// GET /api/region/all - all regions (public for registration)
router.get('/all', (req, res) => {
  const regions = db.getAllRegions();
  const players = db.getAllPlayers();

  const enriched = regions.map(r => {
    const regionPlayers = players.filter(p => p.regionId === r.id && p.role !== 'admin');
    const factories = db.getFactoriesByRegion(r.id);
    return {
      ...r,
      playerCount: regionPlayers.length,
      factoryCount: factories.length,
      activeFactories: factories.filter(f => f.active).length
    };
  });

  res.json({ regions: enriched });
});

// GET /api/region/:id - single region detail
router.get('/:id', authMiddleware, (req, res) => {
  const region = db.getRegion(req.params.id);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  const players = db.getAllPlayers().filter(p => p.regionId === region.id && p.role !== 'admin');
  const factories = db.getFactoriesByRegion(region.id);

  const topPlayers = players
    .sort((a, b) => b.level - a.level)
    .slice(0, 10)
    .map(p => ({ nickname: p.nickname, level: p.level, workLevel: p.workLevel }));

  res.json({
    region: {
      ...region,
      playerCount: players.length,
      factoryCount: factories.length,
      topPlayers,
      factories: factories.map(f => ({
        id: f.id, name: f.name, type: f.type, level: f.level,
        salary: f.salary, workers: f.workers.length, maxWorkers: f.maxWorkers, active: f.active
      }))
    }
  });
});

// GET /api/region/:id/stats - economic stats
router.get('/:id/stats', authMiddleware, (req, res) => {
  const region = db.getRegion(req.params.id);
  if (!region) return res.status(404).json({ error: 'Región no encontrada' });

  const players = db.getAllPlayers().filter(p => p.regionId === region.id);
  const factories = db.getFactoriesByRegion(region.id);

  const totalProduction = factories.reduce((sum, f) => sum + f.production, 0);
  const avgLevel = players.length > 0
    ? Math.floor(players.reduce((sum, p) => sum + p.level, 0) / players.length)
    : 0;

  res.json({
    stats: {
      regionId: region.id,
      regionName: region.name,
      population: region.population,
      players: players.length,
      factories: factories.length,
      totalProduction,
      avgPlayerLevel: avgLevel,
      treasury: region.treasury || 0,
      taxes: region.taxes,
      resources: region.resources,
      medicine: region.medicine,
      education: region.education,
      industrial: region.industrial,
      infrastructure: region.infrastructure
    }
  });
});

module.exports = router;

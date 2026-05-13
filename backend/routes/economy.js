const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// GET /api/economy/stats - global economy overview
router.get('/stats', authMiddleware, (req, res) => {
  const economy = db.getEconomy();
  const allPlayers = db.getAllPlayers().filter(p => p.role !== 'admin');
  const allFactories = db.getAllFactories();

  const totalMoney = allPlayers.reduce((sum, p) => sum + p.money, 0);
  const totalGold = allPlayers.reduce((sum, p) => sum + p.gold, 0);
  const totalProduction = allFactories.reduce((sum, f) => sum + f.production, 0);

  // Top factories by production
  const topFactories = allFactories
    .sort((a, b) => b.production - a.production)
    .slice(0, 10)
    .map(f => {
      const owner = db.getPlayer(f.ownerId);
      const region = db.getRegion(f.regionId);
      return {
        name: f.name,
        type: f.type,
        level: f.level,
        production: f.production,
        ownerNickname: owner ? owner.nickname : '?',
        regionName: region ? region.name : '?'
      };
    });

  res.json({
    economy: {
      globalMining: economy.globalMining || 0,
      dailyGoldPool: economy.dailyGoldPool || 1000000,
      lastDistribution: economy.lastDistribution,
      totalMoneySupply: totalMoney,
      totalGoldSupply: totalGold,
      totalProduction,
      activeFactories: allFactories.filter(f => f.active).length,
      totalPlayers: allPlayers.length,
      topFactories
    }
  });
});

// GET /api/economy/mining - mining contributions
router.get('/mining', authMiddleware, (req, res) => {
  const economy = db.getEconomy();
  const allFactories = db.getAllFactories().filter(f => f.type === 'gold');

  const totalMining = economy.globalMining || 1;

  const contributions = allFactories
    .filter(f => (f.warehouse.goldMining || 0) > 0)
    .map(f => {
      const owner = db.getPlayer(f.ownerId);
      const region = db.getRegion(f.regionId);
      const mining = f.warehouse.goldMining || 0;
      return {
        factoryId: f.id,
        factoryName: f.name,
        ownerNickname: owner ? owner.nickname : '?',
        regionName: region ? region.name : '?',
        miningContribution: mining,
        percentage: ((mining / totalMining) * 100).toFixed(2),
        estimatedGold: Math.floor((mining / totalMining) * (economy.dailyGoldPool || 1000000))
      };
    })
    .sort((a, b) => b.miningContribution - a.miningContribution);

  res.json({
    mining: {
      globalTotal: totalMining,
      dailyPool: economy.dailyGoldPool || 1000000,
      lastDistribution: economy.lastDistribution,
      contributions
    }
  });
});

module.exports = router;

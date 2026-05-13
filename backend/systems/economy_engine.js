const db = require('../utils/db');
const { DAILY_GOLD_POOL } = require('../utils/constants');
const { v4: uuidv4 } = require('uuid');

function distributeGold() {
  console.log('💰 Iniciando distribución diaria de oro...');

  const economy = db.getEconomy();
  const totalMining = economy.globalMining || 0;

  if (totalMining === 0) {
    console.log('⚠️ No hay minería global registrada hoy. Distribución omitida.');
    economy.lastDistribution = Date.now();
    economy.globalMining = 0;
    db.saveEconomy(economy);
    return;
  }

  const goldPool = DAILY_GOLD_POOL;
  const goldFactories = db.getAllFactories().filter(f => f.type === 'gold');

  let totalDistributed = 0;
  const distributions = [];

  goldFactories.forEach(factory => {
    const miningContrib = factory.warehouse.goldMining || 0;
    if (miningContrib === 0) return;

    const share = miningContrib / totalMining;
    const goldEarned = Math.floor(share * goldPool);

    if (goldEarned > 0) {
      const owner = db.getPlayer(factory.ownerId);
      if (owner) {
        owner.gold += goldEarned;
        if (!owner.notifications) owner.notifications = [];
        owner.notifications.unshift({
          id: uuidv4(),
          type: 'gold_distribution',
          text: `💰 Distribución de minería: +${goldEarned} oro de ${factory.name}`,
          read: false,
          timestamp: Date.now()
        });
        db.savePlayer(owner);
        totalDistributed += goldEarned;
        distributions.push({ factoryId: factory.id, owner: owner.nickname, goldEarned, share: (share * 100).toFixed(2) });
      }
    }

    // Reset mining counter
    factory.warehouse.goldMining = 0;
    db.saveFactory(factory);
  });

  economy.lastDistribution = Date.now();
  economy.globalMining = 0;
  db.saveEconomy(economy);

  // Log to global chat
  db.addChatMessage('global', {
    id: uuidv4(),
    type: 'system',
    text: `🏆 Distribución diaria de minería: ${goldPool.toLocaleString()} ORO repartido entre ${distributions.length} fábricas!`,
    timestamp: Date.now()
  });

  console.log(`✅ Distribución completada: ${totalDistributed} oro a ${distributions.length} fábricas`);
  return distributions;
}

module.exports = { distributeGold };

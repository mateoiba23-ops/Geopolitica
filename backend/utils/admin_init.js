const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');

function createAdminAccount() {
  const adminId = 'admin_root';
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync('admin2024!', salt);

  const admin = {
    id: adminId,
    email: 'admin@geopolitica.game',
    password: hashedPassword,
    nickname: 'GOBIERNO',
    role: 'admin',
    regionId: 'bogota',
    money: 999999999,
    gold: 999999,
    energy: 200,
    maxEnergy: 200,
    xp: 999999,
    level: 100,
    skills: { strength: 100, education: 100, endurance: 100 },
    workXp: 999999,
    workLevel: 100,
    inventory: {},
    warehouse: {},
    factories: [],
    premium: true,
    registeredAt: Date.now(),
    lastSeen: Date.now(),
    banned: false
  };

  db.savePlayer(admin);

  // Create gold factory in each department
  const regions = db.getAllRegions();
  regions.forEach(region => {
    const factoryId = `admin_gold_${region.id}`;
    const factory = {
      id: factoryId,
      ownerId: adminId,
      regionId: region.id,
      type: 'gold',
      name: `Mina de Oro - ${region.name}`,
      level: 5,
      xp: 0,
      xpToNext: 5000,
      workers: [],
      maxWorkers: 10,
      salary: 50,
      warehouse: {},
      warehouseLimit: 500,
      production: 0,
      efficiency: 100,
      taxes: region.taxes.factory,
      active: true,
      createdAt: Date.now()
    };
    db.saveFactory(factory);
    admin.factories.push(factoryId);
  });

  db.savePlayer(admin);

  console.log('✅ Admin account created: admin@geopolitica.game / admin2024!');
  console.log(`✅ ${regions.length} gold factories created across Colombia`);
}

module.exports = { createAdminAccount };

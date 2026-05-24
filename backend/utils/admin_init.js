'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function createAdminAccount() {
  // Importar db aquí para evitar circular dependency
  const db = require('./db');

  const adminId = 'admin_root';

  // Verificar que no exista ya
  if (db.getPlayer(adminId)) {
    console.log('✅ Admin ya existe — skipping');
    return;
  }

  const hashedPassword = bcrypt.hashSync('admin2024!', 10);

  const admin = {
    id:              adminId,
    email:           'admin@geopolitica.game',
    password:        hashedPassword,
    nickname:        'GOBIERNO',
    role:            'admin',
    regionId:        'bogota',
    stateId:         null,
    stateRole:       null,
    money:           999999999,
    gold:            999999,
    energy:          200,
    maxEnergy:       200,
    energyAccum:     0,
    xp:              999999,
    level:           100,
    xpToNext:        999999,
    workXp:          999999,
    workLevel:       100,
    workXpToNext:    999999,
    skills:          { strength:100, education:100, endurance:100 },
    skillXp:         { strength:0,   education:0,   endurance:0   },
    premium:         true,
    premiumUntil:    Date.now() + 365 * 10 * 86400000,
    banned:          false,
    banReason:       null,
    warehouse:       {},
    warehouseLimit:  9999,
    factories:       [],
    inventory:       {},
    notifications:   [],
    residencies:     {},
    registeredAt:    Date.now(),
    lastSeen:        Date.now(),
    lastEnergyRegen: Date.now()
  };

  db.savePlayer(admin);

  // Crear fábricas de oro en cada región
  const regions  = db.getAllRegions();
  const { FACTORY_TYPES } = require('./constants');
  const typeInfo = FACTORY_TYPES.gold;

  for (const region of regions) {
    const factoryId = `admin_gold_${region.id}`;

    // No duplicar
    if (db.getFactory(factoryId)) continue;

    const factory = {
      id:             factoryId,
      ownerId:        adminId,
      regionId:       region.id,
      type:           'gold',
      name:           `Mina de Oro - ${region.name}`,
      level:          5,
      xp:             0,
      xpToNext:       typeInfo.xpPerLevel(5),
      workers:        [],
      maxWorkers:     typeInfo.maxWorkersPerLevel * 5,
      salary:         50,
      salaryMode:     'fixed',
      warehouse:      {},
      warehouseLimit: typeInfo.warehousePerLevel * 5,
      production:     0,
      efficiency:     100,
      taxes:          region.taxes ? region.taxes.factory : 8,
      active:         true,
      createdAt:      Date.now()
    };

    db.saveFactory(factory);
    admin.factories.push(factoryId);
  }

  // Guardar admin con fábricas actualizadas
  db.savePlayer(admin);

  console.log(`✅ Admin creado: admin@geopolitica.game / admin2024!`);
  console.log(`✅ ${regions.length} fábricas de oro creadas`);
}

module.exports = { createAdminAccount };

const db = require('../utils/db');
const { ENERGY_REGEN_BY_MEDICINE, calcMaxEnergy } = require('../utils/constants');

function regenEnergy() {
  const players = db.getAllPlayers();
  let count = 0;

  players.forEach(player => {
    const maxEnergy = calcMaxEnergy(player);
    player.maxEnergy = maxEnergy;

    if (player.energy >= maxEnergy) return; // Ya está lleno

    const region     = db.getRegion(player.regionId);
    const medicine   = region ? region.medicine : 1;
    const regenAmt   = ENERGY_REGEN_BY_MEDICINE(medicine);

    player.energy = Math.min(player.energy + regenAmt, maxEnergy);
    player.lastEnergyRegen = Date.now();
    db.savePlayer(player);
    count++;
  });

  if (count > 0) console.log(`[EnergySystem] Regenerado en ${count} jugadores`);
}

module.exports = { regenEnergy };

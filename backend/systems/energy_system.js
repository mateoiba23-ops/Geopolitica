// ─── ENERGY SYSTEM — Regeneración por minuto ─────────────────────────────────
// medicina 1 = +0.1/min (llena en ~1000 min desde 0)
// medicina 5 = +0.5/min (llena en ~200 min)
// medicina 10 = +1.0/min (llena en ~100 min)
//
// Se acumula en player.energyAccum (decimal) y solo se aplica
// cuando llega a 1 o más, evitando float spam en el JSON.

const db = require('../utils/db');
const { ENERGY_REGEN_PER_MIN, calcMaxEnergy } = require('../utils/constants');

function regenEnergy() {
  const players = db.getAllPlayers();
  let count = 0;

  players.forEach(player => {
    const maxEnergy = calcMaxEnergy(player);
    player.maxEnergy = maxEnergy;

    if (player.energy >= maxEnergy) {
      // Ya lleno — limpiar acumulador
      if (player.energyAccum) {
        player.energyAccum = 0;
        db.savePlayer(player);
      }
      return;
    }

    // Solo aplica regen de la región donde está el jugador
    const region   = db.getRegion(player.regionId);
    const medicine = region ? region.medicine : 1;
    const regenPerMin = ENERGY_REGEN_PER_MIN(medicine); // ej: medicina 5 → 0.5/min

    // Acumular fracción
    if (!player.energyAccum) player.energyAccum = 0;
    player.energyAccum += regenPerMin;

    // Solo aplicar enteros
    if (player.energyAccum >= 1) {
      const toAdd = Math.floor(player.energyAccum);
      player.energyAccum -= toAdd;
      player.energy = Math.min(player.energy + toAdd, maxEnergy);
      player.lastEnergyRegen = Date.now();
      db.savePlayer(player);
      count++;
    } else {
      // Solo guardar el acumulador actualizado
      db.savePlayer(player);
    }
  });

  if (count > 0) console.log(`[Energy] +regen en ${count} jugadores`);
}

module.exports = { regenEnergy };

const { regenEnergy } = require('./energy_system');
const { distributeGold } = require('./economy_engine');
const { ENERGY_REGEN_INTERVAL } = require('../utils/constants');

// 1 minuto para energía, 1 minuto para check de distribución
const CHECK_MS = 60 * 1000;

let lastDistributionDate = null;

function processVotes() {
  try {
    const db   = require('../utils/db');
    const now  = Date.now();
    const laws = db.getAllLaws().filter(l => l.status === 'voting' && now > l.votingEndsAt);
    const { executeLaw } = require('../routes/politics');
    const { v4: uuidv4 } = require('uuid');

    laws.forEach(law => {
      const state = db.getState(law.stateId);
      if (!state) return;
      const total  = state.members.length;
      const yes    = law.votes.yes.length;
      const no     = law.votes.no.length;
      const passed = yes > no && yes > total * 0.3;

      law.status     = passed ? 'approved' : 'rejected';
      law.executedAt = now;
      if (passed) executeLaw(law, state);
      db.saveLaw(law);

      state.members.forEach(m => {
        const p = db.getPlayer(m.id);
        if (!p) return;
        if (!p.notifications) p.notifications = [];
        p.notifications.unshift({
          id: uuidv4(), type: 'law_result',
          text: `🏛️ ${state.name}: "${law.title}" — ${passed ? '✅ APROBADA' : '❌ RECHAZADA'} (${yes} sí / ${no} no)`,
          read: false, timestamp: now
        });
        db.savePlayer(p);
      });
    });
    if (laws.length > 0) console.log(`[Scheduler] ${laws.length} leyes procesadas`);
  } catch(e) { console.error('Vote processing error:', e.message); }
}

function startScheduler() {
  console.log('⏰ Scheduler iniciado (regen energía: cada 1 minuto)');

  // ─── Energía: cada 1 minuto ───────────────────────────────────────────────
  setInterval(() => {
    try { regenEnergy(); } catch(e) { console.error('Energy regen error:', e.message); }
  }, ENERGY_REGEN_INTERVAL); // 60 segundos

  // ─── AutoWork: cada 10 minutos ────────────────────────────────────────────
  setInterval(() => {
    try {
      const { processAutoworkTick } = require('../routes/autowork');
      const results = processAutoworkTick();
      if (results.length > 0) console.log(`[AutoWork] ${results.length} ciclos`);
    } catch(e) { console.error('AutoWork tick error:', e.message); }
  }, 10 * 60 * 1000);

  // ─── Votos expirados: cada 5 minutos ─────────────────────────────────────
  setInterval(() => {
    try { processVotes(); } catch(e) {}
  }, 5 * 60 * 1000);

  // ─── Elecciones: cada minuto ──────────────────────────────────────────────
  setInterval(() => {
    try {
      const { processElections } = require('../routes/politics2');
      processElections();
    } catch(e) { console.error('Election processing error:', e.message); }
  }, 60 * 1000);

  // ─── Distribución de oro: cada minuto (check) ────────────────────────────
  setInterval(() => {
    try { checkGoldDistribution(); } catch(e) {}
  }, CHECK_MS);

  // Regen inmediato al arrancar
  setTimeout(() => { try { regenEnergy(); } catch(e) {} }, 2000);
}

function checkGoldDistribution() {
  const now = new Date();
  const bogotaOffset = -5 * 60;
  const utcOffset    = now.getTimezoneOffset();
  const bogotaTime   = new Date(now.getTime() + (utcOffset + bogotaOffset) * 60 * 1000);
  const today  = bogotaTime.toDateString();
  const hour   = bogotaTime.getHours();
  const minute = bogotaTime.getMinutes();

  if (hour === 12 && minute === 0 && lastDistributionDate !== today) {
    lastDistributionDate = today;
    console.log(`[Scheduler] 💰 Distribución diaria de oro...`);
    distributeGold();
  }
}

module.exports = { startScheduler };

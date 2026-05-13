const { regenEnergy } = require('./energy_system');
const { distributeGold } = require('./economy_engine');

const ENERGY_REGEN_MS = 10 * 60 * 1000; // 10 minutes
const CHECK_DISTRIBUTION_MS = 60 * 1000; // Check every minute for gold distribution

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
  } catch (e) { console.error('Vote processing error:', e.message); }
}

function startScheduler() {
  console.log('⏰ Scheduler started');

  // Energy regen every 10 minutes
  setInterval(() => {
    try {
      regenEnergy();
      console.log(`[${new Date().toLocaleTimeString()}] ⚡ Energy regenerated`);
    } catch (err) {
      console.error('Energy regen error:', err.message);
    }
  }, ENERGY_REGEN_MS);

  // AutoWork tick every 10 minutes (same as energy regen)
  setInterval(() => {
    try {
      const { processAutoworkTick } = require('../routes/autowork');
      const results = processAutoworkTick();
      if (results.length > 0) console.log(`[AutoWork] ${results.length} ciclos ejecutados`);
    } catch(e) { console.error('AutoWork tick error:', e.message); }
  }, ENERGY_REGEN_MS);

  // Process expired votes every 5 minutes
  setInterval(() => {
    try { processVotes(); } catch(e) {}
  }, 5 * 60 * 1000);

  // Gold distribution check every minute
  setInterval(() => {
    try {
      checkGoldDistribution();
    } catch (err) {
      console.error('Gold distribution check error:', err.message);
    }
  }, CHECK_DISTRIBUTION_MS);

  // Run energy regen immediately on start
  setTimeout(() => {
    try { regenEnergy(); } catch (e) {}
  }, 2000);
}

function checkGoldDistribution() {
  // Get Bogota time (UTC-5)
  const now = new Date();
  const bogotaOffset = -5 * 60;
  const utcOffset = now.getTimezoneOffset();
  const bogotaTime = new Date(now.getTime() + (utcOffset + bogotaOffset) * 60 * 1000);

  const today = bogotaTime.toDateString();
  const hour = bogotaTime.getHours();
  const minute = bogotaTime.getMinutes();

  // Distribute at 12:00 PM Bogota time, once per day
  if (hour === 12 && minute === 0 && lastDistributionDate !== today) {
    lastDistributionDate = today;
    console.log(`[${new Date().toLocaleTimeString()}] 💰 Running daily gold distribution...`);
    distributeGold();
  }
}

module.exports = { startScheduler };

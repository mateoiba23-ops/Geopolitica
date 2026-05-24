'use strict';
// ─── MIGRACIÓN JSON → PostgreSQL ─────────────────────────────────────────────
// Ejecutar UNA sola vez:
//   DATABASE_URL=postgres://... node backend/utils/migrate_pg.js
// Idempotente — usa ON CONFLICT DO NOTHING en todo.

require("dotenv").config();

const { Pool } = require('pg');
const path     = require('path');
const fs       = require('fs');

if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const DATA_DIR = path.join(__dirname, '../data');

function readJson(name) {
  const fp = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch(e) { console.warn(`⚠️  ${name}.json: ${e.message}`); return null; }
}

async function run() {
  console.log('🔄 Migración JSON → PostgreSQL\n');

  // ─── Schema ──────────────────────────────────────────────────────────────
  console.log('📐 Creando schema...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
      nickname TEXT UNIQUE NOT NULL, nickname_lower TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player',
      region_id TEXT NOT NULL DEFAULT 'bogota', state_id TEXT, state_role TEXT,
      money DOUBLE PRECISION NOT NULL DEFAULT 1000,
      gold DOUBLE PRECISION NOT NULL DEFAULT 5,
      energy DOUBLE PRECISION NOT NULL DEFAULT 100,
      max_energy DOUBLE PRECISION NOT NULL DEFAULT 100,
      energy_accum DOUBLE PRECISION NOT NULL DEFAULT 0,
      xp DOUBLE PRECISION NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      xp_to_next DOUBLE PRECISION NOT NULL DEFAULT 100,
      work_xp DOUBLE PRECISION NOT NULL DEFAULT 0,
      work_level INTEGER NOT NULL DEFAULT 1,
      work_xp_to_next DOUBLE PRECISION NOT NULL DEFAULT 100,
      premium BOOLEAN NOT NULL DEFAULT FALSE,
      premium_until BIGINT,
      banned BOOLEAN NOT NULL DEFAULT FALSE,
      ban_reason TEXT,
      last_seen BIGINT NOT NULL DEFAULT 0,
      registered_at BIGINT NOT NULL DEFAULT 0,
      last_energy_regen BIGINT NOT NULL DEFAULT 0,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS factories (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, region_id TEXT NOT NULL,
      type TEXT NOT NULL, name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      xp DOUBLE PRECISION NOT NULL DEFAULT 0,
      xp_to_next DOUBLE PRECISION NOT NULL DEFAULT 1000,
      salary DOUBLE PRECISION NOT NULL DEFAULT 50,
      salary_mode TEXT NOT NULL DEFAULT 'fixed',
      efficiency INTEGER NOT NULL DEFAULT 100,
      taxes INTEGER NOT NULL DEFAULT 10,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      production DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL DEFAULT 0,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_fac_owner ON factories(owner_id);
    CREATE INDEX IF NOT EXISTS idx_fac_region ON factories(region_id);
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL,
      capital TEXT NOT NULL DEFAULT '',
      population INTEGER NOT NULL DEFAULT 0,
      medicine INTEGER NOT NULL DEFAULT 1,
      education INTEGER NOT NULL DEFAULT 1,
      industrial INTEGER NOT NULL DEFAULT 1,
      infrastructure INTEGER NOT NULL DEFAULT 1,
      treasury DOUBLE PRECISION NOT NULL DEFAULT 0,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, player_id TEXT NOT NULL, created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, channel TEXT NOT NULL, player_id TEXT,
      type TEXT NOT NULL DEFAULT 'player', data JSONB NOT NULL, ts BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat ON chat_messages(channel, ts);
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, type TEXT NOT NULL,
      from_id TEXT, to_id TEXT, from_nickname TEXT, to_nickname TEXT,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'money',
      resource TEXT, description TEXT, ts BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_id, ts);
    CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_id, ts);
    CREATE TABLE IF NOT EXISTS market_listings (
      id TEXT PRIMARY KEY, seller_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      price_per_unit DOUBLE PRECISION NOT NULL,
      created_at BIGINT NOT NULL DEFAULT 0,
      expires_at BIGINT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY, resource_type TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL, ts BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS states (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS laws (
      id TEXT PRIMARY KEY, state_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'voting', data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_laws_state ON laws(state_id);
    CREATE TABLE IF NOT EXISTS economy (
      id INTEGER PRIMARY KEY DEFAULT 1,
      global_mining DOUBLE PRECISION NOT NULL DEFAULT 0,
      daily_gold_pool DOUBLE PRECISION NOT NULL DEFAULT 1000000,
      last_distribution BIGINT,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, player_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY, player_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS autowork (
      player_id TEXT PRIMARY KEY,
      active BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS wars (
      id                TEXT PRIMARY KEY,
      attacker_state_id TEXT NOT NULL,
      defender_state_id TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'active',
      started_at        BIGINT NOT NULL DEFAULT 0,
      ended_at          BIGINT,
      data              JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_wars_attacker ON wars(attacker_state_id, status);
    CREATE INDEX IF NOT EXISTS idx_wars_defender ON wars(defender_state_id, status);
  `);
  console.log('✅ Schema listo\n');

  // ─── Regiones ────────────────────────────────────────────────────────────
  const regionsJson = readJson('regions');
  const { COLOMBIA_REGIONS } = require('./regions_data');
  const source = regionsJson ? Object.values(regionsJson) : COLOMBIA_REGIONS;
  let n = 0;
  for (const r of source) {
    await pool.query(
      `INSERT INTO regions(id,name,capital,population,medicine,education,industrial,infrastructure,treasury,data)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
      [r.id, r.name, r.capital||'', r.population||0,
       r.medicine||1, r.education||1, r.industrial||1, r.infrastructure||1, r.treasury||0,
       { taxes:r.taxes, resources:r.resources, description:r.description, area:r.area }]
    ); n++;
  }
  console.log(`✅ Regiones: ${n}`);

  // ─── Jugadores ───────────────────────────────────────────────────────────
  const playersJson = readJson('players');
  n = 0;
  if (playersJson) {
    for (const p of Object.values(playersJson)) {
      try {
        const d = {
          skills:        p.skills       || { strength:1,education:1,endurance:1 },
          skillXp:       p.skillXp      || { strength:0,education:0,endurance:0 },
          warehouse:     p.warehouse    || {},
          warehouseLimit:p.warehouseLimit|| 55,
          factories:     p.factories    || [],
          inventory:     p.inventory    || {},
          notifications: (p.notifications||[]).slice(0,100),
          residencies:   p.residencies  || {}
        };
        await pool.query(
          `INSERT INTO players(id,email,nickname,nickname_lower,password,role,region_id,state_id,state_role,
            money,gold,energy,max_energy,energy_accum,xp,level,xp_to_next,work_xp,work_level,work_xp_to_next,
            premium,premium_until,banned,ban_reason,last_seen,registered_at,last_energy_regen,data)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
           ON CONFLICT(id) DO NOTHING`,
          [p.id, (p.email||'').toLowerCase(), p.nickname, (p.nickname||'').toLowerCase(),
           p.password, p.role||'player', p.regionId||'bogota', p.stateId||null, p.stateRole||null,
           p.money||0, p.gold||0, p.energy||100, p.maxEnergy||100, p.energyAccum||0,
           p.xp||0, p.level||1, p.xpToNext||100,
           p.workXp||0, p.workLevel||1, p.workXpToNext||100,
           !!p.premium, p.premiumUntil||null, !!p.banned, p.banReason||null,
           p.lastSeen||Date.now(), p.registeredAt||Date.now(), p.lastEnergyRegen||Date.now(), d]
        ); n++;
      } catch(e) { console.warn(`  ⚠️  ${p.nickname}: ${e.message}`); }
    }
  }
  console.log(`✅ Jugadores: ${n}`);

  // ─── Fábricas ────────────────────────────────────────────────────────────
  const factoriesJson = readJson('factories');
  n = 0;
  if (factoriesJson) {
    for (const f of Object.values(factoriesJson)) {
      try {
        await pool.query(
          `INSERT INTO factories(id,owner_id,region_id,type,name,level,xp,xp_to_next,
            salary,salary_mode,efficiency,taxes,active,production,created_at,data)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT(id) DO NOTHING`,
          [f.id, f.ownerId, f.regionId, f.type, f.name,
           f.level||1, f.xp||0, f.xpToNext||1000,
           f.salary||50, f.salaryMode||'fixed', f.efficiency||100, f.taxes||10,
           f.active!==false, f.production||0, f.createdAt||Date.now(),
           { workers:f.workers||[], warehouse:f.warehouse||{},
             warehouseLimit:f.warehouseLimit||100, maxWorkers:f.maxWorkers||2 }]
        ); n++;
      } catch(e) { console.warn(`  ⚠️  ${f.name}: ${e.message}`); }
    }
  }
  console.log(`✅ Fábricas: ${n}`);

  // ─── Chat ────────────────────────────────────────────────────────────────
  const chatsJson = readJson('chats');
  n = 0;
  if (chatsJson) {
    for (const [channel, msgs] of Object.entries(chatsJson)) {
      for (const msg of (msgs||[]).slice(-200)) {
        try {
          await pool.query(
            `INSERT INTO chat_messages(id,channel,player_id,type,data,ts)
             VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
            [msg.id, channel, msg.playerId||null, msg.type||'player', msg, msg.timestamp||Date.now()]
          ); n++;
        } catch {}
      }
    }
  }
  console.log(`✅ Chat: ${n} mensajes`);

  // ─── Transacciones ───────────────────────────────────────────────────────
  const txJson = readJson('transactions');
  n = 0;
  if (txJson) {
    for (const tx of Object.values(txJson)) {
      try {
        await pool.query(
          `INSERT INTO transactions(id,type,from_id,to_id,from_nickname,to_nickname,
            amount,fee,currency,resource,description,ts)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING`,
          [tx.id, tx.type, tx.fromId||null, tx.toId||null,
           tx.fromNickname||null, tx.toNickname||null,
           tx.amount||0, tx.fee||0, tx.currency||'money',
           tx.resource||null, tx.description||null, tx.timestamp||Date.now()]
        ); n++;
      } catch {}
    }
  }
  console.log(`✅ Transacciones: ${n}`);

  // ─── Mercado ─────────────────────────────────────────────────────────────
  const marketJson = readJson('market');
  n = 0;
  if (marketJson && marketJson.listings) {
    for (const l of marketJson.listings) {
      try {
        await pool.query(
          `INSERT INTO market_listings(id,seller_id,resource_type,amount,price_per_unit,created_at,expires_at)
           VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
          [l.id, l.sellerId, l.resourceType, l.amount, l.pricePerUnit,
           l.createdAt||0, l.expiresAt||0]
        ); n++;
      } catch {}
    }
  }
  console.log(`✅ Mercado: ${n} ofertas`);

  // ─── Estados ─────────────────────────────────────────────────────────────
  const statesJson = readJson('states');
  n = 0;
  if (statesJson) {
    for (const st of Object.values(statesJson)) {
      try {
        await pool.query(
          `INSERT INTO states(id,name,data) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING`,
          [st.id, st.name, st]
        ); n++;
      } catch(e) { console.warn(`  ⚠️  ${st.name}: ${e.message}`); }
    }
  }
  console.log(`✅ Estados: ${n}`);

  // ─── Leyes ───────────────────────────────────────────────────────────────
  const lawsJson = readJson('laws');
  n = 0;
  if (lawsJson) {
    for (const law of Object.values(lawsJson)) {
      try {
        await pool.query(
          `INSERT INTO laws(id,state_id,status,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`,
          [law.id, law.stateId, law.status||'voting', law]
        ); n++;
      } catch {}
    }
  }
  console.log(`✅ Leyes: ${n}`);

  // ─── Economía ────────────────────────────────────────────────────────────
  const econ = readJson('economy') || {};
  await pool.query(
    `INSERT INTO economy(id,global_mining,daily_gold_pool,last_distribution,data)
     VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`,
    [econ.globalMining||0, econ.dailyGoldPool||1000000, econ.lastDistribution||null, econ]
  );
  console.log(`✅ Economía`);

  // ─── Pagos ───────────────────────────────────────────────────────────────
  const payJson = readJson('payments'); n = 0;
  if (payJson) {
    for (const p of Object.values(payJson)) {
      try { await pool.query(`INSERT INTO payments(id,player_id,status,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`, [p.id, p.playerId, p.status||'pending', p]); n++; } catch {}
    }
  }
  const donJson = readJson('donations'); let n2 = 0;
  if (donJson) {
    for (const d of Object.values(donJson)) {
      try { await pool.query(`INSERT INTO donations(id,player_id,status,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`, [d.id, d.playerId, d.status||'pending', d]); n2++; } catch {}
    }
  }
  console.log(`✅ Pagos: ${n} · Donaciones: ${n2}`);

  // ─── Autowork ────────────────────────────────────────────────────────────
  const awJson = readJson('autowork'); n = 0;
  if (awJson) {
    for (const [pid, aw] of Object.entries(awJson)) {
      try { await pool.query(`INSERT INTO autowork(player_id,active,data) VALUES($1,$2,$3) ON CONFLICT(player_id) DO NOTHING`, [pid, !!aw.active, aw]); n++; } catch {}
    }
  }
  console.log(`✅ AutoWork: ${n}`);

  await pool.end();
  console.log('\n═══════════════════════════════════════');
  console.log('✅ MIGRACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════\n');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  pool.end();
  process.exit(1);
});

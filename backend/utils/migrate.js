// ─── MIGRACIÓN JSON → SQLite ──────────────────────────────────────────────────
// Ejecutar UNA sola vez: node backend/utils/migrate.js
// Lee los JSON existentes y los inserta en la base de datos SQLite

const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '../data');

console.log('🔄 Iniciando migración JSON → SQLite...\n');

// Cargar db ANTES de que initData corra (para que no cree admin duplicado)
const db = require('./db');
const { getDb } = db;

// Crear schema primero
const { COLOMBIA_REGIONS } = require('./regions_data');
getDb(); // Inicializa conexión

// Función para leer JSON de forma segura
function readJson(name) {
  const fp = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return raw;
  } catch(e) {
    console.warn(`⚠️  No se pudo leer ${name}.json:`, e.message);
    return null;
  }
}

// ─── 1. Schema ────────────────────────────────────────────────────────────────
console.log('📐 Creando schema SQLite...');
require('./db').initData = function() {}; // Evitar doble init
const Database = require('better-sqlite3');
const DB_FILE  = process.env.DB_PATH || path.join(DATA_DIR, 'game.db');

// Forzar creación del schema directamente
const sqldb = getDb();
sqldb.exec(`
  CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nickname TEXT UNIQUE NOT NULL, nickname_lower TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'player', region_id TEXT DEFAULT 'bogota', state_id TEXT, state_role TEXT, money REAL DEFAULT 1000, gold REAL DEFAULT 5, energy REAL DEFAULT 100, max_energy REAL DEFAULT 100, xp REAL DEFAULT 0, level INTEGER DEFAULT 1, xp_to_next REAL DEFAULT 100, work_xp REAL DEFAULT 0, work_level INTEGER DEFAULT 1, work_xp_to_next REAL DEFAULT 100, premium INTEGER DEFAULT 0, premium_until INTEGER, banned INTEGER DEFAULT 0, ban_reason TEXT, last_seen INTEGER, registered_at INTEGER, last_energy_regen INTEGER, data TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS factories (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, region_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, level INTEGER DEFAULT 1, xp REAL DEFAULT 0, xp_to_next REAL DEFAULT 1000, salary REAL DEFAULT 50, salary_mode TEXT DEFAULT 'fixed', efficiency INTEGER DEFAULT 100, taxes INTEGER DEFAULT 10, active INTEGER DEFAULT 1, production REAL DEFAULT 0, created_at INTEGER, data TEXT NOT NULL DEFAULT '{}');
  CREATE INDEX IF NOT EXISTS idx_fac_owner  ON factories(owner_id);
  CREATE INDEX IF NOT EXISTS idx_fac_region ON factories(region_id);
  CREATE TABLE IF NOT EXISTS regions (id TEXT PRIMARY KEY, name TEXT NOT NULL, capital TEXT, population INTEGER DEFAULT 0, medicine INTEGER DEFAULT 1, education INTEGER DEFAULT 1, industrial INTEGER DEFAULT 1, infrastructure INTEGER DEFAULT 1, treasury REAL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, player_id TEXT NOT NULL, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, channel TEXT NOT NULL, player_id TEXT, type TEXT DEFAULT 'player', data TEXT NOT NULL, timestamp INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_chat ON chat_messages(channel, timestamp);
  CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL, from_id TEXT, to_id TEXT, from_nickname TEXT, to_nickname TEXT, amount REAL DEFAULT 0, fee REAL DEFAULT 0, currency TEXT DEFAULT 'money', resource TEXT, description TEXT, timestamp INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_tx_to   ON transactions(to_id,   timestamp);
  CREATE TABLE IF NOT EXISTS market_listings (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, resource_type TEXT NOT NULL, amount REAL NOT NULL, price_per_unit REAL NOT NULL, created_at INTEGER, expires_at INTEGER);
  CREATE TABLE IF NOT EXISTS price_history (id INTEGER PRIMARY KEY AUTOINCREMENT, resource_type TEXT NOT NULL, price REAL NOT NULL, timestamp INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS states (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS laws (id TEXT PRIMARY KEY, state_id TEXT NOT NULL, status TEXT DEFAULT 'voting', data TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_laws_state ON laws(state_id);
  CREATE TABLE IF NOT EXISTS economy (id INTEGER PRIMARY KEY DEFAULT 1, global_mining REAL DEFAULT 0, daily_gold_pool REAL DEFAULT 1000000, last_distribution INTEGER, data TEXT DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, status TEXT DEFAULT 'pending', data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, status TEXT DEFAULT 'pending', data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS autowork (player_id TEXT PRIMARY KEY, active INTEGER DEFAULT 0, data TEXT NOT NULL DEFAULT '{}');
`);
console.log('✅ Schema creado\n');

const s = (o) => JSON.stringify(o||{});

// ─── 2. Regiones ─────────────────────────────────────────────────────────────
const regionsJson = readJson('regions');
let regCount = 0;

if (regionsJson && Object.keys(regionsJson).length > 0) {
  const insReg = sqldb.prepare(`INSERT OR REPLACE INTO regions(id,name,capital,population,medicine,education,industrial,infrastructure,treasury,data) VALUES(?,?,?,?,?,?,?,?,?,?)`);
  sqldb.transaction(() => {
    Object.values(regionsJson).forEach(r => {
      insReg.run(r.id, r.name, r.capital||'', r.population||0, r.medicine||1, r.education||1, r.industrial||1, r.infrastructure||1, r.treasury||0, s({name:r.name,capital:r.capital,population:r.population,taxes:r.taxes,resources:r.resources,description:r.description,area:r.area,production:r.production}));
      regCount++;
    });
  })();
} else {
  // Usar regiones por defecto
  const insReg = sqldb.prepare(`INSERT OR IGNORE INTO regions(id,name,capital,population,medicine,education,industrial,infrastructure,treasury,data) VALUES(?,?,?,?,?,?,?,?,?,?)`);
  sqldb.transaction(() => {
    COLOMBIA_REGIONS.forEach(r => {
      insReg.run(r.id, r.name, r.capital||'', r.population||0, r.medicine||1, r.education||1, r.industrial||1, r.infrastructure||1, 0, s(r));
      regCount++;
    });
  })();
}
console.log(`✅ Regiones: ${regCount}`);

// ─── 3. Jugadores ─────────────────────────────────────────────────────────────
const playersJson = readJson('players');
let playerCount = 0;

if (playersJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO players(id,email,nickname,nickname_lower,password,role,region_id,state_id,state_role,money,gold,energy,max_energy,xp,level,xp_to_next,work_xp,work_level,work_xp_to_next,premium,premium_until,banned,ban_reason,last_seen,registered_at,last_energy_regen,data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  
  sqldb.transaction(() => {
    Object.values(playersJson).forEach(p => {
      try {
        const extra = s({
          skills:        p.skills        || {strength:1,education:1,endurance:1},
          warehouse:     p.warehouse     || {},
          warehouseLimit:p.warehouseLimit|| 55,
          factories:     p.factories     || [],
          inventory:     p.inventory     || {},
          notifications: (p.notifications||[]).slice(0,100)
        });
        ins.run(
          p.id, (p.email||'').toLowerCase(), p.nickname,
          (p.nickname||'').toLowerCase(), p.password,
          p.role||'player', p.regionId||'bogota',
          p.stateId||null, p.stateRole||null,
          p.money||0, p.gold||0, p.energy||100, p.maxEnergy||100,
          p.xp||0, p.level||1, p.xpToNext||100,
          p.workXp||0, p.workLevel||1, p.workXpToNext||100,
          p.premium?1:0, p.premiumUntil||null,
          p.banned?1:0, p.banReason||null,
          p.lastSeen||Date.now(), p.registeredAt||Date.now(),
          p.lastEnergyRegen||Date.now(), extra
        );
        playerCount++;
      } catch(e) {
        console.warn(`⚠️  Error migrando jugador ${p.nickname}:`, e.message);
      }
    });
  })();
}
console.log(`✅ Jugadores: ${playerCount}`);

// ─── 4. Fábricas ──────────────────────────────────────────────────────────────
const factoriesJson = readJson('factories');
let factoryCount = 0;

if (factoriesJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO factories(id,owner_id,region_id,type,name,level,xp,xp_to_next,salary,salary_mode,efficiency,taxes,active,production,created_at,data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  
  sqldb.transaction(() => {
    Object.values(factoriesJson).forEach(f => {
      try {
        ins.run(
          f.id, f.ownerId, f.regionId, f.type, f.name,
          f.level||1, f.xp||0, f.xpToNext||1000,
          f.salary||50, f.salaryMode||'fixed',
          f.efficiency||100, f.taxes||10,
          f.active?1:0, f.production||0,
          f.createdAt||Date.now(),
          s({workers:f.workers||[],warehouse:f.warehouse||{},warehouseLimit:f.warehouseLimit||100,maxWorkers:f.maxWorkers||2})
        );
        factoryCount++;
      } catch(e) {
        console.warn(`⚠️  Error migrando fábrica ${f.name}:`, e.message);
      }
    });
  })();
}
console.log(`✅ Fábricas: ${factoryCount}`);

// ─── 5. Chat ──────────────────────────────────────────────────────────────────
const chatsJson = readJson('chats');
let chatCount = 0;

if (chatsJson) {
  const ins = sqldb.prepare(`INSERT OR IGNORE INTO chat_messages(id,channel,player_id,type,data,timestamp) VALUES(?,?,?,?,?,?)`);
  
  sqldb.transaction(() => {
    Object.entries(chatsJson).forEach(([channel, messages]) => {
      (messages||[]).slice(-200).forEach(msg => {
        try {
          ins.run(msg.id, channel, msg.playerId||null, msg.type||'player', s(msg), msg.timestamp||Date.now());
          chatCount++;
        } catch {}
      });
    });
  })();
}
console.log(`✅ Mensajes de chat: ${chatCount}`);

// ─── 6. Transacciones ─────────────────────────────────────────────────────────
const txJson = readAll('transactions');
let txCount = 0;

function readAll(name) {
  const fp = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(fp)) return {};
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return {}; }
}

const txData = readAll('transactions');
if (txData && Object.keys(txData).length > 0) {
  const ins = sqldb.prepare(`INSERT OR IGNORE INTO transactions(id,type,from_id,to_id,from_nickname,to_nickname,amount,fee,currency,resource,description,timestamp) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
  
  sqldb.transaction(() => {
    Object.values(txData).forEach(tx => {
      try {
        ins.run(tx.id,tx.type,tx.fromId||null,tx.toId||null,tx.fromNickname||null,tx.toNickname||null,tx.amount||0,tx.fee||0,tx.currency||'money',tx.resource||null,tx.description||null,tx.timestamp||Date.now());
        txCount++;
      } catch {}
    });
  })();
}
console.log(`✅ Transacciones: ${txCount}`);

// ─── 7. Mercado ───────────────────────────────────────────────────────────────
const marketJson = readAll('market');
let listingCount = 0;

if (marketJson && marketJson.listings) {
  const ins = sqldb.prepare(`INSERT OR IGNORE INTO market_listings(id,seller_id,resource_type,amount,price_per_unit,created_at,expires_at) VALUES(?,?,?,?,?,?,?)`);
  sqldb.transaction(() => {
    (marketJson.listings||[]).forEach(l => {
      try { ins.run(l.id,l.sellerId,l.resourceType,l.amount,l.pricePerUnit,l.createdAt,l.expiresAt); listingCount++; } catch {}
    });
  })();
}
console.log(`✅ Ofertas de mercado: ${listingCount}`);

// ─── 8. Estados ───────────────────────────────────────────────────────────────
const statesJson = readAll('states');
let stateCount = 0;

if (statesJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO states(id,name,data) VALUES(?,?,?)`);
  sqldb.transaction(() => {
    Object.values(statesJson).forEach(st => {
      try { ins.run(st.id, st.name, s(st)); stateCount++; } catch(e) {
        console.warn(`⚠️  Estado ${st.name}:`, e.message);
      }
    });
  })();
}
console.log(`✅ Estados: ${stateCount}`);

// ─── 9. Leyes ─────────────────────────────────────────────────────────────────
const lawsJson = readAll('laws');
let lawCount = 0;

if (lawsJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO laws(id,state_id,status,data) VALUES(?,?,?,?)`);
  sqldb.transaction(() => {
    Object.values(lawsJson).forEach(law => {
      try { ins.run(law.id, law.stateId, law.status||'voting', s(law)); lawCount++; } catch {}
    });
  })();
}
console.log(`✅ Leyes: ${lawCount}`);

// ─── 10. Economía ─────────────────────────────────────────────────────────────
const econJson = readAll('economy');
if (econJson && typeof econJson === 'object') {
  sqldb.prepare(`INSERT INTO economy(id,global_mining,daily_gold_pool,last_distribution,data) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET global_mining=excluded.global_mining,daily_gold_pool=excluded.daily_gold_pool,last_distribution=excluded.last_distribution`).run(econJson.globalMining||0, econJson.dailyGoldPool||1000000, econJson.lastDistribution||null, s(econJson));
}
console.log(`✅ Economía migrada`);

// ─── 11. Pagos y donaciones ───────────────────────────────────────────────────
const paymentsJson = readAll('payments');
let payCount = 0;
if (paymentsJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO payments(id,player_id,status,data) VALUES(?,?,?,?)`);
  sqldb.transaction(() => { Object.values(paymentsJson).forEach(p => { try { ins.run(p.id,p.playerId,p.status||'pending',s(p)); payCount++; } catch {} }); })();
}

const donationsJson = readAll('donations');
let donCount = 0;
if (donationsJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO donations(id,player_id,status,data) VALUES(?,?,?,?)`);
  sqldb.transaction(() => { Object.values(donationsJson).forEach(d => { try { ins.run(d.id,d.playerId,d.status||'pending',s(d)); donCount++; } catch {} }); })();
}
console.log(`✅ Pagos: ${payCount} · Donaciones: ${donCount}`);

// ─── 12. Autowork ─────────────────────────────────────────────────────────────
const awJson = readAll('autowork');
let awCount = 0;
if (awJson) {
  const ins = sqldb.prepare(`INSERT OR REPLACE INTO autowork(player_id,active,data) VALUES(?,?,?)`);
  sqldb.transaction(() => { Object.entries(awJson).forEach(([pid,aw]) => { try { ins.run(pid,aw.active?1:0,s(aw)); awCount++; } catch {} }); })();
}
console.log(`✅ AutoWork: ${awCount}`);

// ─── Resumen ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log('✅ MIGRACIÓN COMPLETADA');
console.log(`📂 Base de datos: ${DB_FILE}`);
console.log(`📊 Tamaño: ${(fs.statSync(DB_FILE).size / 1024).toFixed(1)} KB`);
console.log('═══════════════════════════════════════');
console.log('\nAhora puedes iniciar el servidor:');
console.log('  node backend/server.js\n');

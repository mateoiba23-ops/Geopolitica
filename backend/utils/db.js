'use strict';
// ─── DATABASE LAYER — PostgreSQL ──────────────────────────────────────────────
// Todos los IDs son TEXT.
// Todos los timestamps son BIGINT (epoch ms de Date.now()).
// Sin foreign key constraints — el juego maneja integridad en JS.
// Bootstrap idempotente — nunca duplica datos.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no definida.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', err => console.error('[PG] Pool error:', err.message));

// ─── Query helper ─────────────────────────────────────────────────────────────
async function q(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r;
  } catch (e) {
    console.error('[PG] Query error:', e.message);
    console.error('[PG] SQL:', sql.slice(0, 200));
    throw e;
  }
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────
const j = v => {
  if (v === null || v === undefined) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
};

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Escrituras: cache + PG async. Lecturas: cache first.
const C = {
  players:    {},
  factories:  {},
  regions:    {},
  sessions:   {},
  states:     {},
  laws:       {},
  economy:    null,
  autowork:   {},
  payments:   {},
  donations:  {},
  market:     null,
  parties:    {},
  elections:  {},
  parliaments:{},
  wars:       {}
};

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
async function createSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS players (
      id              TEXT PRIMARY KEY,
      email           TEXT UNIQUE NOT NULL,
      nickname        TEXT UNIQUE NOT NULL,
      nickname_lower  TEXT UNIQUE NOT NULL,
      password        TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'player',
      region_id       TEXT NOT NULL DEFAULT 'bogota',
      state_id        TEXT,
      state_role      TEXT,
      money           DOUBLE PRECISION NOT NULL DEFAULT 1000,
      gold            DOUBLE PRECISION NOT NULL DEFAULT 5,
      energy          DOUBLE PRECISION NOT NULL DEFAULT 100,
      max_energy      DOUBLE PRECISION NOT NULL DEFAULT 100,
      energy_accum    DOUBLE PRECISION NOT NULL DEFAULT 0,
      xp              DOUBLE PRECISION NOT NULL DEFAULT 0,
      level           INTEGER NOT NULL DEFAULT 1,
      xp_to_next      DOUBLE PRECISION NOT NULL DEFAULT 100,
      work_xp         DOUBLE PRECISION NOT NULL DEFAULT 0,
      work_level      INTEGER NOT NULL DEFAULT 1,
      work_xp_to_next DOUBLE PRECISION NOT NULL DEFAULT 100,
      premium         BOOLEAN NOT NULL DEFAULT FALSE,
      premium_until   BIGINT,
      banned          BOOLEAN NOT NULL DEFAULT FALSE,
      ban_reason      TEXT,
      last_seen       BIGINT NOT NULL DEFAULT 0,
      registered_at   BIGINT NOT NULL DEFAULT 0,
      last_energy_regen BIGINT NOT NULL DEFAULT 0,
      data            JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS factories (
      id           TEXT PRIMARY KEY,
      owner_id     TEXT NOT NULL,
      region_id    TEXT NOT NULL,
      type         TEXT NOT NULL,
      name         TEXT NOT NULL,
      level        INTEGER NOT NULL DEFAULT 1,
      xp           DOUBLE PRECISION NOT NULL DEFAULT 0,
      xp_to_next   DOUBLE PRECISION NOT NULL DEFAULT 1000,
      salary       DOUBLE PRECISION NOT NULL DEFAULT 50,
      salary_mode  TEXT NOT NULL DEFAULT 'fixed',
      efficiency   INTEGER NOT NULL DEFAULT 100,
      taxes        INTEGER NOT NULL DEFAULT 10,
      active       BOOLEAN NOT NULL DEFAULT TRUE,
      production   DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at   BIGINT NOT NULL DEFAULT 0,
      data         JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_fac_owner  ON factories(owner_id);
    CREATE INDEX IF NOT EXISTS idx_fac_region ON factories(region_id);

    CREATE TABLE IF NOT EXISTS regions (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      capital        TEXT NOT NULL DEFAULT '',
      population     INTEGER NOT NULL DEFAULT 0,
      medicine       INTEGER NOT NULL DEFAULT 1,
      education      INTEGER NOT NULL DEFAULT 1,
      industrial     INTEGER NOT NULL DEFAULT 1,
      infrastructure INTEGER NOT NULL DEFAULT 1,
      treasury       DOUBLE PRECISION NOT NULL DEFAULT 0,
      data           JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      player_id  TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id        TEXT PRIMARY KEY,
      channel   TEXT NOT NULL,
      player_id TEXT,
      type      TEXT NOT NULL DEFAULT 'player',
      data      JSONB NOT NULL,
      ts        BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat ON chat_messages(channel, ts);

    CREATE TABLE IF NOT EXISTS transactions (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL,
      from_id       TEXT,
      to_id         TEXT,
      from_nickname TEXT,
      to_nickname   TEXT,
      amount        DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee           DOUBLE PRECISION NOT NULL DEFAULT 0,
      currency      TEXT NOT NULL DEFAULT 'money',
      resource      TEXT,
      description   TEXT,
      ts            BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_id, ts);
    CREATE INDEX IF NOT EXISTS idx_tx_to   ON transactions(to_id, ts);

    CREATE TABLE IF NOT EXISTS market_listings (
      id             TEXT PRIMARY KEY,
      seller_id      TEXT NOT NULL,
      resource_type  TEXT NOT NULL,
      amount         DOUBLE PRECISION NOT NULL,
      price_per_unit DOUBLE PRECISION NOT NULL,
      created_at     BIGINT NOT NULL DEFAULT 0,
      expires_at     BIGINT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id            SERIAL PRIMARY KEY,
      resource_type TEXT NOT NULL,
      price         DOUBLE PRECISION NOT NULL,
      ts            BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ph_res ON price_history(resource_type, ts);

    CREATE TABLE IF NOT EXISTS states (
      id   TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS laws (
      id       TEXT PRIMARY KEY,
      state_id TEXT NOT NULL,
      status   TEXT NOT NULL DEFAULT 'voting',
      data     JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_laws_state ON laws(state_id);

    CREATE TABLE IF NOT EXISTS economy (
      id                INTEGER PRIMARY KEY DEFAULT 1,
      global_mining     DOUBLE PRECISION NOT NULL DEFAULT 0,
      daily_gold_pool   DOUBLE PRECISION NOT NULL DEFAULT 1000000,
      last_distribution BIGINT,
      data              JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS payments (
      id        TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      data      JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS donations (
      id        TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      data      JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS autowork (
      player_id TEXT PRIMARY KEY,
      active    BOOLEAN NOT NULL DEFAULT FALSE,
      data      JSONB NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS parties (
      id        TEXT PRIMARY KEY,
      name      TEXT UNIQUE NOT NULL,
      region_id TEXT NOT NULL,
      leader_id TEXT NOT NULL,
      active    BOOLEAN NOT NULL DEFAULT TRUE,
      data      JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_parties_region ON parties(region_id);

    CREATE TABLE IF NOT EXISTS elections (
      id        TEXT PRIMARY KEY,
      region_id TEXT NOT NULL,
      type      TEXT NOT NULL,
      status    TEXT NOT NULL DEFAULT 'pending',
      ends_at   BIGINT NOT NULL DEFAULT 0,
      data      JSONB NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_elections_region ON elections(region_id, type, status);

    CREATE TABLE IF NOT EXISTS parliaments (
      state_id TEXT PRIMARY KEY,
      data     JSONB NOT NULL DEFAULT '{}'
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
  console.log('✅ Schema PostgreSQL verificado');
}

// ─── CACHE LOADER ─────────────────────────────────────────────────────────────
async function loadCache() {
  const [players, factories, regions, sessions, states, laws, eco, aw, pay, don, ml, ph, parties, elections, parliaments, wars_r] = await Promise.all([
    q('SELECT * FROM players'),
    q('SELECT * FROM factories'),
    q('SELECT * FROM regions'),
    q('SELECT * FROM sessions WHERE created_at > $1', [Date.now() - 30*86400000]),
    q('SELECT * FROM states'),
    q('SELECT * FROM laws'),
    q('SELECT * FROM economy WHERE id = 1'),
    q('SELECT * FROM autowork'),
    q('SELECT * FROM payments'),
    q('SELECT * FROM donations'),
    q('SELECT * FROM market_listings ORDER BY created_at DESC'),
    q('SELECT resource_type, price, ts FROM price_history ORDER BY ts DESC LIMIT 500'),
    q('SELECT * FROM parties'),
    q('SELECT * FROM elections ORDER BY ends_at DESC LIMIT 200'),
    q('SELECT * FROM parliaments'),
    q('SELECT * FROM wars WHERE status = $1', ['active'])
  ]);

  players.rows.forEach(r   => { C.players[r.id]      = rowToPlayer(r); });
  factories.rows.forEach(r => { C.factories[r.id]    = rowToFactory(r); });
  regions.rows.forEach(r   => { C.regions[r.id]      = rowToRegion(r); });
  sessions.rows.forEach(r  => { C.sessions[r.token]  = { playerId: r.player_id, createdAt: Number(r.created_at) }; });
  states.rows.forEach(r    => { C.states[r.id]       = { id: r.id, ...j(r.data) }; });
  laws.rows.forEach(r      => { C.laws[r.id]         = { id: r.id, stateId: r.state_id, status: r.status, ...j(r.data) }; });
  aw.rows.forEach(r        => { C.autowork[r.player_id] = { active: !!r.active, ...j(r.data) }; });
  pay.rows.forEach(r       => { C.payments[r.id]     = { id: r.id, playerId: r.player_id, status: r.status, ...j(r.data) }; });
  don.rows.forEach(r       => { C.donations[r.id]    = { id: r.id, playerId: r.player_id, status: r.status, ...j(r.data) }; });

  if (eco.rows[0]) {
    const r = eco.rows[0];
    C.economy = { globalMining: +r.global_mining, dailyGoldPool: +r.daily_gold_pool, lastDistribution: r.last_distribution ? Number(r.last_distribution) : null };
  }

  const priceHistory = {};
  ph.rows.forEach(r => {
    if (!priceHistory[r.resource_type]) priceHistory[r.resource_type] = [];
    priceHistory[r.resource_type].push({ price: +r.price, timestamp: Number(r.ts) });
  });
  parties.rows.forEach(r    => { C.parties[r.id]            = { id:r.id, name:r.name, regionId:r.region_id, leaderId:r.leader_id, active:!!r.active, ...j(r.data) }; });
  elections.rows.forEach(r  => { C.elections[r.id]           = { id:r.id, regionId:r.region_id, type:r.type, status:r.status, endsAt:Number(r.ends_at), ...j(r.data) }; });
  parliaments.rows.forEach(r=> { C.parliaments[r.state_id]   = { stateId:r.state_id, ...j(r.data) }; });
  wars_r.rows.forEach(r     => { C.wars[r.id]                = { id:r.id, attackerStateId:r.attacker_state_id, defenderStateId:r.defender_state_id, status:r.status, startedAt:Number(r.started_at), endedAt:r.ended_at?Number(r.ended_at):null, ...j(r.data) }; });

  C.market = {
    listings: ml.rows.map(r => ({
      id: r.id, sellerId: r.seller_id, resourceType: r.resource_type,
      amount: +r.amount, pricePerUnit: +r.price_per_unit,
      totalPrice: +r.amount * +r.price_per_unit,
      createdAt: Number(r.created_at), expiresAt: Number(r.expires_at)
    })),
    priceHistory,
    lastUpdated: Date.now()
  };

  console.log(`✅ Cache: ${players.rows.length} jugadores, ${factories.rows.length} fábricas, ${regions.rows.length} regiones`);
}

// ─── ROW MAPPERS ──────────────────────────────────────────────────────────────
function rowToPlayer(r) {
  const d = j(r.data);
  return {
    id: r.id, email: r.email, nickname: r.nickname,
    password: r.password, role: r.role,
    regionId: r.region_id, stateId: r.state_id || null, stateRole: r.state_role || null,
    money: +r.money, gold: +r.gold,
    energy: +r.energy, maxEnergy: +r.max_energy, energyAccum: +r.energy_accum,
    xp: +r.xp, level: +r.level, xpToNext: +r.xp_to_next,
    workXp: +r.work_xp, workLevel: +r.work_level, workXpToNext: +r.work_xp_to_next,
    premium: !!r.premium, premiumUntil: r.premium_until ? Number(r.premium_until) : null,
    banned: !!r.banned, banReason: r.ban_reason || null,
    lastSeen: Number(r.last_seen), registeredAt: Number(r.registered_at),
    lastEnergyRegen: Number(r.last_energy_regen),
    skills:        d.skills        || { strength:1, education:1, endurance:1 },
    skillXp:       d.skillXp       || { strength:0, education:0, endurance:0 },
    warehouse:     d.warehouse     || {},
    warehouseLimit:d.warehouseLimit|| 55,
    factories:     d.factories     || [],
    inventory:     d.inventory     || {},
    notifications: (d.notifications || []).slice(0, 100),
    residencies:   d.residencies   || {}
  };
}

function rowToFactory(r) {
  const d = j(r.data);
  return {
    id: r.id, ownerId: r.owner_id, regionId: r.region_id,
    type: r.type, name: r.name,
    level: +r.level, xp: +r.xp, xpToNext: +r.xp_to_next,
    salary: +r.salary, salaryMode: r.salary_mode,
    efficiency: +r.efficiency, taxes: +r.taxes,
    active: !!r.active, production: +r.production, createdAt: Number(r.created_at),
    workers:       d.workers       || [],
    warehouse:     d.warehouse     || {},
    warehouseLimit:d.warehouseLimit|| 100,
    maxWorkers:    d.maxWorkers    || 2
  };
}

function rowToRegion(r) {
  const d = j(r.data);
  return {
    id: r.id, name: r.name, capital: r.capital,
    population: +r.population,
    medicine: +r.medicine, education: +r.education,
    industrial: +r.industrial, infrastructure: +r.infrastructure,
    treasury: +r.treasury,
    taxes:       d.taxes       || { income:10, factory:8 },
    resources:   d.resources   || [],
    description: d.description || '',
    area:        d.area        || 0,
    production:  d.production  || 0
  };
}

// ─── PLAYERS ──────────────────────────────────────────────────────────────────
function getPlayer(id)            { return C.players[id] || null; }
function getAllPlayers()           { return Object.values(C.players); }
function getPlayerByEmail(email)  { const e = (email||'').toLowerCase(); return Object.values(C.players).find(p => p.email === e) || null; }
function getPlayerByNickname(n)   { const nl = (n||'').toLowerCase(); return Object.values(C.players).find(p => p.nickname && p.nickname.toLowerCase() === nl) || null; }

function savePlayer(p) {
  C.players[p.id] = p;
  const d = {
    skills: p.skills, skillXp: p.skillXp,
    warehouse: p.warehouse, warehouseLimit: p.warehouseLimit,
    factories: p.factories, inventory: p.inventory,
    notifications: (p.notifications||[]).slice(0,100),
    residencies: p.residencies || {}
  };
  pool.query(
    `INSERT INTO players(id,email,nickname,nickname_lower,password,role,region_id,state_id,state_role,
      money,gold,energy,max_energy,energy_accum,xp,level,xp_to_next,work_xp,work_level,work_xp_to_next,
      premium,premium_until,banned,ban_reason,last_seen,registered_at,last_energy_regen,data)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
     ON CONFLICT(id) DO UPDATE SET
      email=$2,nickname=$3,nickname_lower=$4,password=$5,role=$6,region_id=$7,state_id=$8,state_role=$9,
      money=$10,gold=$11,energy=$12,max_energy=$13,energy_accum=$14,xp=$15,level=$16,xp_to_next=$17,
      work_xp=$18,work_level=$19,work_xp_to_next=$20,premium=$21,premium_until=$22,banned=$23,
      ban_reason=$24,last_seen=$25,last_energy_regen=$27,data=$28`,
    [ p.id, (p.email||'').toLowerCase(), p.nickname, (p.nickname||'').toLowerCase(),
      p.password, p.role||'player', p.regionId||'bogota', p.stateId||null, p.stateRole||null,
      p.money||0, p.gold||0, p.energy||0, p.maxEnergy||100, p.energyAccum||0,
      p.xp||0, p.level||1, p.xpToNext||100, p.workXp||0, p.workLevel||1, p.workXpToNext||100,
      !!p.premium, p.premiumUntil||null, !!p.banned, p.banReason||null,
      p.lastSeen||Date.now(), p.registeredAt||Date.now(), p.lastEnergyRegen||Date.now(), d ]
  ).catch(e => console.error('[PG] savePlayer:', e.message));
}

// ─── FACTORIES ────────────────────────────────────────────────────────────────
function getFactory(id)                { return C.factories[id] || null; }
function getAllFactories()             { return Object.values(C.factories); }
function getFactoriesByOwner(oid)      { return Object.values(C.factories).filter(f => f.ownerId === oid); }
function getFactoriesByRegion(rid)     { return Object.values(C.factories).filter(f => f.regionId === rid); }

function saveFactory(f) {
  C.factories[f.id] = f;
  const d = { workers: f.workers||[], warehouse: f.warehouse||{}, warehouseLimit: f.warehouseLimit||100, maxWorkers: f.maxWorkers||2 };
  pool.query(
    `INSERT INTO factories(id,owner_id,region_id,type,name,level,xp,xp_to_next,salary,salary_mode,efficiency,taxes,active,production,created_at,data)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT(id) DO UPDATE SET
      name=$4,level=$6,xp=$7,xp_to_next=$8,salary=$9,salary_mode=$10,
      efficiency=$11,taxes=$12,active=$13,production=$14,data=$16`,
    [ f.id, f.ownerId, f.regionId, f.type, f.name,
      f.level||1, f.xp||0, f.xpToNext||1000, f.salary||50, f.salaryMode||'fixed',
      f.efficiency||100, f.taxes||10, !!f.active, f.production||0,
      f.createdAt||Date.now(), d ]
  ).catch(e => console.error('[PG] saveFactory:', e.message));
}

// ─── REGIONS ──────────────────────────────────────────────────────────────────
function getRegion(id)    { return C.regions[id] || null; }
function getAllRegions()   { return Object.values(C.regions); }

function saveRegion(r) {
  C.regions[r.id] = r;
  const d = { taxes: r.taxes, resources: r.resources, description: r.description, area: r.area, production: r.production };
  pool.query(
    `INSERT INTO regions(id,name,capital,population,medicine,education,industrial,infrastructure,treasury,data)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(id) DO UPDATE SET
      name=$2,capital=$3,population=$4,medicine=$5,education=$6,
      industrial=$7,infrastructure=$8,treasury=$9,data=$10`,
    [ r.id, r.name, r.capital||'', r.population||0,
      r.medicine||1, r.education||1, r.industrial||1, r.infrastructure||1,
      r.treasury||0, d ]
  ).catch(e => console.error('[PG] saveRegion:', e.message));
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
function getSession(token)    { return C.sessions[token] || null; }
function getSessions()        { return { ...C.sessions }; }

function saveSession(token, playerId) {
  const now = Date.now();
  C.sessions[token] = { playerId, createdAt: now };
  pool.query(
    `INSERT INTO sessions(token,player_id,created_at) VALUES($1,$2,$3)
     ON CONFLICT(token) DO UPDATE SET player_id=$2, created_at=$3`,
    [token, playerId, now]
  ).catch(e => console.error('[PG] saveSession:', e.message));
}

function deleteSession(token) {
  delete C.sessions[token];
  pool.query('DELETE FROM sessions WHERE token=$1', [token]).catch(() => {});
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
// Chat siempre va directo a PG (no cacheado)
function getChat(_channel) { return []; } // sync stub — usar getChatAsync

async function getChatAsync(channel) {
  const r = await q('SELECT data FROM chat_messages WHERE channel=$1 ORDER BY ts ASC LIMIT 200', [channel]);
  return r.rows.map(row => j(row.data));
}

function addChatMessage(channel, msg) {
  pool.query(
    `INSERT INTO chat_messages(id,channel,player_id,type,data,ts)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
    [msg.id, channel, msg.playerId||null, msg.type||'player', msg, msg.timestamp||Date.now()]
  ).catch(e => console.error('[PG] addChatMessage:', e.message));

  // Limpieza async
  pool.query(
    `DELETE FROM chat_messages WHERE channel=$1 AND id NOT IN
     (SELECT id FROM chat_messages WHERE channel=$1 ORDER BY ts DESC LIMIT 200)`,
    [channel]
  ).catch(() => {});
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function addTransaction(tx) {
  pool.query(
    `INSERT INTO transactions(id,type,from_id,to_id,from_nickname,to_nickname,amount,fee,currency,resource,description,ts)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING`,
    [ tx.id, tx.type, tx.fromId||null, tx.toId||null,
      tx.fromNickname||null, tx.toNickname||null,
      tx.amount||0, tx.fee||0, tx.currency||'money',
      tx.resource||null, tx.description||null, tx.timestamp||Date.now() ]
  ).catch(e => console.error('[PG] addTransaction:', e.message));
}

async function getPlayerTransactionsAsync(playerId, limit = 50) {
  const r = await q(
    'SELECT * FROM transactions WHERE from_id=$1 OR to_id=$1 ORDER BY ts DESC LIMIT $2',
    [playerId, limit]
  );
  return r.rows.map(row => ({
    id: row.id, type: row.type,
    fromId: row.from_id, toId: row.to_id,
    fromNickname: row.from_nickname, toNickname: row.to_nickname,
    amount: +row.amount, fee: +row.fee,
    currency: row.currency, resource: row.resource,
    description: row.description, timestamp: Number(row.ts)
  }));
}

function getPlayerTransactions(playerId, limit = 50) { return []; }
function getTransactions() { return {}; }
function saveTransactions() {}

// ─── MARKET ───────────────────────────────────────────────────────────────────
function getMarket()        { return C.market || { listings:[], priceHistory:{}, lastUpdated: Date.now() }; }

function saveMarket(market) {
  C.market = market;
  pool.query('DELETE FROM market_listings').then(() =>
    Promise.all((market.listings||[]).map(l =>
      pool.query(
        `INSERT INTO market_listings(id,seller_id,resource_type,amount,price_per_unit,created_at,expires_at)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
        [l.id, l.sellerId, l.resourceType, l.amount, l.pricePerUnit, l.createdAt||0, l.expiresAt||0]
      )
    ))
  ).catch(e => console.error('[PG] saveMarket:', e.message));
}

function addPriceHistory(resourceType, price) {
  pool.query('INSERT INTO price_history(resource_type,price,ts) VALUES($1,$2,$3)', [resourceType, price, Date.now()])
    .catch(() => {});
}

// ─── ECONOMY ──────────────────────────────────────────────────────────────────
function getEconomy()       { return C.economy || { globalMining:0, dailyGoldPool:1000000, lastDistribution:null }; }

function saveEconomy(e) {
  C.economy = e;
  pool.query(
    `INSERT INTO economy(id,global_mining,daily_gold_pool,last_distribution,data)
     VALUES(1,$1,$2,$3,$4)
     ON CONFLICT(id) DO UPDATE SET global_mining=$1,daily_gold_pool=$2,last_distribution=$3,data=$4`,
    [e.globalMining||0, e.dailyGoldPool||1000000, e.lastDistribution||null, e]
  ).catch(e2 => console.error('[PG] saveEconomy:', e2.message));
}

// ─── STATES ───────────────────────────────────────────────────────────────────
function getState(id)       { return C.states[id] || null; }
function getAllStates()      { return Object.values(C.states); }
function getStateByName(n)  { const nl=(n||'').toLowerCase(); return Object.values(C.states).find(s => s.name && s.name.toLowerCase()===nl)||null; }

function saveState(state) {
  C.states[state.id] = state;
  pool.query(
    `INSERT INTO states(id,name,data) VALUES($1,$2,$3)
     ON CONFLICT(id) DO UPDATE SET name=$2,data=$3`,
    [state.id, state.name, state]
  ).catch(e => console.error('[PG] saveState:', e.message));
}

// ─── LAWS ─────────────────────────────────────────────────────────────────────
function getLaw(id)         { return C.laws[id] || null; }
function getAllLaws()        { return Object.values(C.laws); }

function saveLaw(law) {
  C.laws[law.id] = law;
  pool.query(
    `INSERT INTO laws(id,state_id,status,data) VALUES($1,$2,$3,$4)
     ON CONFLICT(id) DO UPDATE SET state_id=$2,status=$3,data=$4`,
    [law.id, law.stateId, law.status, law]
  ).catch(e => console.error('[PG] saveLaw:', e.message));
}

// ─── PAYMENTS / DONATIONS ─────────────────────────────────────────────────────
function readAll(name) {
  if (name==='payments')    return { ...C.payments };
  if (name==='donations')   return { ...C.donations };
  if (name==='wars')        return { ...C.wars };
  if (name==='parties')     return { ...C.parties };
  if (name==='elections')   return { ...C.elections };
  if (name==='parliaments') return { ...C.parliaments };
  return {};
}

function write(name, data) {
  if (name==='wars') {
    Object.assign(C.wars, data);
    Object.values(data).forEach(w => saveWar(w));
    return;
  }
  if (name==='parties') {
    Object.assign(C.parties, data);
    Object.values(data).forEach(p => saveParty(p));
    return;
  }
  if (name==='elections') {
    Object.assign(C.elections, data);
    Object.values(data).forEach(e => saveElection(e));
    return;
  }
  if (name==='parliaments') {
    Object.assign(C.parliaments, data);
    Object.values(data).forEach(p => saveParliament(p));
    return;
  }
  if (name==='payments') {
    C.payments = data;
    Object.values(data).forEach(p =>
      pool.query(
        `INSERT INTO payments(id,player_id,status,data) VALUES($1,$2,$3,$4)
         ON CONFLICT(id) DO UPDATE SET status=$3,data=$4`,
        [p.id, p.playerId, p.status, p]
      ).catch(() => {})
    );
  }
  if (name==='donations') {
    C.donations = data;
    Object.values(data).forEach(d =>
      pool.query(
        `INSERT INTO donations(id,player_id,status,data) VALUES($1,$2,$3,$4)
         ON CONFLICT(id) DO UPDATE SET status=$3,data=$4`,
        [d.id, d.playerId, d.status, d]
      ).catch(() => {})
    );
  }
}

// ─── AUTOWORK ─────────────────────────────────────────────────────────────────
function getAutowork()              { return { ...C.autowork }; }
function saveAutowork()             {}
function getAutoworkByPlayer(pid)   { return C.autowork[pid] || null; }

function setAutowork(pid, data) {
  if (data === null) {
    delete C.autowork[pid];
    pool.query('DELETE FROM autowork WHERE player_id=$1', [pid]).catch(() => {});
    return;
  }
  C.autowork[pid] = data;
  pool.query(
    `INSERT INTO autowork(player_id,active,data) VALUES($1,$2,$3)
     ON CONFLICT(player_id) DO UPDATE SET active=$2,data=$3`,
    [pid, !!data.active, data]
  ).catch(e => console.error('[PG] setAutowork:', e.message));
}

// ─── WARS ────────────────────────────────────────────────────────────────────
function getWar(id)      { return C.wars[id] || null; }
function getAllWars()     { return Object.values(C.wars); }

function saveWar(war) {
  C.wars[war.id] = war;
  pool.query(
    `INSERT INTO wars(id,attacker_state_id,defender_state_id,status,started_at,ended_at,data)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(id) DO UPDATE SET status=$4,ended_at=$6,data=$7`,
    [war.id, war.attackerStateId, war.defenderStateId, war.status,
     war.startedAt||Date.now(), war.endedAt||null, war]
  ).catch(e => console.error('[PG] saveWar:', e.message));
}

// ─── PARTIES ──────────────────────────────────────────────────────────────────
function getPartyById(id)       { return C.parties[id] || null; }
function getAllParties()         { return Object.values(C.parties); }
function getPartiesByRegion(rid){ return Object.values(C.parties).filter(p => p.regionId === rid); }

function saveParty(party) {
  C.parties[party.id] = party;
  pool.query(
    `INSERT INTO parties(id,name,region_id,leader_id,active,data) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(id) DO UPDATE SET name=$2,leader_id=$4,active=$5,data=$6`,
    [party.id, party.name, party.regionId, party.leaderId, !!party.active, party]
  ).catch(e => console.error('[PG] saveParty:', e.message));
}

// ─── ELECTIONS ────────────────────────────────────────────────────────────────
function getElectionById(id)  { return C.elections[id] || null; }
function getAllElections()     { return Object.values(C.elections); }

function saveElection(election) {
  C.elections[election.id] = election;
  pool.query(
    `INSERT INTO elections(id,region_id,type,status,ends_at,data) VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(id) DO UPDATE SET status=$4,ends_at=$5,data=$6`,
    [election.id, election.regionId, election.type, election.status, election.endsAt||0, election]
  ).catch(e => console.error('[PG] saveElection:', e.message));
}

// ─── PARLIAMENTS ──────────────────────────────────────────────────────────────
function getParliamentByState(stateId) { return C.parliaments[stateId] || null; }

function saveParliament(parliament) {
  C.parliaments[parliament.stateId] = parliament;
  pool.query(
    `INSERT INTO parliaments(state_id,data) VALUES($1,$2)
     ON CONFLICT(state_id) DO UPDATE SET data=$2`,
    [parliament.stateId, parliament]
  ).catch(e => console.error('[PG] saveParliament:', e.message));
}

// ─── COMPAT read/write (para admin.js payments/donations) ────────────────────

// ─── INIT — IDEMPOTENTE ───────────────────────────────────────────────────────
async function initData() {
  // 1. Schema
  await createSchema();

  // 2. Cache
  await loadCache();

  // 3. Regiones — solo si la tabla está vacía
  if (Object.keys(C.regions).length === 0) {
    const { COLOMBIA_REGIONS } = require('./regions_data');
    for (const r of COLOMBIA_REGIONS) {
      await q(
        `INSERT INTO regions(id,name,capital,population,medicine,education,industrial,infrastructure,treasury,data)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO NOTHING`,
        [ r.id, r.name, r.capital||'', r.population||0,
          r.medicine||1, r.education||1, r.industrial||1, r.infrastructure||1, 0,
          { taxes: r.taxes, resources: r.resources, description: r.description, area: r.area } ]
      );
      C.regions[r.id] = rowToRegion({ ...r, capital: r.capital||'', population: r.population||0, medicine: r.medicine||1, education: r.education||1, industrial: r.industrial||1, infrastructure: r.infrastructure||1, treasury: 0, data: { taxes:r.taxes, resources:r.resources, description:r.description } });
    }
    console.log(`✅ Regiones inicializadas: ${COLOMBIA_REGIONS.length}`);
  }

  // 4. Economía — solo si no existe
  if (!C.economy) {
    await q(`INSERT INTO economy(id,global_mining,daily_gold_pool,data) VALUES(1,0,1000000,'{}') ON CONFLICT(id) DO NOTHING`);
    C.economy = { globalMining:0, dailyGoldPool:1000000, lastDistribution:null };
  }

  // 5. Admin — solo si no existe ningún admin
  const hasAdmin = Object.values(C.players).some(p => p.role === 'admin');
  if (!hasAdmin) {
    const { createAdminAccount } = require('./admin_init');
    await createAdminAccount();
  }

  // 6. Limpieza de sesiones viejas
  await q('DELETE FROM sessions WHERE created_at < $1', [Date.now() - 30*86400000]).catch(() => {});

  console.log('✅ PostgreSQL lista');
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
module.exports = {
  // compat
  read: readAll, write, readAll,
  // players
  getPlayer, savePlayer, getPlayerByEmail, getPlayerByNickname, getAllPlayers,
  // factories
  getFactory, saveFactory, getAllFactories, getFactoriesByOwner, getFactoriesByRegion,
  // regions
  getRegion, saveRegion, getAllRegions,
  // market
  getMarket, saveMarket, addPriceHistory,
  // chat
  getChat, addChatMessage, getChatAsync,
  // economy
  getEconomy, saveEconomy,
  // sessions
  getSessions, saveSession, getSession, deleteSession,
  // transactions
  getTransactions, saveTransactions, addTransaction,
  getPlayerTransactions, getPlayerTransactionsAsync,
  // states
  getState, getAllStates, getStateByName, saveState,
  // laws
  getLaw, getAllLaws, saveLaw,
  // autowork
  getAutowork, saveAutowork, getAutoworkByPlayer, setAutowork,
  // wars
  getWar, getAllWars, saveWar,
  // parties/elections/parliaments
  getPartyById, getAllParties, getPartiesByRegion, saveParty,
  getElectionById, getAllElections, saveElection,
  getParliamentByState, saveParliament,
  // init
  initData,
  // raw pool para migrate
  pool, q
};

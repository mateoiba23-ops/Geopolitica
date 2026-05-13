const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data');

// ─── File helpers ─────────────────────────────────────────────────────────────

function filePath(name) { return path.join(DB_PATH, `${name}.json`); }

function read(name) {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return null; }
}

function write(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

function readAll(name) { return read(name) || {}; }

// ─── Player ───────────────────────────────────────────────────────────────────

function getPlayer(id)         { return readAll('players')[id] || null; }
function getAllPlayers()        { return Object.values(readAll('players')); }
function getPlayerByEmail(e)   { return getAllPlayers().find(p => p.email === e.toLowerCase()) || null; }
function getPlayerByNickname(n){ return getAllPlayers().find(p => p.nickname.toLowerCase() === n.toLowerCase()) || null; }

function savePlayer(player) {
  const players = readAll('players');
  players[player.id] = player;
  write('players', players);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function getFactory(id)              { return readAll('factories')[id] || null; }
function getAllFactories()            { return Object.values(readAll('factories')); }
function getFactoriesByOwner(ownerId){ return getAllFactories().filter(f => f.ownerId === ownerId); }
function getFactoriesByRegion(rid)   { return getAllFactories().filter(f => f.regionId === rid); }

function saveFactory(factory) {
  const factories = readAll('factories');
  factories[factory.id] = factory;
  write('factories', factories);
}

// ─── Region ───────────────────────────────────────────────────────────────────

function getRegion(id)  { return readAll('regions')[id] || null; }
function getAllRegions() { return Object.values(readAll('regions')); }

function saveRegion(region) {
  const regions = readAll('regions');
  regions[region.id] = region;
  write('regions', regions);
}

// ─── Market ───────────────────────────────────────────────────────────────────

function getMarket()        { return readAll('market'); }
function saveMarket(market) { write('market', market); }

// ─── Chat ─────────────────────────────────────────────────────────────────────

function getChat(channel) {
  return (readAll('chats')[channel]) || [];
}

function addChatMessage(channel, message) {
  const chats = readAll('chats');
  if (!chats[channel]) chats[channel] = [];
  chats[channel].push(message);
  if (chats[channel].length > 200) chats[channel] = chats[channel].slice(-200);
  write('chats', chats);
}

// ─── Economy ──────────────────────────────────────────────────────────────────

function getEconomy()          { return readAll('economy'); }
function saveEconomy(economy)  { write('economy', economy); }

// ─── Sessions ─────────────────────────────────────────────────────────────────

function getSessions()              { return readAll('sessions'); }
function getSession(token)          { return getSessions()[token] || null; }
function deleteSession(token)       { const s = getSessions(); delete s[token]; write('sessions', s); }

function saveSession(token, playerId) {
  const s = getSessions();
  s[token] = { playerId, createdAt: Date.now() };
  write('sessions', s);
}

// ─── Transactions ─────────────────────────────────────────────────────────────
// Cada transacción:
// { id, type, fromId, toId, fromNickname, toNickname,
//   amount, currency, resource, description, timestamp }
//
// Types: transfer_money | transfer_resource | salary | market_buy |
//        market_sell | tax | mining_reward | admin_gift | premium |
//        factory_created | skill_train

function getTransactions()            { return readAll('transactions'); }
function saveTransactions(txs)        { write('transactions', txs); }

function addTransaction(tx) {
  const txs = getTransactions();
  txs[tx.id] = tx;
  // Mantener máx 10000 transacciones globales
  const keys = Object.keys(txs);
  if (keys.length > 10000) {
    const sorted = keys.sort((a, b) => txs[a].timestamp - txs[b].timestamp);
    sorted.slice(0, keys.length - 10000).forEach(k => delete txs[k]);
  }
  write('transactions', txs);
}

function getPlayerTransactions(playerId, limit = 50) {
  const txs = getTransactions();
  return Object.values(txs)
    .filter(tx => tx.fromId === playerId || tx.toId === playerId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── States ──────────────────────────────────────────────────────────────────
function getState(id)   { return readAll('states')[id] || null; }
function getAllStates()  { return Object.values(readAll('states')); }
function getStateByName(name) {
  return getAllStates().find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
}
function saveState(state) {
  const states = readAll('states');
  states[state.id] = state;
  write('states', states);
}

// ─── Laws ─────────────────────────────────────────────────────────────────────
function getLaw(id)    { return readAll('laws')[id] || null; }
function getAllLaws()   { return Object.values(readAll('laws')); }
function saveLaw(law)  { const laws = readAll('laws'); laws[law.id] = law; write('laws', laws); }

// ─── AutoWork ────────────────────────────────────────────────────────────────
function getAutowork()         { return readAll('autowork'); }
function saveAutowork(aw)      { write('autowork', aw); }

function getAutoworkByPlayer(playerId) {
  return getAutowork()[playerId] || null;
}

function setAutowork(playerId, data) {
  const aw = getAutowork();
  if (data === null) {
    delete aw[playerId];
  } else {
    aw[playerId] = data;
  }
  write('autowork', aw);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initData() {
  const files = [
    'players','factories','regions','market',
    'chats','economy','sessions','payments',
    'donations','transactions','states','laws','autowork'
  ];
  files.forEach(name => {
    if (!fs.existsSync(filePath(name))) write(name, {});
  });

  // Regiones
  const regions = readAll('regions');
  if (Object.keys(regions).length === 0) {
    const { COLOMBIA_REGIONS } = require('./regions_data');
    COLOMBIA_REGIONS.forEach(r => { regions[r.id] = r; });
    write('regions', regions);
    console.log(`✅ Regiones inicializadas: ${Object.keys(regions).length}`);
  }

  // Economía
  const economy = readAll('economy');
  if (!economy.globalMining && economy.globalMining !== 0) {
    write('economy', {
      globalMining: 0, dailyGoldPool: 1000000,
      lastDistribution: null, totalMoneySupply: 0
    });
  }

  // Mercado
  const market = readAll('market');
  if (!market.listings) {
    write('market', { listings: [], priceHistory: {}, lastUpdated: Date.now() });
  }

  // Admin
  const players = readAll('players');
  if (!Object.values(players).find(p => p.role === 'admin')) {
    require('./admin_init').createAdminAccount();
  }
}

module.exports = {
  read, write, readAll,
  getPlayer, savePlayer, getPlayerByEmail, getPlayerByNickname, getAllPlayers,
  getFactory, saveFactory, getAllFactories, getFactoriesByOwner, getFactoriesByRegion,
  getRegion, saveRegion, getAllRegions,
  getMarket, saveMarket,
  getChat, addChatMessage,
  getEconomy, saveEconomy,
  getSessions, saveSession, getSession, deleteSession,
  getTransactions, saveTransactions, addTransaction, getPlayerTransactions,
  getState, getAllStates, getStateByName, saveState,
  getLaw, getAllLaws, saveLaw,
  getAutowork, saveAutowork, getAutoworkByPlayer, setAutowork,
  initData
};

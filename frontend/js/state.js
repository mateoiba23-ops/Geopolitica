// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
const STATE = {
  player: null,
  regions: [],
  currentPanel: 'home',
  chatChannel: 'global',
  chatPolling: null,
  playerPolling: null,

  set(key, val) { this[key] = val; },
  get(key) { return this[key]; }
};

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
const Storage = {
  setToken(token) { localStorage.setItem('geo_token', token); },
  getToken() { return localStorage.getItem('geo_token'); },
  clearToken() { localStorage.removeItem('geo_token'); },
  setPlayer(player) { localStorage.setItem('geo_player', JSON.stringify(player)); },
  getPlayer() {
    try { return JSON.parse(localStorage.getItem('geo_player')); }
    catch { return null; }
  },
  clearPlayer() { localStorage.removeItem('geo_player'); }
};

// ─── STATE HELPERS ────────────────────────────────────────────────────────────
function updatePlayerState(player) {
  STATE.player = player;
  Storage.setPlayer(player);
  updateHUD(player);
}

function updateHUD(player) {
  if (!player) return;
  const energyVal = document.getElementById('hud-energy-val');
  const energyMax = document.getElementById('hud-energy-max');
  const moneyVal = document.getElementById('hud-money-val');
  const goldVal = document.getElementById('hud-gold-val');
  const nickname = document.getElementById('hud-nickname');
  const level = document.getElementById('hud-level');

  if (energyVal) energyVal.textContent = Math.floor(player.energy);
  if (energyMax) energyMax.textContent = player.maxEnergy || 100;
  if (moneyVal) moneyVal.textContent = formatMoney(player.money);
  if (goldVal) goldVal.textContent = player.gold;
  if (nickname) nickname.textContent = player.nickname;
  if (level) level.textContent = `Nv.${player.level}`;

  // Notification badge
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn && player.notifications) {
    const unread = player.notifications.filter(n => !n.read).length;
    notifBtn.textContent = unread > 0 ? `🔔${unread}` : '🔔';
  }
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function formatMoney(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function formatNumber(n) {
  return new Intl.NumberFormat('es-CO').format(Math.floor(n));
}

function formatTime(ts) {
  if (!ts) return 'Nunca';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString('es-CO');
}

function getResourceIcon(type) {
  const icons = {
    gold: '⚱️', oil: '🛢️', mineral: '⛏️', uranium: '☢️', diamond: '💎',
    rubber: '🌱', wood: '🪵', fish: '🐟', coffee: '☕', flowers: '🌺',
    coal: '⚫', cattle: '🐄', platinum: '⬜', sugarcane: '🌾',
    emeralds: '💚', iron: '🔩', gas: '💨', tourism: '🏖️'
  };
  return icons[type] || '📦';
}

function getSkillIcon(skill) {
  return { strength: '⚔️', education: '📚', endurance: '🛡️' }[skill] || '⭐';
}

function getRegionIndicatorColor(val) {
  if (val >= 8) return '#00e676';
  if (val >= 6) return '#00d4ff';
  if (val >= 4) return '#ffca28';
  if (val >= 2) return '#ff9800';
  return '#ff3d57';
}

function startPlayerPolling() {
  if (STATE.playerPolling) clearInterval(STATE.playerPolling);
  STATE.playerPolling = setInterval(async () => {
    if (!API.token) return;
    try {
      const data = await API.getProfile();
      if (data.player) updatePlayerState(data.player);
    } catch {}
  }, 30000); // Every 30 seconds
}


// ─── THEME SYSTEM ─────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('geo_theme') || 'modern';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('geo_theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'modern' ? '🎨' : '✨';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'modern';
  const next    = current === 'modern' ? 'classic' : 'modern';
  applyTheme(next);
  showToast(next === 'classic' ? '🏛️ Tema Clásico activado' : '✨ Tema Moderno activado', '');
}

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'modern';
}

// ─── APP BOOTSTRAP ────────────────────────────────────────────────────────────

async function init() {
  initTheme(); // Aplicar tema guardado
  // Cargar regiones para el formulario de registro (endpoint público)
  loadRegionsForRegister();

  // Intentar restaurar sesión
  const token = Storage.getToken();
  if (token) {
    API.token = token;
    try {
      const data = await API.getMe();
      if (data.player) {
        await startGame(data.player);
        return;
      }
    } catch {}
    Storage.clearToken();
    API.token = null;
  }

  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('game-screen').classList.remove('active');
}

async function loadRegionsForRegister() {
  const regionSelect = document.getElementById('reg-region');
  if (!regionSelect) return;

  try {
    const r    = await fetch('/api/region/all');
    const data = await r.json();

    if (data.regions && data.regions.length > 0) {
      regionSelect.innerHTML = data.regions
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => `<option value="${r.id}">${r.name}</option>`)
        .join('');
      return;
    }
  } catch {}

  // Fallback estático si el fetch falla
  const fallback = [
    ['amazonas','Amazonas'],['antioquia','Antioquia'],['arauca','Arauca'],
    ['atlantico','Atlántico'],['bogota','Bogotá D.C.'],['bolivar','Bolívar'],
    ['boyaca','Boyacá'],['caldas','Caldas'],['caqueta','Caquetá'],
    ['casanare','Casanare'],['cauca','Cauca'],['cesar','Cesar'],
    ['choco','Chocó'],['cordoba','Córdoba'],['cundinamarca','Cundinamarca'],
    ['guainia','Guainía'],['guaviare','Guaviare'],['huila','Huila'],
    ['laguajira','La Guajira'],['magdalena','Magdalena'],['meta','Meta'],
    ['narino','Nariño'],['norte_santander','Norte de Santander'],
    ['putumayo','Putumayo'],['quindio','Quindío'],['risaralda','Risaralda'],
    ['san_andres','San Andrés y Providencia'],['santander','Santander'],
    ['sucre','Sucre'],['tolima','Tolima'],['valle_cauca','Valle del Cauca'],
    ['vaupes','Vaupés'],['vichada','Vichada']
  ];
  regionSelect.innerHTML = fallback.map(([id, name]) =>
    `<option value="${id}">${name}</option>`
  ).join('');
}

async function startGame(player) {
  updatePlayerState(player);

  // Cargar regiones en el estado global
  try {
    const data = await API.getAllRegions();
    if (data.regions) STATE.regions = data.regions;
  } catch {}

  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('game-screen').classList.add('active');

  // Mostrar botón admin si corresponde
  const adminBtn = document.getElementById('admin-nav-btn');
  if (adminBtn && player.role === 'admin') {
    adminBtn.classList.remove('hidden');
  }

  navigate('home');
  startPlayerPolling();
}

// ─── AUTH ACTIONS ─────────────────────────────────────────────────────────────

async function doLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) return showAuthError('Completa todos los campos');

  const btn = document.querySelector('#login-form .btn-primary');
  setButtonLoading(btn, true);

  try {
    const data = await API.login(email, password);
    if (data.error) {
      setButtonLoading(btn, false);
      return showAuthError(data.error);
    }
    API.token = data.token;
    Storage.setToken(data.token);
    await startGame(data.player);
  } catch {
    setButtonLoading(btn, false);
    showAuthError('Error de conexión. ¿Está corriendo el servidor?');
  }
}

async function doRegister() {
  const nickname = document.getElementById('reg-nickname').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const regionId = document.getElementById('reg-region').value;

  if (!nickname || !email || !password || !regionId) {
    return showAuthError('Completa todos los campos');
  }

  const btn = document.querySelector('#register-form .btn-primary');
  setButtonLoading(btn, true);

  try {
    const data = await API.register({ nickname, email, password, regionId });
    if (data.error) {
      setButtonLoading(btn, false);
      return showAuthError(data.error);
    }
    API.token = data.token;
    Storage.setToken(data.token);
    await startGame(data.player);
    showToast(`🌟 ¡Bienvenido a Geopolítica, ${nickname}!`, 'success', 4000);
  } catch {
    setButtonLoading(btn, false);
    showAuthError('Error de conexión. ¿Está corriendo el servidor?');
  }
}

// ─── TECLADO ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter') {
    const loginForm = document.getElementById('login-form');
    if (loginForm && loginForm.classList.contains('active')) doLogin();
  }
});

// ─── INICIO ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { initTheme(); init(); });

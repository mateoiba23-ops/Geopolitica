// ─── TOAST ────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '', duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function navigate(panel) {
  STATE.currentPanel = panel;

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === panel);
  });

  // Stop chat polling if leaving chat
  if (panel !== 'chat' && STATE.chatPolling) {
    clearInterval(STATE.chatPolling);
    STATE.chatPolling = null;
  }

  // Render panel
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando...</div>';

  const panels = {
    home:         renderHome,
    map:          renderMap,
    profile:      renderProfile,
    factories:    renderFactories,
    work:         renderWork,
    market:       renderMarket,
    chat:         renderChat,
    notifications: renderNotifications,
    economy:      renderEconomy,
    warehouse:    renderWarehouse,
    store:        renderStore,
    admin:        renderAdmin,
    transactions: renderTransactions,
    politics:     renderPolitics,
    rankings:     renderRankings
  };

  if (panels[panel]) {
    setTimeout(() => panels[panel](), 50);
  } else {
    content.innerHTML = `<div class="panel"><div class="empty">Panel en construcción 🚧</div></div>`;
  }
}

// ─── AUTH SWITCHING ───────────────────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('login-form').classList.toggle('active', tab === 'login');
  document.getElementById('register-form').classList.toggle('active', tab === 'register');
  document.getElementById('auth-error').classList.add('hidden');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── STAT BAR HELPER ─────────────────────────────────────────────────────────
function statBar(label, val, max, cssClass = 'generic', showNum = true) {
  const pct = Math.min((val / max) * 100, 100);
  return `
    <div class="stat-bar-wrap">
      <div class="stat-bar-label">
        <span>${label}</span>
        ${showNum ? `<span>${val} / ${max}</span>` : `<span>${pct.toFixed(0)}%</span>`}
      </div>
      <div class="stat-bar-track">
        <div class="stat-bar-fill ${cssClass}" style="width:${pct}%"></div>
      </div>
    </div>`;
}

// ─── REGION NAME HELPER ───────────────────────────────────────────────────────
function getRegionName(id) {
  const r = STATE.regions.find(r => r.id === id);
  return r ? r.name : id;
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────
function confirmAction(title, body, onConfirm) {
  openModal(`
    <h3 style="font-family:var(--font-display);font-size:18px;margin-bottom:10px;color:var(--warning)">${title}</h3>
    <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">${body}</p>
    <div style="display:flex;gap:10px">
      <button class="btn-ghost btn-full" onclick="closeModal()">CANCELAR</button>
      <button class="btn-danger btn-full" onclick="closeModal();(${onConfirm.toString()})()">CONFIRMAR</button>
    </div>
  `);
}

// ─── LOADING STATE ────────────────────────────────────────────────────────────
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = '⏳';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
    btn.disabled = false;
  }
}

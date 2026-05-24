// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

async function renderAdmin() {
  const content = document.getElementById('game-content');
  const p = STATE.player;

  if (p.role !== 'admin') {
    content.innerHTML = `<div class="panel"><div class="empty">⛔ Acceso denegado</div></div>`;
    return;
  }

  content.innerHTML = '<div class="loading">⏳ Cargando panel admin...</div>';

  try {
    const data = await API.get('/admin/stats');
    const s = data;

    const uptimeMin = Math.floor(s.serverUptime / 60);
    const uptimeHr = Math.floor(uptimeMin / 60);

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">👑 <span>PANEL ADMIN</span></div>

        <!-- Server stats grid -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px">
          ${[
            { label: 'JUGADORES', val: s.players, icon: '👥', color: 'var(--accent)' },
            { label: 'ACTIVOS 24H', val: s.activePlayers24h, icon: '🟢', color: 'var(--success)' },
            { label: 'PREMIUM', val: s.premiumPlayers, icon: '⭐', color: 'var(--gold)' },
            { label: 'BANEADOS', val: s.bannedPlayers, icon: '🔨', color: 'var(--danger)' },
            { label: 'FÁBRICAS', val: s.factories, icon: '🏭', color: 'var(--accent)' },
            { label: 'INGRESOS USD', val: '$' + (s.totalRevenue || 0).toFixed(2), icon: '💵', color: 'var(--money)' },
            { label: 'DONACIONES', val: '$' + (s.totalDonated || 0).toFixed(2), icon: '💛', color: 'var(--gold)' },
            { label: 'UPTIME', val: uptimeHr + 'h ' + (uptimeMin % 60) + 'm', icon: '⏱️', color: 'var(--text-secondary)' }
          ].map(s => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center">
              <div style="font-size:20px">${s.icon}</div>
              <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:${s.color};margin:4px 0">${s.val}</div>
              <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">${s.label}</div>
            </div>`).join('')}
        </div>

        <!-- Pending alerts -->
        ${(s.pendingPayments > 0 || s.pendingDonations > 0) ? `
          <div style="background:rgba(255,202,40,0.08);border:1px solid rgba(255,202,40,0.3);border-radius:12px;padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:10px;cursor:pointer" onclick="renderAdminSection('payments')">
            <div style="font-size:24px">⚠️</div>
            <div>
              <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--warning)">PAGOS PENDIENTES</div>
              <div style="font-size:12px;color:var(--text-secondary)">${s.pendingPayments} compras · ${s.pendingDonations} donaciones por verificar</div>
            </div>
            <div style="margin-left:auto;font-size:18px;color:var(--warning)">›</div>
          </div>` : ''}

        <!-- Admin sections menu -->
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            { id: 'players', icon: '👥', label: 'GESTIONAR JUGADORES', desc: 'Banear, dar recursos, cambiar nivel' },
            { id: 'payments', icon: '💳', label: 'PAGOS Y COMPRAS', desc: 'Verificar y aprobar pagos Binance' },
            { id: 'donations', icon: '💛', label: 'DONACIONES', desc: 'Verificar y aprobar donaciones' },
            { id: 'regions', icon: '🗺️', label: 'EDITAR REGIONES', desc: 'Medicina, educación, impuestos...' },
            { id: 'factories', icon: '🏭', label: 'CREAR FÁBRICAS', desc: 'Construir fábricas del admin' },
            { id: 'broadcast', icon: '📢', label: 'MENSAJE GLOBAL', desc: 'Enviar anuncio al chat global' },
            { id: 'economy', icon: '⚱️', label: 'ECONOMÍA', desc: 'Distribuir oro manualmente' }
          ].map(sec => `
            <button style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;text-align:left;width:100%;transition:0.18s ease"
                    onclick="renderAdminSection('${sec.id}')"
                    onmousedown="this.style.borderColor='var(--accent)'" onmouseup="this.style.borderColor='var(--border)'" ontouchstart="this.style.borderColor='var(--accent)'" ontouchend="this.style.borderColor='var(--border)'">
              <div style="font-size:26px;flex-shrink:0">${sec.icon}</div>
              <div>
                <div style="font-family:var(--font-display);font-size:14px;font-weight:700;letter-spacing:1px">${sec.label}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${sec.desc}</div>
              </div>
              <div style="margin-left:auto;color:var(--text-dim);font-size:20px">›</div>
            </button>`).join('')}
        </div>
      </div>`;
  } catch {
    content.innerHTML = `<div class="panel"><div class="empty">Error cargando panel admin</div></div>`;
  }
}

async function renderAdminSection(section) {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando...</div>';

  const backBtn = `<button class="btn-ghost btn-sm" style="margin-bottom:14px" onclick="renderAdmin()">← VOLVER</button>`;

  switch (section) {

    case 'players': {
      const data = await API.get('/admin/players');
      const players = data.players || [];
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">👥 <span>JUGADORES</span></div>
          <div style="margin-bottom:12px">
            <input type="text" id="player-search" placeholder="🔍 Buscar nickname..."
              style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:20px;color:var(--text-primary);padding:10px 16px;font-size:14px;outline:none"
              oninput="filterAdminPlayers()">
          </div>
          <div id="admin-players-list">
            ${renderAdminPlayersList(players)}
          </div>
        </div>`;
      window._adminPlayers = players;
      break;
    }

    case 'payments': {
      const data = await API.get('/admin/payments');
      const payments = data.payments || [];
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">💳 <span>PAGOS</span></div>
          ${payments.length === 0
            ? '<div class="card"><div class="empty">No hay pagos registrados</div></div>'
            : payments.map(pay => renderPaymentCard(pay, 'payment')).join('')}
        </div>`;
      break;
    }

    case 'donations': {
      const data = await API.get('/admin/donations');
      const donations = data.donations || [];
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">💛 <span>DONACIONES</span></div>
          <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-family:var(--font-mono);font-size:12px;color:var(--gold)">
            Total donado: $${(data.totalDonated || 0).toFixed(2)} USD
          </div>
          ${donations.length === 0
            ? '<div class="card"><div class="empty">No hay donaciones registradas</div></div>'
            : donations.map(don => renderPaymentCard(don, 'donation')).join('')}
        </div>`;
      break;
    }

    case 'regions': {
      const data = await API.getAllRegions();
      const regions = data.regions || [];
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">🗺️ <span>REGIONES</span></div>
          ${regions.map(r => `
            <div class="card" style="margin-bottom:10px">
              <div style="font-family:var(--font-display);font-size:15px;font-weight:700;margin-bottom:10px">${r.name}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                ${[
                  { key: 'medicine', label: 'MEDICINA', val: r.medicine },
                  { key: 'education', label: 'EDUCACIÓN', val: r.education },
                  { key: 'industrial', label: 'INDUSTRIAL', val: r.industrial },
                  { key: 'infrastructure', label: 'INFRAESTRUCTURA', val: r.infrastructure }
                ].map(f => `
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:4px">${f.label}</div>
                    <input type="number" id="reg-${r.id}-${f.key}" value="${f.val}" min="1" max="10"
                      style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);padding:6px 8px;font-size:14px;outline:none">
                  </div>`).join('')}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div>
                  <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:4px">IMP. RENTA %</div>
                  <input type="number" id="reg-${r.id}-tax-income" value="${r.taxes.income}" min="0" max="50"
                    style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);padding:6px 8px;font-size:14px;outline:none">
                </div>
                <div>
                  <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:4px">IMP. FÁBRICA %</div>
                  <input type="number" id="reg-${r.id}-tax-factory" value="${r.taxes.factory}" min="0" max="50"
                    style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);padding:6px 8px;font-size:14px;outline:none">
                </div>
              </div>
              <button class="btn-primary btn-full btn-sm" onclick="saveRegionChanges('${r.id}')">💾 GUARDAR ${r.name}</button>
            </div>`).join('')}
        </div>`;
      break;
    }

    case 'factories': {
      const regData = await API.getAllRegions();
      const regions = regData.regions || [];
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">🏭 <span>CREAR FÁBRICA</span></div>
          <div class="card">
            <div class="field-group" style="margin-bottom:12px">
              <label>TIPO</label>
              <select id="af-type">
                <option value="gold">⚱️ Fábrica de Oro</option>
                <option value="oil">🛢️ Petróleo</option>
                <option value="mineral">⛏️ Mineral</option>
                <option value="uranium">☢️ Uranio</option>
                <option value="diamond">💎 Diamantes</option>
              </select>
            </div>
            <div class="field-group" style="margin-bottom:12px">
              <label>REGIÓN</label>
              <select id="af-region">
                ${regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
              </select>
            </div>
            <div class="field-group" style="margin-bottom:12px">
              <label>NIVEL INICIAL</label>
              <input type="number" id="af-level" value="1" min="1" max="10">
            </div>
            <div class="field-group" style="margin-bottom:14px">
              <label>NOMBRE (opcional)</label>
              <input type="text" id="af-name" placeholder="Nombre de la fábrica">
            </div>
            <button class="btn-primary btn-full" onclick="adminCreateFactory()">🏭 CREAR FÁBRICA</button>
          </div>
        </div>`;
      break;
    }

    case 'broadcast': {
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">📢 <span>MENSAJE GLOBAL</span></div>
          <div class="card">
            <div class="field-group" style="margin-bottom:14px">
              <label>MENSAJE AL CHAT GLOBAL</label>
              <textarea id="broadcast-msg" rows="4" placeholder="Escribe el anuncio..."
                style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:12px;font-size:14px;resize:none;outline:none;font-family:var(--font-body)"></textarea>
            </div>
            <button class="btn-primary btn-full" onclick="sendBroadcast()">📢 ENVIAR A TODOS</button>
          </div>
        </div>`;
      break;
    }

    case 'economy': {
      const ecoData = await API.getEconomyStats();
      const e = ecoData.economy || {};
      content.innerHTML = `
        <div class="panel">
          ${backBtn}
          <div class="panel-title">⚱️ <span>ECONOMÍA</span></div>
          <div class="card">
            <div class="info-row"><span class="info-label">MINERÍA GLOBAL</span><span class="info-val text-accent">${formatNumber(e.globalMining || 0)}</span></div>
            <div class="info-row"><span class="info-label">POOL DIARIO</span><span class="info-val text-gold">1,000,000 ⚱️</span></div>
            <div class="info-row"><span class="info-label">ÚLTIMA DISTRIBUCIÓN</span><span class="info-val">${formatTime(e.lastDistribution)}</span></div>
            <button class="btn-gold btn-full" style="margin-top:14px" onclick="adminDistributeGold()">
              ⚱️ EJECUTAR DISTRIBUCIÓN AHORA
            </button>
            <div style="font-size:11px;color:var(--text-dim);margin-top:8px;text-align:center;font-family:var(--font-mono)">
              Esto reparte 1,000,000 ⚱️ entre todas las fábricas de oro
            </div>
          </div>
        </div>`;
      break;
    }
  }
}

// ─── Render helpers ──────────────────────────────────────────────────────────

function renderAdminPlayersList(players) {
  if (players.length === 0) return '<div class="empty">No hay jugadores</div>';
  return players.map(p => `
    <div style="background:var(--bg-card);border:1px solid ${p.banned ? 'var(--danger)' : 'var(--border)'};border-radius:12px;padding:12px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700">
            ${p.nickname}
            ${p.premium ? '<span style="color:var(--gold);font-size:12px"> ⭐</span>' : ''}
            ${p.banned ? '<span style="color:var(--danger);font-size:12px"> 🔨BANEADO</span>' : ''}
          </div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary)">
            Nv.${p.level} · ${p.email} · ${getRegionName(p.regionId)}
          </div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">
            💵 $${formatMoney(p.money)} · ⚱️ ${p.gold} · ⚡ ${p.energy}/${p.maxEnergy}
          </div>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);text-align:right">
          ${formatTime(p.lastSeen)}
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        <button class="btn-gold btn-sm" onclick="adminGiveGold('${p.id}', '${p.nickname}')">+⚱️</button>
        <button class="btn-primary btn-sm" style="background:var(--money-dim);box-shadow:none" onclick="adminGiveMoney('${p.id}', '${p.nickname}')">+💵</button>
        <button class="btn-primary btn-sm" style="font-size:10px" onclick="adminGivePremium('${p.id}', '${p.nickname}')">+⭐</button>
        <button class="btn-ghost btn-sm" onclick="adminSetLevel('${p.id}', '${p.nickname}', ${p.level})">Nivel</button>
        ${p.banned
          ? `<button class="btn-primary btn-sm" style="background:var(--success);box-shadow:none" onclick="adminUnban('${p.id}', '${p.nickname}')">✅ Desbanear</button>`
          : `<button class="btn-danger btn-sm" onclick="adminBan('${p.id}', '${p.nickname}')">🔨 Banear</button>`
        }
      </div>
    </div>`).join('');
}

function filterAdminPlayers() {
  const q = document.getElementById('player-search')?.value?.toLowerCase() || '';
  const filtered = (window._adminPlayers || []).filter(p =>
    p.nickname.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
  const list = document.getElementById('admin-players-list');
  if (list) list.innerHTML = renderAdminPlayersList(filtered);
}

function renderPaymentCard(item, type) {
  const statusColors = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--danger)' };
  const statusIcons = { pending: '⏳', approved: '✅', rejected: '❌' };
  const color = statusColors[item.status] || 'var(--warning)';

  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700">${item.playerNickname}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${item.itemName || 'Donación'}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">${formatTime(item.createdAt)}</div>
          ${item.txHash ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);margin-top:2px">TX: ${item.txHash}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:20px;color:var(--money)">$${item.usdAmount} USD</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:${color};margin-top:4px">${statusIcons[item.status]} ${item.status?.toUpperCase()}</div>
        </div>
      </div>
      ${item.status === 'pending' ? `
        <div style="display:flex;gap:8px">
          <button class="btn-primary btn-full btn-sm" style="background:var(--success);box-shadow:none"
            onclick="adminApproveItem('${item.id}', '${type}')">✅ APROBAR</button>
          <button class="btn-danger btn-sm" style="flex:1"
            onclick="adminRejectItem('${item.id}', '${type}')">❌ RECHAZAR</button>
        </div>` : ''}
    </div>`;
}

// ─── Admin actions ────────────────────────────────────────────────────────────

function adminGiveGold(playerId, nickname) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">⚱️ DAR ORO A ${nickname}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>CANTIDAD DE ORO</label>
      <input type="number" id="give-gold-amount" placeholder="Cantidad" min="1" value="100">
    </div>
    <button class="btn-gold btn-full" onclick="doAdminGiveGold('${playerId}', '${nickname}')">⚱️ DAR ORO</button>
  `);
}

async function doAdminGiveGold(playerId, nickname) {
  const amount = parseInt(document.getElementById('give-gold-amount').value);
  if (!amount || amount <= 0) return showToast('Cantidad inválida', 'error');
  const data = await API.post('/admin/give-gold', { playerId, amount });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
}

function adminGiveMoney(playerId, nickname) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">💵 DAR DINERO A ${nickname}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>CANTIDAD DE DINERO</label>
      <input type="number" id="give-money-amount" placeholder="Cantidad" min="1" value="1000">
    </div>
    <button class="btn-primary btn-full" onclick="doAdminGiveMoney('${playerId}', '${nickname}')">💵 DAR DINERO</button>
  `);
}

async function doAdminGiveMoney(playerId, nickname) {
  const amount = parseInt(document.getElementById('give-money-amount').value);
  if (!amount || amount <= 0) return showToast('Cantidad inválida', 'error');
  const data = await API.post('/admin/give-money', { playerId, amount });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
}

function adminGivePremium(playerId, nickname) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">⭐ PREMIUM A ${nickname}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>DÍAS DE PREMIUM</label>
      <select id="premium-days">
        <option value="7">7 días</option>
        <option value="30" selected>30 días</option>
        <option value="90">90 días</option>
        <option value="365">1 año</option>
      </select>
    </div>
    <button class="btn-gold btn-full" onclick="doAdminGivePremium('${playerId}', '${nickname}')">⭐ ACTIVAR PREMIUM</button>
  `);
}

async function doAdminGivePremium(playerId, nickname) {
  const days = parseInt(document.getElementById('premium-days').value);
  const data = await API.post('/admin/give-premium', { playerId, days });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
}

function adminSetLevel(playerId, nickname, currentLevel) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">⬆️ NIVEL DE ${nickname}</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Nivel actual: ${currentLevel}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>NUEVO NIVEL</label>
      <input type="number" id="new-level" value="${currentLevel}" min="1" max="999">
    </div>
    <button class="btn-primary btn-full" onclick="doAdminSetLevel('${playerId}')">💾 GUARDAR NIVEL</button>
  `);
}

async function doAdminSetLevel(playerId) {
  const level = parseInt(document.getElementById('new-level').value);
  if (!level || level < 1) return showToast('Nivel inválido', 'error');
  const data = await API.post('/admin/set-level', { playerId, level });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
}

function adminBan(playerId, nickname) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px;color:var(--danger)">🔨 BANEAR A ${nickname}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>MOTIVO DEL BAN</label>
      <input type="text" id="ban-reason" placeholder="Motivo..." value="Violación de normas">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-ghost btn-full" onclick="closeModal()">CANCELAR</button>
      <button class="btn-danger btn-full" onclick="doAdminBan('${playerId}')">🔨 CONFIRMAR BAN</button>
    </div>
  `);
}

async function doAdminBan(playerId) {
  const reason = document.getElementById('ban-reason')?.value || 'Violación de normas';
  const data = await API.post('/admin/ban', { playerId, reason });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderAdminSection('players');
}

async function adminUnban(playerId, nickname) {
  const data = await API.post('/admin/unban', { playerId });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderAdminSection('players');
}

async function saveRegionChanges(regionId) {
  const updates = {
    medicine: parseInt(document.getElementById(`reg-${regionId}-medicine`)?.value),
    education: parseInt(document.getElementById(`reg-${regionId}-education`)?.value),
    industrial: parseInt(document.getElementById(`reg-${regionId}-industrial`)?.value),
    infrastructure: parseInt(document.getElementById(`reg-${regionId}-infrastructure`)?.value),
    taxes: {
      income: parseInt(document.getElementById(`reg-${regionId}-tax-income`)?.value),
      factory: parseInt(document.getElementById(`reg-${regionId}-tax-factory`)?.value)
    }
  };
  const data = await API.post('/admin/region-update', { regionId, updates });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
}

async function adminCreateFactory() {
  const type = document.getElementById('af-type').value;
  const regionId = document.getElementById('af-region').value;
  const level = document.getElementById('af-level').value;
  const name = document.getElementById('af-name').value;
  const data = await API.post('/admin/create-factory', { type, regionId, level, name });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
}

async function sendBroadcast() {
  const msg = document.getElementById('broadcast-msg')?.value?.trim();
  if (!msg) return showToast('Escribe un mensaje', 'error');
  const data = await API.post('/admin/broadcast', { message: msg });
  if (data.error) return showToast(data.error, 'error');
  document.getElementById('broadcast-msg').value = '';
  showToast('✅ Mensaje enviado al chat global', 'success');
}

async function adminDistributeGold() {
  const data = await API.post('/admin/distribute-gold', {});
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'gold', 5000);
}

async function adminApproveItem(id, type) {
  const endpoint = type === 'donation' ? '/admin/approve-donation' : '/admin/approve-payment';
  const body = type === 'donation' ? { donationId: id } : { paymentId: id };
  const data = await API.post(endpoint, body);
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderAdminSection(type === 'donation' ? 'donations' : 'payments');
}

function adminRejectItem(id, type) {
  openModal(`
    <div style="font-family:var(--font-display);font-size:17px;font-weight:700;margin-bottom:12px;color:var(--danger)">❌ RECHAZAR ${type === 'donation' ? 'DONACIÓN' : 'PAGO'}</div>
    <div class="field-group" style="margin-bottom:14px">
      <label>MOTIVO</label>
      <input type="text" id="reject-reason" placeholder="Ej: No se verificó el pago" value="No verificado">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-ghost btn-full" onclick="closeModal()">CANCELAR</button>
      <button class="btn-danger btn-full" onclick="doAdminReject('${id}', '${type}')">❌ RECHAZAR</button>
    </div>
  `);
}

async function doAdminReject(id, type) {
  const reason = document.getElementById('reject-reason')?.value || 'No verificado';
  const endpoint = type === 'donation' ? '/admin/reject-donation' : '/admin/reject-payment';
  const body = type === 'donation' ? { donationId: id, reason } : { paymentId: id, reason };
  const data = await API.post(endpoint, body);
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderAdminSection(type === 'donation' ? 'donations' : 'payments');
}

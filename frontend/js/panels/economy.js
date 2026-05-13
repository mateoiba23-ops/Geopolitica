// ─── ECONOMY PANEL ────────────────────────────────────────────────────────────
async function renderEconomy() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando economía global...</div>';

  try {
    const [ecoData, miningData] = await Promise.all([
      API.getEconomyStats(),
      API.getMiningStats()
    ]);

    const e = ecoData.economy || {};
    const m = miningData.mining || {};

    const nextDist = e.lastDistribution
      ? new Date(e.lastDistribution + 86400000).toLocaleString('es-CO')
      : 'Hoy 12:00 PM Bogotá';

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">📊 <span>ECONOMÍA GLOBAL</span></div>

        <!-- Global stats -->
        <div class="grid-2" style="margin-bottom:14px">
          ${[
            { label: 'JUGADORES', val: e.totalPlayers || 0, color: 'var(--accent)', icon: '👥' },
            { label: 'FÁBRICAS ACTIVAS', val: e.activeFactories || 0, color: 'var(--gold)', icon: '🏭' },
            { label: 'DINERO TOTAL', val: '$' + formatMoney(e.totalMoneySupply || 0), color: 'var(--money)', icon: '💵' },
            { label: 'ORO TOTAL', val: formatMoney(e.totalGoldSupply || 0) + ' ⚱️', color: 'var(--gold)', icon: '⚱️' }
          ].map(s => `
            <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
              <div style="font-size:22px">${s.icon}</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:${s.color};margin:4px 0">${s.val}</div>
              <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);letter-spacing:1px">${s.label}</div>
            </div>`).join('')}
        </div>

        <!-- Gold mining pool -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">⛏️ MINERÍA GLOBAL DE ORO</div>
          </div>
          <div class="info-row">
            <span class="info-label">POOL DIARIO</span>
            <span class="info-val text-gold">1,000,000 ⚱️</span>
          </div>
          <div class="info-row">
            <span class="info-label">MINERÍA ACUMULADA</span>
            <span class="info-val text-accent">${formatNumber(m.globalTotal || 0)} unidades</span>
          </div>
          <div class="info-row">
            <span class="info-label">PRÓXIMA DISTRIBUCIÓN</span>
            <span class="info-val" style="font-size:12px">${nextDist}</span>
          </div>
          <div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);margin-top:8px">
            🕛 Distribución automática todos los días a las 12:00 PM hora Bogotá
          </div>
        </div>

        <!-- Top factories by mining -->
        ${m.contributions && m.contributions.length > 0 ? `
          <div class="card">
            <div class="card-header"><div class="card-title">🏆 TOP MINERÍA</div></div>
            ${m.contributions.slice(0,10).map((c, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-dim);width:24px">${i+1}.</div>
                <div style="flex:1">
                  <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${c.factoryName}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${c.ownerNickname} · ${c.regionName}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-family:var(--font-display);font-size:13px;color:var(--gold)">${c.percentage}%</div>
                  <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">≈${formatMoney(c.estimatedGold)} ⚱️</div>
                </div>
              </div>`).join('')}
          </div>` : ''}

        <!-- Top factories by production -->
        ${e.topFactories && e.topFactories.length > 0 ? `
          <div class="card">
            <div class="card-header"><div class="card-title">📈 TOP PRODUCCIÓN</div></div>
            ${e.topFactories.map((f, i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-dim);width:24px">${i+1}.</div>
                <div style="flex:1">
                  <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${f.name}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${f.ownerNickname} · ${f.regionName}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-family:var(--font-display);font-size:14px;color:var(--accent)">${formatNumber(f.production)}</div>
                  <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">PRODUCCIÓN</div>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  } catch {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar datos económicos</div></div>`;
  }
}

// ─── WAREHOUSE PANEL ──────────────────────────────────────────────────────────
async function renderWarehouse() {
  const content = document.getElementById('game-content');
  const p = STATE.player;

  const warehouseEntries = Object.entries(p.warehouse || {}).filter(([,v]) => v > 0);
  const total = warehouseEntries.reduce((a, [,v]) => a + v, 0);

  content.innerHTML = `
    <div class="panel">
      <div class="panel-title">📦 <span>ALMACÉN</span></div>

      <!-- Capacity -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">CAPACIDAD</div>
          <span class="badge ${total >= p.warehouseLimit ? 'badge-danger' : 'badge-accent'}">${total}/${p.warehouseLimit}</span>
        </div>
        ${statBar('ALMACÉN PERSONAL', total, p.warehouseLimit, total >= p.warehouseLimit ? 'danger' : 'generic')}
        <div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);margin-top:6px">
          💡 Aumenta tu habilidad de AGUANTE para expandir el almacén (+10 slots por nivel)
        </div>
      </div>

      <!-- Resources -->
      ${warehouseEntries.length === 0
        ? `<div class="card"><div class="empty">
            Tu almacén está vacío.<br>
            <span style="color:var(--text-dim);font-size:12px">Trabaja en fábricas y retira recursos para llenar tu almacén.</span>
           </div></div>`
        : `<div class="card">
            <div class="card-header"><div class="card-title">RECURSOS</div></div>
            <div class="warehouse-grid">
              ${warehouseEntries.map(([type, qty]) => `
                <div class="warehouse-item" onclick="showWarehouseItemOptions('${type}', ${qty})">
                  <div class="warehouse-item-icon">${getResourceIcon(type)}</div>
                  <div class="warehouse-item-name">${type.toUpperCase()}</div>
                  <div class="warehouse-item-qty">${qty}</div>
                </div>`).join('')}
            </div>
           </div>`
      }

      <!-- My factory warehouses -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏭 ALMACENES DE FÁBRICAS</div>
          <button class="btn-ghost btn-sm" onclick="navigate('factories')">Gestionar</button>
        </div>
        <div id="factory-warehouses"><div class="loading">Cargando...</div></div>
      </div>
    </div>`;

  // Load factory warehouses
  try {
    const data = await API.getMyFactories();
    const factories = data.factories || [];
    const el = document.getElementById('factory-warehouses');
    if (!el) return;

    if (factories.length === 0) {
      el.innerHTML = '<div class="empty">No tienes fábricas</div>';
      return;
    }

    el.innerHTML = factories.map(f => {
      const wEntries = Object.entries(f.warehouse || {}).filter(([k,v]) => k !== 'goldMining' && v > 0);
      const mining = f.warehouse?.goldMining || 0;
      const wTotal = wEntries.reduce((a,[,v]) => a+v, 0);
      return `
        <div style="padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <div>
              <span style="font-family:var(--font-display);font-size:13px;font-weight:600">${f.icon} ${f.name}</span>
              <span style="font-size:11px;color:var(--text-secondary);margin-left:8px">Nv.${f.level}</span>
            </div>
            <span class="badge badge-accent" style="font-size:10px">${wTotal}/${f.warehouseLimit}</span>
          </div>
          ${wEntries.length > 0 ? `
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${wEntries.map(([type, qty]) => `
                <span style="background:var(--bg-input);border-radius:6px;padding:4px 10px;font-family:var(--font-mono);font-size:11px">
                  ${getResourceIcon(type)} ${qty}
                </span>`).join('')}
            </div>` : '<div style="font-size:11px;color:var(--text-dim)">Almacén vacío</div>'}
          ${mining > 0 ? `<div style="margin-top:6px;font-family:var(--font-mono);font-size:10px;color:var(--gold)">⛏️ ${mining} unidades de minería</div>` : ''}
        </div>`;
    }).join('');
  } catch {}
}

function showWarehouseItemOptions(type, qty) {
  openModal(`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:40px">${getResourceIcon(type)}</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-top:8px">${type.toUpperCase()}</div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-secondary);margin-top:4px">Tienes: <strong style="color:var(--text-primary)">${qty}</strong> unidades</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn-primary" onclick="closeModal();navigate('market');showSellModal()">
        📤 VENDER EN EL MERCADO
      </button>
      <button class="btn-ghost" onclick="closeModal()">
        ✕ Cerrar
      </button>
    </div>
  `);
}

// ─── NOTIFICATIONS PANEL ──────────────────────────────────────────────────────
async function renderNotifications() {
  const content = document.getElementById('game-content');
  const p = STATE.player;
  const notifs = p.notifications || [];

  content.innerHTML = `
    <div class="panel">
      <div class="panel-title">🔔 <span>NOTIFICACIONES</span></div>
      ${notifs.length === 0
        ? `<div class="card"><div class="empty">No tienes notificaciones</div></div>`
        : `<div class="card" style="padding:0;overflow:hidden">
            ${notifs.map(n => `
              <div class="notif-item ${!n.read ? 'unread' : ''}">
                <div class="notif-icon">${n.type === 'gold_distribution' ? '⚱️' : n.type === 'level_up' ? '⬆️' : '📬'}</div>
                <div>
                  <div class="notif-text">${n.text}</div>
                  <div class="notif-time">${formatTime(n.timestamp)}</div>
                </div>
              </div>`).join('')}
           </div>
           <button class="btn-ghost btn-full" style="margin-top:10px" onclick="markNotifsRead()">
             ✓ MARCAR TODAS COMO LEÍDAS
           </button>`
      }
    </div>`;

  // Mark as read
  await API.markNotificationsRead();
  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);
}

async function markNotifsRead() {
  await API.markNotificationsRead();
  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);
  renderNotifications();
}

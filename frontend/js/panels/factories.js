async function renderFactories() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando fábricas...</div>';

  try {
    const data = await API.getMyFactories();
    const factories = data.factories || [];

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">🏭 <span>MIS FÁBRICAS</span></div>

        <button class="btn-primary btn-full" style="margin-bottom:16px" onclick="showCreateFactoryModal()">
          ➕ CREAR NUEVA FÁBRICA
        </button>

        ${factories.length === 0
          ? `<div class="card"><div class="empty">No tienes fábricas aún.<br><span style="color:var(--text-dim);font-size:12px">Crea tu primera fábrica para empezar a producir.</span></div></div>`
          : factories.map(f => renderFactoryCard(f)).join('')
        }
      </div>`;
  } catch {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar fábricas</div></div>`;
  }
}

function renderFactoryCard(f) {
  const xpPct = Math.min((f.xp / f.xpToNext) * 100, 100);
  const warehouseTotal = Object.entries(f.warehouse || {})
    .filter(([k]) => k !== 'goldMining')
    .reduce((a, [,v]) => a + v, 0);

  return `
    <div class="factory-card">
      <div class="factory-card-header">
        <div class="factory-type-badge" style="background:${f.color}22;border:1px solid ${f.color}44">
          ${f.icon}
        </div>
        <div style="flex:1">
          <div class="factory-name">${f.name}</div>
          <div class="factory-meta">📍 ${f.regionName} · ${f.active ? '<span style="color:var(--success)">●  ACTIVA</span>' : '<span style="color:var(--danger)">● INACTIVA</span>'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:${f.color}">Nv.${f.level}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">${f.typeName}</div>
        </div>
      </div>

      <div class="factory-body">
        <!-- XP Bar -->
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:4px">
            <span>XP FÁBRICA</span><span>${f.xp} / ${f.xpToNext}</span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill generic" style="width:${xpPct}%"></div>
          </div>
        </div>

        <div class="factory-stats">
          <div class="factory-stat">
            <div class="factory-stat-label">TRABAJADORES</div>
            <div class="factory-stat-val">${f.workers ? f.workers.length : 0}<span style="font-size:12px;color:var(--text-dim)">/${f.maxWorkers}</span></div>
          </div>
          <div class="factory-stat">
            <div class="factory-stat-label">SALARIO</div>
            <div class="factory-stat-val text-money">$${f.salary}</div>
          </div>
          <div class="factory-stat">
            <div class="factory-stat-label">ALMACÉN</div>
            <div class="factory-stat-val">${warehouseTotal}<span style="font-size:12px;color:var(--text-dim)">/${f.warehouseLimit}</span></div>
          </div>
          <div class="factory-stat">
            <div class="factory-stat-label">EFICIENCIA</div>
            <div class="factory-stat-val text-accent">${f.efficiency}%</div>
          </div>
        </div>

        <!-- Warehouse contents -->
        ${warehouseTotal > 0 ? `
          <div style="margin-top:10px">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:6px">INVENTARIO</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${Object.entries(f.warehouse || {}).filter(([k,v]) => k !== 'goldMining' && v > 0).map(([type, qty]) => `
                <span style="background:var(--bg-input);border-radius:6px;padding:4px 10px;font-family:var(--font-mono);font-size:11px">
                  ${getResourceIcon(type)} ${qty}
                </span>`).join('')}
            </div>
          </div>` : ''}

        ${f.warehouse && f.warehouse.goldMining > 0 ? `
          <div style="margin-top:8px;background:var(--gold-glow);border:1px solid rgba(255,215,0,0.2);border-radius:6px;padding:8px 12px;font-family:var(--font-mono);font-size:11px;color:var(--gold)">
            ⛏️ Minería acumulada: ${f.warehouse.goldMining} unidades
          </div>` : ''}
      </div>

      <div class="factory-footer">
        <button class="btn-primary btn-sm" onclick="showFactoryActions('${f.id}')">⚙️ GESTIONAR</button>
        <button class="btn-ghost btn-sm" onclick="showUpgradeModal('${f.id}')">⬆️ MEJORAR</button>
        <button class="btn-ghost btn-sm" onclick="toggleFactory('${f.id}', this)">${f.active ? '⏸️' : '▶️'}</button>
      </div>
    </div>`;
}

async function showFactoryActions(factoryId) {
  try {
    const data = await API.getFactory(factoryId);
    const f = data.factory;
    const warehouseEntries = Object.entries(f.warehouse || {}).filter(([k,v]) => k !== 'goldMining' && v > 0);

    openModal(`
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">${f.icon} ${f.name}</div>

      <div class="section-title" style="margin-bottom:8px">SALARIO</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input type="number" id="salary-input" value="${f.salary}" min="0" style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:10px;font-size:15px">
        <button class="btn-primary" onclick="updateSalary('${factoryId}')">💾</button>
      </div>

      ${warehouseEntries.length > 0 ? `
        <div class="section-title" style="margin-bottom:8px">RETIRAR RECURSOS</div>
        ${warehouseEntries.map(([type, qty]) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:20px">${getResourceIcon(type)}</span>
            <span style="flex:1;font-family:var(--font-mono);font-size:12px">${type} (${qty})</span>
            <input type="number" id="withdraw-${type}" value="${qty}" min="1" max="${qty}" style="width:70px;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;color:var(--text-primary);padding:6px;font-size:13px">
            <button class="btn-ghost btn-sm" onclick="withdrawResource('${factoryId}', '${type}')">📤</button>
          </div>`).join('')}
      ` : '<div class="empty" style="padding:14px">Almacén de fábrica vacío</div>'}
    `);
  } catch {}
}

async function updateSalary(factoryId) {
  const salary = parseInt(document.getElementById('salary-input').value);
  if (isNaN(salary) || salary < 0) return showToast('Salario inválido', 'error');
  const data = await API.setSalary(factoryId, salary);
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderFactories();
}

async function withdrawResource(factoryId, resourceType) {
  const input = document.getElementById(`withdraw-${resourceType}`);
  const amount = parseInt(input.value);
  if (!amount || amount <= 0) return showToast('Cantidad inválida', 'error');
  const data = await API.withdrawFactory(factoryId, resourceType, amount);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState({ ...STATE.player });
  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderFactories();
  // Refresh player
  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);
}

async function showUpgradeModal(factoryId) {
  try {
    const data = await API.getFactory(factoryId);
    const f = data.factory;
    const goldCost = 5 * f.level;
    const xpRequired = f.xpToNext;
    const canUpgrade = f.xp >= xpRequired && STATE.player.gold >= goldCost;

    openModal(`
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">${f.icon} ${f.name}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-bottom:14px">MEJORAR Nv.${f.level} → Nv.${f.level+1}</div>

      <div class="info-row"><span class="info-label">XP ACTUAL</span><span class="info-val ${f.xp >= xpRequired ? 'text-money' : 'text-danger'}">${f.xp} / ${xpRequired}</span></div>
      <div class="info-row"><span class="info-label">ORO REQUERIDO</span><span class="info-val text-gold">⚱️ ${goldCost}</span></div>
      <div class="info-row"><span class="info-label">TU ORO</span><span class="info-val text-gold">⚱️ ${STATE.player.gold}</span></div>

      <div style="margin-top:12px;padding:12px;background:var(--bg-input);border-radius:8px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-bottom:6px">BENEFICIOS DEL NIVEL ${f.level+1}</div>
        <div style="font-size:13px;color:var(--text-primary)">
          ✅ +${3 * f.level} producción base<br>
          ✅ +${100} almacén<br>
          ✅ +${f.type === 'gold' ? 2 : 3} trabajadores máximos
        </div>
      </div>

      <button class="btn-gold btn-full" style="margin-top:14px" onclick="doUpgrade('${factoryId}')" ${!canUpgrade ? 'disabled style="opacity:0.4"' : ''}>
        ${canUpgrade ? '⬆️ MEJORAR FÁBRICA' : '❌ REQUISITOS NO CUMPLIDOS'}
      </button>
    `);
  } catch {}
}

async function doUpgrade(factoryId) {
  const data = await API.upgradeFactory(factoryId);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState(data.player);
  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderFactories();
}

async function toggleFactory(factoryId, btn) {
  const data = await API.toggleFactory(factoryId);
  if (data.error) return showToast(data.error, 'error');
  showToast(data.message, 'success');
  renderFactories();
}

function showCreateFactoryModal() {
  const p = STATE.player;
  const types = [
    { id: 'gold', icon: '⚱️', name: 'Fábrica de Oro', money: 5000, gold: 20 },
    { id: 'oil', icon: '🛢️', name: 'Refinería de Petróleo', money: 8000, gold: 25 },
    { id: 'mineral', icon: '⛏️', name: 'Mina Mineral', money: 4000, gold: 15 },
    { id: 'uranium', icon: '☢️', name: 'Planta de Uranio', money: 15000, gold: 50 },
    { id: 'diamond', icon: '💎', name: 'Mina de Diamantes', money: 10000, gold: 35 }
  ];
  const regions = STATE.regions;

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">➕ NUEVA FÁBRICA</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>TIPO DE FÁBRICA</label>
      <select id="new-factory-type">
        ${types.map(t => `<option value="${t.id}">${t.icon} ${t.name} — $${t.money.toLocaleString()} + ⚱️${t.gold}</option>`).join('')}
      </select>
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>REGIÓN</label>
      <select id="new-factory-region">
        ${regions.map(r => `<option value="${r.id}" ${r.id === p.regionId ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    </div>

    <div class="field-group" style="margin-bottom:14px">
      <label>NOMBRE (opcional)</label>
      <input type="text" id="new-factory-name" placeholder="Nombre de tu fábrica" maxlength="40">
    </div>

    <div style="background:var(--bg-input);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">
      💵 Dinero: $${formatMoney(p.money)} &nbsp;|&nbsp; ⚱️ Oro: ${p.gold}
    </div>

    <button class="btn-primary btn-full" onclick="doCreateFactory()">🏭 CREAR FÁBRICA</button>
  `);
}

async function doCreateFactory() {
  const type = document.getElementById('new-factory-type').value;
  const regionId = document.getElementById('new-factory-region').value;
  const name = document.getElementById('new-factory-name').value.trim();

  const data = await API.createFactory(type, regionId, name || undefined);
  if (data.error) return showToast(data.error, 'error');

  updatePlayerState(data.player || { ...STATE.player });
  // Refresh player data
  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);

  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderFactories();
}

async function setSalaryMode(factoryId, mode) {
  const data = await API.post('/factory/set-salary', { factoryId, salaryMode: mode });
  if (data.error) return showToast(data.error, 'error');
  showToast(`✅ Modo: ${mode === 'fixed' ? 'Salario fijo' : 'Porcentaje de recurso'}`, 'success');
  closeModal();
  renderFactories();
}

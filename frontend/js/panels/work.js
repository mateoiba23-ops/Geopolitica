// ─── WORK PANEL ───────────────────────────────────────────────────────────────

let _autoworkInterval = null;

async function renderWork() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Buscando trabajos...</div>';

  // Stop any existing autowork UI polling
  if (_autoworkInterval) { clearInterval(_autoworkInterval); _autoworkInterval = null; }

  try {
    const [jobsData, awData] = await Promise.all([
      API.getJobs(),
      API.getAutoworkStatus()
    ]);

    const jobs = jobsData.jobs || [];
    const aw   = awData;
    const p    = STATE.player;

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">⚒️ <span>TRABAJO</span></div>

        <!-- Energía -->
        <div class="card" style="margin-bottom:12px">
          <div class="card-header">
            <div class="card-title">⚡ ENERGÍA</div>
            <span class="badge ${p.energy >= 10 ? 'badge-success' : 'badge-danger'}">${p.energy}/${p.maxEnergy}</span>
          </div>
          ${statBar('ENERGÍA', p.energy, p.maxEnergy, 'energy')}
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:4px">
            Mínimo 10⚡ por acción · Máx 100⚡ por turno
          </div>
        </div>

        <!-- AUTOWORK PREMIUM -->
        ${renderAutoworkPanel(aw, p)}

        <!-- Filtros -->
        <div class="map-filter-row" style="margin-bottom:10px">
          <button class="map-filter-btn active" onclick="filterJobs('all',this)">TODOS</button>
          <button class="map-filter-btn" onclick="filterJobs('gold',this)">⚱️</button>
          <button class="map-filter-btn" onclick="filterJobs('oil',this)">🛢️</button>
          <button class="map-filter-btn" onclick="filterJobs('mineral',this)">⛏️</button>
          <button class="map-filter-btn" onclick="filterJobs('uranium',this)">☢️</button>
          <button class="map-filter-btn" onclick="filterJobs('diamond',this)">💎</button>
          <button class="map-filter-btn" onclick="filterJobs('my-region',this)">📍 MÍA</button>
        </div>

        <div id="jobs-list">
          ${renderJobsList(jobs)}
        </div>
      </div>`;

    window._allJobs = jobs;

    // Poll autowork status if active
    if (aw.active) startAutoworkPolling();

  } catch {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar trabajos</div></div>`;
  }
}

function renderAutoworkPanel(aw, player) {
  if (!player.premium) {
    return `
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,165,0,0.03));
        border:1px dashed rgba(255,215,0,0.3);border-radius:var(--radius-lg);
        padding:14px;margin-bottom:12px;text-align:center">
        <div style="font-size:24px;margin-bottom:6px">⚙️</div>
        <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--gold);margin-bottom:4px">
          TRABAJO AUTOMÁTICO
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
          Trabaja mientras descansas. Exclusivo Premium.
        </div>
        <button class="btn-gold btn-sm" onclick="navigate('store')">⭐ ACTIVAR PREMIUM</button>
      </div>`;
  }

  if (aw.active) {
    const elapsed  = aw.startedAt ? Math.floor((Date.now() - aw.startedAt) / 60000) : 0;
    return `
      <div style="background:linear-gradient(135deg,rgba(0,230,118,0.08),rgba(0,180,90,0.04));
        border:1px solid rgba(0,230,118,0.3);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:10px;height:10px;background:var(--success);border-radius:50%;
            box-shadow:0 0 8px var(--success);animation:pulse 1.5s infinite"></div>
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--success)">
            TRABAJANDO AUTOMÁTICAMENTE
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
          🏭 ${aw.factoryName || 'Fábrica'}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          <div style="background:var(--bg-input);border-radius:8px;padding:8px;text-align:center">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--money)" id="aw-earned">$${formatMoney(aw.totalEarned||0)}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">GANADO</div>
          </div>
          <div style="background:var(--bg-input);border-radius:8px;padding:8px;text-align:center">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--accent)" id="aw-xp">${aw.totalXp||0}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">XP</div>
          </div>
          <div style="background:var(--bg-input);border-radius:8px;padding:8px;text-align:center">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text-secondary)" id="aw-cycles">${aw.totalCycles||0}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">CICLOS</div>
          </div>
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:10px">
          ⏱️ Activo hace ${elapsed} min · Último ciclo: ${aw.lastCycleAt ? formatTime(aw.lastCycleAt) : 'Pendiente'}
        </div>
        <button class="btn-danger btn-full btn-sm" onclick="stopAutowork()">⏹️ DETENER TRABAJO AUTOMÁTICO</button>
      </div>`;
  }

  return `
    <div style="background:rgba(0,212,255,0.05);border:1px solid var(--border);
      border-radius:var(--radius-lg);padding:14px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="font-size:20px">⚙️</div>
        <div>
          <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--accent)">TRABAJO AUTOMÁTICO ⭐</div>
          <div style="font-size:11px;color:var(--text-secondary)">Elige una fábrica y trabaja solo</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">
        Se ejecuta cada 10 min usando hasta 100⚡. Funciona con la pantalla apagada.
      </div>
      <button class="btn-primary btn-full btn-sm" onclick="showStartAutoworkModal()">
        ⚙️ INICIAR TRABAJO AUTOMÁTICO
      </button>
    </div>`;
}

function renderJobsList(jobs) {
  if (!jobs.length) {
    return '<div class="card"><div class="empty">No hay trabajos disponibles</div></div>';
  }
  const p = STATE.player;
  return jobs.map(j => `
    <div class="job-card">
      <div class="job-header">
        <div class="job-icon">${j.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="job-title">${j.factoryName}</div>
          <div class="job-region">📍 ${j.regionName} · ${j.ownerNickname}</div>
          ${j.isLocal ? '<span class="badge badge-accent" style="font-size:9px">MI REGIÓN</span>' : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--money)">$${j.salary}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">por acción</div>
        </div>
      </div>
      <div class="job-stats">
        <div class="job-stat">Nv.<strong>${j.level}</strong></div>
        <div class="job-stat">👥 <strong>${j.workers}/${j.maxWorkers}</strong></div>
        <div class="job-stat">⚙️ ${j.efficiency}%</div>
        <div class="job-stat">${j.salaryMode === 'percent' ? '📦 %recurso' : '💵 fijo'}</div>
      </div>
      <button class="btn-primary btn-full btn-sm" style="margin-top:8px"
        onclick="showWorkModal('${j.factoryId}','${j.factoryName.replace(/'/g,"\\'")}',${j.salary},'${j.icon}')">
        ⚡ TRABAJAR AQUÍ
      </button>
    </div>`).join('');
}

function filterJobs(type, btn) {
  document.querySelectorAll('.map-filter-row .map-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const all = window._allJobs || [];
  let filtered;
  if (type === 'all')       filtered = all;
  else if (type === 'my-region') filtered = all.filter(j => j.regionId === STATE.player.regionId);
  else                      filtered = all.filter(j => j.type === type);
  document.getElementById('jobs-list').innerHTML = renderJobsList(filtered);
}

// ─── Modal trabajo manual ─────────────────────────────────────────────────────

function showWorkModal(factoryId, factoryName, salary, icon) {
  const p          = STATE.player;
  const maxEnergy  = Math.min(p.energy, 100);
  const education  = (p.skills && p.skills.education) || 1;
  const endurance  = (p.skills && p.skills.endurance) || 1;

  openModal(`
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:36px;margin-bottom:6px">${icon}</div>
      <div style="font-family:var(--font-display);font-size:17px;font-weight:700">${factoryName}</div>
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-top:2px">
        $${salary}/acción · ${p.premium ? '⭐ XP Premium' : 'XP normal'}
      </div>
    </div>

    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-bottom:5px">
        <span>ENERGÍA A GASTAR</span><span id="energy-label">${maxEnergy} ⚡</span>
      </div>
      <input type="range" class="energy-slider" id="energy-slider"
        min="10" max="${maxEnergy}" step="10" value="${maxEnergy}"
        oninput="updateWorkPreview(${salary}, ${education}, ${endurance}, ${p.premium ? 1 : 0})">
    </div>

    <div id="work-preview" style="background:var(--bg-input);border-radius:8px;padding:12px;margin-bottom:14px;font-family:var(--font-mono);font-size:12px">
      ${buildWorkPreview(maxEnergy, salary, education, endurance, p.premium)}
    </div>

    <button class="btn-primary btn-full" id="work-btn" onclick="doWork('${factoryId}')">
      ⚡ TRABAJAR
    </button>
  `);
}

function buildWorkPreview(energy, salary, education, endurance, premium) {
  const actions   = Math.floor(energy / 10);
  const gross     = actions * salary;
  const tax       = Math.floor(gross * 0.12);
  const salBonus  = Math.min(education * 1, 50);
  const net       = Math.floor((gross - tax) * (1 + salBonus / 100));
  const reduction = Math.min(endurance * 0.5, 40).toFixed(1);
  const xpBase    = premium ? 9 : 5;
  const xpBonus   = education * 2;
  const xp        = Math.floor(actions * xpBase * (1 + xpBonus / 100));
  return `
    <div class="flex-between" style="margin-bottom:5px"><span style="color:var(--text-secondary)">ACCIONES</span><span>${actions}</span></div>
    <div class="flex-between" style="margin-bottom:5px"><span style="color:var(--text-secondary)">SALARIO BRUTO</span><span style="color:var(--money)">$${formatMoney(gross)}</span></div>
    <div class="flex-between" style="margin-bottom:5px"><span style="color:var(--text-secondary)">IMPUESTOS (~12%)</span><span style="color:var(--danger)">-$${formatMoney(tax)}</span></div>
    <div class="flex-between" style="margin-bottom:5px"><span style="color:var(--text-secondary)">BONUS EDUCACIÓN</span><span style="color:var(--success)">+${salBonus.toFixed(0)}%</span></div>
    <div class="flex-between" style="margin-bottom:5px"><span style="color:var(--text-secondary)">REDUCCIÓN ENERGÍA</span><span style="color:var(--energy)">-${reduction}%</span></div>
    <div class="flex-between" style="border-top:1px solid var(--border);padding-top:5px;margin-top:5px">
      <span style="color:var(--text-primary);font-weight:700">RECIBIRÁS</span>
      <span style="color:var(--money);font-weight:700">$${formatMoney(net)}</span>
    </div>
    <div class="flex-between" style="margin-top:3px"><span style="color:var(--text-secondary)">XP LABORAL</span><span style="color:var(--accent)">+${xp}</span></div>`;
}

function updateWorkPreview(salary, education, endurance, isPremium) {
  const energy = parseInt(document.getElementById('energy-slider')?.value) || 10;
  document.getElementById('energy-label').textContent = energy + ' ⚡';
  const el = document.getElementById('work-preview');
  if (el) el.innerHTML = buildWorkPreview(energy, salary, education, endurance, isPremium === 1);
}

async function doWork(factoryId) {
  const btn    = document.getElementById('work-btn');
  const slider = document.getElementById('energy-slider');
  if (!slider) return;
  const energy = parseInt(slider.value);

  setButtonLoading(btn, true);

  try {
    const data = await API.doWork(factoryId, energy);
    if (data.error) { setButtonLoading(btn, false); return showToast(data.error, 'error'); }

    updatePlayerState(data.player);
    closeModal();

    const r = data.result;
    let msg = `✅ +$${formatMoney(r.netSalary)} · +${r.xpGain} XP`;
    if (r.levelMessages && r.levelMessages.length) msg = r.levelMessages[0];
    showToast(msg, 'success', 3500);
    renderWork();
  } catch {
    setButtonLoading(btn, false);
    showToast('Error al trabajar', 'error');
  }
}

// ─── AutoWork UI ──────────────────────────────────────────────────────────────

async function showStartAutoworkModal() {
  const data = await API.getJobs();
  const jobs = (data.jobs || []).filter(j => j.workers < j.maxWorkers);

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">⚙️ TRABAJO AUTOMÁTICO</div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">
      Se ejecutará cada 10 minutos usando hasta 100⚡. Funciona con la pantalla apagada mientras el servidor esté activo.
    </div>

    <div class="field-group" style="margin-bottom:14px">
      <label>SELECCIONA UNA FÁBRICA</label>
      <select id="aw-factory-select">
        ${jobs.length === 0
          ? '<option value="">No hay fábricas disponibles</option>'
          : jobs.map(j => `<option value="${j.factoryId}">${j.icon} ${j.factoryName} — $${j.salary}/acc — ${j.regionName}</option>`).join('')}
      </select>
    </div>

    <div style="background:var(--bg-input);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--text-secondary)">
      ✅ Recibirás salario y XP automáticamente<br>
      ✅ Funciona mientras tengas energía<br>
      ✅ El servidor ejecuta el ciclo cada 10 minutos<br>
      ⚠️ Si la fábrica se desactiva, el autowork se detiene
    </div>

    <button class="btn-primary btn-full" onclick="startAutowork()" ${jobs.length === 0 ? 'disabled' : ''}>
      ⚙️ INICIAR TRABAJO AUTOMÁTICO
    </button>
  `);
}

async function startAutowork() {
  const factoryId = document.getElementById('aw-factory-select')?.value;
  if (!factoryId) return showToast('Selecciona una fábrica', 'error');

  const data = await API.startAutowork(factoryId);
  if (data.error) return showToast(data.error, 'error');

  showToast(data.message, 'success');
  closeModal();
  renderWork();
}

async function stopAutowork() {
  const data = await API.stopAutowork();
  if (data.error) return showToast(data.error, 'error');

  if (_autoworkInterval) { clearInterval(_autoworkInterval); _autoworkInterval = null; }

  const s = data.summary;
  showToast(`⏹️ Detenido · Ganaste $${formatMoney(s.totalEarned)} y ${s.totalXp} XP en ${s.totalCycles} ciclos`, 'success', 5000);
  renderWork();
}

function startAutoworkPolling() {
  if (_autoworkInterval) clearInterval(_autoworkInterval);
  _autoworkInterval = setInterval(async () => {
    if (STATE.currentPanel !== 'work') {
      clearInterval(_autoworkInterval);
      _autoworkInterval = null;
      return;
    }
    try {
      const data = await API.getAutoworkStatus();
      if (!data.active) {
        clearInterval(_autoworkInterval);
        _autoworkInterval = null;
        return;
      }
      // Update stats in UI
      const earned = document.getElementById('aw-earned');
      const xp     = document.getElementById('aw-xp');
      const cycles = document.getElementById('aw-cycles');
      if (earned) earned.textContent = '$' + formatMoney(data.totalEarned || 0);
      if (xp)     xp.textContent     = data.totalXp || 0;
      if (cycles) cycles.textContent = data.totalCycles || 0;

      // Also refresh player data
      const pd = await API.getProfile();
      if (pd.player) updatePlayerState(pd.player);
    } catch {}
  }, 15000); // Poll every 15 seconds
}


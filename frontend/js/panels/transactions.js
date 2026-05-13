// ─── TRANSACTIONS PANEL ───────────────────────────────────────────────────────

async function renderTransactions() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando historial...</div>';

  try {
    const [histData, sumData] = await Promise.all([
      API.getTransactionHistory(),
      API.getTransactionSummary()
    ]);

    const txs     = histData.transactions || [];
    const summary = sumData.today || {};
    const week    = sumData.week  || {};
    const allTime = sumData.allTime || {};

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">💸 <span>FINANZAS</span></div>

        <!-- Resumen rápido hoy -->
        <div class="card" style="margin-bottom:12px">
          <div class="card-header">
            <div class="card-title">📊 RESUMEN HOY</div>
            <span class="badge badge-accent">24h</span>
          </div>
          <div class="grid-2" style="gap:8px">
            <div style="background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.15);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">ENTRADAS $</div>
              <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--money)">+$${formatMoney(summary.moneyIn||0)}</div>
            </div>
            <div style="background:rgba(255,61,87,0.06);border:1px solid rgba(255,61,87,0.15);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">SALIDAS $</div>
              <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--danger)">-$${formatMoney(summary.moneyOut||0)}</div>
            </div>
            <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">ORO RECIBIDO</div>
              <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--gold)">+${summary.goldIn||0} ⚱️</div>
            </div>
            <div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">BALANCE $</div>
              <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:${(summary.moneyNet||0)>=0?'var(--money)':'var(--danger)'}">
                ${(summary.moneyNet||0)>=0?'+':''} $${formatMoney(summary.moneyNet||0)}
              </div>
            </div>
          </div>
        </div>

        <!-- Acumulado semana -->
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:8px">ESTA SEMANA</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div><span style="color:var(--text-secondary);font-size:12px">Entradas: </span><span style="color:var(--money);font-family:var(--font-display);font-size:14px">$${formatMoney(week.moneyIn||0)}</span></div>
            <div><span style="color:var(--text-secondary);font-size:12px">Salidas: </span><span style="color:var(--danger);font-family:var(--font-display);font-size:14px">$${formatMoney(week.moneyOut||0)}</span></div>
            <div><span style="color:var(--text-secondary);font-size:12px">Oro: </span><span style="color:var(--gold);font-family:var(--font-display);font-size:14px">+${week.goldIn||0}</span></div>
          </div>
        </div>

        <!-- Acciones rápidas -->
        <div class="section-header" style="margin-bottom:10px">
          <div class="section-title">TRANSFERIR</div>
        </div>
        <div class="grid-3" style="margin-bottom:16px">
          <button class="home-action-btn" onclick="showSendMoneyModal()">
            <div class="home-action-icon">💵</div>
            <div class="home-action-label">DINERO</div>
          </button>
          <button class="home-action-btn" onclick="showSendGoldModal()">
            <div class="home-action-icon">⚱️</div>
            <div class="home-action-label">ORO</div>
          </button>
          <button class="home-action-btn" onclick="showSendResourceModal()">
            <div class="home-action-icon">📦</div>
            <div class="home-action-label">RECURSO</div>
          </button>
        </div>

        <!-- Filtros historial -->
        <div class="section-header" style="margin-bottom:10px">
          <div class="section-title">HISTORIAL</div>
        </div>
        <div class="map-filter-row" style="margin-bottom:12px" id="tx-filters">
          <button class="map-filter-btn active" onclick="filterTx('all', this)">TODOS</button>
          <button class="map-filter-btn" onclick="filterTx('salary', this)">SALARIOS</button>
          <button class="map-filter-btn" onclick="filterTx('transfer_money', this)">TRANSFERENCIAS</button>
          <button class="map-filter-btn" onclick="filterTx('market_buy', this)">MERCADO</button>
          <button class="map-filter-btn" onclick="filterTx('mining_reward', this)">MINERÍA</button>
        </div>

        <div id="tx-list">
          ${renderTxList(txs)}
        </div>

        ${txs.length === 0 ? '' : `
          <button class="btn-ghost btn-full" style="margin-top:10px" onclick="loadMoreTx()">
            📜 Cargar más
          </button>`}
      </div>`;

    window._txPage    = 1;
    window._txFilter  = 'all';
    window._allTxData = txs;

  } catch (e) {
    content.innerHTML = `<div class="panel"><div class="empty">Error cargando historial</div></div>`;
  }
}

function renderTxList(txs) {
  if (!txs || txs.length === 0) {
    return '<div class="card"><div class="empty">Sin transacciones aún.<br><span style="font-size:12px;color:var(--text-dim)">Trabaja, compra o transfiere para ver el historial.</span></div></div>';
  }

  const p = STATE.player;
  return txs.map(tx => {
    const isIn    = tx.toId === p.id;
    const sign    = isIn ? '+' : '-';
    const color   = isIn ? 'var(--money)' : 'var(--danger)';
    const desc    = tx.description || tx.label || tx.type;
    const curIcon = tx.currency === 'gold' ? '⚱️' : (tx.currency === 'resource' ? getResourceIcon(tx.resource||'') : '$');

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;margin-bottom:6px">
        <div style="width:36px;height:36px;background:${isIn ? 'rgba(0,230,118,0.1)' : 'rgba(255,61,87,0.1)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
          ${tx.icon || '💰'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${desc}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">
            ${isIn ? `De: ${tx.fromNickname||'?'}` : `Para: ${tx.toNickname||'?'}`} · ${formatTime(tx.timestamp)}
          </div>
          ${tx.fee > 0 ? `<div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">Comisión: ${tx.currency==='money'?'$':''}${tx.fee}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${color}">
            ${sign}${curIcon}${tx.currency==='money' ? formatMoney(tx.amount) : tx.amount}
          </div>
          ${tx.currency==='resource' ? `<div style="font-size:10px;color:var(--text-dim)">${tx.resource}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function filterTx(type, btn) {
  document.querySelectorAll('#tx-filters .map-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window._txFilter = type;
  window._txPage   = 1;

  const list = document.getElementById('tx-list');
  if (list) list.innerHTML = '<div class="loading">⏳</div>';

  try {
    const data = await API.getTransactionHistory(type === 'all' ? null : type, null, 1);
    if (list) list.innerHTML = renderTxList(data.transactions || []);
    window._allTxData = data.transactions || [];
  } catch {}
}

async function loadMoreTx() {
  window._txPage = (window._txPage || 1) + 1;
  try {
    const data = await API.getTransactionHistory(
      window._txFilter === 'all' ? null : window._txFilter,
      null,
      window._txPage
    );
    const list = document.getElementById('tx-list');
    if (list && data.transactions && data.transactions.length > 0) {
      list.innerHTML += renderTxList(data.transactions);
    } else {
      showToast('No hay más transacciones', '');
    }
  } catch {}
}

// ─── Modales de transferencia ─────────────────────────────────────────────────

function showSendMoneyModal() {
  const p = STATE.player;
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">💵 TRANSFERIR DINERO</div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-bottom:14px">Disponible: $${formatMoney(p.money)} · Comisión: 2%</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>DESTINATARIO (nickname)</label>
      <input type="text" id="send-to-nick" placeholder="Nickname del jugador" autocomplete="off">
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>CANTIDAD ($)</label>
      <input type="number" id="send-money-amount" placeholder="Mínimo $10" min="10" oninput="updateSendMoneyPreview()">
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>NOTA (opcional)</label>
      <input type="text" id="send-money-note" placeholder="Motivo de la transferencia" maxlength="80">
    </div>
    <div id="send-money-preview" style="background:var(--bg-input);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">
      Ingresa una cantidad para ver el desglose
    </div>
    <button class="btn-primary btn-full" onclick="doSendMoney()">💵 TRANSFERIR</button>
  `);
}

function updateSendMoneyPreview() {
  const amt = parseInt(document.getElementById('send-money-amount')?.value) || 0;
  const fee  = Math.floor(amt * 0.02);
  const el   = document.getElementById('send-money-preview');
  if (!el) return;
  if (amt < 10) { el.textContent = 'Mínimo $10'; return; }
  el.innerHTML = `
    Envías: <strong style="color:var(--money)">$${formatMoney(amt)}</strong><br>
    Comisión (2%): <strong style="color:var(--danger)">$${fee}</strong><br>
    Total debitado: <strong style="color:var(--text-primary)">$${formatMoney(amt + fee)}</strong>
  `;
}

async function doSendMoney() {
  const to     = document.getElementById('send-to-nick')?.value?.trim();
  const amount = parseInt(document.getElementById('send-money-amount')?.value);
  const note   = document.getElementById('send-money-note')?.value?.trim();

  if (!to || !amount) return showToast('Completa todos los campos', 'error');

  try {
    const data = await API.sendMoney(to, amount, note);
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(data.message, 'success');
    closeModal();
    renderTransactions();
  } catch { showToast('Error al transferir', 'error'); }
}

function showSendGoldModal() {
  const p = STATE.player;
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">⚱️ TRANSFERIR ORO</div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-bottom:14px">Disponible: ${p.gold} ⚱️ · Sin comisión</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>DESTINATARIO (nickname)</label>
      <input type="text" id="send-gold-to" placeholder="Nickname del jugador" autocomplete="off">
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>CANTIDAD (⚱️)</label>
      <input type="number" id="send-gold-amount" placeholder="Cantidad de oro" min="1" max="${p.gold}">
    </div>
    <div class="field-group" style="margin-bottom:14px">
      <label>NOTA (opcional)</label>
      <input type="text" id="send-gold-note" placeholder="Motivo" maxlength="80">
    </div>
    <button class="btn-gold btn-full" onclick="doSendGold()">⚱️ TRANSFERIR ORO</button>
  `);
}

async function doSendGold() {
  const to     = document.getElementById('send-gold-to')?.value?.trim();
  const amount = parseInt(document.getElementById('send-gold-amount')?.value);
  const note   = document.getElementById('send-gold-note')?.value?.trim();

  if (!to || !amount) return showToast('Completa todos los campos', 'error');

  try {
    const data = await API.sendGold(to, amount, note);
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(data.message, 'success');
    closeModal();
    renderTransactions();
  } catch { showToast('Error al transferir', 'error'); }
}

function showSendResourceModal() {
  const p       = STATE.player;
  const entries = Object.entries(p.warehouse || {}).filter(([,v]) => v > 0);

  if (entries.length === 0) {
    return showToast('Tu almacén está vacío', 'error');
  }

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📦 TRANSFERIR RECURSO</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>RECURSO</label>
      <select id="send-res-type" onchange="updateSendResMax()">
        ${entries.map(([type, qty]) =>
          `<option value="${type}" data-max="${qty}">${getResourceIcon(type)} ${type.toUpperCase()} (${qty})</option>`
        ).join('')}
      </select>
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>DESTINATARIO</label>
      <input type="text" id="send-res-to" placeholder="Nickname del jugador" autocomplete="off">
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>CANTIDAD <span id="send-res-max-label" style="color:var(--accent)"></span></label>
      <input type="number" id="send-res-amount" placeholder="Cantidad" min="1">
    </div>
    <div class="field-group" style="margin-bottom:14px">
      <label>NOTA (opcional)</label>
      <input type="text" id="send-res-note" placeholder="Motivo" maxlength="80">
    </div>
    <button class="btn-primary btn-full" onclick="doSendResource()">📦 TRANSFERIR</button>
  `);
  updateSendResMax();
}

function updateSendResMax() {
  const sel = document.getElementById('send-res-type');
  if (!sel) return;
  const max   = sel.options[sel.selectedIndex]?.dataset.max || 0;
  const label = document.getElementById('send-res-max-label');
  if (label) label.textContent = `(máx ${max})`;
  const inp = document.getElementById('send-res-amount');
  if (inp) inp.max = max;
}

async function doSendResource() {
  const type   = document.getElementById('send-res-type')?.value;
  const to     = document.getElementById('send-res-to')?.value?.trim();
  const amount = parseInt(document.getElementById('send-res-amount')?.value);
  const note   = document.getElementById('send-res-note')?.value?.trim();

  if (!type || !to || !amount) return showToast('Completa todos los campos', 'error');

  try {
    const data = await API.sendResource(to, type, amount, note);
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(data.message, 'success');
    closeModal();
    renderTransactions();
  } catch { showToast('Error al transferir', 'error'); }
}

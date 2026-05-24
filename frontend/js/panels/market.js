async function renderMarket() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando mercado...</div>';

  try {
    const data = await API.getListings();
    const listings = data.listings || [];
    const p = STATE.player;
    const warehouseEntries = Object.entries(p.warehouse || {}).filter(([,v]) => v > 0);

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">📈 <span>MERCADO</span></div>

        <!-- Sell button -->
        ${warehouseEntries.length > 0
          ? `<button class="btn-primary btn-full" style="margin-bottom:14px" onclick="showSellModal()">
              📤 VENDER RECURSOS
             </button>`
          : `<div class="card" style="margin-bottom:14px">
              <div class="empty">Tu almacén está vacío. Trabaja en fábricas para obtener recursos.</div>
             </div>`
        }

        <!-- Filter row -->
        <div class="map-filter-row" style="margin-bottom:12px">
          <button class="map-filter-btn active" onclick="filterListings('all', this)">TODOS</button>
          <button class="map-filter-btn" onclick="filterListings('gold', this)">⚱️</button>
          <button class="map-filter-btn" onclick="filterListings('oil', this)">🛢️</button>
          <button class="map-filter-btn" onclick="filterListings('mineral', this)">⛏️</button>
          <button class="map-filter-btn" onclick="filterListings('diamond', this)">💎</button>
          <button class="map-filter-btn" onclick="filterListings('uranium', this)">☢️</button>
          <button class="map-filter-btn" onclick="filterListings('my', this)">MIS VENTAS</button>
        </div>

        <div id="listings-list">
          ${renderListings(listings)}
        </div>
      </div>`;

    window._allListings = listings;
  } catch {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar el mercado</div></div>`;
  }
}

function renderListings(listings) {
  if (listings.length === 0) {
    return '<div class="card"><div class="empty">No hay ofertas en el mercado</div></div>';
  }
  const p = STATE.player;
  return listings.map(l => {
    const isOwn = l.sellerId === p.id;
    const canAfford = p.money >= l.totalPrice * 1.05;
    const timeLeft = l.expiresAt ? Math.max(0, Math.floor((l.expiresAt - Date.now()) / 86400000)) : 7;

    return `
      <div class="listing-card">
        <div class="listing-header">
          <div>
            <div class="listing-resource">${getResourceIcon(l.resourceType)} ${l.resourceType.toUpperCase()}</div>
            <div class="listing-meta">Vendedor: ${l.sellerNickname} · Expira en ${timeLeft}d</div>
          </div>
          <div style="text-align:right">
            <div class="listing-price">$${l.pricePerUnit}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">por unidad</div>
          </div>
        </div>
        <div class="listing-footer">
          <div>
            <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">Cantidad: <strong style="color:var(--text-primary)">${l.amount}</strong></div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--money)">Total: $${Math.floor(l.totalPrice)}</div>
          </div>
          ${isOwn
            ? `<button class="btn-danger btn-sm" onclick="cancelListing('${l.id}')">🗑️ CANCELAR</button>`
            : `<button class="btn-primary btn-sm ${!canAfford ? 'disabled' : ''}" onclick="showBuyModal('${l.id}', '${l.resourceType}', ${l.amount}, ${l.pricePerUnit})" ${!canAfford ? 'disabled' : ''}>
                🛒 COMPRAR
               </button>`
          }
        </div>
      </div>`;
  }).join('');
}

function filterListings(type, btn) {
  document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const all = window._allListings || [];
  let filtered;
  if (type === 'all') filtered = all;
  else if (type === 'my') filtered = all.filter(l => l.sellerId === STATE.player.id);
  else filtered = all.filter(l => l.resourceType === type);
  document.getElementById('listings-list').innerHTML = renderListings(filtered);
}

function showSellModal() {
  const p = STATE.player;
  const warehouseEntries = Object.entries(p.warehouse || {}).filter(([,v]) => v > 0);

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📤 VENDER RECURSO</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>RECURSO</label>
      <select id="sell-resource" onchange="updateSellMax()">
        ${warehouseEntries.map(([type, qty]) => `
          <option value="${type}" data-max="${qty}">${getResourceIcon(type)} ${type.toUpperCase()} (${qty} disponibles)</option>
        `).join('')}
      </select>
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>CANTIDAD <span id="sell-max-label" style="color:var(--accent)"></span></label>
      <input type="number" id="sell-amount" placeholder="Cantidad" min="1" oninput="updateSellTotal()">
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>PRECIO POR UNIDAD ($)</label>
      <input type="number" id="sell-price" placeholder="Precio unitario" min="1" oninput="updateSellTotal()">
    </div>

    <div id="sell-total" style="background:var(--bg-input);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">
      Total estimado: $0 · Comisión mercado: 5%
    </div>

    <button class="btn-primary btn-full" onclick="doSell()">📤 PUBLICAR OFERTA</button>
  `);
  updateSellMax();
}

function updateSellMax() {
  const sel = document.getElementById('sell-resource');
  if (!sel) return;
  const max = sel.options[sel.selectedIndex]?.dataset.max || 0;
  const label = document.getElementById('sell-max-label');
  if (label) label.textContent = `(máx ${max})`;
  const amountInput = document.getElementById('sell-amount');
  if (amountInput) amountInput.max = max;
  updateSellTotal();
}

function updateSellTotal() {
  const amount = parseInt(document.getElementById('sell-amount')?.value) || 0;
  const price = parseFloat(document.getElementById('sell-price')?.value) || 0;
  const total = amount * price;
  const fee = total * 0.05;
  const el = document.getElementById('sell-total');
  if (el) el.innerHTML = `Total: <strong style="color:var(--money)">$${Math.floor(total)}</strong> · Comisión: <strong style="color:var(--danger)">$${Math.floor(fee)}</strong> · Recibes: <strong style="color:var(--success)">$${Math.floor(total - fee)}</strong>`;
}

async function doSell() {
  const resourceType = document.getElementById('sell-resource').value;
  const amount = parseInt(document.getElementById('sell-amount').value);
  const price = parseFloat(document.getElementById('sell-price').value);

  if (!amount || !price || amount <= 0 || price <= 0) return showToast('Completa todos los campos', 'error');

  const data = await API.sellResource(resourceType, amount, price);
  if (data.error) return showToast(data.error, 'error');

  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);

  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderMarket();
}

function showBuyModal(listingId, resourceType, amount, pricePerUnit) {
  const total = amount * pricePerUnit;
  const fee = Math.floor(total * 0.05);

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">
      🛒 ${getResourceIcon(resourceType)} ${resourceType.toUpperCase()}
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>CANTIDAD (disponible: ${amount})</label>
      <input type="number" id="buy-amount" value="${amount}" min="1" max="${amount}" oninput="updateBuyTotal(${pricePerUnit})">
    </div>

    <div id="buy-total" style="background:var(--bg-input);border-radius:8px;padding:12px;margin-bottom:14px;font-family:var(--font-mono);font-size:12px">
      <div class="flex-between"><span style="color:var(--text-secondary)">Precio unitario:</span><span>$${pricePerUnit}</span></div>
      <div class="flex-between"><span style="color:var(--text-secondary)">Subtotal:</span><span id="buy-sub">$${total}</span></div>
      <div class="flex-between"><span style="color:var(--text-secondary)">Comisión (5%):</span><span id="buy-fee" style="color:var(--danger)">+$${fee}</span></div>
      <div class="flex-between" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
        <span style="color:var(--text-primary);font-weight:700">TOTAL:</span>
        <span id="buy-total-val" style="color:var(--money);font-size:14px;font-weight:700">$${total + fee}</span>
      </div>
    </div>

    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);margin-bottom:12px">
      Tu dinero: $${formatMoney(STATE.player.money)}
    </div>

    <button class="btn-primary btn-full" onclick="doBuy('${listingId}')">✅ CONFIRMAR COMPRA</button>
  `);
}

function updateBuyTotal(pricePerUnit) {
  const amount = parseInt(document.getElementById('buy-amount')?.value) || 0;
  const sub = amount * pricePerUnit;
  const fee = Math.floor(sub * 0.05);
  document.getElementById('buy-sub').textContent = '$' + sub;
  document.getElementById('buy-fee').textContent = '+$' + fee;
  document.getElementById('buy-total-val').textContent = '$' + (sub + fee);
}

async function doBuy(listingId) {
  const amount = parseInt(document.getElementById('buy-amount').value);
  const data = await API.buyListing(listingId, amount);
  if (data.error) return showToast(data.error, 'error');

  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);

  showToast('✅ ' + data.message, 'success');
  closeModal();
  renderMarket();
}

async function cancelListing(listingId) {
  const data = await API.cancelListing(listingId);
  if (data.error) return showToast(data.error, 'error');

  const pd = await API.getProfile();
  if (pd.player) updatePlayerState(pd.player);

  showToast('✅ ' + data.message, 'success');
  renderMarket();
}

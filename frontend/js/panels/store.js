// ─── TIENDA — GEOPOLÍTICA COLOMBIA ────────────────────────────────────────────
// Precios rebalanceados: más oro por paquete, premium más barato

const STORE_PACKAGES = [
  {
    id: 'starter', name: 'ARRANQUE', icon: '🌱',
    gold: 800, bonus: 0, usd: 0.99,
    color: '#4a9eff', popular: false,
    description: 'Ideal para comenzar'
  },
  {
    id: 'explorer', name: 'EXPLORADOR', icon: '⚡',
    gold: 2000, bonus: 500, usd: 2.99,
    color: '#00d4ff', popular: false,
    description: '+500 oro bonus · Buen valor'
  },
  {
    id: 'commander', name: 'COMANDANTE', icon: '🏆',
    gold: 5000, bonus: 2000, usd: 6.99,
    color: '#ffd700', popular: true,
    description: '+2000 bonus · MÁS POPULAR'
  },
  {
    id: 'general', name: 'GENERAL', icon: '⚔️',
    gold: 12000, bonus: 6000, usd: 14.99,
    color: '#ff9800', popular: false,
    description: '+6000 bonus · Gran valor'
  },
  {
    id: 'president', name: 'PRESIDENTE', icon: '👑',
    gold: 30000, bonus: 20000, usd: 29.99,
    color: '#ff6b35', popular: false,
    description: '+20000 bonus · Máximo poder'
  }
];

const PREMIUM_PLANS = [
  {
    id: 'premium_7',
    name: 'PREMIUM 7 DÍAS',
    icon: '⭐',
    days: 7,
    usd: 0.99,
    color: '#ffd700',
    badge: 'PRUEBA',
    benefits: [
      '+50 energía máxima',
      '+80% XP al trabajar',
      'Regeneración mejorada',
      'Chat destacado ⭐',
      'Trabajo automático ⚙️'
    ]
  },
  {
    id: 'premium_30',
    name: 'PREMIUM 30 DÍAS',
    icon: '🌟',
    days: 30,
    usd: 2.99,
    color: '#ffa500',
    badge: 'POPULAR',
    benefits: [
      '+50 energía máxima',
      '+80% XP al trabajar',
      'Regeneración mejorada',
      'Chat destacado ⭐',
      'Trabajo automático ⚙️',
      'Acceso a rankings especiales'
    ]
  },
  {
    id: 'premium_90',
    name: 'PREMIUM 90 DÍAS',
    icon: '💎',
    days: 90,
    usd: 6.99,
    color: '#b9f2ff',
    badge: 'MEJOR PRECIO',
    benefits: [
      '+50 energía máxima',
      '+80% XP al trabajar',
      'Regeneración mejorada',
      'Chat destacado ⭐',
      'Trabajo automático ⚙️',
      'Acceso a rankings especiales',
      'Insignia exclusiva 💎'
    ]
  },
  {
    id: 'premium_365',
    name: 'PREMIUM 1 AÑO',
    icon: '🔱',
    days: 365,
    usd: 19.99,
    color: '#e040fb',
    badge: 'VIP',
    benefits: [
      '+50 energía máxima',
      '+80% XP al trabajar',
      'Regeneración mejorada',
      'Chat destacado ⭐',
      'Trabajo automático ⚙️',
      'Acceso a rankings especiales',
      'Insignia VIP exclusiva 🔱',
      'Soporte prioritario'
    ]
  }
];

// ── CONFIGURA TU ID DE BINANCE PAY AQUÍ ──────────────────────────────────────
const BINANCE_PAY_ID = 'TU_BINANCE_PAY_ID';

async function renderStore() {
  const content = document.getElementById('game-content');
  const p = STATE.player;
  const premiumActive   = p.premium && p.premiumUntil && p.premiumUntil > Date.now();
  const premiumDaysLeft = premiumActive ? Math.ceil((p.premiumUntil - Date.now()) / 86400000) : 0;

  content.innerHTML = `
    <div class="panel">
      <div class="panel-title">🛍️ <span>TIENDA</span></div>

      ${premiumActive ? `
        <div style="background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,165,0,0.06));
          border:1px solid rgba(255,215,0,0.3);border-radius:var(--radius-lg);
          padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
          <div style="font-size:28px">⭐</div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--gold)">PREMIUM ACTIVO</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${premiumDaysLeft} días restantes · Trabajo automático ✅</div>
          </div>
          <button class="btn-gold btn-sm" onclick="navigate('work')">⚙️ Autowork</button>
        </div>` : `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
          padding:12px 14px;margin-bottom:14px;cursor:pointer"
          onclick="document.getElementById('premium-section').scrollIntoView({behavior:'smooth'})">
          <div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--accent)">
            ⭐ Activa Premium desde $0.99 USD
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:3px">
            +50 energía · +80% XP · Trabajo automático · Desde 7 días
          </div>
        </div>`}

      <!-- Cómo pagar -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:16px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:8px">💳 CÓMO FUNCIONA</div>
        ${[
          '1. Elige un paquete y toca COMPRAR',
          '2. Paga via Binance Pay al ID del juego',
          '3. Pon tu nickname en el comentario del pago',
          '4. Envía el comprobante por el chat global',
          '5. El admin verifica y entrega en minutos'
        ].map((s,i) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <div style="width:18px;height:18px;background:var(--accent);border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              font-family:var(--font-mono);font-size:9px;font-weight:700;
              color:var(--bg-base);flex-shrink:0">${i+1}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${s}</div>
          </div>`).join('')}
      </div>

      <!-- Paquetes de oro -->
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:10px">⚱️ PAQUETES DE ORO</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
        ${STORE_PACKAGES.map(pkg => `
          <div style="background:var(--bg-card);border:1px solid ${pkg.popular?pkg.color:'var(--border)'};
            border-radius:var(--radius-lg);padding:12px 14px;position:relative;overflow:hidden;
            cursor:pointer;transition:0.18s ease"
            onclick="showPurchaseModal('${pkg.id}','gold')"
            onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform=''"
            ontouchstart="this.style.transform='scale(0.98)'" ontouchend="this.style.transform=''">
            ${pkg.popular?`<div style="position:absolute;top:0;right:0;background:${pkg.color};color:#000;
              font-family:var(--font-mono);font-size:9px;font-weight:700;padding:3px 10px;
              border-radius:0 var(--radius-lg) 0 8px">⭐ POPULAR</div>`:''}
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:44px;height:44px;background:${pkg.color}22;border:1px solid ${pkg.color}44;
                border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${pkg.icon}</div>
              <div style="flex:1">
                <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${pkg.color}">${pkg.name}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:1px">${pkg.description}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
                  <span style="font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--gold)">${(pkg.gold+pkg.bonus).toLocaleString()} ⚱️</span>
                  ${pkg.bonus>0?`<span style="font-family:var(--font-mono);font-size:9px;color:var(--success);
                    background:rgba(0,230,118,0.1);border:1px solid rgba(0,230,118,0.2);
                    padding:2px 6px;border-radius:4px">+${pkg.bonus.toLocaleString()} BONUS</span>`:''}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--money)">$${pkg.usd}</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">USD</div>
                <div style="margin-top:5px;background:var(--accent);color:var(--bg-base);
                  font-family:var(--font-display);font-size:10px;font-weight:700;
                  padding:4px 8px;border-radius:6px">COMPRAR</div>
              </div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Premium plans -->
      <div id="premium-section" style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:10px">⭐ PLANES PREMIUM</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
        ${PREMIUM_PLANS.map(plan => `
          <div style="background:var(--bg-card);border:1px solid rgba(255,215,0,0.2);
            border-radius:var(--radius-lg);padding:12px 14px;cursor:pointer;transition:0.18s ease;position:relative"
            onclick="showPurchaseModal('${plan.id}','premium')"
            onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform=''">
            ${plan.badge?`<div style="position:absolute;top:0;right:0;background:${plan.color};color:#000;
              font-family:var(--font-mono);font-size:9px;font-weight:700;padding:3px 10px;
              border-radius:0 var(--radius-lg) 0 8px">${plan.badge}</div>`:''}
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div>
                <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:${plan.color}">${plan.icon} ${plan.name}</div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-top:2px">${plan.days} días</div>
              </div>
              <div style="text-align:right">
                <div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--money)">$${plan.usd}</div>
                <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">USD</div>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">
              ${plan.benefits.map(b => `
                <span style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.15);
                  border-radius:5px;padding:3px 7px;font-size:10px;color:var(--gold)">✓ ${b}</span>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <!-- Donaciones -->
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:10px">💛 APOYA EL JUEGO</div>
      <div style="background:linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,165,0,0.03));
        border:1px solid rgba(255,215,0,0.2);border-radius:var(--radius-lg);padding:14px;margin-bottom:10px">
        <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--gold);margin-bottom:6px">
          💛 DONACIONES
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">
          Cada $1 USD donado = <strong style="color:var(--gold)">50 ⚱️ oro</strong> de agradecimiento.
          Tu apoyo financia guerras, diplomacia, elecciones y más.
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
          ${[1,2,5,10,20,50].map(amt => `
            <button style="background:var(--bg-card2);border:1px solid var(--border);border-radius:var(--radius);
              padding:8px 4px;font-family:var(--font-display);font-size:13px;font-weight:700;
              color:var(--gold);cursor:pointer;transition:0.18s ease"
              onclick="showDonationModal(${amt})"
              onmousedown="this.style.borderColor='var(--gold)'" onmouseup="this.style.borderColor='var(--border)'">
              $${amt}<br><span style="font-family:var(--font-mono);font-size:9px;color:var(--text-secondary)">${amt*50}⚱️</span>
            </button>`).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <input type="number" id="custom-donation" placeholder="Otro monto (USD)" min="0.5" step="0.5"
            style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);
            color:var(--text-primary);padding:9px 12px;font-size:13px;outline:none">
          <button class="btn-gold" onclick="showCustomDonation()">DONAR</button>
        </div>
      </div>

      <button class="btn-ghost btn-full" onclick="showMyPurchases()">📜 VER MIS COMPRAS</button>
    </div>`;
}

// ─── Modales de compra ────────────────────────────────────────────────────────

function showPurchaseModal(itemId, type) {
  let item, goldAmount, usdAmount, itemName, itemIcon;
  if (type === 'gold') {
    item       = STORE_PACKAGES.find(p => p.id === itemId);
    goldAmount = item.gold + item.bonus;
    usdAmount  = item.usd;
    itemName   = item.name;
    itemIcon   = item.icon;
  } else {
    item       = PREMIUM_PLANS.find(p => p.id === itemId);
    goldAmount = 0;
    usdAmount  = item.usd;
    itemName   = item.name;
    itemIcon   = item.icon;
  }
  const p = STATE.player;

  openModal(`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:40px;margin-bottom:8px">${itemIcon}</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700">${itemName}</div>
      <div style="font-family:var(--font-display);font-size:28px;color:var(--money);margin-top:6px">$${usdAmount} USD</div>
      ${goldAmount>0?`<div style="font-family:var(--font-mono);font-size:13px;color:var(--gold);margin-top:4px">${goldAmount.toLocaleString()} ⚱️ oro</div>`:''}
    </div>

    <div style="background:rgba(243,186,47,0.08);border:1px solid rgba(243,186,47,0.3);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px">
      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:#f3ba2f;margin-bottom:8px">◈ BINANCE PAY</div>
      <div style="background:var(--bg-input);border-radius:var(--radius);padding:10px;text-align:center;margin-bottom:8px">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:5px">ID DEL JUEGO</div>
        <div style="font-family:var(--font-display);font-size:24px;font-weight:700;color:#f3ba2f;letter-spacing:3px">${BINANCE_PAY_ID}</div>
        <button onclick="copyBinanceId()" style="margin-top:7px;background:rgba(243,186,47,0.12);border:1px solid rgba(243,186,47,0.3);
          border-radius:6px;padding:5px 14px;font-family:var(--font-mono);font-size:10px;color:#f3ba2f;cursor:pointer">📋 COPIAR</button>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">
        1. Abre Binance → Pagar → ID de pago<br>
        2. Envía exactamente <strong style="color:var(--money)">$${usdAmount} USD</strong> en USDT<br>
        3. Escribe en comentario: <strong style="color:var(--accent)">${p.nickname}</strong>
      </div>
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>ID DE TRANSACCIÓN (opcional)</label>
      <input type="text" id="tx-hash" placeholder="Número de transacción Binance">
    </div>

    <button class="btn-primary btn-full" style="margin-bottom:6px"
      onclick="submitPayment('${itemId}','${type}',${usdAmount},'${itemName}')">
      ✅ YA PAGUÉ — NOTIFICAR
    </button>
    <div style="font-size:10px;color:var(--text-dim);text-align:center">Tu compra se entrega en minutos tras verificación</div>
  `);
}

function copyBinanceId() {
  navigator.clipboard?.writeText(BINANCE_PAY_ID)
    .then(() => showToast('✅ ID copiado', 'success'))
    .catch(() => showToast('ID: ' + BINANCE_PAY_ID, ''));
}

async function submitPayment(itemId, type, usdAmount, itemName) {
  const txHash = document.getElementById('tx-hash')?.value?.trim() || '';
  const p      = STATE.player;
  try {
    const data = await API.submitPayment({ itemId, type, usdAmount, itemName, txHash, playerNickname: p.nickname });
    if (data.error) return showToast(data.error, 'error');
    closeModal();
    showToast('✅ Pago notificado. El admin verificará pronto.', 'success', 5000);
    await API.sendChat('global', `💳 Pagué $${usdAmount} USD por "${itemName}". TX: ${txHash||'ver captura'}. Esperando verificación 🙏`);
  } catch { showToast('Error al enviar. Notifica por el chat.', 'error'); }
}

// ─── Donaciones ───────────────────────────────────────────────────────────────

function showDonationModal(amount) {
  const p         = STATE.player;
  const bonusGold = amount * 50;
  openModal(`
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:40px;margin-bottom:8px">💛</div>
      <div style="font-family:var(--font-display);font-size:20px;font-weight:700">DONACIÓN</div>
      <div style="font-family:var(--font-display);font-size:32px;color:var(--gold);margin-top:6px">$${amount} USD</div>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--success);margin-top:4px">+${bonusGold} ⚱️ como agradecimiento</div>
    </div>
    <div style="background:rgba(243,186,47,0.08);border:1px solid rgba(243,186,47,0.3);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px">
      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:#f3ba2f;margin-bottom:6px">◈ BINANCE PAY ID: ${BINANCE_PAY_ID}</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.7">
        Envía <strong style="color:var(--money)">$${amount} USDT</strong><br>
        Comentario: <strong style="color:var(--accent)">${p.nickname} DONACION</strong>
      </div>
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>ID DE TRANSACCIÓN</label>
      <input type="text" id="donation-tx" placeholder="ID de transacción Binance">
    </div>
    <button class="btn-gold btn-full" onclick="submitDonation(${amount})">💛 NOTIFICAR DONACIÓN</button>
  `);
}

function showCustomDonation() {
  const val = parseFloat(document.getElementById('custom-donation')?.value);
  if (!val || val < 0.5) return showToast('Mínimo $0.50 USD', 'error');
  showDonationModal(Math.round(val * 100) / 100);
}

async function submitDonation(amount) {
  const txHash = document.getElementById('donation-tx')?.value?.trim() || '';
  const p      = STATE.player;
  try {
    const data = await API.submitDonation({ usdAmount: amount, txHash, playerNickname: p.nickname });
    if (data.error) return showToast(data.error, 'error');
    closeModal();
    showToast('💛 ¡Gracias! El admin verificará tu donación.', 'gold', 5000);
    await API.sendChat('global', `💛 Doné $${amount} USD al juego. TX: ${txHash||'ver captura'}. ¡Apoyando el proyecto!`);
  } catch { showToast('Error al enviar. Notifica por el chat.', 'error'); }
}

// ─── Historial de compras ─────────────────────────────────────────────────────

async function showMyPurchases() {
  try {
    const data      = await API.getMyPurchases();
    const purchases = data.purchases  || [];
    const donations = data.donations  || [];
    const all       = [...purchases, ...donations].sort((a,b) => b.createdAt - a.createdAt);

    const statusBadge = (s) => ({
      pending:  ['⏳ PENDIENTE', 'badge-warning'],
      approved: ['✅ APROBADO',  'badge-success'],
      rejected: ['❌ RECHAZADO', 'badge-danger']
    }[s] || ['⏳', 'badge-warning']);

    openModal(`
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📜 MIS COMPRAS</div>
      ${all.length === 0
        ? '<div class="empty">No tienes compras ni donaciones aún</div>'
        : all.map(t => {
            const [label, cls] = statusBadge(t.status);
            return `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                  <div>
                    <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${t.itemName||'Donación'}</div>
                    <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">${formatTime(t.createdAt)}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-family:var(--font-display);font-size:15px;color:var(--money)">$${t.usdAmount} USD</div>
                    <span class="badge ${cls}" style="margin-top:4px">${label}</span>
                  </div>
                </div>
              </div>`;
          }).join('')}
    `);
  } catch { showToast('Error al cargar historial', 'error'); }
}

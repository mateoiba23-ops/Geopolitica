// ─── PANEL DE GUERRAS ─────────────────────────────────────────────────────────

async function renderWar() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando guerras...</div>';

  try {
    const p = STATE.player;
    const [warListData, myWarsData] = await Promise.all([
      API.getWarList(),
      API.getMyStateWars()
    ]);

    const allWars  = warListData.wars  || [];
    const myWars   = myWarsData.wars   || [];
    const atWar    = myWarsData.atWar  || false;
    const myState  = p.stateId ? db_getState(p.stateId) : null;

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">⚔️ <span>GUERRAS</span></div>

        <!-- Estado de mi estado -->
        ${atWar ? renderWarStatus(myWars, p) : renderPeaceStatus(p)}

        <!-- Mis guerras activas -->
        ${myWars.length > 0 ? `
          <div class="section-header" style="margin-bottom:10px">
            <div class="section-title">⚔️ MIS GUERRAS</div>
            <span class="badge badge-danger">${myWars.length} ACTIVA${myWars.length > 1 ? 'S' : ''}</span>
          </div>
          ${myWars.map(w => renderWarCard(w, p, true)).join('')}
        ` : ''}

        <!-- Ataque rápido si estoy en guerra -->
        ${atWar ? renderAttackPanel(p) : ''}

        <!-- Todas las guerras activas en el juego -->
        <div class="section-header" style="margin-bottom:10px">
          <div class="section-title">🌍 CONFLICTOS ACTIVOS</div>
        </div>
        ${allWars.length === 0
          ? '<div class="card"><div class="empty">No hay guerras activas. El mundo está en paz.</div></div>'
          : allWars.filter(w => !myWars.find(mw => mw.id === w.id))
              .map(w => renderWarCard(w, p, false)).join('') ||
            '<div style="font-size:12px;color:var(--text-dim);padding:8px">Solo tus guerras están activas.</div>'}
      </div>`;

  } catch(e) {
    console.error(e);
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar guerras</div></div>`;
  }
}

function db_getState(stateId) {
  // Try to find from allStates cache if available
  const all = window._politicsAllStates || [];
  return all.find(s => s.id === stateId) || null;
}

function renderWarStatus(myWars, player) {
  const war = myWars[0];
  const isAttacker = war.attackerStateId === player.stateId;
  const enemyName  = isAttacker ? war.defenderName : war.attackerName;
  const elapsed    = Math.floor((Date.now() - war.startedAt) / 3600000);

  return `
    <div style="background:linear-gradient(135deg,rgba(255,61,87,0.12),rgba(255,61,87,0.04));
      border:1px solid rgba(255,61,87,0.4);border-radius:var(--radius-lg);padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:28px">⚔️</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--danger)">
            EN GUERRA CON ${enemyName.toUpperCase()}
          </div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-top:2px">
            Hace ${elapsed}h · ${war.attackCount || 0} ataques totales
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--danger)">
            Daño infligido: ${isAttacker ? war.attackerDamage||0 : war.defenderDamage||0}
          </div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--money)">
            Botín: $${formatMoney(isAttacker ? war.attackerLoot||0 : war.defenderLoot||0)}
          </div>
        </div>
      </div>
    </div>`;
}

function renderPeaceStatus(player) {
  if (!player.stateId) return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
      padding:12px 14px;margin-bottom:14px;text-align:center">
      <div style="font-size:12px;color:var(--text-secondary)">
        No perteneces a ningún estado. Las guerras se declaran entre estados.
      </div>
      <button class="btn-ghost btn-sm" style="margin-top:8px" onclick="navigate('parties')">🗳️ Ver partidos</button>
    </div>`;

  return `
    <div style="background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.2);
      border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:14px">
      <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--success)">
        🕊️ TU ESTADO ESTÁ EN PAZ
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
        Las guerras se declaran mediante leyes en el parlamento.
      </div>
    </div>`;
}

function renderAttackPanel(player) {
  const energy    = Math.floor(player.energy);
  const canAttack = energy >= 30;

  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div class="card-title">⚔️ ATACAR</div>
        <span class="badge ${canAttack ? 'badge-danger' : 'badge-warning'}">${energy}⚡</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
        Cuesta 30⚡ por ataque. Ganas XP de Fuerza y Aguante. Puedes saquear hasta 5% del dinero del enemigo.
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="attack-target" placeholder="Nickname del enemigo"
          style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;
          color:var(--text-primary);padding:9px 12px;font-size:14px;outline:none">
        <button class="btn-danger" onclick="doAttack()" ${!canAttack ? 'disabled style="opacity:0.5"' : ''}>
          ⚔️ ATACAR
        </button>
      </div>
      ${!canAttack ? `<div style="font-size:11px;color:var(--warning);margin-top:6px">⚡ Necesitas 30 de energía</div>` : ''}
      <div style="font-size:10px;color:var(--text-dim);margin-top:6px;font-family:var(--font-mono)">
        Cooldown: 1 min entre ataques · Solo jugadores de estados enemigos
      </div>
    </div>`;
}

function renderWarCard(war, player, isMyWar) {
  const isAttacker   = war.attackerStateId === player.stateId;
  const elapsed      = Math.floor((Date.now() - war.startedAt) / 3600000);
  const isLeader     = player.stateRole === 'leader';
  const log          = (war.log || []).slice(0, 5);

  return `
    <div style="background:var(--bg-card);border:1px solid ${isMyWar ? 'rgba(255,61,87,0.3)' : 'var(--border)'};
      border-radius:var(--radius-lg);padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="font-size:24px">⚔️</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700">
            ${war.attackerName} vs ${war.defenderName}
          </div>
          <div style="font-size:11px;color:var(--text-secondary)">Hace ${elapsed}h · ${war.attackCount||0} ataques</div>
        </div>
        ${isMyWar && isLeader ? `
          <button class="btn-ghost btn-sm" style="color:var(--warning);border-color:var(--warning)"
            onclick="confirmSurrender('${war.id}','${isAttacker ? war.defenderName : war.attackerName}')">
            🏳️ Rendirse
          </button>` : ''}
      </div>

      <!-- Stats -->
      <div class="grid-2" style="gap:8px;margin-bottom:8px">
        <div style="background:${war.attackerStateId===player.stateId?'rgba(255,61,87,0.08)':'var(--bg-input)'};
          border-radius:8px;padding:8px;text-align:center">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">⚔️ ${war.attackerName}</div>
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--danger)">${war.attackerDamage||0} dmg</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--money)">$${formatMoney(war.attackerLoot||0)}</div>
        </div>
        <div style="background:${war.defenderStateId===player.stateId?'rgba(255,61,87,0.08)':'var(--bg-input)'};
          border-radius:8px;padding:8px;text-align:center">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">🛡️ ${war.defenderName}</div>
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent)">${war.defenderDamage||0} dmg</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--money)">$${formatMoney(war.defenderLoot||0)}</div>
        </div>
      </div>

      <!-- Log reciente -->
      ${log.length > 0 ? `
        <div style="border-top:1px solid var(--border);padding-top:8px">
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:6px">ÚLTIMOS ATAQUES</div>
          ${log.map(entry => `
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;font-size:11px">
              <span style="color:var(--danger);font-family:var(--font-mono);font-size:10px">⚔️${entry.damage}</span>
              <span style="color:var(--text-secondary)">${entry.attackerNickname} → ${entry.defenderNickname}</span>
              ${entry.loot > 0 ? `<span style="color:var(--money);font-family:var(--font-mono);font-size:10px">+$${formatMoney(entry.loot)}</span>` : ''}
              <span style="color:var(--text-dim);font-size:10px;margin-left:auto">${formatTime(entry.ts)}</span>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

// ─── Acciones ─────────────────────────────────────────────────────────────────

async function doAttack() {
  const target = document.getElementById('attack-target')?.value?.trim();
  if (!target) return showToast('Escribe el nickname del objetivo', 'error');

  const btn = document.querySelector('#attack-target + button');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Atacando...'; }

  try {
    const data = await API.attackPlayer(target);
    if (btn) { btn.disabled = false; btn.textContent = '⚔️ ATACAR'; }

    if (data.error) return showToast(data.error, 'error');

    updatePlayerState(data.attacker);

    const r = data.result;
    let msg = `⚔️ ${data.message}`;
    if (r.reduction > 0) msg += ` (def -${r.reduction}%)`;
    showToast(msg, r.loot > 0 ? 'success' : '', 4000);

    if (r.skillMsgs && r.skillMsgs.length > 0) {
      setTimeout(() => showToast(r.skillMsgs[0], 'success', 3000), 1000);
    }

    // Refresh
    renderWar();
  } catch {
    if (btn) { btn.disabled = false; btn.textContent = '⚔️ ATACAR'; }
    showToast('Error al atacar', 'error');
  }
}

function confirmSurrender(warId, enemyName) {
  confirmAction(
    'Rendirse',
    `¿Seguro que quieres rendirte ante ${enemyName}? La guerra terminará.`,
    async () => {
      const data = await API.surrenderWar(warId);
      if (data.error) return showToast(data.error, 'error');
      showToast('🏳️ ' + data.message, '');
      renderWar();
    }
  );
}

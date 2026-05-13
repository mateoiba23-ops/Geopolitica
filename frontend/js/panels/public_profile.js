// ─── PUBLIC PROFILE ───────────────────────────────────────────────────────────
// Abre el perfil público de cualquier jugador en un modal

async function showPublicProfile(nickname) {
  openModal(`<div class="loading">⏳ Cargando perfil...</div>`);

  try {
    const [playerData, txData] = await Promise.all([
      API.getPlayerByNick(nickname),
      API.getPlayerTransactions(nickname)
    ]);

    if (playerData.error || !playerData.player) {
      document.getElementById('modal-content').innerHTML =
        `<div class="empty">Jugador no encontrado</div>`;
      return;
    }

    const p     = playerData.player;
    const txs   = txData.transactions || [];
    const me    = STATE.player;
    const isMe  = p.nickname === me.nickname;

    // Skills display
    const skills = p.skills || { strength:1, education:1, endurance:1 };
    const workCap = 10 + (skills.education||1) * 2;

    // State info
    let stateHtml = '';
    if (p.stateId) {
      try {
        const sd = await API.getState(p.stateId);
        if (sd.state) {
          stateHtml = `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
              background:${sd.state.color}11;border:1px solid ${sd.state.color}44;
              border-radius:10px;margin-bottom:12px;cursor:pointer"
              onclick="closeModal();navigate('politics')">
              <div style="font-size:22px">${sd.state.shield}</div>
              <div>
                <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:${sd.state.color}">${sd.state.name}</div>
                <div style="font-size:10px;color:var(--text-dim)">${sd.state.systemName}</div>
              </div>
            </div>`;
        }
      } catch {}
    }

    document.getElementById('modal-content').innerHTML = `
      <!-- Avatar y nombre -->
      <div style="text-align:center;margin-bottom:14px">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,var(--accent2),var(--accent));
          border-radius:50%;display:flex;align-items:center;justify-content:center;
          font-size:28px;margin:0 auto 10px;box-shadow:0 0 20px rgba(0,212,255,0.3)">👤</div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:700">
          ${p.nickname}${p.premium ? ' ⭐' : ''}
        </div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);margin-top:4px">
          NIVEL ${p.level} · TRABAJO ${p.workLevel}/${workCap}
        </div>
        ${p.role === 'admin' ? '<span class="badge badge-gold" style="margin-top:6px">👑 ADMINISTRADOR</span>' : ''}
      </div>

      ${stateHtml}

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">
        ${[
          { label:'NIVEL',    val: p.level,                 color:'var(--accent)' },
          { label:'LAB.',     val: p.workLevel,              color:'var(--text-primary)' },
          { label:'FÁBRICAS', val: p.factories,              color:'var(--gold)' },
          { label:'FUERZA',   val: '⚔️'+skills.strength,    color:'var(--danger)' },
          { label:'EDUCACIÓN',val: '📚'+skills.education,   color:'var(--accent)' },
          { label:'AGUANTE',  val: '🛡️'+skills.endurance,  color:'var(--success)' }
        ].map(s => `
          <div style="background:var(--bg-input);border-radius:8px;padding:8px;text-align:center">
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${s.color}">${s.val}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-top:2px">${s.label}</div>
          </div>`).join('')}
      </div>

      <!-- Info -->
      <div class="info-row"><span class="info-label">REGIÓN</span><span class="info-val">📍 ${getRegionName(p.regionId)}</span></div>
      <div class="info-row"><span class="info-label">REGISTRO</span><span class="info-val">${new Date(p.registeredAt).toLocaleDateString('es-CO')}</span></div>
      <div class="info-row"><span class="info-label">ÚLTIMA VEZ</span><span class="info-val">${formatTime(p.lastSeen)}</span></div>

      <!-- Transacciones recientes con este jugador -->
      ${txs.length > 0 ? `
        <div style="margin-top:14px">
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);letter-spacing:2px;margin-bottom:8px">TRANSACCIONES RECIENTES</div>
          ${txs.slice(0,5).map(tx => {
            const isIn = tx.toId === me.id || (tx.isIncoming !== undefined ? tx.isIncoming : false);
            return `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
                <div style="font-size:16px">${tx.icon||'💰'}</div>
                <div style="flex:1;font-size:12px;color:var(--text-secondary)">${tx.label||tx.type}</div>
                <div style="font-family:var(--font-mono);font-size:12px;color:${isIn?'var(--money)':'var(--danger)'};font-weight:700">
                  ${isIn?'+':'-'}${tx.currency==='money'?'$':''}${tx.amount}
                </div>
              </div>`;
          }).join('')}
        </div>` : ''}

      <!-- Acciones -->
      ${!isMe ? `
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn-primary btn-full" onclick="closeModal();navigate('transactions');setTimeout(()=>showSendMoneyModal('${p.nickname}'),300)">
            💵 ENVIAR DINERO
          </button>
          <button class="btn-ghost btn-full" onclick="closeModal();navigate('chat')">
            💬 CHAT
          </button>
        </div>` : `
        <div style="margin-top:12px">
          <button class="btn-ghost btn-full" onclick="closeModal();navigate('profile')">
            👤 VER MI PERFIL
          </button>
        </div>`}
    `;
  } catch {
    document.getElementById('modal-content').innerHTML =
      `<div class="empty">Error cargando perfil</div>`;
  }
}

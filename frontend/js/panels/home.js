async function renderHome() {
  const content = document.getElementById('game-content');
  const p = STATE.player;
  if (!p) return;

  const region = STATE.regions.find(r => r.id === p.regionId);
  const regionName = region ? region.name : p.regionId;
  const medicineLvl = region ? region.medicine : 1;

  // Energy regen info
  const regenPer10 = medicineLvl;
  const timeToFull = p.energy < p.maxEnergy
    ? Math.ceil(((p.maxEnergy - p.energy) / regenPer10) * 10)
    : 0;

  // XP progress
  const xpPct = Math.min((p.xp / p.xpToNext) * 100, 100);
  const workXpPct = Math.min((p.workXp / p.workXpToNext) * 100, 100);

  let economyHtml = '';
  try {
    const ecoData = await API.getEconomyStats();
    if (ecoData.economy) {
      const e = ecoData.economy;
      economyHtml = `
        <div class="economy-ticker">
          <div class="ticker-item">🌍 Jugadores: <strong>${e.totalPlayers}</strong></div>
          <div class="ticker-item">🏭 Fábricas: <strong>${e.activeFactories}</strong></div>
          <div class="ticker-item">⚱️ Minería: <strong>${formatNumber(e.globalMining)}</strong></div>
          <div class="ticker-item">💵 M. Dinero: <strong>${formatMoney(e.totalMoneySupply)}</strong></div>
        </div>`;
    }
  } catch {}

  content.innerHTML = `
    <div class="panel">
      <!-- Hero greeting -->
      <div class="home-hero">
        <div class="home-greeting">BIENVENIDO DE VUELTA</div>
        <div class="home-name">${p.nickname}</div>
        <div class="home-region">📍 ${regionName} · Nv.${p.level} · ${p.premium ? '⭐ PREMIUM' : 'ESTÁNDAR'}</div>
      </div>

      <!-- Economy ticker -->
      ${economyHtml}

      <!-- Energy & XP -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">⚡ ESTADO</div>
          ${timeToFull > 0 ? `<span class="badge badge-warning">+${regenPer10}/10min</span>` : `<span class="badge badge-success">LLENO</span>`}
        </div>
        ${statBar('ENERGÍA', p.energy, p.maxEnergy, 'energy')}
        ${statBar('EXPERIENCIA', p.xp, p.xpToNext, 'xp')}
        ${statBar('EXP. LABORAL', p.workXp, p.workXpToNext, 'generic')}
        ${timeToFull > 0 ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:6px">⏱️ Lleno en ~${timeToFull} min</div>` : ''}
      </div>

      <!-- Wallet -->
      <div class="card">
        <div class="card-header"><div class="card-title">💰 BILLETERA</div></div>
        <div class="grid-2">
          <div style="background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.15);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:10px;color:var(--text-secondary);font-family:var(--font-mono);letter-spacing:1px">DINERO</div>
            <div style="font-family:var(--font-display);font-size:26px;font-weight:700;color:var(--money)">$${formatMoney(p.money)}</div>
          </div>
          <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:10px;color:var(--text-secondary);font-family:var(--font-mono);letter-spacing:1px">ORO</div>
            <div style="font-family:var(--font-display);font-size:26px;font-weight:700;color:var(--gold)">${formatNumber(p.gold)} ⚱️</div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="section-header"><div class="section-title">ACCIONES RÁPIDAS</div></div>
      <div class="home-actions">
        <button class="home-action-btn" onclick="navigate('factories')">
          <div class="home-action-icon">🏭</div>
          <div class="home-action-label">FÁBRICAS</div>
        </button>
        <button class="home-action-btn" onclick="navigate('market')">
          <div class="home-action-icon">📈</div>
          <div class="home-action-label">MERCADO</div>
        </button>
        <button class="home-action-btn" onclick="navigate('chat')">
          <div class="home-action-icon">💬</div>
          <div class="home-action-label">CHAT</div>
        </button>
        <button class="home-action-btn" onclick="navigate('warehouse')">
          <div class="home-action-icon">📦</div>
          <div class="home-action-label">ALMACÉN</div>
        </button>
        <button class="home-action-btn" onclick="navigate('economy')">
          <div class="home-action-icon">📊</div>
          <div class="home-action-label">ECONOMÍA</div>
        </button>
        <button class="home-action-btn" onclick="navigate('transactions')">
          <div class="home-action-icon">💸</div>
          <div class="home-action-label">FINANZAS</div>
        </button>
        <button class="home-action-btn" onclick="navigate('store')">
          <div class="home-action-icon">🛍️</div>
          <div class="home-action-label">TIENDA</div>
        </button>
        <button class="home-action-btn" onclick="navigate('politics')">
          <div class="home-action-icon">🏛️</div>
          <div class="home-action-label">POLÍTICA</div>
        </button>
        <button class="home-action-btn" onclick="navigate('rankings')">
          <div class="home-action-icon">🏆</div>
          <div class="home-action-label">RANKINGS</div>
        </button>
      </div>

      <!-- Skills summary -->
      <div class="card" style="margin-top:6px">
        <div class="card-header">
          <div class="card-title">🎯 HABILIDADES</div>
          <button class="btn-ghost btn-sm" onclick="navigate('profile')">Ver más</button>
        </div>
        <div class="grid-3">
          ${['strength','education','endurance'].map(sk => `
            <div style="text-align:center;padding:10px 6px;background:var(--bg-input);border-radius:8px">
              <div style="font-size:22px">${getSkillIcon(sk)}</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin:4px 0">${p.skills[sk]}</div>
              <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-secondary)">${sk.toUpperCase()}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Leaderboard teaser -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏆 TOP JUGADORES</div>
        </div>
        <div id="home-leaderboard"><div class="loading">Cargando...</div></div>
      </div>
    </div>`;

  // Load leaderboard async
  try {
    const lb = await API.getLeaderboard();
    const lbEl = document.getElementById('home-leaderboard');
    if (lb.leaderboard && lbEl) {
      lbEl.innerHTML = lb.leaderboard.slice(0, 5).map((pl, i) => `
        <div class="player-row" onclick="showPublicProfile('${pl.nickname}')">
          <div class="player-rank">${['🥇','🥈','🥉','4.','5.'][i]}</div>
          <div class="player-info">
            <div class="player-nick">${pl.nickname}${pl.premium ? ' ⭐' : ''}</div>
            <div class="player-region">📍 ${getRegionName(pl.regionId)} · Lab.${pl.workLevel}</div>
          </div>
          <div class="player-level-badge">Nv.${pl.level}</div>
        </div>`).join('');
    }
  } catch {}
}

async function showPlayerProfile(nickname) {
  try {
    const data = await API.getPlayerByNick(nickname);
    if (!data.player) return;
    const pl = data.player;
    openModal(`
      <div style="text-align:center;margin-bottom:16px">
        <div style="width:60px;height:60px;background:linear-gradient(135deg,#0099cc,#00d4ff);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">👤</div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:700">${pl.nickname}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--accent);margin-top:4px">NIVEL ${pl.level} · TRABAJO ${pl.workLevel}</div>
      </div>
      <div class="info-row"><span class="info-label">REGIÓN</span><span class="info-val">📍 ${getRegionName(pl.regionId)}</span></div>
      <div class="info-row"><span class="info-label">FUERZA</span><span class="info-val">⚔️ ${pl.skills.strength}</span></div>
      <div class="info-row"><span class="info-label">EDUCACIÓN</span><span class="info-val">📚 ${pl.skills.education}</span></div>
      <div class="info-row"><span class="info-label">AGUANTE</span><span class="info-val">🛡️ ${pl.skills.endurance}</span></div>
      <div class="info-row"><span class="info-label">FÁBRICAS</span><span class="info-val">🏭 ${pl.factories}</span></div>
      <div class="info-row"><span class="info-label">REGISTRO</span><span class="info-val">${formatTime(pl.registeredAt)}</span></div>
      <div class="info-row"><span class="info-label">ÚLTIMA VEZ</span><span class="info-val">${formatTime(pl.lastSeen)}</span></div>
    `);
  } catch {}
}

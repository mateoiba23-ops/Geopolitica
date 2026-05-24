async function renderProfile() {
  const content = document.getElementById('game-content');
  const p = STATE.player;
  if (!p) return;

  const region       = STATE.regions.find(r => r.id === p.regionId);
  const regionName   = region ? region.name : p.regionId;
  const endurance    = (p.skills && p.skills.endurance) || 1;
  const education    = (p.skills && p.skills.education) || 1;
  const strength     = (p.skills && p.skills.strength)  || 1;
  const workLevelCap = 10 + education * 2;
  const maxEnergy    = 100 + (p.level - 1) + endurance * 3 + (p.premium ? 50 : 0);
  const warehouseLimit = 50 + endurance * 5;
  const energyReduc    = Math.min(endurance * 0.5, 40).toFixed(1);
  const regenPerMin    = region ? (region.medicine / 10).toFixed(1) : '0.1';

  const premiumActive   = p.premium && p.premiumUntil && p.premiumUntil > Date.now();
  const premiumDaysLeft = premiumActive ? Math.ceil((p.premiumUntil - Date.now()) / 86400000) : 0;

  // Skill XP data
  const skillXp     = p.skillXp     || { strength:0, education:0, endurance:0 };
  const skillXpNext = p.skillXpToNext || {
    strength:  strength  * 100,
    education: education * 100,
    endurance: endurance * 100
  };

  content.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">👤</div>
      <div class="profile-nick">${p.nickname}</div>
      <div class="profile-title">NIVEL ${p.level} · LAB.${p.workLevel}/${workLevelCap} · ${regionName.toUpperCase()}</div>
      <div class="profile-badges">
        ${premiumActive ? `<span class="badge badge-premium">⭐ PREMIUM ${premiumDaysLeft}d</span>` : ''}
        ${p.role === 'admin' ? '<span class="badge badge-gold">👑 ADMIN</span>' : ''}
        <span class="badge badge-accent">📍 ${regionName}</span>
      </div>
    </div>

    <div class="profile-stats-grid">
      <div class="profile-stat-card">
        <div class="profile-stat-val text-accent">${p.level}</div>
        <div class="profile-stat-label">NIVEL</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-val text-money">$${formatMoney(p.money)}</div>
        <div class="profile-stat-label">DINERO</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-val text-gold">${p.gold}</div>
        <div class="profile-stat-label">ORO</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-val text-energy">${Math.floor(p.energy)}/${maxEnergy}</div>
        <div class="profile-stat-label">ENERGÍA</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-val">${p.workLevel}</div>
        <div class="profile-stat-label">LAB.</div>
      </div>
      <div class="profile-stat-card">
        <div class="profile-stat-val">${(p.factories || []).length}</div>
        <div class="profile-stat-label">FÁBRICAS</div>
      </div>
    </div>

    <div class="panel">
      <!-- Progresión -->
      <div class="card">
        <div class="card-header"><div class="card-title">📊 PROGRESIÓN</div></div>
        ${statBar('EXPERIENCIA GENERAL', Math.floor(p.xp), Math.floor(p.xpToNext), 'xp')}
        ${statBar(`NIVEL LABORAL (${p.workLevel}/${workLevelCap})`, Math.floor(p.workXp), Math.floor(p.workXpToNext), 'generic')}
        ${statBar('ENERGÍA', Math.floor(p.energy), maxEnergy, 'energy')}
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:6px">
          ⚡ Regeneración: +${regenPerMin}/min en ${regionName}
          ${region && region.medicine ? ` (medicina ${region.medicine}/10)` : ''}
        </div>
        ${p.workLevel >= workLevelCap
          ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--warning);margin-top:4px">
              ⚠️ Nivel laboral máximo. Sube EDUCACIÓN para desbloquear más.
             </div>` : ''}
      </div>

      <!-- Habilidades -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🎯 HABILIDADES</div>
          <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">Sube entrenando o actuando</span>
        </div>

        ${renderSkillBlock({
          icon: '⚔️', name: 'FUERZA', skill: 'strength',
          level: strength, xp: skillXp.strength, xpNext: skillXpNext.strength,
          goldCost: Math.max(1, Math.floor(strength * 1.5)),
          effects: [
            `+${(strength*0.5).toFixed(1)}% daño militar`,
            `+${(strength*0.2).toFixed(1)}% producción general`
          ],
          nextEffects: [
            `+${((strength+1)*0.5).toFixed(1)}% daño militar`
          ],
          xpSource: 'Gana XP en guerras ⚔️',
          player: p
        })}

        ${renderSkillBlock({
          icon: '📚', name: 'EDUCACIÓN', skill: 'education',
          level: education, xp: skillXp.education, xpNext: skillXpNext.education,
          goldCost: Math.max(1, Math.floor(education * 1.5)),
          effects: [
            `+${(education*2).toFixed(0)}% XP laboral`,
            `+${(education*1.5).toFixed(1)}% producción minas de oro`,
            `+${education}% salario neto`,
            `Nivel lab. máximo: ${workLevelCap}`
          ],
          nextEffects: [
            `+${(education+1)*2}% XP laboral`,
            `Nivel lab. máximo: ${10+(education+1)*2}`
          ],
          xpSource: 'Gana XP trabajando ⚒️ (+0.8 XP/acción)',
          player: p
        })}

        ${renderSkillBlock({
          icon: '🛡️', name: 'AGUANTE', skill: 'endurance',
          level: endurance, xp: skillXp.endurance, xpNext: skillXpNext.endurance,
          goldCost: Math.max(1, Math.floor(endurance * 1.5)),
          effects: [
            `${maxEnergy} energía máxima`,
            `-${energyReduc}% costo energía`,
            `${warehouseLimit} slots almacén`
          ],
          nextEffects: [
            `${maxEnergy+3} energía máxima`,
            `${warehouseLimit+5} slots almacén`
          ],
          xpSource: 'Gana XP trabajando ⚒️ y en guerras ⚔️ (+0.5 XP/acción)',
          player: p
        })}

        <div style="font-size:11px;color:var(--text-dim);margin-top:8px;font-family:var(--font-mono);padding:8px;background:var(--bg-input);border-radius:6px">
          💡 Las habilidades también suben con el tiempo por tus acciones. Entrenar con oro acelera el proceso.
        </div>
      </div>

      <!-- Cuenta -->
      <div class="card">
        <div class="card-header"><div class="card-title">👤 CUENTA</div></div>
        <div class="info-row"><span class="info-label">EMAIL</span><span class="info-val" style="font-size:12px">${p.email}</span></div>
        <div class="info-row"><span class="info-label">ALMACÉN</span><span class="info-val">${Object.values(p.warehouse||{}).reduce((a,b)=>a+b,0)} / ${warehouseLimit}</span></div>
        <div class="info-row"><span class="info-label">REGISTRO</span><span class="info-val">${new Date(p.registeredAt).toLocaleDateString('es-CO')}</span></div>
        <div class="info-row"><span class="info-label">ÚLTIMA SESIÓN</span><span class="info-val">${formatTime(p.lastSeen)}</span></div>
        ${premiumActive
          ? `<div class="info-row"><span class="info-label">PREMIUM HASTA</span><span class="info-val text-gold">${new Date(p.premiumUntil).toLocaleDateString('es-CO')}</span></div>`
          : `<div style="margin-top:8px"><button class="btn-gold btn-full btn-sm" onclick="navigate('store')">⭐ Activar Premium</button></div>`}
      </div>

      <!-- Estado político -->
      <div class="card" id="profile-state-card">
        <div class="card-header">
          <div class="card-title">🏛️ ESTADO POLÍTICO</div>
          <button class="btn-ghost btn-sm" onclick="navigate('politics')">Ver más</button>
        </div>
        <div id="profile-state-info"><div style="font-size:12px;color:var(--text-dim)">Cargando...</div></div>
      </div>

      <!-- Almacén preview -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📦 ALMACÉN PERSONAL</div>
          <button class="btn-ghost btn-sm" onclick="navigate('warehouse')">Ver todo</button>
        </div>
        ${renderWarehousePreview(p.warehouse || {})}
      </div>

      <!-- Configuración -->
      <div class="card" style="margin-top:8px">
        <div class="card-header"><div class="card-title">⚙️ CONFIGURACIÓN</div></div>
        <div class="info-row">
          <span class="info-label">TEMA VISUAL</span>
          <button class="btn-ghost btn-sm" onclick="toggleTheme()">🎨 Cambiar tema</button>
        </div>
        <div class="info-row">
          <span class="info-label">RANKINGS</span>
          <button class="btn-ghost btn-sm" onclick="navigate('rankings')">🏆 Ver rankings</button>
        </div>
        <div class="info-row">
          <span class="info-label">FINANZAS</span>
          <button class="btn-ghost btn-sm" onclick="navigate('transactions')">💸 Historial</button>
        </div>
        <div class="info-row">
          <span class="info-label">TIENDA</span>
          <button class="btn-ghost btn-sm" onclick="navigate('store')">🛍️ Ver tienda</button>
        </div>
      </div>

      <button class="btn-danger btn-full" style="margin-top:8px" onclick="doLogout()">🚪 CERRAR SESIÓN</button>
    </div>`;

  setTimeout(() => loadProfileStateInfo(), 100);
}

function renderSkillBlock({ icon, name, skill, level, xp, xpNext, goldCost, effects, nextEffects, xpSource, player }) {
  const canAfford = player.gold >= goldCost && player.energy >= 20;
  const xpPct     = Math.min((xp / xpNext) * 100, 100);
  const xpToNext  = Math.max(0, xpNext - xp).toFixed(1);

  return `
    <div class="skill-item" style="flex-direction:column;align-items:stretch;gap:0;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div class="skill-icon">${icon}</div>
        <div style="flex:1">
          <div class="skill-name">${name}</div>
          <div class="skill-level">NIVEL ${level}</div>
        </div>
        <button class="btn-gold btn-sm ${!canAfford ? 'skill-btn-disabled' : ''}"
          onclick="${canAfford ? `trainSkill('${skill}')` : ''}"
          style="${!canAfford ? 'opacity:0.45;cursor:not-allowed' : ''}">
          ⚱️${goldCost} +20⚡
        </button>
      </div>

      <!-- Barra de XP de habilidad -->
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:3px">
          <span>XP HABILIDAD</span>
          <span>${xp.toFixed(1)} / ${xpNext} (faltan ${xpToNext})</span>
        </div>
        <div style="height:4px;background:var(--bg-input);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,var(--accent2),var(--accent));border-radius:2px;transition:width 0.5s ease"></div>
        </div>
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-top:3px">${xpSource}</div>
      </div>

      <!-- Efectos -->
      <div style="background:var(--bg-input);border-radius:8px;padding:8px 10px;font-size:11px">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:4px">EFECTOS ACTUALES</div>
        ${effects.map(e => `<div style="color:var(--text-secondary);margin-bottom:2px">✓ ${e}</div>`).join('')}
        ${nextEffects.length > 0 ? `
          <div style="border-top:1px solid var(--border);margin-top:5px;padding-top:5px">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:3px">PRÓXIMO NIVEL</div>
            ${nextEffects.map(e => `<div style="color:var(--accent);margin-bottom:2px">→ ${e}</div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
}

function renderWarehousePreview(warehouse) {
  const entries = Object.entries(warehouse).filter(([,v]) => v > 0);
  if (entries.length === 0) return '<div class="empty" style="padding:10px">Almacén vacío</div>';
  return `<div class="warehouse-grid">
    ${entries.slice(0,6).map(([type, qty]) => `
      <div class="warehouse-item">
        <div class="warehouse-item-icon">${getResourceIcon(type)}</div>
        <div class="warehouse-item-name">${type.toUpperCase()}</div>
        <div class="warehouse-item-qty">${qty}</div>
      </div>`).join('')}
  </div>`;
}

async function loadProfileStateInfo() {
  try {
    const data = await API.getMyState();
    const el   = document.getElementById('profile-state-info');
    if (!el) return;
    if (!data.state) {
      el.innerHTML = `<div style="font-size:12px;color:var(--text-dim)">Sin estado · <button class="btn-ghost btn-sm" onclick="navigate('politics')">Fundar o unirte</button></div>`;
      return;
    }
    const s = data.state;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:28px">${s.shield}</div>
        <div>
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${s.color}">${s.name}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${s.systemIcon} ${s.systemName}</div>
          ${s.activeLaws > 0 ? `<div style="font-size:10px;color:var(--warning);margin-top:2px">⚠️ ${s.activeLaws} ley(es) en votación</div>` : ''}
        </div>
      </div>`;
  } catch {}
}

async function trainSkill(skill) {
  const p       = STATE.player;
  const level   = p.skills[skill] || 1;
  const goldCost = Math.max(1, Math.floor(level * 1.5));

  try {
    const data = await API.trainSkill(skill);
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(`✅ ${data.message}`, 'success');
    if (data.effects && data.effects.length > 0) {
      setTimeout(() => showToast(data.effects.join(' · '), '', 4000), 500);
    }
    renderProfile();
  } catch { showToast('Error al entrenar', 'error'); }
}

async function doLogout() {
  try { await API.logout(); } catch {}
  API.token = null;
  Storage.clearToken();
  Storage.clearPlayer();
  STATE.player = null;
  if (STATE.playerPolling) clearInterval(STATE.playerPolling);
  if (STATE.chatPolling)   clearInterval(STATE.chatPolling);
  document.getElementById('game-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
}

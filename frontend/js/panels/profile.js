async function renderProfile() {
  const content = document.getElementById('game-content');
  const p = STATE.player;
  if (!p) return;

  const region       = STATE.regions.find(r => r.id === p.regionId);
  const regionName   = region ? region.name : p.regionId;
  const workLevelCap = 10 + ((p.skills && p.skills.education) || 1) * 2;
  const endurance    = (p.skills && p.skills.endurance) || 1;
  const education    = (p.skills && p.skills.education) || 1;
  const strength     = (p.skills && p.skills.strength)  || 1;

  // Derived values
  const maxEnergy      = 100 + (p.level - 1) * 1 + endurance * 3 + (p.premium ? 50 : 0);
  const warehouseLimit = 50  + endurance * 5;
  const energyReduc    = Math.min(endurance * 0.5, 40).toFixed(1);
  const workXpBonus    = (education * 2).toFixed(0);
  const goldBonus      = (education * 1.5).toFixed(1);
  const salaryBonus    = (education * 1).toFixed(0);

  const premiumActive  = p.premium && p.premiumUntil && p.premiumUntil > Date.now();
  const premiumDaysLeft = premiumActive ? Math.ceil((p.premiumUntil - Date.now()) / 86400000) : 0;

  content.innerHTML = `
    <!-- Hero -->
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

    <!-- Stats rápidas -->
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
        <div class="profile-stat-val text-energy">${p.energy}/${maxEnergy}</div>
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
        ${statBar('EXPERIENCIA GENERAL', p.xp, p.xpToNext, 'xp')}
        ${statBar(`NIVEL LABORAL (${p.workLevel}/${workLevelCap})`, p.workXp, p.workXpToNext, 'generic')}
        ${statBar('ENERGÍA', p.energy, maxEnergy, 'energy')}
        ${p.workLevel >= workLevelCap
          ? `<div style="font-family:var(--font-mono);font-size:10px;color:var(--warning);margin-top:6px">
              ⚠️ Nivel laboral máximo. Sube EDUCACIÓN para desbloquear más.
             </div>`
          : ''}
      </div>

      <!-- Habilidades -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🎯 HABILIDADES</div>
          <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">Costo: oro + 20⚡</span>
        </div>

        ${renderSkillItem({
          icon: '⚔️', name: 'FUERZA', level: strength,
          goldCost: Math.max(1, Math.floor(strength * 1.5)),
          effects: [
            `+${(strength * 0.5).toFixed(1)}% daño militar`,
            `+${(strength * 0.2).toFixed(1)}% producción general`
          ],
          nextEffects: [
            `+${((strength+1) * 0.5).toFixed(1)}% daño militar`,
            `+${((strength+1) * 0.2).toFixed(1)}% producción general`
          ],
          skill: 'strength', player: p
        })}

        ${renderSkillItem({
          icon: '📚', name: 'EDUCACIÓN', level: education,
          goldCost: Math.max(1, Math.floor(education * 1.5)),
          effects: [
            `+${workXpBonus}% XP laboral`,
            `+${goldBonus}% producción minas de oro`,
            `+${salaryBonus}% salario neto`,
            `Nivel lab. máximo: ${workLevelCap}`
          ],
          nextEffects: [
            `+${(education+1)*2}% XP laboral`,
            `Nivel lab. máximo: ${10+(education+1)*2}`
          ],
          skill: 'education', player: p
        })}

        ${renderSkillItem({
          icon: '🛡️', name: 'AGUANTE', level: endurance,
          goldCost: Math.max(1, Math.floor(endurance * 1.5)),
          effects: [
            `${maxEnergy} energía máxima`,
            `-${energyReduc}% costo energía`,
            `${warehouseLimit} slots almacén`
          ],
          nextEffects: [
            `${maxEnergy + 3} energía máxima`,
            `-${Math.min((endurance+1)*0.5,40).toFixed(1)}% costo energía`,
            `${warehouseLimit + 5} slots almacén`
          ],
          skill: 'endurance', player: p
        })}
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
          : `<div style="margin-top:10px"><button class="btn-gold btn-full btn-sm" onclick="navigate('store')">⭐ Activar Premium</button></div>`}
      </div>

      <!-- Almacén preview -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📦 ALMACÉN PERSONAL</div>
          <button class="btn-ghost btn-sm" onclick="navigate('warehouse')">Ver todo</button>
        </div>
        ${renderWarehousePreview(p.warehouse || {})}
      </div>

      <!-- Estado político -->
      <div class="card" id="profile-state-card">
        <div class="card-header">
          <div class="card-title">🏛️ ESTADO POLÍTICO</div>
          <button class="btn-ghost btn-sm" onclick="navigate('politics')">Ver más</button>
        </div>
        <div id="profile-state-info"><div style="font-size:12px;color:var(--text-dim)">Cargando...</div></div>
      </div>

      <!-- Configuración visual -->
      <div class="card" style="margin-top:8px">
        <div class="card-header"><div class="card-title">⚙️ CONFIGURACIÓN</div></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
          <div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">TEMA VISUAL</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">Moderno o Clásico</div>
          </div>
          <div style="display:flex;gap:6px">
            <button id="btn-theme-modern"
              style="padding:6px 12px;border-radius:6px;font-family:var(--font-mono);font-size:11px;cursor:pointer;
                background:var(--bg-input);border:1px solid var(--border);color:var(--text-secondary)"
              onclick="applyTheme('modern');updateThemeBtns()">✨ MODERNO</button>
            <button id="btn-theme-classic"
              style="padding:6px 12px;border-radius:6px;font-family:var(--font-mono);font-size:11px;cursor:pointer;
                background:var(--bg-input);border:1px solid var(--border);color:var(--text-secondary)"
              onclick="applyTheme('classic');updateThemeBtns()">🏛️ CLÁSICO</button>
          </div>
        </div>
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
}

function renderSkillItem({ icon, name, level, goldCost, effects, nextEffects, skill, player }) {
  const canAfford  = player.gold >= goldCost && player.energy >= 20;

  return `
    <div class="skill-item" style="flex-direction:column;align-items:stretch;gap:0">
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
      <!-- Efectos actuales -->
      <div style="background:var(--bg-input);border-radius:8px;padding:8px 10px;font-size:11px">
        <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:5px">EFECTOS ACTUALES</div>
        ${effects.map(e => `<div style="color:var(--text-secondary);margin-bottom:2px">✓ ${e}</div>`).join('')}
        ${nextEffects.length > 0 ? `
          <div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px">
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim);margin-bottom:4px">PRÓXIMO NIVEL</div>
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

async function trainSkill(skill) {
  const p        = STATE.player;
  const level    = p.skills[skill] || 1;
  const goldCost = Math.max(1, Math.floor(level * 1.5));

  try {
    const data = await API.trainSkill(skill);
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(`✅ ${data.message}`, 'success');
    // Mostrar efectos
    if (data.effects && data.effects.length > 0) {
      setTimeout(() => showToast(data.effects.join(' · '), '', 4000), 500);
    }
    renderProfile();
  } catch { showToast('Error al entrenar', 'error'); }
}

function updateThemeBtns() {
  const theme = getCurrentTheme();
  const mBtn  = document.getElementById('btn-theme-modern');
  const cBtn  = document.getElementById('btn-theme-classic');
  if (!mBtn || !cBtn) return;
  const activeStyle   = 'background:var(--accent);border-color:var(--accent);color:var(--bg-base)';
  const inactiveStyle = 'background:var(--bg-input);border:1px solid var(--border);color:var(--text-secondary)';
  mBtn.style.cssText += ';' + (theme === 'modern'  ? activeStyle : inactiveStyle);
  cBtn.style.cssText += ';' + (theme === 'classic' ? activeStyle : inactiveStyle);
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

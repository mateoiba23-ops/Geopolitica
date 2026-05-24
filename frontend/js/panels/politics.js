<<<<<<< HEAD
'use strict';
=======
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
// ─── POLITICS PANEL ───────────────────────────────────────────────────────────

async function renderPolitics() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando política...</div>';

  try {
    const p = STATE.player;
    const [myStateData, allStatesData] = await Promise.all([
      API.getMyState(),
      API.getAllStates()
    ]);

<<<<<<< HEAD
    const myState   = myStateData.state;
=======
    const myState  = myStateData.state;
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
    const allStates = allStatesData.states || [];

    content.innerHTML = `
      <div class="panel">
<<<<<<< HEAD
        <div class="panel-title">🏛️ <span>ESTADOS POLÍTICOS</span></div>

        ${myState ? renderMyStateBanner(myState, p) : renderNoStateBanner()}

        <div class="auth-tabs" style="margin-bottom:14px" id="politics-tabs">
          <button class="auth-tab ${myState?'active':''}" onclick="switchPoliticsTab('my-state',this)"
            style="${!myState?'opacity:0.4':''}">
            ${myState?`${myState.shield} MI ESTADO`:'MI ESTADO'}
          </button>
          <button class="auth-tab ${!myState?'active':''}" onclick="switchPoliticsTab('all-states',this)">
            🌍 TODOS
          </button>
          ${myState?`<button class="auth-tab" onclick="switchPoliticsTab('laws',this)">📜 LEYES</button>`:''}
        </div>

        <div id="politics-content">
          ${myState ? renderMyStatePanel(myState, p) : renderAllStatesPanel(allStates, p)}
=======
        <div class="panel-title">🏛️ <span>POLÍTICA</span></div>

        ${myState
          ? renderMyStateBanner(myState, p)
          : renderNoStateBanner(p)}

        <!-- Tabs -->
        <div class="auth-tabs" style="margin-bottom:14px" id="politics-tabs">
          <button class="auth-tab ${myState ? 'active' : ''}" onclick="switchPoliticsTab('my-state', this)"
            ${!myState ? 'style="opacity:0.4"' : ''}>
            ${myState ? `${myState.shield} MI ESTADO` : 'MI ESTADO'}
          </button>
          <button class="auth-tab ${!myState ? 'active' : ''}" onclick="switchPoliticsTab('all-states', this)">
            🌍 TODOS LOS ESTADOS
          </button>
          ${myState ? `<button class="auth-tab" onclick="switchPoliticsTab('laws', this)">📜 LEYES</button>` : ''}
        </div>

        <div id="politics-content">
          ${myState
            ? renderMyStatePanel(myState, p)
            : renderAllStatesPanel(allStates, p)}
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
        </div>
      </div>`;

    window._politicsMyState   = myState;
    window._politicsAllStates = allStates;

<<<<<<< HEAD
  } catch(e) {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar política</div></div>`;
=======
  } catch (e) {
    content.innerHTML = `<div class="panel"><div class="empty">Error cargando política</div></div>`;
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
  }
}

function renderMyStateBanner(state, player) {
<<<<<<< HEAD
  const role = state.members?.find(m => m.id === player.id)?.role || 'citizen';
  const sys  = state.systemIcon + ' ' + state.systemName;
  const atWar = (state.enemies||[]).length > 0;
  return `
    <div style="background:linear-gradient(135deg,${state.color}22,${state.color}0a);
      border:1px solid ${state.color}55;border-radius:14px;padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:36px">${state.shield}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:${state.color}">${state.name}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-top:2px">
            ${sys} · ${role==='leader'?`👑 ${state.leaderTitle}`:'🏅 '+(role==='parliament'?'Parlamentario':'Ciudadano')}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${state.memberCount} miembros</div>
          ${state.activeLaws>0?`<div style="color:var(--warning);font-size:11px;margin-top:4px">⚠️ ${state.activeLaws} ley(es)</div>`:''}
          ${atWar?`<div style="color:var(--danger);font-size:11px;margin-top:2px">⚔️ EN GUERRA</div>`:''}
        </div>
      </div>
    </div>`;
}

function renderNoStateBanner() {
  return `
    <div style="background:var(--bg-card);border:1px dashed var(--border-bright);border-radius:14px;
      padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🌍</div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:6px">Sin estado</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
        Los estados se forman a través del sistema de partidos y elecciones.<br>
        Funda o únete a un partido político para empezar.
      </div>
      <button class="btn-ghost btn-full" onclick="navigate('parties')">🗳️ IR A PARTIDOS POLÍTICOS</button>
=======
  const member = state.members.find(m => m.id === player.id);
  const role   = member ? member.role : 'citizen';
  return `
    <div style="background:linear-gradient(135deg,${state.color}22,${state.color}0a);border:1px solid ${state.color}55;border-radius:14px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
      <div style="font-size:36px">${state.shield}</div>
      <div style="flex:1">
        <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:${state.color}">${state.name}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);margin-top:2px">
          ${state.systemIcon} ${state.systemName} · ${role === 'leader' ? `👑 ${state.leaderTitle}` : '🏅 Ciudadano'}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${state.memberCount} miembros</div>
        ${state.activeLaws > 0 ? `<div style="color:var(--warning);font-size:11px;margin-top:4px">⚠️ ${state.activeLaws} ley(es) en votación</div>` : ''}
      </div>
    </div>`;
}

function renderNoStateBanner(player) {
  return `
    <div style="background:var(--bg-card);border:1px dashed var(--border-bright);border-radius:14px;padding:16px;margin-bottom:14px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px">🌍</div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-bottom:6px">Sin estado</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">Funda o únete a un estado para participar en política</div>
      <button class="btn-primary" onclick="showFoundStateModal()">🌍 FUNDAR ESTADO ($10,000 + 50⚱️)</button>
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
    </div>`;
}

function switchPoliticsTab(tab, btn) {
  document.querySelectorAll('#politics-tabs .auth-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
<<<<<<< HEAD
  const el  = document.getElementById('politics-content');
  const my  = window._politicsMyState;
  const all = window._politicsAllStates || [];
  if (tab === 'my-state' && my)  el.innerHTML = renderMyStatePanel(my, STATE.player);
  else if (tab === 'all-states') el.innerHTML = renderAllStatesPanel(all, STATE.player);
  else if (tab === 'laws' && my) loadLawsPanel(my.id);
}

function renderMyStatePanel(state, player) {
  const isLeader  = state.leaderId === player.id;
  const myMember  = state.members?.find(m => m.id === player.id);
  const isParliament = ['leader','parliament','minister'].includes(myMember?.role);
  const sys = state.votingBody || 'parliament';
=======

  const el = document.getElementById('politics-content');
  const my = window._politicsMyState;
  const all = window._politicsAllStates || [];

  if (tab === 'my-state' && my)        el.innerHTML = renderMyStatePanel(my, STATE.player);
  else if (tab === 'all-states')        el.innerHTML = renderAllStatesPanel(all, STATE.player);
  else if (tab === 'laws' && my)        loadLawsPanel(my.id);
}

function renderMyStatePanel(state, player) {
  const isLeader = state.leaderId === player.id;
  const member   = state.members.find(m => m.id === player.id);
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd

  return `
    <!-- Tesoro -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-header">
        <div class="card-title">💰 TESORO DEL ESTADO</div>
<<<<<<< HEAD
        <span style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--money)">
          $${formatMoney(state.treasury||0)}
        </span>
      </div>
      <div style="display:flex;gap:8px">
        <input type="number" id="budget-contrib" placeholder="Contribuir al tesoro" min="1"
          style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:8px 10px;font-size:14px;outline:none">
        <button class="btn-primary btn-sm" onclick="doContributeBudget()">💰</button>
      </div>
    </div>

    <!-- Info del sistema político -->
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--text-secondary)">
      <strong style="color:var(--accent)">${state.systemIcon} ${state.systemName}</strong> — ${state.systemDesc || ''}
      <br><span style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">
        Votan en leyes: ${sys==='parliament'?'Parlamento (líder + parlamentarios)':sys==='members'?'Todos los miembros':'Solo el líder'}
      </span>
    </div>

    <!-- Aliados y enemigos -->
    ${(state.allies||[]).length>0||((state.enemies||[]).length>0) ? `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${(state.allies||[]).map(id => {
        const s = db_getStateName(id);
        return `<span style="background:rgba(0,230,118,0.1);border:1px solid rgba(0,230,118,0.3);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--success)">🤝 ${s}</span>`;
      }).join('')}
      ${(state.enemies||[]).map(id => {
        const s = db_getStateName(id);
        return `<span style="background:rgba(255,61,87,0.1);border:1px solid rgba(255,61,87,0.3);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--danger)">⚔️ ${s}</span>`;
      }).join('')}
    </div>` : ''}

    <!-- Acciones -->
    <div class="section-header" style="margin-bottom:10px"><div class="section-title">ACCIONES</div></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      ${isParliament ? `<button class="btn-primary btn-full" onclick="showProposeLawModal()">📜 PROPONER LEY</button>` : ''}
      ${(isLeader||myMember?.role==='minister_exterior') ? `
        <button class="btn-ghost btn-full" onclick="showResidencyRequests()">📋 GESTIONAR RESIDENCIAS</button>` : ''}
      ${isLeader ? `
        <button class="btn-ghost btn-full" onclick="showEditStateModal()">✏️ EDITAR ESTADO</button>
        <button class="btn-ghost btn-full" onclick="showTransferLeadershipModal()">👑 TRANSFERIR LIDERAZGO</button>` : ''}
      <button class="btn-danger btn-full btn-sm" onclick="confirmLeaveState()">🚪 ABANDONAR ESTADO</button>
=======
        <span style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--money)">$${formatMoney(state.treasury||0)}</span>
      </div>
      <div style="display:flex;gap:8px">
        <input type="number" id="budget-contrib" placeholder="Cantidad a contribuir" min="1" style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:8px 10px;font-size:14px;outline:none">
        <button class="btn-primary btn-sm" onclick="doContributeBudget()">💰 CONTRIBUIR</button>
      </div>
    </div>

    <!-- Descripción -->
    ${state.description ? `
      <div class="card" style="margin-bottom:12px">
        <div style="font-size:13px;color:var(--text-secondary)">${state.description}</div>
      </div>` : ''}

    <!-- Acciones según rol -->
    <div class="section-header" style="margin-bottom:10px"><div class="section-title">ACCIONES</div></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
      <button class="btn-primary btn-full" onclick="showProposeLawModal()">
        📜 PROPONER LEY
      </button>
      ${isLeader ? `
        <button class="btn-ghost btn-full" onclick="showEditStateModal()">
          ✏️ EDITAR ESTADO
        </button>
        <button class="btn-ghost btn-full" onclick="showTransferLeadershipModal()">
          👑 TRANSFERIR LIDERAZGO
        </button>` : ''}
      <button class="btn-danger btn-full btn-sm" onclick="confirmLeaveState()">
        🚪 ABANDONAR ESTADO
      </button>
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
    </div>

    <!-- Miembros -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">👥 MIEMBROS (${state.memberCount})</div>
      </div>
<<<<<<< HEAD
      ${(state.members||[]).map(m => {
        const roleIcons = { leader:'👑', parliament:'🏛️', minister:'⚖️', citizen:'🏅' };
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:18px">${roleIcons[m.role]||'🏅'}</div>
            <div style="flex:1">
              <div style="font-family:var(--font-display);font-size:13px;font-weight:600;cursor:pointer"
                onclick="showPublicProfile('${m.nickname}')">${m.nickname}</div>
              <div style="font-size:10px;color:var(--text-dim)">${m.role}</div>
            </div>
          </div>`;
      }).join('')}
    </div>

    <!-- Regiones controladas -->
    ${state.regionDetails?.length>0 ? `
=======
      ${(state.members || []).map(m => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:18px">${m.role === 'leader' ? '👑' : m.role === 'parliament' ? '🏛️' : '🏅'}</div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${m.nickname}</div>
            <div style="font-size:10px;color:var(--text-dim)">Se unió ${formatTime(m.joinedAt)}</div>
          </div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary)">${m.role}</div>
        </div>`).join('')}
    </div>

    <!-- Regiones controladas -->
    ${state.regionDetails && state.regionDetails.length > 0 ? `
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
      <div class="card" style="margin-top:10px">
        <div class="card-header"><div class="card-title">🗺️ REGIONES CONTROLADAS</div></div>
        ${state.regionDetails.map(r => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:16px">📍</div>
            <div style="font-family:var(--font-display);font-size:13px">${r.name}</div>
          </div>`).join('')}
      </div>` : ''}`;
}

<<<<<<< HEAD
function db_getStateName(id) {
  const all = window._politicsAllStates || [];
  const s   = all.find(s => s.id === id);
  return s ? s.name : id;
}

function renderAllStatesPanel(states, player) {
  if (states.length === 0) {
    return `<div class="card"><div class="empty">No hay estados fundados aún.<br>
      <span style="font-size:12px;color:var(--text-dim)">Los estados se forman a través del sistema electoral.</span></div>
      <button class="btn-ghost btn-full" style="margin-top:12px" onclick="navigate('parties')">🗳️ Ver partidos</button>
    </div>`;
  }
  return `<div style="margin-bottom:10px">
    ${states.map(s => {
      const isMe = player.stateId === s.id;
      return `
        <div style="background:var(--bg-card);border:1px solid ${s.color}44;border-radius:14px;
          padding:14px;margin-bottom:10px;cursor:pointer"
          onclick="showStateDetail('${s.id}')">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <div style="font-size:32px">${s.shield}</div>
            <div style="flex:1">
              <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${s.color}">${s.name}</div>
              <div style="font-size:11px;color:var(--text-secondary)">${s.systemIcon} ${s.systemName}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${s.memberCount} miembros</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">💰 $${formatMoney(s.treasury||0)}</div>
              ${isMe?'<span class="badge badge-accent" style="font-size:9px">TU ESTADO</span>':''}
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-secondary)">
            👑 ${s.leaderNickname} · ${s.leaderTitle}
          </div>
          ${s.description?`<div style="font-size:11px;color:var(--text-dim);margin-top:4px;font-style:italic">"${s.description.slice(0,80)}"</div>`:''}
        </div>`;
    }).join('')}
  </div>`;
=======
function renderAllStatesPanel(states, player) {
  if (states.length === 0) {
    return `<div class="card"><div class="empty">No hay estados fundados aún.<br>
      <span style="font-size:12px;color:var(--text-dim)">¡Sé el primero en fundar uno!</span></div>
      <button class="btn-primary btn-full" style="margin-top:12px" onclick="showFoundStateModal()">🌍 FUNDAR ESTADO</button>
    </div>`;
  }

  return `
    <div style="margin-bottom:10px">
      ${!player.stateId ? `<button class="btn-primary btn-full" style="margin-bottom:12px" onclick="showFoundStateModal()">🌍 FUNDAR NUEVO ESTADO</button>` : ''}
      ${states.map(s => `
        <div style="background:var(--bg-card);border:1px solid ${s.color}44;border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;transition:0.18s ease"
             onclick="showStateDetail('${s.id}')"
             onmousedown="this.style.transform='scale(0.99)'" onmouseup="this.style.transform='scale(1)'"
             ontouchstart="this.style.transform='scale(0.99)'" ontouchend="this.style.transform='scale(1)'">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="font-size:32px">${s.shield}</div>
            <div style="flex:1">
              <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${s.color}">${s.name}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">${s.systemIcon} ${s.systemName}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${s.memberCount} miembros</div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">💰 $${formatMoney(s.treasury||0)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${s.color}"></div>
            <span style="font-size:11px;color:var(--text-secondary)">Líder: <strong style="color:var(--text-primary)">${s.leaderNickname}</strong> · ${s.leaderTitle}</span>
            ${player.stateId === s.id ? '<span class="badge badge-accent" style="margin-left:auto;font-size:9px">TU ESTADO</span>' : ''}
          </div>
          ${s.description ? `<div style="font-size:11px;color:var(--text-dim);margin-top:6px;font-style:italic">${s.description.slice(0,80)}${s.description.length > 80 ? '...' : ''}</div>` : ''}
        </div>`).join('')}
    </div>`;
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
}

async function loadLawsPanel(stateId) {
  const el = document.getElementById('politics-content');
  el.innerHTML = '<div class="loading">⏳ Cargando leyes...</div>';
<<<<<<< HEAD
=======

>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
  try {
    const data = await API.getStateLaws(stateId);
    const laws = data.laws || [];
    const p    = STATE.player;
<<<<<<< HEAD
    const my   = window._politicsMyState;
    const sys  = my ? (my.votingBody||'parliament') : 'parliament';

    el.innerHTML = `
      ${my && ['leader','parliament','minister'].includes(my.members?.find(m=>m.id===p.id)?.role) ? `
        <button class="btn-primary btn-full" style="margin-bottom:14px" onclick="showProposeLawModal()">
          📜 PROPONER NUEVA LEY
        </button>` : ''}
      ${laws.length===0
        ? '<div class="card"><div class="empty">No hay leyes propuestas aún</div></div>'
        : laws.map(law => renderLawCard(law, p, sys)).join('')}`;
=======

    el.innerHTML = `
      <button class="btn-primary btn-full" style="margin-bottom:14px" onclick="showProposeLawModal()">
        📜 PROPONER NUEVA LEY
      </button>
      ${laws.length === 0
        ? '<div class="card"><div class="empty">No hay leyes propuestas aún</div></div>'
        : laws.map(law => renderLawCard(law, p)).join('')}`;
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
  } catch {
    el.innerHTML = '<div class="empty">Error cargando leyes</div>';
  }
}

<<<<<<< HEAD
function renderLawCard(law, player, votingBody) {
  const statusMap = {
    voting:   { label:'EN VOTACIÓN', color:'var(--warning)',  icon:'🗳️' },
    approved: { label:'APROBADA',    color:'var(--success)',  icon:'✅' },
    rejected: { label:'RECHAZADA',   color:'var(--danger)',   icon:'❌' }
  };
  const st   = statusMap[law.status] || statusMap.voting;
  const yes  = (law.votes?.yes||[]).length;
  const no   = (law.votes?.no||[]).length;
  const abs  = (law.votes?.abstain||[]).length;
  const tot  = yes + no + abs;

  const allVoters = [...(law.votes?.yes||[]), ...(law.votes?.no||[]), ...(law.votes?.abstain||[])];
  const hasVoted  = allVoters.includes(player.id);

  // Is player allowed to vote?
  const my    = window._politicsMyState;
  const myRole = my?.members?.find(m => m.id === player.id)?.role;
  const canVote = votingBody === 'parliament'
    ? ['leader','parliament','minister'].includes(myRole)
    : votingBody === 'members'
      ? !!myRole
      : myRole === 'leader';

  const timeLeft = law.votingEndsAt > Date.now()
    ? `${Math.ceil((law.votingEndsAt-Date.now())/3600000)}h restantes`
    : 'Cerrada';

  // Display field values
  const fieldDisplay = renderLawFields(law);

=======
function renderLawCard(law, player) {
  const statusMap = {
    voting:   { label: 'EN VOTACIÓN', color: 'var(--warning)',  icon: '🗳️' },
    approved: { label: 'APROBADA',    color: 'var(--success)',  icon: '✅' },
    rejected: { label: 'RECHAZADA',   color: 'var(--danger)',   icon: '❌' }
  };
  const st  = statusMap[law.status] || statusMap.voting;
  const yes = (law.votes?.yes || []).length;
  const no  = (law.votes?.no  || []).length;
  const abs = (law.votes?.abstain || []).length;
  const total = yes + no + abs;
  const hasVoted = [
    ...(law.votes?.yes||[]),
    ...(law.votes?.no||[]),
    ...(law.votes?.abstain||[])
  ].includes(player.id);
  const timeLeft = law.votingEndsAt > Date.now()
    ? `${Math.ceil((law.votingEndsAt - Date.now()) / 3600000)}h restantes`
    : 'Cerrada';

>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700">${law.title}</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">
            Por: ${law.proposerNickname} · ${formatTime(law.createdAt)}
          </div>
<<<<<<< HEAD
          ${law.description?`<div style="font-size:12px;color:var(--text-dim);margin-top:4px">${law.description}</div>`:''}
          ${fieldDisplay?`<div style="font-size:11px;color:var(--accent);margin-top:4px;font-family:var(--font-mono)">${fieldDisplay}</div>`:''}
        </div>
        <span style="font-family:var(--font-mono);font-size:10px;color:${st.color};background:${st.color}15;
          border:1px solid ${st.color}30;border-radius:6px;padding:3px 8px;margin-left:8px;flex-shrink:0">
          ${st.icon} ${st.label}
        </span>
      </div>

      ${law.status==='voting' ? `
        <div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:4px">
            <span>✅${yes} sí · ❌${no} no · ⬜${abs}</span>
            <span>⏱️ ${timeLeft}</span>
          </div>
          <div style="height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;display:flex">
            ${tot>0?`
              <div style="height:100%;background:var(--success);width:${(yes/tot*100).toFixed(0)}%;transition:0.3s"></div>
              <div style="height:100%;background:var(--danger);width:${(no/tot*100).toFixed(0)}%;transition:0.3s"></div>
              <div style="height:100%;background:var(--text-dim);width:${(abs/tot*100).toFixed(0)}%;transition:0.3s"></div>`:''}
          </div>
        </div>
        ${canVote && !hasVoted ? `
          <div style="display:flex;gap:6px">
            <button style="flex:1;background:rgba(0,230,118,0.1);border:1px solid var(--success);border-radius:8px;color:var(--success);font-family:var(--font-display);font-size:12px;padding:8px;font-weight:700"
              onclick="doVoteLaw('${law.id}','yes')">✅ SÍ</button>
            <button style="flex:1;background:rgba(255,61,87,0.1);border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-family:var(--font-display);font-size:12px;padding:8px;font-weight:700"
              onclick="doVoteLaw('${law.id}','no')">❌ NO</button>
            <button style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-family:var(--font-display);font-size:12px;padding:8px"
              onclick="doVoteLaw('${law.id}','abstain')">⬜ ABSTENER</button>
          </div>` :
          canVote && hasVoted ? `<div style="text-align:center;font-family:var(--font-mono);font-size:11px;color:var(--success);padding:6px">✅ Ya votaste</div>` :
          `<div style="text-align:center;font-family:var(--font-mono);font-size:11px;color:var(--text-dim);padding:6px">
            ${votingBody==='parliament'?'Solo el parlamento puede votar':'Solo el líder puede votar'}
          </div>`}` : `
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">
          Resultado: ${yes} sí · ${no} no · Ejecutada: ${law.executedAt?formatTime(law.executedAt):'—'}
        </div>`}
    </div>`;
}

function renderLawFields(law) {
  const parts = [];
  if (law.targetRegionId) {
    const r = STATE.regions?.find(r => r.id === law.targetRegionId);
    parts.push(`📍 Región: ${r?.name || law.targetRegionId}`);
  }
  if (law.value !== undefined && law.value !== null) {
    const typ = law.type;
    if (typ === 'tax_income' || typ === 'tax_factory') parts.push(`Nuevo %: ${law.value}%`);
    else if (['medicine','education_inv','infrastructure','transfer_budget'].includes(typ)) parts.push(`Inversión: $${formatMoney(law.value)}`);
    else if (typ === 'salary_minimum') parts.push(`Salario mín: $${law.value}`);
    else parts.push(`Valor: ${law.value}`);
  }
  if (law.targetState) parts.push(`🎯 Estado: ${law.targetState}`);
  if (law.newSystem)   parts.push(`🏛️ Sistema: ${law.newSystem}`);
  return parts.join(' · ');
}

// ─── Modal: proponer ley ──────────────────────────────────────────────────────
async function showProposeLawModal() {
  const p = STATE.player;
  if (!p.stateId) return showToast('No perteneces a ningún estado', 'error');

  const [lawTypesData, regionsData] = await Promise.all([
    API.getLawTypes(),
    API.getAllRegions()
  ]);
  const lawTypes = lawTypesData.lawTypes || {};
  const regions  = regionsData.regions   || [];
  const state    = window._politicsMyState;
  const stateRegions = regions.filter(r => (state?.regions||[]).includes(r.id));

  // Build type options grouped
  const typeOptions = Object.entries(lawTypes).map(([id, lt]) =>
    `<option value="${id}">${lt.icon} ${lt.name}</option>`
  ).join('');

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📜 PROPONER LEY</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>TIPO DE LEY</label>
      <select id="law-type" onchange="updateLawFields(${JSON.stringify(lawTypes).replace(/"/g,'&quot;')}, ${JSON.stringify(stateRegions).replace(/"/g,'&quot;')})">
        ${typeOptions}
      </select>
    </div>

    <div id="law-dynamic-fields" style="margin-bottom:12px"></div>

    <div class="field-group" style="margin-bottom:12px">
      <label>TÍTULO (opcional)</label>
      <input type="text" id="law-title" placeholder="Título descriptivo" maxlength="60">
    </div>

    <div class="field-group" style="margin-bottom:14px">
      <label>DESCRIPCIÓN (opcional)</label>
      <input type="text" id="law-desc" placeholder="Explica el propósito" maxlength="150">
    </div>

    <div id="law-voting-info" style="background:var(--bg-input);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--text-secondary)">
      ${state ? `🗳️ Sistema: ${state.systemName} · Votan: ${state.votingBody==='parliament'?'Parlamento':state.votingBody==='members'?'Todos los miembros':'Solo el líder'}` : ''}
    </div>

    <button class="btn-primary btn-full" onclick="doProposeLaw()">📜 PROPONER</button>
  `);

  // Trigger initial field update
  setTimeout(() => {
    const sel = document.getElementById('law-type');
    if (sel) updateLawFields(lawTypes, stateRegions);
  }, 100);
}

function updateLawFields(lawTypes, stateRegions) {
  const sel    = document.getElementById('law-type');
  const lawId  = sel ? sel.value : Object.keys(lawTypes)[0];
  const lawDef = lawTypes[lawId];
  const el     = document.getElementById('law-dynamic-fields');
  if (!el || !lawDef) return;

  const fields = lawDef.fields || [];
  el.innerHTML = fields.map(f => {
    if (f.type === 'number') return `
      <div class="field-group" style="margin-bottom:10px">
        <label>${f.label}</label>
        <input type="number" id="law-field-${f.id}" min="${f.min||0}" max="${f.max||999999}"
          placeholder="${f.hint||''}"
          style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:10px;font-size:14px;outline:none">
        ${f.hint?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${f.hint}</div>`:''}
      </div>`;
    if (f.type === 'text') return `
      <div class="field-group" style="margin-bottom:10px">
        <label>${f.label}</label>
        <input type="text" id="law-field-${f.id}" placeholder="${f.hint||''}"
          style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:10px;font-size:14px;outline:none">
        ${f.hint?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${f.hint}</div>`:''}
      </div>`;
    if (f.type === 'select') return `
      <div class="field-group" style="margin-bottom:10px">
        <label>${f.label}</label>
        <select id="law-field-${f.id}">
          ${(f.options||[]).map(o=>`<option value="${o.value}">${o.label}</option>`).join('')}
        </select>
        ${f.hint?`<div style="font-size:10px;color:var(--text-dim);margin-top:3px">${f.hint}</div>`:''}
      </div>`;
    return '';
  }).join('');

  // Add region selector if required
  if (lawDef.requiresRegion) {
    el.innerHTML += `
      <div class="field-group" style="margin-bottom:10px">
        <label>REGIÓN OBJETIVO</label>
        <select id="law-region">
          ${stateRegions.length===0
            ? '<option value="">Sin regiones controladas</option>'
            : stateRegions.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
        </select>
        <div style="font-size:10px;color:var(--text-dim);margin-top:3px">Solo regiones controladas por tu estado</div>
      </div>`;
  } else {
    // Remove region selector if not needed
    const existing = document.getElementById('law-region');
    if (existing) existing.closest('.field-group')?.remove();
  }
}

async function doProposeLaw() {
  const lawType      = document.getElementById('law-type')?.value;
  const title        = document.getElementById('law-title')?.value?.trim();
  const description  = document.getElementById('law-desc')?.value?.trim();
  const targetRegionId = document.getElementById('law-region')?.value || null;

  if (!lawType) return showToast('Selecciona un tipo de ley', 'error');

  // Collect all dynamic field values
  const fieldValues = {};
  document.querySelectorAll('[id^="law-field-"]').forEach(el => {
    const key = el.id.replace('law-field-', '');
    fieldValues[key] = el.value;
  });

  try {
    const data = await API.proposeLaw({ lawType, title, description, targetRegionId, ...fieldValues });
    if (data.error) return showToast(data.error, 'error');
    showToast('✅ ' + data.message, 'success', 4000);
    closeModal();
    renderPolitics();
  } catch { showToast('Error al proponer ley', 'error'); }
}

async function doVoteLaw(lawId, vote) {
  try {
    const data = await API.voteLaw(lawId, vote);
    if (data.error) return showToast(data.error, 'error');
    showToast(data.executed ? '⚡ ¡Ley aprobada y ejecutada!' : `✅ Voto "${vote}" registrado`, 'success');
    const state = window._politicsMyState;
    if (state) loadLawsPanel(state.id);
  } catch { showToast('Error al votar', 'error'); }
}

async function doContributeBudget() {
  const amount = parseInt(document.getElementById('budget-contrib')?.value);
  if (!amount || amount <= 0) return showToast('Cantidad inválida', 'error');
  const data = await API.transferBudget(amount);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState(data.player);
  showToast('✅ ' + data.message, 'success');
  renderPolitics();
}
=======
          ${law.description ? `<div style="font-size:12px;color:var(--text-dim);margin-top:4px">${law.description}</div>` : ''}
        </div>
        <span style="font-family:var(--font-mono);font-size:10px;color:${st.color};background:${st.color}15;border:1px solid ${st.color}30;border-radius:6px;padding:3px 8px;margin-left:8px;flex-shrink:0">${st.icon} ${st.label}</span>
      </div>

      ${law.status === 'voting' ? `
        <!-- Barra de votos -->
        <div style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-bottom:4px">
            <span>✅ ${yes} sí · ❌ ${no} no · ⬜ ${abs}</span>
            <span>⏱️ ${timeLeft}</span>
          </div>
          <div style="height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;display:flex">
            ${total > 0 ? `
              <div style="height:100%;background:var(--success);width:${(yes/total*100).toFixed(0)}%;transition:0.3s"></div>
              <div style="height:100%;background:var(--danger);width:${(no/total*100).toFixed(0)}%;transition:0.3s"></div>
              <div style="height:100%;background:var(--text-dim);width:${(abs/total*100).toFixed(0)}%;transition:0.3s"></div>
            ` : ''}
          </div>
        </div>
        ${!hasVoted ? `
          <div style="display:flex;gap:6px">
            <button style="flex:1;background:rgba(0,230,118,0.1);border:1px solid var(--success);border-radius:8px;color:var(--success);font-family:var(--font-display);font-size:12px;padding:8px;font-weight:700"
              onclick="doVote('${law.id}', 'yes')">✅ SÍ</button>
            <button style="flex:1;background:rgba(255,61,87,0.1);border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-family:var(--font-display);font-size:12px;padding:8px;font-weight:700"
              onclick="doVote('${law.id}', 'no')">❌ NO</button>
            <button style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-family:var(--font-display);font-size:12px;padding:8px"
              onclick="doVote('${law.id}', 'abstain')">⬜ ABSTENER</button>
          </div>` : `
          <div style="text-align:center;font-family:var(--font-mono);font-size:11px;color:var(--success);padding:6px">
            ✅ Ya votaste en esta ley
          </div>`}` : ''}

      ${law.status !== 'voting' ? `
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">
          Resultado: ${yes} sí · ${no} no · Ejecutada: ${formatTime(law.executedAt)}
        </div>` : ''}
    </div>`;
}

// ─── Modal: fundar estado ─────────────────────────────────────────────────────

async function showFoundStateModal() {
  const [sysData, shieldData] = await Promise.all([
    API.getPoliticalSystems(),
    API.getShields()
  ]);
  const systems = sysData.systems || {};
  const shields = shieldData.shields || [];
  let selectedShield = shields[0];

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">🌍 FUNDAR ESTADO</div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-bottom:14px">Costo: $10,000 + 50 ⚱️ oro</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>NOMBRE DEL ESTADO</label>
      <input type="text" id="state-name" placeholder="Nombre único" maxlength="30">
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>COLOR (hex)</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="color" id="state-color" value="#00d4ff" style="width:50px;height:40px;border:none;background:none;cursor:pointer">
        <input type="text" id="state-color-text" value="#00d4ff" maxlength="7" style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:8px;font-size:14px;outline:none"
          oninput="document.getElementById('state-color').value=this.value">
      </div>
    </div>

    <div style="margin-bottom:12px">
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);letter-spacing:2px;margin-bottom:8px">ESCUDO</div>
      <div id="shield-selector" style="display:flex;flex-wrap:wrap;gap:8px">
        ${shields.map(s => `
          <button style="width:44px;height:44px;background:var(--bg-card);border:2px solid ${s === selectedShield ? 'var(--accent)' : 'var(--border)'};border-radius:10px;font-size:22px;cursor:pointer"
            id="shield-btn-${s}" onclick="selectShield('${s}')">${s}</button>`).join('')}
      </div>
      <input type="hidden" id="selected-shield" value="${selectedShield}">
    </div>

    <div class="field-group" style="margin-bottom:14px">
      <label>SISTEMA POLÍTICO</label>
      <select id="state-system">
        ${Object.entries(systems).map(([id, sys]) =>
          `<option value="${id}">${sys.icon} ${sys.name}</option>`).join('')}
      </select>
    </div>

    <div id="system-desc" style="background:var(--bg-input);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--text-secondary)">
      Selecciona un sistema para ver la descripción
    </div>

    <button class="btn-primary btn-full" onclick="doFoundState()">🌍 FUNDAR ESTADO</button>
  `);

  // Update system description on change
  document.getElementById('state-system').addEventListener('change', function() {
    const sys = systems[this.value];
    if (sys) document.getElementById('system-desc').textContent = sys.description;
  });
  const firstSys = Object.values(systems)[0];
  if (firstSys) document.getElementById('system-desc').textContent = firstSys.description;

  window._foundStateShields = shields;
}

function selectShield(shield) {
  document.getElementById('selected-shield').value = shield;
  (window._foundStateShields || []).forEach(s => {
    const btn = document.getElementById(`shield-btn-${s}`);
    if (btn) btn.style.borderColor = s === shield ? 'var(--accent)' : 'var(--border)';
  });
}

async function doFoundState() {
  const name            = document.getElementById('state-name')?.value?.trim();
  const color           = document.getElementById('state-color')?.value || '#00d4ff';
  const shield          = document.getElementById('selected-shield')?.value;
  const politicalSystem = document.getElementById('state-system')?.value;

  if (!name) return showToast('Escribe un nombre para el estado', 'error');

  try {
    const data = await API.foundState({ name, color, shield, politicalSystem });
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast(`✅ ${data.message}`, 'success', 5000);
    closeModal();
    renderPolitics();
  } catch { showToast('Error al fundar estado', 'error'); }
}

// ─── Modal: ver estado ajeno ──────────────────────────────────────────────────
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd

async function showStateDetail(stateId) {
  try {
    const data  = await API.getState(stateId);
    const state = data.state;
    const p     = STATE.player;
    const isMember = p.stateId === stateId;

    openModal(`
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:44px;margin-bottom:8px">${state.shield}</div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:${state.color}">${state.name}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${state.systemIcon} ${state.systemName}</div>
      </div>
<<<<<<< HEAD
      ${state.description?`<div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px;font-style:italic">"${state.description}"</div>`:''}
=======

      ${state.description ? `<div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px;font-style:italic">"${state.description}"</div>` : ''}

>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
      <div class="info-row"><span class="info-label">LÍDER</span><span class="info-val">👑 ${state.leaderNickname} (${state.leaderTitle})</span></div>
      <div class="info-row"><span class="info-label">MIEMBROS</span><span class="info-val">${state.memberCount}</span></div>
      <div class="info-row"><span class="info-label">TESORO</span><span class="info-val text-money">$${formatMoney(state.treasury||0)}</span></div>
      <div class="info-row"><span class="info-label">REGIONES</span><span class="info-val">${(state.regionDetails||[]).length}</span></div>
<<<<<<< HEAD
      ${state.activeLaws>0?`<div class="info-row"><span class="info-label">LEYES ACTIVAS</span><span class="info-val text-warning">⚠️ ${state.activeLaws}</span></div>`:''}
      <div style="margin-top:14px">
        ${isMember
          ?`<div class="badge badge-accent" style="display:block;text-align:center;padding:10px">✅ Eres miembro</div>`
          :`<div style="font-size:12px;color:var(--text-dim);text-align:center">Los estados se unen a través del sistema electoral y de partidos</div>`}
=======
      <div class="info-row"><span class="info-label">FUNDADO</span><span class="info-val">${formatTime(state.foundedAt)}</span></div>
      ${state.activeLaws > 0 ? `<div class="info-row"><span class="info-label">LEYES ACTIVAS</span><span class="info-val text-warning">⚠️ ${state.activeLaws}</span></div>` : ''}

      <div style="margin-top:14px">
        ${isMember
          ? `<div class="badge badge-accent" style="display:block;text-align:center;padding:10px">✅ Eres miembro de este estado</div>`
          : !p.stateId
            ? `<button class="btn-primary btn-full" onclick="doJoinState('${stateId}', '${state.name}')">🤝 UNIRSE A ${state.name.toUpperCase()}</button>`
            : `<div style="font-size:12px;color:var(--text-dim);text-align:center">Debes salir de tu estado actual para unirte a otro</div>`}
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
      </div>
    `);
  } catch {}
}

<<<<<<< HEAD
=======
async function doJoinState(stateId, name) {
  const data = await API.joinState(stateId);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState(data.player);
  showToast(`✅ ${data.message}`, 'success');
  closeModal();
  renderPolitics();
}

// ─── Modal: proponer ley ──────────────────────────────────────────────────────

async function showProposeLawModal() {
  const p = STATE.player;
  if (!p.stateId) return showToast('No perteneces a ningún estado', 'error');

  const [lawTypesData, regionsData] = await Promise.all([
    API.getLawTypes(),
    API.getAllRegions()
  ]);
  const lawTypes = lawTypesData.lawTypes || {};
  const regions  = regionsData.regions  || [];
  const state    = window._politicsMyState;

  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📜 PROPONER LEY</div>

    <div class="field-group" style="margin-bottom:12px">
      <label>TIPO DE LEY</label>
      <select id="law-type" onchange="updateLawForm()">
        ${Object.entries(lawTypes).map(([id, lt]) =>
          `<option value="${id}">${lt.icon} ${lt.name}</option>`).join('')}
      </select>
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>TÍTULO</label>
      <input type="text" id="law-title" placeholder="Título descriptivo" maxlength="60">
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>DESCRIPCIÓN (opcional)</label>
      <input type="text" id="law-desc" placeholder="Explica el propósito de la ley" maxlength="150">
    </div>

    <div class="field-group" style="margin-bottom:12px">
      <label>VALOR / PARÁMETRO</label>
      <input type="number" id="law-value" placeholder="Ej: 15 (para 15% de impuesto)">
    </div>

    <div class="field-group" style="margin-bottom:14px" id="law-region-wrap">
      <label>REGIÓN OBJETIVO</label>
      <select id="law-region">
        <option value="">Todas las regiones del estado</option>
        ${regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
      </select>
    </div>

    <button class="btn-primary btn-full" onclick="doProposeLaw()">📜 PROPONER LEY</button>
  `);
}

async function doProposeLaw() {
  const lawType  = document.getElementById('law-type')?.value;
  const title    = document.getElementById('law-title')?.value?.trim();
  const desc     = document.getElementById('law-desc')?.value?.trim();
  const value    = document.getElementById('law-value')?.value;
  const regionId = document.getElementById('law-region')?.value;

  if (!lawType || !title) return showToast('Tipo y título son obligatorios', 'error');

  try {
    const data = await API.proposeLaw({
      lawType, title, description: desc,
      value: value || null,
      targetRegionId: regionId || null
    });
    if (data.error) return showToast(data.error, 'error');
    showToast(`✅ ${data.message}`, 'success', 4000);
    closeModal();
    renderPolitics();
  } catch { showToast('Error al proponer ley', 'error'); }
}

async function doVote(lawId, vote) {
  try {
    const data = await API.voteLaw(lawId, vote);
    if (data.error) return showToast(data.error, 'error');
    const msg = data.executed ? '⚡ ¡Ley aprobada y ejecutada!' : `✅ Voto "${vote}" registrado`;
    showToast(msg, 'success');
    // Recargar leyes
    const state = window._politicsMyState;
    if (state) loadLawsPanel(state.id);
  } catch { showToast('Error al votar', 'error'); }
}

// ─── Acciones de estado ───────────────────────────────────────────────────────

async function doContributeBudget() {
  const amount = parseInt(document.getElementById('budget-contrib')?.value);
  if (!amount || amount <= 0) return showToast('Cantidad inválida', 'error');
  const data = await API.transferBudget(amount);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState(data.player);
  showToast(`✅ ${data.message}`, 'success');
  renderPolitics();
}

>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
function showEditStateModal() {
  const state = window._politicsMyState;
  if (!state) return;
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">✏️ EDITAR ESTADO</div>
    <div class="field-group" style="margin-bottom:12px">
      <label>DESCRIPCIÓN</label>
      <textarea id="edit-state-desc" rows="3" maxlength="300"
<<<<<<< HEAD
        style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;
        color:var(--text-primary);padding:10px;font-size:14px;resize:none;outline:none"
=======
        style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:10px;font-size:14px;resize:none;outline:none;font-family:var(--font-body)"
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
        placeholder="Describe tu estado...">${state.description||''}</textarea>
    </div>
    <div class="field-group" style="margin-bottom:14px">
      <label>COLOR</label>
      <input type="color" id="edit-state-color" value="${state.color||'#00d4ff'}"
<<<<<<< HEAD
        style="width:100%;height:44px;border:1px solid var(--border);border-radius:8px;cursor:pointer">
=======
        style="width:100%;height:44px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--bg-input)">
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
    </div>
    <button class="btn-primary btn-full" onclick="doEditState()">💾 GUARDAR</button>
  `);
}

async function doEditState() {
  const description = document.getElementById('edit-state-desc')?.value?.trim();
  const color       = document.getElementById('edit-state-color')?.value;
  const data = await API.updateState({ description, color });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ Estado actualizado', 'success');
<<<<<<< HEAD
  closeModal(); renderPolitics();
=======
  closeModal();
  renderPolitics();
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
}

function showTransferLeadershipModal() {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px;color:var(--warning)">👑 TRANSFERIR LIDERAZGO</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
<<<<<<< HEAD
      ⚠️ Esta acción es irreversible.
=======
      ⚠️ Esta acción es irreversible. El nuevo líder tendrá control total del estado.
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
    </div>
    <div class="field-group" style="margin-bottom:14px">
      <label>NICKNAME DEL NUEVO LÍDER</label>
      <input type="text" id="new-leader-nick" placeholder="Nickname del miembro">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-ghost btn-full" onclick="closeModal()">CANCELAR</button>
      <button class="btn-danger btn-full" onclick="doTransferLeadership()">👑 TRANSFERIR</button>
    </div>
  `);
}

async function doTransferLeadership() {
  const nick = document.getElementById('new-leader-nick')?.value?.trim();
  if (!nick) return showToast('Escribe un nickname', 'error');
  const data = await API.transferLeadership(nick);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState(data.player);
<<<<<<< HEAD
  showToast('✅ ' + data.message, 'success');
  closeModal(); renderPolitics();
=======
  showToast(`✅ ${data.message}`, 'success');
  closeModal();
  renderPolitics();
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
}

function confirmLeaveState() {
  const state = window._politicsMyState;
<<<<<<< HEAD
  confirmAction('Abandonar estado', `¿Salir de ${state?.name||'el estado'}?`, async () => {
    const data = await API.leaveState();
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast('Abandonaste el estado', '');
    renderPolitics();
  });
}

async function showResidencyRequests() {
  const state = window._politicsMyState;
  if (!state) return;
  openModal('<div class="loading">⏳ Cargando solicitudes...</div>');
  try {
    const regionIds = state.regions || [];
    if (regionIds.length === 0) {
      document.getElementById('modal-content').innerHTML = `
        <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📋 RESIDENCIAS</div>
        <div class="empty">Tu estado no controla ninguna región aún</div>`;
      return;
    }
    const regionDataList = await Promise.all(regionIds.map(rId => API.getRegion(rId)));
    let allPending = [];
    regionDataList.forEach(rd => {
      const r = rd.region;
      if (r?.pendingResidencies?.length > 0) {
        r.pendingResidencies.forEach(p => allPending.push({ ...p, regionId: r.id, regionName: r.name }));
      }
    });
    document.getElementById('modal-content').innerHTML = `
      <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:14px">📋 SOLICITUDES DE RESIDENCIA</div>
      ${allPending.length===0
        ? '<div class="empty">No hay solicitudes pendientes</div>'
        : allPending.map(req => `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="flex:1">
                <div style="font-family:var(--font-display);font-size:14px;font-weight:700">${req.nickname}</div>
                <div style="font-size:11px;color:var(--text-secondary)">📍 ${req.regionName}</div>
                <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">${formatTime(req.requestedAt)}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-primary btn-full btn-sm" style="background:var(--success);box-shadow:none"
                onclick="handleResidency('${req.id}','${req.regionId}',true)">✅ APROBAR</button>
              <button class="btn-danger btn-sm" style="flex:1"
                onclick="handleResidency('${req.id}','${req.regionId}',false)">❌ RECHAZAR</button>
            </div>
          </div>`).join('')}`;
  } catch { document.getElementById('modal-content').innerHTML = '<div class="empty">Error cargando solicitudes</div>'; }
}

async function handleResidency(playerId, regionId, approve) {
  const data = await API.approveResidency(playerId, regionId, approve);
  if (data.error) return showToast(data.error, 'error');
  showToast(data.message, 'success');
  showResidencyRequests();
=======
  confirmAction(
    'Abandonar estado',
    `¿Seguro que quieres abandonar ${state?.name || 'el estado'}?`,
    async () => {
      const data = await API.leaveState();
      if (data.error) return showToast(data.error, 'error');
      updatePlayerState(data.player);
      showToast('Abandonaste el estado', '');
      renderPolitics();
    }
  );
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
}

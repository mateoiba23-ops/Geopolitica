// ─── PARTIDOS Y ELECCIONES ────────────────────────────────────────────────────

const IDEOLOGIES = [
  { id:'liberal',      name:'Liberal',       color:'#e74c3c', icon:'🔴' },
  { id:'conservative', name:'Conservador',   color:'#2980b9', icon:'🔵' },
  { id:'socialist',    name:'Socialista',    color:'#e67e22', icon:'🟠' },
  { id:'nationalist',  name:'Nacionalista',  color:'#27ae60', icon:'🟢' },
  { id:'libertarian',  name:'Libertario',    color:'#f39c12', icon:'🟡' },
  { id:'communist',    name:'Comunista',     color:'#c0392b', icon:'🔴' },
  { id:'progressive',  name:'Progresista',   color:'#8e44ad', icon:'🟣' },
  { id:'centrist',     name:'Centrista',     color:'#7f8c8d', icon:'⚪' }
];

async function renderParties() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando partidos...</div>';

  try {
    const p = STATE.player;
    const [partiesData, myPartyData, electionsData] = await Promise.all([
      API.getPartiesByRegion(p.regionId),
      API.getMyParty(),
      API.getElectionsByRegion(p.regionId)
    ]);
    let parliamentData = { parliament: null };
    if (p.stateId) {
      try { parliamentData = await API.getParliament(p.stateId); } catch {}
    }

    const parties   = partiesData.parties   || [];
    const myParty   = myPartyData.party;
    const elections = electionsData.elections || [];
    const parliament = parliamentData.parliament;
    const now = Date.now();

    const activeEl  = elections.filter(e => e.status === 'open'    && now < e.endsAt);
    const pendingEl = elections.filter(e => e.status === 'pending'  && now < e.endsAt);

    content.innerHTML = `
      <div class="panel">
        <div class="panel-title">🗳️ <span>PARTIDOS · ${getRegionName(p.regionId).toUpperCase()}</span></div>

        ${myParty ? renderMyPartyCard(myParty, p) : renderNoPartyCard()}

        ${activeEl.length > 0 ? `
          <div class="section-header" style="margin-bottom:10px">
            <div class="section-title">🗳️ ELECCIONES ABIERTAS</div>
            <span class="badge badge-danger">EN CURSO</span>
          </div>
          ${activeEl.map(e => renderElectionCard(e, p, myParty)).join('')}` : ''}

        ${pendingEl.length > 0 ? `
          <div style="background:rgba(255,202,40,0.06);border:1px solid rgba(255,202,40,0.2);
            border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:12px">
            <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--warning);margin-bottom:4px">⏳ PRÓXIMAS ELECCIONES</div>
            ${pendingEl.map(e => `
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:2px">
                ${e.type==='parliamentary'?'🏛️ Parlamentarias':e.type==='presidential'?'🎖️ Presidenciales':'🔵 Primarias'}
                — Inician en ${formatCountdown(e.startsAt)}
              </div>`).join('')}
          </div>` : ''}

        ${parliament ? renderParliamentCard(parliament, p) : ''}

        <div class="section-header" style="margin-bottom:10px">
          <div class="section-title">🏳️ PARTIDOS EN LA REGIÓN</div>
          ${!myParty ? `<button class="btn-primary btn-sm" onclick="showFoundPartyModal()">➕ Fundar</button>` : ''}
        </div>

        ${parties.length === 0 ? `
          <div class="card">
            <div class="empty">No hay partidos aún.<br>
              <span style="font-size:12px;color:var(--text-dim)">Funda el primero y activa las elecciones ($5,000 + 10⚱️)</span>
            </div>
            ${!myParty ? `<button class="btn-primary btn-full" style="margin-top:10px" onclick="showFoundPartyModal()">🏳️ FUNDAR PRIMER PARTIDO</button>` : ''}
          </div>`
        : parties.map(party => renderPartyCard(party, p, myParty)).join('')}
      </div>`;
  } catch(e) {
    console.error(e);
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar partidos</div></div>`;
  }
}

function renderMyPartyCard(party, player) {
  const isLeader = party.leaderId === player.id;
  const ideo = IDEOLOGIES.find(i => i.id === party.ideology);
  return `
    <div style="background:linear-gradient(135deg,${party.color}18,${party.color}08);
      border:1px solid ${party.color}55;border-radius:var(--radius-lg);padding:14px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:44px;height:44px;background:${party.color};border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${ideo?.icon||'🏳️'}</div>
        <div style="flex:1">
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${party.color}">${party.name}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${ideo?.name||party.ideology} · ${party.memberCount} miembros</div>
          <div style="font-size:10px;color:var(--text-dim)">${isLeader?'👑 Líder':'🏅 Miembro'}</div>
        </div>
        <span class="badge badge-accent" style="font-size:9px">MI PARTIDO</span>
      </div>
      ${party.description?`<div style="font-size:12px;color:var(--text-dim);font-style:italic;margin-bottom:8px">"${party.description}"</div>`:''}
      <div style="display:flex;gap:8px">
        <button class="btn-danger btn-sm" onclick="confirmLeaveParty()">🚪 Salir</button>
      </div>
    </div>`;
}

function renderNoPartyCard() {
  return `
    <div style="background:var(--bg-card);border:1px dashed var(--border-bright);
      border-radius:var(--radius-lg);padding:14px;margin-bottom:14px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">🏳️</div>
      <div style="font-family:var(--font-display);font-size:14px;font-weight:600;margin-bottom:4px">Sin partido</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">Únete o funda un partido para participar en política</div>
      <button class="btn-primary btn-sm" onclick="showFoundPartyModal()">🏳️ FUNDAR ($5,000 + 10⚱️)</button>
    </div>`;
}

function renderPartyCard(party, player, myParty) {
  const isMine = myParty && myParty.id === party.id;
  const ideo   = IDEOLOGIES.find(i => i.id === party.ideology);
  const canJoin = !myParty;
  return `
    <div style="background:var(--bg-card);border:1px solid ${isMine?party.color+'88':'var(--border)'};
      border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:${party.color};border-radius:8px;
          display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${ideo?.icon||'🏳️'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${party.color}">${party.name}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${ideo?.name||party.ideology} · ${party.memberCount} miembros · Líder: ${party.leaderNickname}</div>
        </div>
        ${canJoin?`<button class="btn-ghost btn-sm" onclick="doJoinParty('${party.id}','${party.name.replace(/'/g,"\\'")}')">UNIRSE</button>`
          :isMine?`<span class="badge badge-accent" style="font-size:9px">MÍO</span>`:''}
      </div>
      ${party.description?`<div style="font-size:11px;color:var(--text-dim);margin-top:6px;font-style:italic">"${party.description.slice(0,80)}"</div>`:''}
    </div>`;
}

function renderElectionCard(election, player, myParty) {
  const now = Date.now();
  const timeLeft = formatCountdown(election.endsAt);
  const hasVoted = !!(election.votes && election.votes[player.id]);
  const dur = election.endsAt - (election.startsAt || (election.endsAt - 86400000));
  const elapsed = now - (election.startsAt || (election.endsAt - dur));
  const pct = Math.max(0, Math.min(100, (elapsed/dur)*100));

  let typeLabel, typeIcon, body;

  if (election.type === 'primary') {
    typeLabel = `Primarias — ${election.partyName}`;
    typeIcon = '🔵';
    const isMyPartyPrimary = myParty && myParty.id === election.partyId;
    const isCandidate = !!(election.candidates && election.candidates[player.id]);
    const candidates = Object.values(election.candidates||{}).sort((a,b)=>b.votes-a.votes);
    body = `
      ${isMyPartyPrimary && !isCandidate?`<button class="btn-ghost btn-full btn-sm" style="margin-bottom:8px" onclick="doRegisterCandidate('${election.id}')">📋 REGISTRARME COMO CANDIDATO</button>`:''}
      ${candidates.length===0?'<div style="font-size:12px;color:var(--text-dim)">Sin candidatos aún</div>'
      :candidates.map(c=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${c.nickname}</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim)">${c.votes} votos</div>
          </div>
          ${isMyPartyPrimary&&!hasVoted?`<button class="btn-primary btn-sm" onclick="doVotePrimary('${election.id}','${c.id}')">VOTAR</button>`
            :election.votes&&election.votes[player.id]===c.id?'<span class="badge badge-accent" style="font-size:9px">✅ TU VOTO</span>':''}
        </div>`).join('')}`;
  } else if (election.type === 'parliamentary') {
    typeLabel = 'Elecciones Parlamentarias';
    typeIcon = '🏛️';
    const isRes = player.residencies && player.residencies[election.regionId]?.status === 'approved';
    const plist = Object.values(election.parties||{}).sort((a,b)=>b.votes-a.votes);
    body = `
      ${!isRes?'<div style="font-size:11px;color:var(--warning);margin-bottom:8px">⚠️ Necesitas residencia para votar</div>':''}
      ${plist.map(party=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="width:12px;height:12px;background:${party.color};border-radius:50%;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${party.name}</div>
            <div style="font-size:10px;color:var(--text-dim)">${party.votes} votos · Candidato: ${party.candidate?.nickname||'Sin definir'}</div>
          </div>
          ${isRes&&!hasVoted?`<button class="btn-primary btn-sm" onclick="doVoteParliamentary('${election.id}','${party.id}')">VOTAR</button>`
            :election.votes&&election.votes[player.id]===party.id?'<span class="badge badge-accent" style="font-size:9px">✅ TU VOTO</span>':''}
        </div>`).join('')}`;
  } else {
    typeLabel = 'Elecciones Presidenciales';
    typeIcon = '🎖️';
    const isRes = player.residencies && player.residencies[election.regionId]?.status === 'approved';
    const cands = Object.values(election.candidates||{}).sort((a,b)=>b.votes-a.votes);
    body = `
      ${!isRes?'<div style="font-size:11px;color:var(--warning);margin-bottom:8px">⚠️ Necesitas residencia para votar</div>':''}
      ${cands.map(c=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="width:10px;height:10px;background:${c.partyColor};border-radius:50%;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600">${c.nickname}</div>
            <div style="font-size:10px;color:var(--text-dim)">${c.partyName} · ${c.votes} votos</div>
          </div>
          ${isRes&&!hasVoted?`<button class="btn-primary btn-sm" onclick="doVotePresidential('${election.id}','${c.id}')">VOTAR</button>`
            :election.votes&&election.votes[player.id]===c.id?'<span class="badge badge-accent" style="font-size:9px">✅ TU VOTO</span>':''}
        </div>`).join('')}`;
  }

  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700">${typeIcon} ${typeLabel}</div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);margin-top:2px">⏱️ Cierra en ${timeLeft}</div>
        </div>
        ${hasVoted?'<span class="badge badge-success" style="font-size:9px">✅ VOTASTE</span>':'<span class="badge badge-warning" style="font-size:9px">⚠️ PENDIENTE</span>'}
      </div>
      <div style="height:4px;background:var(--bg-input);border-radius:2px;margin-bottom:10px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:2px"></div>
      </div>
      ${body}
    </div>`;
}

function renderParliamentCard(parliament, player) {
  if (!parliament || !parliament.seats) return '';
  const isMember = parliament.seats.some(s => s.playerId === player.id);
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div class="card-title">🏛️ PARLAMENTO</div>
        ${isMember?'<span class="badge badge-accent">ERES MIEMBRO</span>':''}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${parliament.seats.map(s=>`
          <div style="background:${s.partyColor}33;border:1px solid ${s.partyColor}55;border-radius:4px;
            padding:3px 8px;font-family:var(--font-mono);font-size:10px;color:${s.partyColor}${s.playerId===player.id?';font-weight:700':''}">
            ${s.nickname}
          </div>`).join('')}
      </div>
      ${parliament.partyResults?`<div style="font-size:11px;color:var(--text-dim)">${parliament.partyResults.map(p=>`${p.name}: ${p.seats} (${p.percentage}%)`).join(' · ')}</div>`:''}
    </div>`;
}

// ─── Modales y acciones ───────────────────────────────────────────────────────
function showFoundPartyModal() {
  openModal(`
    <div style="font-family:var(--font-display);font-size:18px;font-weight:700;margin-bottom:4px">🏳️ FUNDAR PARTIDO</div>
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);margin-bottom:14px">
      $5,000 + 10⚱️ · Región: ${getRegionName(STATE.player.regionId)}
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>NOMBRE</label>
      <input type="text" id="party-name" placeholder="Nombre único del partido" maxlength="40">
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>IDEOLOGÍA</label>
      <select id="party-ideology">
        ${IDEOLOGIES.map(i=>`<option value="${i.id}">${i.icon} ${i.name}</option>`).join('')}
      </select>
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>COLOR</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="color" id="party-color" value="#e74c3c" style="width:50px;height:40px;border:none;cursor:pointer">
        <input type="text" id="party-color-text" value="#e74c3c" maxlength="7"
          style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:8px;outline:none"
          oninput="document.getElementById('party-color').value=this.value">
      </div>
    </div>
    <div class="field-group" style="margin-bottom:12px">
      <label>DESCRIPCIÓN (opcional)</label>
      <input type="text" id="party-desc" placeholder="Principios del partido" maxlength="120">
    </div>
    <div style="background:var(--bg-input);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--text-secondary)">
      💡 Si es el primer partido de la región, las elecciones parlamentarias iniciarán en <strong>24 horas</strong>.
    </div>
    <button class="btn-primary btn-full" onclick="doFoundParty()">🏳️ FUNDAR PARTIDO</button>
  `);
}

async function doFoundParty() {
  const name        = document.getElementById('party-name')?.value?.trim();
  const ideology    = document.getElementById('party-ideology')?.value;
  const color       = document.getElementById('party-color')?.value || '#e74c3c';
  const description = document.getElementById('party-desc')?.value?.trim();
  if (!name) return showToast('Escribe un nombre', 'error');
  try {
    const data = await API.post('/politics2/found-party', { name, ideology, color, description });
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast('✅ ' + data.message, 'success', 4000);
    closeModal(); renderParties();
  } catch { showToast('Error al fundar partido', 'error'); }
}

async function doJoinParty(partyId, partyName) {
  confirmAction(`Unirse a ${partyName}`, `¿Quieres unirte al partido "${partyName}"?`, async () => {
    const data = await API.post('/politics2/join-party', { partyId });
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast('✅ ' + data.message, 'success');
    renderParties();
  });
}

function confirmLeaveParty() {
  confirmAction('Salir del partido', '¿Seguro que quieres salir de tu partido?', async () => {
    const data = await API.post('/politics2/leave-party', {});
    if (data.error) return showToast(data.error, 'error');
    updatePlayerState(data.player);
    showToast('Saliste del partido', '');
    renderParties();
  });
}

async function doRegisterCandidate(electionId) {
  const data = await API.post('/politics2/register-candidate', { electionId });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderParties();
}

async function doVotePrimary(electionId, candidateId) {
  const data = await API.post('/politics2/vote-primary', { electionId, candidateId });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderParties();
}

async function doVoteParliamentary(electionId, partyId) {
  const data = await API.post('/politics2/vote-parliamentary', { electionId, partyId });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderParties();
}

async function doVotePresidential(electionId, candidateId) {
  const data = await API.post('/politics2/vote-presidential', { electionId, candidateId });
  if (data.error) return showToast(data.error, 'error');
  showToast('✅ ' + data.message, 'success');
  renderParties();
}

function formatCountdown(ts) {
  const diff = ts - Date.now();
  if (diff <= 0) return 'Cerrada';
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

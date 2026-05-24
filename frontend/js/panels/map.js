// ─── MAPA INTERACTIVO DE COLOMBIA ────────────────────────────────────────────

const DEPT_POSITIONS = {
  amazonas:        { x:52, y:82, r:8 },
  antioquia:       { x:28, y:35, r:7 },
  arauca:          { x:52, y:18, r:5 },
  atlantico:       { x:25, y:8,  r:4 },
  bogota:          { x:43, y:44, r:5 },
  bolivar:         { x:30, y:16, r:6 },
  boyaca:          { x:45, y:35, r:5 },
  caldas:          { x:32, y:42, r:4 },
  caqueta:         { x:46, y:65, r:7 },
  casanare:        { x:54, y:32, r:6 },
  cauca:           { x:30, y:60, r:6 },
  cesar:           { x:40, y:12, r:5 },
  choco:           { x:16, y:35, r:6 },
  cordoba:         { x:24, y:22, r:5 },
  cundinamarca:    { x:42, y:40, r:5 },
  guainia:         { x:72, y:55, r:6 },
  guaviare:        { x:57, y:58, r:6 },
  huila:           { x:38, y:58, r:5 },
  laguajira:       { x:38, y:5,  r:5 },
  magdalena:       { x:35, y:10, r:5 },
  meta:            { x:53, y:48, r:7 },
  narino:          { x:26, y:72, r:5 },
  norte_santander: { x:48, y:22, r:5 },
  putumayo:        { x:36, y:72, r:5 },
  quindio:         { x:30, y:46, r:3 },
  risaralda:       { x:27, y:44, r:3 },
  san_andres:      { x:5,  y:20, r:3 },
  santander:       { x:44, y:26, r:5 },
  sucre:           { x:28, y:20, r:4 },
  tolima:          { x:36, y:48, r:5 },
  valle_cauca:     { x:24, y:52, r:5 },
  vaupes:          { x:64, y:68, r:7 },
  vichada:         { x:68, y:40, r:8 }
};

async function renderMap() {
  const content = document.getElementById('game-content');
  content.innerHTML = '<div class="loading">⏳ Cargando mapa...</div>';

  try {
    const [regData, statesData] = await Promise.all([
      API.getAllRegions(),
      API.getAllStates()
    ]);

    const regions = regData.regions   || [];
    const states  = statesData.states || [];
    STATE.regions = regions;

    const regionStateMap = {};
    states.forEach(s => {
      (s.regions || []).forEach(rId => { regionStateMap[rId] = s; });
    });

    window._allRegions     = regions;
    window._regionStateMap = regionStateMap;
    window._mapFilter      = 'all';
    if (!window._mapView) window._mapView = 'map';

    const p = STATE.player;

    content.innerHTML = `
      <div class="map-container">
        <div class="map-header">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="panel-title" style="margin-bottom:0">🗺️ <span>COLOMBIA</span></div>
            <div style="display:flex;gap:6px">
              <button class="map-filter-btn ${window._mapView!=='list'?'active':''}" onclick="setMapView('map')">🗺️</button>
              <button class="map-filter-btn ${window._mapView==='list'?'active':''}" onclick="setMapView('list')">📋</button>
            </div>
          </div>
          <div class="map-search">
            <input type="text" id="map-search-input" placeholder="Buscar departamento..." oninput="filterRegions()">
          </div>
          <div class="map-filter-row">
            <button class="map-filter-btn active" onclick="setMapFilter('all',this)">TODOS</button>
            <button class="map-filter-btn" onclick="setMapFilter('high-industrial',this)">IND.</button>
            <button class="map-filter-btn" onclick="setMapFilter('high-medicine',this)">MED.</button>
            <button class="map-filter-btn" onclick="setMapFilter('high-education',this)">EDU.</button>
            <button class="map-filter-btn" onclick="setMapFilter('states',this)">ESTADOS</button>
            <button class="map-filter-btn" onclick="setMapFilter('my-region',this)">MÍA</button>
          </div>
        </div>

        <div id="map-svg-wrap" style="${window._mapView==='list'?'display:none':''}">
          ${buildSvgMap(regions, regionStateMap, p, states)}
        </div>

        <div class="map-list" id="map-list"></div>
      </div>`;

    renderRegionList(regions);

  } catch(e) {
    content.innerHTML = `<div class="panel"><div class="empty">Error al cargar mapa</div></div>`;
  }
}

function buildSvgMap(regions, regionStateMap, player, states) {
  const dots = regions.map(r => {
    const pos   = DEPT_POSITIONS[r.id];
    if (!pos) return '';
    const state   = regionStateMap[r.id];
    const isMyReg = player && player.regionId === r.id;
    const fill    = state ? state.color : '#00d4ff';
    const fillOp  = state ? 0.7 : 0.25;
    const stroke  = isMyReg ? '#00d4ff' : (state ? state.color : '#2a4570');
    const sw      = isMyReg ? 2.5 : 1.5;
    const rr      = pos.r + (isMyReg ? 1.5 : 0);

    return `<g onclick="showRegionDetail('${r.id}')" style="cursor:pointer">
      <circle cx="${pos.x}" cy="${pos.y}" r="${rr+5}" fill="transparent"/>
      <circle cx="${pos.x}" cy="${pos.y}" r="${rr}" fill="${fill}" fill-opacity="${fillOp}" stroke="${stroke}" stroke-width="${sw}">
        <title>${r.name}${state?' — '+state.name:''}</title>
      </circle>
      ${isMyReg?`<circle cx="${pos.x}" cy="${pos.y}" r="${rr+4}" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.5"><animate attributeName="r" values="${rr+2};${rr+7};${rr+2}" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/></circle>`:''}
      <text x="${pos.x}" y="${pos.y+rr+7}" text-anchor="middle" font-family="Share Tech Mono,monospace" font-size="3.5" fill="rgba(255,255,255,0.45)" style="pointer-events:none">${r.name.slice(0,7)}</text>
    </g>`;
  }).join('');

  const legendItems = [
    `<span style="color:var(--text-dim)"><span style="display:inline-block;width:8px;height:8px;background:rgba(0,212,255,0.25);border:1px solid #2a4570;border-radius:50%;margin-right:3px"></span>Libre</span>`,
    `<span style="color:var(--text-dim)"><span style="display:inline-block;width:8px;height:8px;background:rgba(0,212,255,0.4);border:2px solid #00d4ff;border-radius:50%;margin-right:3px"></span>Tu región</span>`,
    ...states.slice(0,3).map(s=>`<span style="color:${s.color}">${s.shield} ${s.name.slice(0,10)}</span>`)
  ].join('');

  return `
    <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);margin:0 14px 6px;overflow:hidden">
      <svg viewBox="0 0 90 100" style="width:100%;max-height:260px;display:block" xmlns="http://www.w3.org/2000/svg">
        <rect width="90" height="100" fill="var(--bg-card)"/>
        <defs><pattern id="mg" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0L0 0 0 10" fill="none" stroke="rgba(0,212,255,0.04)" stroke-width="0.5"/></pattern></defs>
        <rect width="90" height="100" fill="url(#mg)"/>
        <path d="M20,5 L45,3 L55,8 L65,5 L75,15 L80,30 L75,45 L80,60 L70,75 L60,85 L50,95 L35,90 L20,78 L15,65 L10,50 L12,35 L18,20 Z"
          fill="rgba(0,212,255,0.02)" stroke="rgba(0,212,255,0.12)" stroke-width="0.5"/>
        ${dots}
      </svg>
      <div style="padding:6px 12px;display:flex;flex-wrap:wrap;gap:8px;font-family:var(--font-mono);font-size:9px;border-top:1px solid var(--border)">
        ${legendItems}
      </div>
    </div>`;
}

function setMapView(view) {
  window._mapView = view;
  const sw = document.getElementById('map-svg-wrap');
  if (sw) sw.style.display = view === 'list' ? 'none' : '';
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    const oc = btn.getAttribute('onclick') || '';
    if (oc.includes("setMapView('map')")) btn.classList.toggle('active', view==='map');
    if (oc.includes("setMapView('list')")) btn.classList.toggle('active', view==='list');
  });
}

function renderRegionList(regions) {
  const list = document.getElementById('map-list');
  if (!list) return;
  if (!regions.length) { list.innerHTML = '<div class="empty" style="padding:20px">No se encontraron regiones</div>'; return; }

  const p   = STATE.player;
  const rsm = window._regionStateMap || {};

  list.innerHTML = regions.map(r => {
    const isMyRegion = p && p.regionId === r.id;
    const state      = rsm[r.id];
    const indColors  = [r.medicine,r.education,r.industrial,r.infrastructure].map(getRegionIndicatorColor);

    return `
      <div class="region-card${isMyRegion?' my-region-card':''}"
        style="${state?`border-left:3px solid ${state.color}`:''}"
        onclick="showRegionDetail('${r.id}')">
        <div class="region-header">
          <div>
            <div class="region-name">${r.name}
              ${isMyRegion?'<span class="badge badge-accent" style="font-size:9px;margin-left:6px">MÍA</span>':''}
              ${state?`<span style="font-size:11px;color:${state.color};margin-left:4px">${state.shield}</span>`:''}
            </div>
            <div class="region-capital">🏛️ ${r.capital}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">${r.playerCount||0} 👥</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">${r.factoryCount||0} 🏭</div>
          </div>
        </div>
        <div class="region-stats-row">
          <div class="region-stat-pill">👥 ${(r.population/1000).toFixed(0)}K</div>
          <div class="region-stat-pill">💰 ${r.taxes.income}%</div>
          <div class="region-stat-pill">🏭 ${r.taxes.factory}%</div>
        </div>
        <div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap">
          ${(r.resources||[]).slice(0,4).map(res=>`<span style="background:var(--bg-input);border-radius:4px;padding:2px 6px;font-size:10px;font-family:var(--font-mono);color:var(--text-secondary)">${getResourceIcon(res)} ${res}</span>`).join('')}
        </div>
        <div class="region-indicators">
          ${[{label:'MED',val:r.medicine},{label:'EDU',val:r.education},{label:'IND',val:r.industrial},{label:'INF',val:r.infrastructure}].map((ind,i)=>`
            <div class="region-indicator">
              <div class="region-indicator-label">${ind.label}</div>
              <div class="region-indicator-val" style="color:${indColors[i]}">${ind.val}</div>
              <div class="ind-bar"><div class="ind-bar-fill" style="width:${ind.val*10}%;background:${indColors[i]}"></div></div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

async function showRegionDetail(regionId) {
  try {
    const data  = await API.getRegion(regionId);
    const r     = data.region;
    const p     = STATE.player;
    const state = (window._regionStateMap||{})[regionId];
    const isMyRegion = p && p.regionId === regionId;
    const ic = (v) => getRegionIndicatorColor(v);

    openModal(`
      <div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700">${r.name}</div>
          ${isMyRegion?'<span class="badge badge-accent">MI REGIÓN</span>':''}
        </div>
        ${state?`<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:${state.color}11;border:1px solid ${state.color}44;border-radius:8px;margin-bottom:8px"><span style="font-size:18px">${state.shield}</span><span style="font-family:var(--font-display);font-size:13px;color:${state.color}">${state.name}</span></div>`:''}
        <div style="font-size:12px;color:var(--text-secondary)">${r.description||''}</div>
      </div>
      <div class="grid-2" style="gap:8px;margin-bottom:12px">
        <div style="background:var(--bg-input);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:9px;color:var(--text-dim);font-family:var(--font-mono)">JUGADORES</div>
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--accent)">${r.playerCount||0}</div>
        </div>
        <div style="background:var(--bg-input);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:9px;color:var(--text-dim);font-family:var(--font-mono)">FÁBRICAS</div>
          <div style="font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--gold)">${r.factoryCount||0}</div>
        </div>
      </div>
      <div class="info-row"><span class="info-label">CAPITAL</span><span class="info-val">🏛️ ${r.capital}</span></div>
      <div class="info-row"><span class="info-label">POBLACIÓN</span><span class="info-val">👥 ${formatNumber(r.population)}</span></div>
      <div class="info-row"><span class="info-label">IMPUESTO RENTA</span><span class="info-val">${r.taxes.income}%</span></div>
      <div class="info-row"><span class="info-label">IMPUESTO FÁBRICA</span><span class="info-val">${r.taxes.factory}%</span></div>
      <div class="info-row"><span class="info-label">MEDICINA</span><span class="info-val" style="color:${ic(r.medicine)}">${r.medicine}/10 (+${r.medicine}⚡/10min)</span></div>
      <div class="info-row"><span class="info-label">EDUCACIÓN</span><span class="info-val" style="color:${ic(r.education)}">${r.education}/10</span></div>
      <div class="info-row"><span class="info-label">INDUSTRIAL</span><span class="info-val" style="color:${ic(r.industrial)}">${r.industrial}/10</span></div>
      <div class="info-row"><span class="info-label">INFRAESTRUCTURA</span><span class="info-val" style="color:${ic(r.infrastructure)}">${r.infrastructure}/10</span></div>
      ${r.treasury>0?`<div class="info-row"><span class="info-label">TESORO</span><span class="info-val text-money">$${formatMoney(r.treasury)}</span></div>`:''}
      <div style="margin-top:12px">
        <div class="section-title" style="margin-bottom:8px">RECURSOS NATURALES</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${(r.resources||[]).map(res=>`<span style="background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px">${getResourceIcon(res)} ${res}</span>`).join('')}
        </div>
      </div>
      ${r.topPlayers&&r.topPlayers.length>0?`
        <div style="margin-top:12px">
          <div class="section-title" style="margin-bottom:8px">TOP JUGADORES</div>
          ${r.topPlayers.map((pl,i)=>`
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);cursor:pointer"
              onclick="closeModal();setTimeout(()=>showPublicProfile('${pl.nickname}'),200)">
              <span style="font-family:var(--font-display);font-size:13px">${i+1}. ${pl.nickname}</span>
              <span style="font-family:var(--font-mono);font-size:11px;color:var(--accent)">Nv.${pl.level}</span>
            </div>`).join('')}
        </div>`:''}
<<<<<<< HEAD
      <!-- Acciones -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        ${!isMyRegion
          ? `<button class="btn-primary btn-full" onclick="closeModal();moveToRegion('${regionId}')">📍 MUDARSE ($50)</button>`
          : `<div class="badge badge-accent" style="padding:10px;width:100%;text-align:center;display:block">📍 TU REGIÓN ACTUAL</div>`}
        ${isMyRegion ? `
          <button class="btn-ghost btn-full" onclick="closeModal();navigate('work')">⚒️ VER TRABAJOS DISPONIBLES</button>
          ${renderResidencyButton('${regionId}', player)}
        ` : ''}
=======
      <div style="display:flex;gap:8px;margin-top:16px">
        ${!isMyRegion
          ?`<button class="btn-primary btn-full" onclick="closeModal();moveToRegion('${regionId}')">📍 MUDARSE ($50)</button>`
          :`<div class="badge badge-accent" style="padding:10px;width:100%;text-align:center;display:block">📍 TU REGIÓN ACTUAL</div>`}
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd
      </div>
    `);
  } catch {}
}

async function moveToRegion(regionId) {
  const data = await API.moveRegion(regionId);
  if (data.error) return showToast(data.error, 'error');
  updatePlayerState({...STATE.player, regionId, money: STATE.player.money - 50});
  showToast(`✅ Te mudaste a ${getRegionName(regionId)}`, 'success');
  renderMap();
}

function filterRegions() {
  const q = (document.getElementById('map-search-input')?.value||'').toLowerCase();
  const f = (window._allRegions||[]).filter(r=>r.name.toLowerCase().includes(q)||r.capital.toLowerCase().includes(q));
  renderRegionList(applyMapFilter(f, window._mapFilter));
}

function setMapFilter(filter, btn) {
  window._mapFilter = filter;
  document.querySelectorAll('.map-filter-row .map-filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const q = (document.getElementById('map-search-input')?.value||'').toLowerCase();
  const base = (window._allRegions||[]).filter(r=>r.name.toLowerCase().includes(q)||r.capital.toLowerCase().includes(q));
  renderRegionList(applyMapFilter(base, filter));
}

function applyMapFilter(regions, filter) {
  const rsm = window._regionStateMap||{};
  switch(filter) {
    case 'high-industrial': return [...regions].sort((a,b)=>b.industrial-a.industrial);
    case 'high-medicine':   return [...regions].sort((a,b)=>b.medicine-a.medicine);
    case 'high-education':  return [...regions].sort((a,b)=>b.education-a.education);
    case 'states':          return regions.filter(r=>rsm[r.id]);
    case 'my-region':       return regions.filter(r=>STATE.player&&r.id===STATE.player.regionId);
    default:                return regions;
  }
}
<<<<<<< HEAD


function renderResidencyButton(regionId, player) {
  const residencies  = player.residencies || {};
  const myResidency  = residencies[regionId];
  if (!myResidency) {
    return `<button class="btn-ghost btn-full" onclick="closeModal();requestResidencyFromMap('${regionId}')">📋 Solicitar residencia</button>`;
  }
  if (myResidency.status === 'pending') {
    return `<div class="badge badge-warning" style="padding:8px;width:100%;text-align:center;display:block">⏳ Residencia pendiente de aprobación</div>`;
  }
  if (myResidency.status === 'approved') {
    return `<div class="badge badge-success" style="padding:8px;width:100%;text-align:center;display:block">🏠 Eres residente de esta región</div>`;
  }
  return '';
}

async function requestResidencyFromMap(regionId) {
  // First move to the region if not there
  if (STATE.player.regionId !== regionId) {
    showToast('Primero múdate a esa región', 'error');
    return;
  }
  try {
    const data = await API.requestResidency();
    if (data.error) return showToast(data.error, 'error');
    if (data.player) updatePlayerState(data.player);
    showToast(data.message, data.autoApproved ? 'success' : '');
  } catch { showToast('Error al solicitar residencia', 'error'); }
}
=======
>>>>>>> 38cc06ae9d80f7a4ac40fd9e22d3cd7c7d98b5fd

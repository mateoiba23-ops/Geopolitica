// ─── RANKINGS PANEL ───────────────────────────────────────────────────────────

const RANKING_TABS = [
  { id: 'players',   icon: '👤', label: 'JUGADORES' },
  { id: 'states',    icon: '🌍', label: 'ESTADOS'   },
  { id: 'factories', icon: '🏭', label: 'FÁBRICAS'  },
  { id: 'regions',   icon: '🗺️', label: 'REGIONES'  }
];

const PLAYER_SORTS = [
  { id: 'level',     label: 'Nivel'      },
  { id: 'money',     label: 'Dinero'     },
  { id: 'gold',      label: 'Oro'        },
  { id: 'worklevel', label: 'Nivel Lab.' },
  { id: 'strength',  label: 'Fuerza'     },
  { id: 'education', label: 'Educación'  },
  { id: 'endurance', label: 'Aguante'    },
  { id: 'factories', label: 'Fábricas'   }
];

const STATE_SORTS = [
  { id: 'members',  label: 'Miembros'  },
  { id: 'treasury', label: 'Tesoro'    },
  { id: 'regions',  label: 'Regiones'  },
  { id: 'wealth',   label: 'Riqueza'   },
  { id: 'avglevel', label: 'Avg. Nivel'},
  { id: 'age',      label: 'Antigüedad'}
];

const FACTORY_SORTS = [
  { id: 'level',      label: 'Nivel'      },
  { id: 'production', label: 'Producción' },
  { id: 'workers',    label: 'Trabajadores'}
];

const REGION_SORTS = [
  { id: 'players',    label: 'Jugadores'  },
  { id: 'factories',  label: 'Fábricas'   },
  { id: 'production', label: 'Producción' },
  { id: 'medicine',   label: 'Medicina'   },
  { id: 'education',  label: 'Educación'  },
  { id: 'treasury',   label: 'Tesoro'     }
];

let _rankTab  = 'players';
let _rankSort = 'level';

async function renderRankings() {
  const content = document.getElementById('game-content');

  content.innerHTML = `
    <div class="panel">
      <div class="panel-title">🏆 <span>RANKINGS</span></div>

      <!-- Tabs -->
      <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px">
        ${RANKING_TABS.map(t => `
          <button style="flex-shrink:0;padding:8px 14px;background:${t.id===_rankTab?'var(--accent)':'var(--bg-card)'};
            border:1px solid ${t.id===_rankTab?'var(--accent)':'var(--border)'};border-radius:20px;
            font-family:var(--font-display);font-size:12px;font-weight:600;letter-spacing:1px;
            color:${t.id===_rankTab?'var(--bg-base)':'var(--text-secondary)'};cursor:pointer;transition:0.18s ease"
            onclick="switchRankTab('${t.id}')">
            ${t.icon} ${t.label}
          </button>`).join('')}
      </div>

      <!-- Sort row -->
      <div id="rank-sort-row" style="margin-bottom:12px"></div>

      <!-- Content -->
      <div id="rank-content"><div class="loading">⏳ Cargando...</div></div>
    </div>`;

  renderSortRow();
  await loadRankingData();
}

function renderSortRow() {
  const el = document.getElementById('rank-sort-row');
  if (!el) return;

  const sorts = {
    players:   PLAYER_SORTS,
    states:    STATE_SORTS,
    factories: FACTORY_SORTS,
    regions:   REGION_SORTS
  }[_rankTab] || [];

  el.innerHTML = `
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:2px">
      ${sorts.map(s => `
        <button style="flex-shrink:0;padding:5px 12px;background:${s.id===_rankSort?'rgba(0,212,255,0.12)':'var(--bg-card)'};
          border:1px solid ${s.id===_rankSort?'var(--accent)':'var(--border)'};border-radius:12px;
          font-family:var(--font-mono);font-size:10px;color:${s.id===_rankSort?'var(--accent)':'var(--text-secondary)'};cursor:pointer"
          onclick="switchRankSort('${s.id}')">
          ${s.label}
        </button>`).join('')}
    </div>`;
}

async function switchRankTab(tab) {
  _rankTab  = tab;
  _rankSort = { players:'level', states:'members', factories:'level', regions:'players' }[tab];
  renderSortRow();
  await loadRankingData();
}

async function switchRankSort(sort) {
  _rankSort = sort;
  renderSortRow();
  await loadRankingData();
}

async function loadRankingData() {
  const el = document.getElementById('rank-content');
  if (!el) return;
  el.innerHTML = '<div class="loading">⏳ Cargando...</div>';

  try {
    let data, html;

    if (_rankTab === 'players') {
      data = await API.getRankings('players', _rankSort);
      html = renderPlayerRankings(data.rankings || []);
    } else if (_rankTab === 'states') {
      data = await API.getRankings('states', _rankSort);
      html = renderStateRankings(data.rankings || []);
    } else if (_rankTab === 'factories') {
      data = await API.getRankings('factories', _rankSort);
      html = renderFactoryRankings(data.rankings || []);
    } else if (_rankTab === 'regions') {
      data = await API.getRankings('regions', _rankSort);
      html = renderRegionRankings(data.rankings || []);
    }

    el.innerHTML = html || '<div class="empty">Sin datos</div>';
  } catch {
    el.innerHTML = '<div class="empty">Error cargando rankings</div>';
  }
}

function renderPlayerRankings(players) {
  if (!players.length) return '<div class="empty">Sin jugadores</div>';
  const me = STATE.player;

  return players.map(p => {
    const isMe   = p.nickname === me.nickname;
    const medals = ['🥇','🥈','🥉'];
    const rank   = p.rank <= 3 ? medals[p.rank-1] : `${p.rank}.`;
    const sortVal = getSortValue(p, _rankSort);
    const stateName = p.stateId ? '🏳️' : '';

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
        background:${isMe ? 'rgba(0,212,255,0.06)' : 'var(--bg-card)'};
        border:1px solid ${isMe ? 'var(--accent)' : 'var(--border)'};
        border-radius:10px;margin-bottom:6px;cursor:pointer;transition:0.18s ease"
        onclick="showPublicProfile('${p.nickname}')"
        onmousedown="this.style.transform='scale(0.99)'" onmouseup="this.style.transform='scale(1)'"
        ontouchstart="this.style.transform='scale(0.99)'" ontouchend="this.style.transform='scale(1)'">
        <div style="font-family:var(--font-display);font-size:${p.rank<=3?'20':'14'}px;width:28px;text-align:center;flex-shrink:0">${rank}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${p.nickname}${p.premium ? ' ⭐' : ''}${isMe ? ' 👈' : ''} ${stateName}
          </div>
          <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">
            📍${getRegionName(p.regionId)} · Lab.${p.workLevel}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent)">${sortVal}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">${getSortLabel(_rankSort)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderStateRankings(states) {
  if (!states.length) return '<div class="empty">No hay estados fundados aún</div>';
  const myStateId = STATE.player.stateId;

  return states.map(s => {
    const isMe   = s.id === myStateId;
    const medals = ['🥇','🥈','🥉'];
    const rank   = s.rank <= 3 ? medals[s.rank-1] : `${s.rank}.`;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
        background:${isMe ? s.color+'11' : 'var(--bg-card)'};
        border:1px solid ${isMe ? s.color+'88' : 'var(--border)'};
        border-radius:10px;margin-bottom:6px;cursor:pointer"
        onclick="showStateDetail('${s.id}')">
        <div style="font-family:var(--font-display);font-size:${s.rank<=3?'20':'14'}px;width:28px;text-align:center;flex-shrink:0">${rank}</div>
        <div style="font-size:26px;flex-shrink:0">${s.shield}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:${s.color}">${s.name}${isMe?' 👈':''}</div>
          <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">
            👑 ${s.leaderNickname} · ${s.memberCount} miembros
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent)">${getStateSortValue(s, _rankSort)}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">${getSortLabel(_rankSort)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderFactoryRankings(factories) {
  if (!factories.length) return '<div class="empty">Sin fábricas</div>';
  const ICONS = { gold:'⚱️', oil:'🛢️', mineral:'⛏️', uranium:'☢️', diamond:'💎' };

  return factories.map(f => {
    const medals = ['🥇','🥈','🥉'];
    const rank   = f.rank <= 3 ? medals[f.rank-1] : `${f.rank}.`;
    const sortVal = _rankSort === 'level' ? `Nv.${f.level}`
      : _rankSort === 'production' ? formatNumber(f.production)
      : `${f.workers}/${f.maxWorkers}`;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
        background:var(--bg-card);border:1px solid var(--border);border-radius:10px;margin-bottom:6px">
        <div style="font-family:var(--font-display);font-size:${f.rank<=3?'20':'14'}px;width:28px;text-align:center;flex-shrink:0">${rank}</div>
        <div style="font-size:24px;flex-shrink:0">${ICONS[f.type]||'🏭'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
          <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">
            👤 ${f.ownerNickname} · 📍 ${f.regionName}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent)">${sortVal}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">${getSortLabel(_rankSort)}</div>
        </div>
      </div>`;
  }).join('');
}

function renderRegionRankings(regions) {
  if (!regions.length) return '<div class="empty">Sin regiones</div>';
  const myRegion = STATE.player.regionId;

  return regions.map(r => {
    const isMe   = r.id === myRegion;
    const medals = ['🥇','🥈','🥉'];
    const rank   = r.rank <= 3 ? medals[r.rank-1] : `${r.rank}.`;
    const sortVal = _rankSort === 'players'    ? r.playerCount
      : _rankSort === 'factories'  ? r.factoryCount
      : _rankSort === 'production' ? formatNumber(r.totalProduction)
      : _rankSort === 'medicine'   ? `${r.medicine}/10`
      : _rankSort === 'education'  ? `${r.education}/10`
      : `$${formatMoney(r.treasury)}`;

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
        background:${isMe?'rgba(0,212,255,0.06)':'var(--bg-card)'};
        border:1px solid ${isMe?'var(--accent)':'var(--border)'};
        border-radius:10px;margin-bottom:6px;cursor:pointer"
        onclick="showRegionDetail('${r.id}')">
        <div style="font-family:var(--font-display);font-size:${r.rank<=3?'20':'14'}px;width:28px;text-align:center;flex-shrink:0">${rank}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:14px;font-weight:700">${r.name}${isMe?' 👈':''}</div>
          <div style="font-size:10px;color:var(--text-dim);font-family:var(--font-mono)">
            🏛️ ${r.capital} · 👥 ${r.playerCount} · 🏭 ${r.factoryCount}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--accent)">${sortVal}</div>
          <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-dim)">${getSortLabel(_rankSort)}</div>
        </div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSortValue(p, sort) {
  switch (sort) {
    case 'level':     return `Nv.${p.level}`;
    case 'money':     return `$${formatMoney(p.money)}`;
    case 'gold':      return `${p.gold}⚱️`;
    case 'worklevel': return `Lab.${p.workLevel}`;
    case 'strength':  return `⚔️${p.skills?.strength||0}`;
    case 'education': return `📚${p.skills?.education||0}`;
    case 'endurance': return `🛡️${p.skills?.endurance||0}`;
    case 'factories': return `🏭${p.factories}`;
    default:          return `Nv.${p.level}`;
  }
}

function getStateSortValue(s, sort) {
  switch (sort) {
    case 'members':  return `👥${s.memberCount}`;
    case 'treasury': return `$${formatMoney(s.treasury)}`;
    case 'regions':  return `🗺️${s.regionCount}`;
    case 'wealth':   return `$${formatMoney(s.totalMoney)}`;
    case 'avglevel': return `Nv.${s.avgLevel}`;
    case 'age':      return formatTime(s.foundedAt);
    default:         return `👥${s.memberCount}`;
  }
}

function getSortLabel(sort) {
  const labels = {
    level:'NIVEL', money:'DINERO', gold:'ORO', worklevel:'LAB.',
    strength:'FUERZA', education:'EDU.', endurance:'AGUANTE',
    factories:'FÁBRICAS', members:'MIEMBROS', treasury:'TESORO',
    regions:'REGIONES', wealth:'RIQUEZA', avglevel:'AVG NIV.',
    age:'ANTIGÜEDAD', production:'PRODUCCIÓN', workers:'TRABAJADORES',
    players:'JUGADORES', medicine:'MEDICINA', industrial:'INDUSTRIAL'
  };
  return labels[sort] || sort.toUpperCase();
}

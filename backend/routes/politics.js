const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// ─── Constantes políticas ─────────────────────────────────────────────────────

const POLITICAL_SYSTEMS = {
  republic_parliamentary: {
    name: 'República Parlamentaria',
    icon: '🏛️',
    description: 'Gobierno elegido por el parlamento. Leyes requieren votación 24h.',
    lawRequiresVote: true,
    voteDuration: 86400000,     // 24h
    instantThreshold: 0.90,     // 90% aprueba = instantáneo
    canLeaderDismiss: false
  },
  republic_presidential: {
    name: 'República Presidencial',
    icon: '🎖️',
    description: 'Presidente electo con poderes ejecutivos. Leyes requieren votación.',
    lawRequiresVote: true,
    voteDuration: 86400000,
    instantThreshold: 0.90,
    canLeaderDismiss: true
  },
  dictatorship: {
    name: 'Dictadura',
    icon: '⚡',
    description: 'El dictador gobierna solo. Leyes instantáneas, sin parlamento.',
    lawRequiresVote: false,
    voteDuration: 0,
    instantThreshold: 1,
    canLeaderDismiss: true
  },
  unipartidist: {
    name: 'Sistema Unipartidista',
    icon: '🚩',
    description: 'Un solo partido toma decisiones. Leyes por votación interna.',
    lawRequiresVote: true,
    voteDuration: 43200000,     // 12h
    instantThreshold: 0.75,
    canLeaderDismiss: true
  },
  monarchy_executive: {
    name: 'Monarquía Ejecutiva',
    icon: '👑',
    description: 'El monarca tiene poder absoluto. Leyes instantáneas.',
    lawRequiresVote: false,
    voteDuration: 0,
    instantThreshold: 1,
    canLeaderDismiss: true
  },
  monarchy_parliamentary: {
    name: 'Monarquía Parlamentaria',
    icon: '🔱',
    description: 'Monarca simbólico, parlamento gobierna. Leyes por votación.',
    lawRequiresVote: true,
    voteDuration: 86400000,
    instantThreshold: 0.90,
    canLeaderDismiss: false
  }
};

const LAW_TYPES = {
  tax_income:     { name: 'Cambiar impuesto de renta',   icon: '📊', affectsRegion: true },
  tax_factory:    { name: 'Cambiar impuesto de fábrica', icon: '🏭', affectsRegion: true },
  medicine:       { name: 'Invertir en medicina',        icon: '🏥', affectsRegion: true },
  education_inv:  { name: 'Invertir en educación',       icon: '🎓', affectsRegion: true },
  infrastructure: { name: 'Invertir en infraestructura', icon: '🔧', affectsRegion: true },
  declare_war:    { name: 'Declarar guerra',             icon: '⚔️', affectsRegion: false },
  peace_treaty:   { name: 'Tratado de paz',              icon: '🕊️', affectsRegion: false },
  alliance:       { name: 'Proponer alianza',            icon: '🤝', affectsRegion: false },
  transfer_budget:{ name: 'Transferir presupuesto',      icon: '💰', affectsRegion: true }
};

const PREDEFINED_SHIELDS = [
  '🦅','🦁','🐉','⚔️','🛡️','🌟','🔱','⚡','🌙','☀️',
  '🏔️','🌊','🔥','🌿','💎','🦊','🐺','🦋','🎯','👁️'
];

const CREATION_COST = { money: 10000, gold: 50 };

// ─── GET /api/politics/systems ────────────────────────────────────────────────
router.get('/systems', authMiddleware, (req, res) => {
  res.json({ systems: POLITICAL_SYSTEMS });
});

// ─── GET /api/politics/shields ────────────────────────────────────────────────
router.get('/shields', authMiddleware, (req, res) => {
  res.json({ shields: PREDEFINED_SHIELDS });
});

// ─── GET /api/politics/states ─────────────────────────────────────────────────
router.get('/states', authMiddleware, (req, res) => {
  const states = db.getAllStates().map(s => enrichState(s));
  res.json({ states });
});

// ─── GET /api/politics/states/:id ────────────────────────────────────────────
router.get('/states/:id', authMiddleware, (req, res) => {
  const state = db.getState(req.params.id);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  res.json({ state: enrichState(state) });
});

// ─── POST /api/politics/found ─────────────────────────────────────────────────
router.post('/found', authMiddleware, (req, res) => {
  const { name, color, shield, politicalSystem } = req.body;
  const player = req.player;

  // Validaciones
  if (!name || !color || !shield || !politicalSystem) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (name.length < 3 || name.length > 30) {
    return res.status(400).json({ error: 'El nombre debe tener entre 3 y 30 caracteres' });
  }
  if (!POLITICAL_SYSTEMS[politicalSystem]) {
    return res.status(400).json({ error: 'Sistema político inválido' });
  }
  if (!PREDEFINED_SHIELDS.includes(shield)) {
    return res.status(400).json({ error: 'Escudo inválido' });
  }
  if (player.stateId) {
    return res.status(400).json({ error: 'Ya perteneces a un estado' });
  }
  if (db.getStateByName(name)) {
    return res.status(409).json({ error: 'Ya existe un estado con ese nombre' });
  }
  if (player.money < CREATION_COST.money) {
    return res.status(400).json({ error: `Necesitas $${CREATION_COST.money} para fundar un estado` });
  }
  if (player.gold < CREATION_COST.gold) {
    return res.status(400).json({ error: `Necesitas ${CREATION_COST.gold} ⚱️ de oro` });
  }

  const stateId = uuidv4();
  const state = {
    id:              stateId,
    name,
    color,
    shield,
    politicalSystem,
    founderId:       player.id,
    founderNickname: player.nickname,
    leaderId:        player.id,
    leaderNickname:  player.nickname,
    leaderTitle:     getLeaderTitle(politicalSystem),
    members:         [{ id: player.id, nickname: player.nickname, role: 'leader', joinedAt: Date.now() }],
    regions:         [],          // IDs de regiones controladas
    budget:          0,
    treasury:        0,
    parliament:      [],          // miembros del parlamento
    allies:          [],
    enemies:         [],
    laws:            [],
    active:          true,
    foundedAt:       Date.now(),
    description:     ''
  };

  player.money  -= CREATION_COST.money;
  player.gold   -= CREATION_COST.gold;
  player.stateId = stateId;
  player.stateRole = 'leader';

  db.saveState(state);
  db.savePlayer(player);

  // Transacción
  db.addTransaction({
    id: uuidv4(), type: 'factory_created',
    fromId: player.id, toId: stateId,
    fromNickname: player.nickname, toNickname: name,
    amount: CREATION_COST.money, fee: 0,
    currency: 'money',
    description: `Fundación del estado: ${name}`,
    timestamp: Date.now()
  });

  // Chat global
  db.addChatMessage('global', {
    id: uuidv4(), type: 'system',
    text: `🌍 ¡${player.nickname} ha fundado el estado "${name}" ${shield}!`,
    timestamp: Date.now()
  });

  const safe = { ...player };
  delete safe.password;

  res.json({ success: true, state, player: safe, message: `¡Estado "${name}" fundado exitosamente!` });
});

// ─── POST /api/politics/join ──────────────────────────────────────────────────
router.post('/join', authMiddleware, (req, res) => {
  const { stateId } = req.body;
  const player = req.player;

  if (player.stateId) {
    return res.status(400).json({ error: 'Ya perteneces a un estado. Sal primero.' });
  }

  const state = db.getState(stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  if (!state.active) return res.status(400).json({ error: 'Estado inactivo' });

  state.members.push({ id: player.id, nickname: player.nickname, role: 'citizen', joinedAt: Date.now() });
  player.stateId   = stateId;
  player.stateRole = 'citizen';

  db.saveState(state);
  db.savePlayer(player);

  db.addChatMessage('global', {
    id: uuidv4(), type: 'system',
    text: `${state.shield} ${player.nickname} se unió a ${state.name}`,
    timestamp: Date.now()
  });

  const safe = { ...player };
  delete safe.password;
  res.json({ success: true, state, player: safe, message: `¡Te uniste a ${state.name}!` });
});

// ─── POST /api/politics/leave ─────────────────────────────────────────────────
router.post('/leave', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });

  const state = db.getState(player.stateId);
  if (!state) {
    player.stateId   = null;
    player.stateRole = null;
    db.savePlayer(player);
    return res.json({ success: true, message: 'Saliste del estado' });
  }

  if (state.leaderId === player.id) {
    return res.status(400).json({ error: 'El líder no puede abandonar el estado. Transfiere el liderazgo primero.' });
  }

  state.members = state.members.filter(m => m.id !== player.id);
  state.parliament = state.parliament.filter(id => id !== player.id);
  player.stateId   = null;
  player.stateRole = null;

  db.saveState(state);
  db.savePlayer(player);

  const safe = { ...player };
  delete safe.password;
  res.json({ success: true, player: safe, message: `Saliste de ${state.name}` });
});

// ─── POST /api/politics/transfer-leadership ───────────────────────────────────
router.post('/transfer-leadership', authMiddleware, (req, res) => {
  const { toNickname } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  if (state.leaderId !== player.id) return res.status(403).json({ error: 'Solo el líder puede transferir el liderazgo' });

  const target = db.getPlayerByNickname(toNickname);
  if (!target) return res.status(404).json({ error: 'Jugador no encontrado' });
  if (target.stateId !== state.id) return res.status(400).json({ error: `${toNickname} no es miembro del estado` });

  state.leaderId       = target.id;
  state.leaderNickname = target.nickname;
  state.members = state.members.map(m => ({
    ...m,
    role: m.id === target.id ? 'leader' : (m.id === player.id ? 'citizen' : m.role)
  }));

  player.stateRole = 'citizen';
  target.stateRole = 'leader';

  db.saveState(state);
  db.savePlayer(player);
  db.savePlayer(target);

  const safe = { ...player };
  delete safe.password;
  res.json({ success: true, player: safe, message: `Liderazgo transferido a ${toNickname}` });
});

// ─── POST /api/politics/update-state ─────────────────────────────────────────
router.post('/update-state', authMiddleware, (req, res) => {
  const { description, color } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  if (state.leaderId !== player.id) return res.status(403).json({ error: 'Solo el líder puede editar el estado' });

  if (description !== undefined) state.description = description.slice(0, 300);
  if (color !== undefined) state.color = color;

  db.saveState(state);
  res.json({ success: true, state, message: 'Estado actualizado' });
});

// ─── POST /api/politics/transfer-budget ──────────────────────────────────────
router.post('/transfer-budget', authMiddleware, (req, res) => {
  const { amount } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  const qty = parseInt(amount);
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Cantidad inválida' });
  if (player.money < qty) return res.status(400).json({ error: 'Dinero insuficiente' });

  player.money  -= qty;
  state.treasury = (state.treasury || 0) + qty;

  db.savePlayer(player);
  db.saveState(state);

  db.addTransaction({
    id: uuidv4(), type: 'transfer_budget',
    fromId: player.id, toId: state.id,
    fromNickname: player.nickname, toNickname: state.name,
    amount: qty, fee: 0, currency: 'money',
    description: `Contribución al tesoro de ${state.name}`,
    timestamp: Date.now()
  });

  const safe = { ...player };
  delete safe.password;
  res.json({ success: true, player: safe, state, message: `Contribuiste $${qty} al tesoro de ${state.name}` });
});

// ─── POST /api/politics/propose-law ──────────────────────────────────────────
router.post('/propose-law', authMiddleware, (req, res) => {
  const { lawType, title, description, value, targetRegionId } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  if (!LAW_TYPES[lawType]) return res.status(400).json({ error: 'Tipo de ley inválido' });

  const sysConfig = POLITICAL_SYSTEMS[state.politicalSystem];

  // Solo líderes y parlamento pueden proponer leyes
  const member = state.members.find(m => m.id === player.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro del estado' });
  const canPropose = ['leader','parliament','minister'].includes(member.role);
  if (!canPropose) return res.status(403).json({ error: 'No tienes autorización para proponer leyes' });

  const lawId  = uuidv4();
  const now    = Date.now();

  const law = {
    id:             lawId,
    stateId:        state.id,
    stateName:      state.name,
    type:           lawType,
    title:          title || LAW_TYPES[lawType].name,
    description:    description || '',
    value:          value,          // El valor del cambio (ej: nuevo % de impuesto)
    targetRegionId: targetRegionId || null,
    proposerId:     player.id,
    proposerNickname: player.nickname,
    status:         sysConfig.lawRequiresVote ? 'voting' : 'approved',
    votes:          { yes: [], no: [], abstain: [] },
    votingEndsAt:   sysConfig.lawRequiresVote ? now + sysConfig.voteDuration : now,
    createdAt:      now,
    executedAt:     null
  };

  // Si no requiere voto (dictadura/monarquía ejecutiva), ejecutar de inmediato
  if (!sysConfig.lawRequiresVote) {
    law.status    = 'approved';
    law.executedAt = now;
    executeLaw(law, state);
  }

  db.saveLaw(law);
  state.laws = [...(state.laws || []), lawId];
  db.saveState(state);

  // Notificar a miembros
  state.members.forEach(m => {
    const p = db.getPlayer(m.id);
    if (!p) return;
    if (!p.notifications) p.notifications = [];
    p.notifications.unshift({
      id: uuidv4(), type: 'law_proposed',
      text: `🏛️ ${state.name}: Nueva ley propuesta — "${law.title}"${sysConfig.lawRequiresVote ? '. ¡Vota!' : ' (ejecutada)'}`,
      read: false, timestamp: now
    });
    db.savePlayer(p);
  });

  res.json({
    success: true,
    law,
    message: sysConfig.lawRequiresVote
      ? `Ley propuesta. Votación abierta por ${sysConfig.voteDuration / 3600000}h`
      : `Ley ejecutada inmediatamente`
  });
});

// ─── POST /api/politics/vote ──────────────────────────────────────────────────
router.post('/vote', authMiddleware, (req, res) => {
  const { lawId, vote } = req.body; // vote: 'yes' | 'no' | 'abstain'
  const player = req.player;

  if (!['yes','no','abstain'].includes(vote)) {
    return res.status(400).json({ error: 'Voto inválido' });
  }

  const law = db.getLaw(lawId);
  if (!law) return res.status(404).json({ error: 'Ley no encontrada' });
  if (law.status !== 'voting') return res.status(400).json({ error: 'Esta ley no está en votación' });
  if (Date.now() > law.votingEndsAt) return res.status(400).json({ error: 'La votación ha cerrado' });

  const state = db.getState(law.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  const isMember = state.members.some(m => m.id === player.id);
  if (!isMember) return res.status(403).json({ error: 'No eres miembro de este estado' });

  // Quitar voto anterior si existe
  law.votes.yes     = law.votes.yes.filter(id => id !== player.id);
  law.votes.no      = law.votes.no.filter(id => id !== player.id);
  law.votes.abstain = law.votes.abstain.filter(id => id !== player.id);

  law.votes[vote].push(player.id);

  // Verificar si ya hay 90% (aprobación instantánea)
  const sysConfig     = POLITICAL_SYSTEMS[state.politicalSystem];
  const totalMembers  = state.members.length;
  const yesCount      = law.votes.yes.length;
  const threshold     = Math.ceil(totalMembers * sysConfig.instantThreshold);

  if (yesCount >= threshold) {
    law.status     = 'approved';
    law.executedAt = Date.now();
    executeLaw(law, state);
    db.saveLaw(law);
    db.saveState(state);
    return res.json({ success: true, law, message: `¡Ley aprobada por unanimidad y ejecutada!`, executed: true });
  }

  db.saveLaw(law);
  res.json({ success: true, law, message: `Voto "${vote}" registrado`, executed: false });
});

// ─── GET /api/politics/laws/:stateId ─────────────────────────────────────────
router.get('/laws/:stateId', authMiddleware, (req, res) => {
  const state = db.getState(req.params.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  const laws = (state.laws || [])
    .map(id => db.getLaw(id))
    .filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json({ laws });
});

// ─── POST /api/politics/process-votes ────────────────────────────────────────
// Llamado por el scheduler para cerrar votaciones expiradas
router.post('/process-votes', (req, res) => {
  const now  = Date.now();
  const laws = db.getAllLaws().filter(l => l.status === 'voting' && now > l.votingEndsAt);
  let processed = 0;

  laws.forEach(law => {
    const state       = db.getState(law.stateId);
    if (!state) return;
    const totalMembers = state.members.length;
    const yesCount     = law.votes.yes.length;
    const noCount      = law.votes.no.length;
    const passed       = yesCount > noCount && yesCount > totalMembers * 0.3; // mayoría simple + mínimo 30% participación

    law.status     = passed ? 'approved' : 'rejected';
    law.executedAt = now;
    if (passed) executeLaw(law, state);

    db.saveLaw(law);

    // Notificar resultado
    state.members.forEach(m => {
      const p = db.getPlayer(m.id);
      if (!p) return;
      if (!p.notifications) p.notifications = [];
      p.notifications.unshift({
        id: uuidv4(), type: 'law_result',
        text: `🏛️ ${state.name}: Ley "${law.title}" — ${passed ? '✅ APROBADA' : '❌ RECHAZADA'} (${yesCount} sí / ${noCount} no)`,
        read: false, timestamp: now
      });
      db.savePlayer(p);
    });
    processed++;
  });

  res.json({ processed });
});

// ─── GET /api/politics/my-state ───────────────────────────────────────────────
router.get('/my-state', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.stateId) return res.json({ state: null });
  const state = db.getState(player.stateId);
  if (!state) return res.json({ state: null });
  res.json({ state: enrichState(state) });
});

// ─── GET /api/politics/law-types ─────────────────────────────────────────────
router.get('/law-types', authMiddleware, (req, res) => {
  res.json({ lawTypes: LAW_TYPES });
});

// ─── Helpers internos ─────────────────────────────────────────────────────────

function executeLaw(law, state) {
  try {
    switch (law.type) {
      case 'tax_income': {
        const regions = law.targetRegionId
          ? [db.getRegion(law.targetRegionId)]
          : state.regions.map(id => db.getRegion(id));
        regions.filter(Boolean).forEach(r => {
          r.taxes.income = Math.max(0, Math.min(50, parseInt(law.value)));
          db.saveRegion(r);
        });
        break;
      }
      case 'tax_factory': {
        const regions = law.targetRegionId
          ? [db.getRegion(law.targetRegionId)]
          : state.regions.map(id => db.getRegion(id));
        regions.filter(Boolean).forEach(r => {
          r.taxes.factory = Math.max(0, Math.min(50, parseInt(law.value)));
          db.saveRegion(r);
        });
        break;
      }
      case 'medicine': {
        const region = db.getRegion(law.targetRegionId);
        if (region && state.treasury >= parseInt(law.value)) {
          region.medicine = Math.min(10, region.medicine + 1);
          state.treasury -= parseInt(law.value);
          db.saveRegion(region);
        }
        break;
      }
      case 'education_inv': {
        const region = db.getRegion(law.targetRegionId);
        if (region && state.treasury >= parseInt(law.value)) {
          region.education = Math.min(10, region.education + 1);
          state.treasury -= parseInt(law.value);
          db.saveRegion(region);
        }
        break;
      }
      case 'infrastructure': {
        const region = db.getRegion(law.targetRegionId);
        if (region && state.treasury >= parseInt(law.value)) {
          region.infrastructure = Math.min(10, region.infrastructure + 1);
          state.treasury -= parseInt(law.value);
          db.saveRegion(region);
        }
        break;
      }
      case 'transfer_budget': {
        // Transferir del tesoro del estado a una región
        const region = db.getRegion(law.targetRegionId);
        if (region && state.treasury >= parseInt(law.value)) {
          region.treasury = (region.treasury || 0) + parseInt(law.value);
          state.treasury -= parseInt(law.value);
          db.saveRegion(region);
        }
        break;
      }
    }
    db.saveState(state);
  } catch (e) {
    console.error('[Politics] Error executing law:', e.message);
  }
}

function enrichState(state) {
  const sysConfig = POLITICAL_SYSTEMS[state.politicalSystem] || {};
  const regions   = (state.regions || []).map(id => {
    const r = db.getRegion(id);
    return r ? { id: r.id, name: r.name } : null;
  }).filter(Boolean);

  const activeLaws = (state.laws || [])
    .map(id => db.getLaw(id))
    .filter(l => l && l.status === 'voting')
    .length;

  return {
    ...state,
    systemName:   sysConfig.name     || state.politicalSystem,
    systemIcon:   sysConfig.icon     || '🏛️',
    systemDesc:   sysConfig.description || '',
    lawRequiresVote: sysConfig.lawRequiresVote,
    memberCount:  (state.members || []).length,
    regionDetails: regions,
    activeLaws
  };
}

function getLeaderTitle(politicalSystem) {
  const titles = {
    republic_parliamentary: 'Primer Ministro',
    republic_presidential:  'Presidente',
    dictatorship:           'Dictador',
    unipartidist:           'Secretario General',
    monarchy_executive:     'Rey/Reina',
    monarchy_parliamentary: 'Monarca'
  };
  return titles[politicalSystem] || 'Líder';
}

module.exports = router;
module.exports.executeLaw   = executeLaw;
module.exports.POLITICAL_SYSTEMS = POLITICAL_SYSTEMS;
module.exports.LAW_TYPES    = LAW_TYPES;

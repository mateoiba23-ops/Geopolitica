'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

// ─── Sistemas políticos ───────────────────────────────────────────────────────
const POLITICAL_SYSTEMS = {
  republic_parliamentary: {
    name: 'República Parlamentaria', icon: '🏛️',
    description: 'Parlamento elegido vota las leyes. Votan solo miembros del parlamento.',
    lawRequiresVote: true, voteDuration: 86400000,
    votingBody: 'parliament',   // 'parliament' | 'members' | 'leader'
    instantThreshold: 0.90, canLeaderDismiss: false
  },
  republic_presidential: {
    name: 'República Presidencial', icon: '🎖️',
    description: 'Presidente con poderes ejecutivos. Parlamento vota las leyes.',
    lawRequiresVote: true, voteDuration: 86400000,
    votingBody: 'parliament',
    instantThreshold: 0.90, canLeaderDismiss: true
  },
  dictatorship: {
    name: 'Dictadura', icon: '⚡',
    description: 'El dictador promulga leyes sin votación.',
    lawRequiresVote: false, voteDuration: 0,
    votingBody: 'leader',
    instantThreshold: 1, canLeaderDismiss: true
  },
  unipartidist: {
    name: 'Sistema Unipartidista', icon: '🚩',
    description: 'Los miembros del partido único votan las leyes (12h).',
    lawRequiresVote: true, voteDuration: 43200000,
    votingBody: 'members',
    instantThreshold: 0.75, canLeaderDismiss: true
  },
  monarchy_executive: {
    name: 'Monarquía Ejecutiva', icon: '👑',
    description: 'El monarca promulga leyes sin votación.',
    lawRequiresVote: false, voteDuration: 0,
    votingBody: 'leader',
    instantThreshold: 1, canLeaderDismiss: true
  },
  monarchy_parliamentary: {
    name: 'Monarquía Parlamentaria', icon: '🔱',
    description: 'Monarca simbólico, parlamento vota las leyes.',
    lawRequiresVote: true, voteDuration: 86400000,
    votingBody: 'parliament',
    instantThreshold: 0.90, canLeaderDismiss: false
  }
};

// ─── Tipos de ley con validación de campos ────────────────────────────────────
const LAW_TYPES = {
  tax_income: {
    name: 'Cambiar impuesto de renta', icon: '📊',
    fields: [
      { id: 'value', label: 'Nuevo porcentaje (%)', type: 'number', min: 0, max: 50, required: true,
        hint: 'Porcentaje del salario bruto que va al estado (0-50%)' }
    ],
    requiresRegion: true,
    validate: (v) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 0 || n > 50) return 'El impuesto debe ser entre 0% y 50%';
    }
  },
  tax_factory: {
    name: 'Cambiar impuesto de fábrica', icon: '🏭',
    fields: [
      { id: 'value', label: 'Nuevo porcentaje (%)', type: 'number', min: 0, max: 50, required: true,
        hint: 'Porcentaje del salario bruto que van a la región (0-50%)' }
    ],
    requiresRegion: true,
    validate: (v) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 0 || n > 50) return 'El impuesto debe ser entre 0% y 50%';
    }
  },
  medicine: {
    name: 'Invertir en medicina', icon: '🏥',
    fields: [
      { id: 'value', label: 'Inversión ($)', type: 'number', min: 1000, required: true,
        hint: 'Dinero del tesoro para mejorar medicina (+1 nivel, máx 10). Costo: $10,000' }
    ],
    requiresRegion: true,
    validate: (v, state) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 1000) return 'Inversión mínima $1,000';
      if ((state.treasury || 0) < n) return `Tesoro insuficiente ($${state.treasury || 0} disponible)`;
    }
  },
  education_inv: {
    name: 'Invertir en educación', icon: '🎓',
    fields: [
      { id: 'value', label: 'Inversión ($)', type: 'number', min: 1000, required: true,
        hint: 'Dinero del tesoro para mejorar educación (+1 nivel, máx 10)' }
    ],
    requiresRegion: true,
    validate: (v, state) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 1000) return 'Inversión mínima $1,000';
      if ((state.treasury || 0) < n) return `Tesoro insuficiente ($${state.treasury || 0} disponible)`;
    }
  },
  infrastructure: {
    name: 'Invertir en infraestructura', icon: '🔧',
    fields: [
      { id: 'value', label: 'Inversión ($)', type: 'number', min: 1000, required: true,
        hint: 'Dinero del tesoro para mejorar infraestructura (+1 nivel, máx 10)' }
    ],
    requiresRegion: true,
    validate: (v, state) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 1000) return 'Inversión mínima $1,000';
      if ((state.treasury || 0) < n) return `Tesoro insuficiente ($${state.treasury || 0} disponible)`;
    }
  },
  transfer_budget: {
    name: 'Transferir presupuesto a región', icon: '💰',
    fields: [
      { id: 'value', label: 'Cantidad ($)', type: 'number', min: 100, required: true,
        hint: 'Transferir del tesoro del estado a la región objetivo' }
    ],
    requiresRegion: true,
    validate: (v, state) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 100) return 'Mínimo $100';
      if ((state.treasury || 0) < n) return `Tesoro insuficiente ($${state.treasury || 0} disponible)`;
    }
  },
  salary_minimum: {
    name: 'Establecer salario mínimo', icon: '💵',
    fields: [
      { id: 'value', label: 'Salario mínimo ($)', type: 'number', min: 0, required: true,
        hint: 'Salario mínimo que deben pagar las fábricas de las regiones controladas' }
    ],
    requiresRegion: false,
    validate: (v) => {
      const n = parseInt(v.value);
      if (isNaN(n) || n < 0) return 'Salario inválido';
    }
  },
  declare_war: {
    name: 'Declarar guerra', icon: '⚔️',
    fields: [
      { id: 'targetState', label: 'Estado objetivo', type: 'text', required: true,
        hint: 'Nombre del estado al que se declara la guerra' }
    ],
    requiresRegion: false,
    validate: (v) => {
      if (!v.targetState || v.targetState.trim().length < 2) return 'Escribe el nombre del estado objetivo';
      if (!db.getStateByName(v.targetState.trim())) return 'Estado no encontrado';
    }
  },
  peace_treaty: {
    name: 'Proponer tratado de paz', icon: '🕊️',
    fields: [
      { id: 'targetState', label: 'Estado objetivo', type: 'text', required: true,
        hint: 'Nombre del estado con el que se propone la paz' }
    ],
    requiresRegion: false,
    validate: (v) => {
      if (!v.targetState || v.targetState.trim().length < 2) return 'Escribe el nombre del estado objetivo';
    }
  },
  alliance: {
    name: 'Proponer alianza', icon: '🤝',
    fields: [
      { id: 'targetState', label: 'Estado objetivo', type: 'text', required: true,
        hint: 'Nombre del estado con el que se propone la alianza' }
    ],
    requiresRegion: false,
    validate: (v) => {
      if (!v.targetState || v.targetState.trim().length < 2) return 'Escribe el nombre del estado objetivo';
    }
  },
  change_system: {
    name: 'Cambiar sistema político', icon: '🏛️',
    fields: [
      { id: 'newSystem', label: 'Nuevo sistema', type: 'select',
        options: Object.entries(POLITICAL_SYSTEMS).map(([id, s]) => ({ value: id, label: `${s.icon} ${s.name}` })),
        required: true, hint: 'Requiere 70% del parlamento. Vigencia: 24h de votación.' }
    ],
    requiresRegion: false,
    validate: (v) => {
      if (!POLITICAL_SYSTEMS[v.newSystem]) return 'Sistema político inválido';
    }
  }
};

const PREDEFINED_SHIELDS = [
  '🦅','🦁','🐉','⚔️','🛡️','🌟','🔱','⚡','🌙','☀️',
  '🏔️','🌊','🔥','🌿','💎','🦊','🐺','🦋','🎯','👁️'
];

// ─── GET /api/politics/systems ────────────────────────────────────────────────
router.get('/systems', authMiddleware, (req, res) => {
  res.json({ systems: POLITICAL_SYSTEMS });
});

router.get('/shields', authMiddleware, (req, res) => {
  res.json({ shields: PREDEFINED_SHIELDS });
});

// ─── GET /api/politics/states ─────────────────────────────────────────────────
router.get('/states', authMiddleware, (req, res) => {
  res.json({ states: db.getAllStates().map(enrichState) });
});

router.get('/states/:id', authMiddleware, (req, res) => {
  const state = db.getState(req.params.id);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  res.json({ state: enrichState(state) });
});

router.get('/my-state', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.stateId) return res.json({ state: null });
  const state = db.getState(player.stateId);
  res.json({ state: state ? enrichState(state) : null });
});

router.get('/law-types', authMiddleware, (req, res) => {
  // Return law types with field definitions (without validate functions)
  const safe = {};
  Object.entries(LAW_TYPES).forEach(([id, lt]) => {
    safe[id] = { name: lt.name, icon: lt.icon, fields: lt.fields, requiresRegion: lt.requiresRegion };
  });
  res.json({ lawTypes: safe });
});

// ─── GET /api/politics/laws/:stateId ─────────────────────────────────────────
router.get('/laws/:stateId', authMiddleware, (req, res) => {
  const state = db.getState(req.params.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  const laws = (state.laws || [])
    .map(id => db.getLaw(id)).filter(Boolean)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json({ laws });
});

// ─── POST /api/politics/join ──────────────────────────────────────────────────
router.post('/join', authMiddleware, (req, res) => {
  const { stateId } = req.body;
  const player = req.player;
  if (player.stateId) return res.status(400).json({ error: 'Ya perteneces a un estado' });
  const state = db.getState(stateId);
  if (!state || !state.active) return res.status(404).json({ error: 'Estado no encontrado' });
  state.members.push({ id: player.id, nickname: player.nickname, role: 'citizen', joinedAt: Date.now() });
  player.stateId = stateId; player.stateRole = 'citizen';
  db.saveState(state); db.savePlayer(player);
  db.addChatMessage('global', { id: uuidv4(), type: 'system', text: `${state.shield} ${player.nickname} se unió a ${state.name}`, timestamp: Date.now() });
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, state, player: safe, message: `Te uniste a ${state.name}` });
});

// ─── POST /api/politics/leave ─────────────────────────────────────────────────
router.post('/leave', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (state) {
    if (state.leaderId === player.id) return res.status(400).json({ error: 'El líder no puede abandonar el estado' });
    state.members = state.members.filter(m => m.id !== player.id);
    state.parliament = (state.parliament || []).filter(id => id !== player.id);
    db.saveState(state);
  }
  player.stateId = null; player.stateRole = null;
  db.savePlayer(player);
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, player: safe, message: `Saliste del estado` });
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
  player.money -= qty;
  state.treasury = (state.treasury || 0) + qty;
  db.savePlayer(player); db.saveState(state);
  db.addTransaction({ id: uuidv4(), type: 'transfer_budget', fromId: player.id, toId: state.id, fromNickname: player.nickname, toNickname: state.name, amount: qty, fee: 0, currency: 'money', description: `Contribución al tesoro de ${state.name}`, timestamp: Date.now() });
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, player: safe, state, message: `Contribuiste $${qty} al tesoro de ${state.name}` });
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
  state.leaderId = target.id; state.leaderNickname = target.nickname;
  state.members = state.members.map(m => ({ ...m, role: m.id === target.id ? 'leader' : m.id === player.id ? 'citizen' : m.role }));
  player.stateRole = 'citizen'; target.stateRole = 'leader';
  db.saveState(state); db.savePlayer(player); db.savePlayer(target);
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, player: safe, message: `Liderazgo transferido a ${toNickname}` });
});

// ─── POST /api/politics/propose-law ──────────────────────────────────────────
router.post('/propose-law', authMiddleware, (req, res) => {
  const { lawType, title, description, targetRegionId, ...fieldValues } = req.body;
  const player = req.player;

  if (!player.stateId) return res.status(400).json({ error: 'No perteneces a ningún estado' });
  const state = db.getState(player.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  const lawDef = LAW_TYPES[lawType];
  if (!lawDef) return res.status(400).json({ error: 'Tipo de ley inválido' });

  const sysConfig = POLITICAL_SYSTEMS[state.politicalSystem];

  // Verificar autorización según sistema político
  const member = state.members.find(m => m.id === player.id);
  if (!member) return res.status(403).json({ error: 'No eres miembro del estado' });

  const canPropose = sysConfig.votingBody === 'leader'
    ? member.role === 'leader'
    : sysConfig.votingBody === 'parliament'
      ? ['leader', 'parliament', 'minister'].includes(member.role)
      : ['leader', 'parliament', 'minister', 'citizen'].includes(member.role);

  if (!canPropose) return res.status(403).json({ error: 'No tienes autorización para proponer leyes en este sistema político' });

  // Validar campos específicos del tipo de ley
  if (lawDef.validate) {
    const err = lawDef.validate(fieldValues, state);
    if (err) return res.status(400).json({ error: err });
  }

  // Validar región si es requerida
  if (lawDef.requiresRegion && !targetRegionId) {
    return res.status(400).json({ error: 'Esta ley requiere seleccionar una región objetivo' });
  }
  if (targetRegionId) {
    const region = db.getRegion(targetRegionId);
    if (!region) return res.status(400).json({ error: 'Región no encontrada' });
    if (!(state.regions||[]).includes(targetRegionId)) {
      return res.status(400).json({ error: 'La región no pertenece a tu estado' });
    }
  }

  const now = Date.now();
  const lawId = uuidv4();

  const law = {
    id:             lawId,
    stateId:        state.id,
    stateName:      state.name,
    type:           lawType,
    title:          title || lawDef.name,
    description:    description || '',
    fields:         fieldValues,       // Todos los valores específicos del tipo de ley
    value:          fieldValues.value, // Compat con código anterior
    targetRegionId: targetRegionId || null,
    targetState:    fieldValues.targetState || null,
    newSystem:      fieldValues.newSystem || null,
    proposerId:     player.id,
    proposerNickname: player.nickname,
    status:         sysConfig.lawRequiresVote ? 'voting' : 'approved',
    votes:          { yes: [], no: [], abstain: [] },
    votingEndsAt:   sysConfig.lawRequiresVote ? now + sysConfig.voteDuration : now,
    votingBody:     sysConfig.votingBody,
    createdAt:      now,
    executedAt:     null
  };

  if (!sysConfig.lawRequiresVote) {
    law.executedAt = now;
    executeLaw(law, state);
  }

  db.saveLaw(law);
  state.laws = [...(state.laws || []), lawId];
  db.saveState(state);

  // Notificar a los que pueden votar
  const voterIds = getVoters(state, sysConfig.votingBody);
  voterIds.forEach(id => {
    const p = db.getPlayer(id);
    if (!p) return;
    if (!p.notifications) p.notifications = [];
    p.notifications.unshift({
      id: uuidv4(), type: 'law_proposed',
      text: `🏛️ ${state.name}: Ley "${law.title}" propuesta${sysConfig.lawRequiresVote ? ' — ¡Vota!' : ' — Ejecutada'}`,
      read: false, timestamp: now
    });
    db.savePlayer(p);
  });

  res.json({
    success: true, law,
    message: sysConfig.lawRequiresVote
      ? `Ley propuesta. Votación abierta por ${sysConfig.voteDuration/3600000}h`
      : 'Ley ejecutada inmediatamente'
  });
});

// ─── POST /api/politics/vote ──────────────────────────────────────────────────
router.post('/vote', authMiddleware, (req, res) => {
  const { lawId, vote } = req.body;
  const player = req.player;

  if (!['yes','no','abstain'].includes(vote)) return res.status(400).json({ error: 'Voto inválido' });

  const law = db.getLaw(lawId);
  if (!law) return res.status(404).json({ error: 'Ley no encontrada' });
  if (law.status !== 'voting') return res.status(400).json({ error: 'Esta ley no está en votación' });
  if (Date.now() > law.votingEndsAt) return res.status(400).json({ error: 'La votación ha cerrado' });

  const state = db.getState(law.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });

  const sysConfig  = POLITICAL_SYSTEMS[state.politicalSystem];
  const voterIds   = getVoters(state, sysConfig.votingBody);
  const canVote    = voterIds.includes(player.id);
  if (!canVote) {
    const bodyLabel = sysConfig.votingBody === 'parliament' ? 'miembros del parlamento' : 'miembros del estado';
    return res.status(403).json({ error: `Solo los ${bodyLabel} pueden votar en este sistema político` });
  }

  // Quitar voto anterior
  law.votes.yes     = (law.votes.yes||[]).filter(id => id !== player.id);
  law.votes.no      = (law.votes.no||[]).filter(id => id !== player.id);
  law.votes.abstain = (law.votes.abstain||[]).filter(id => id !== player.id);
  law.votes[vote].push(player.id);

  // Verificar threshold de aprobación instantánea
  const totalVoters = voterIds.length;
  const yesCount    = law.votes.yes.length;
  const threshold   = Math.ceil(totalVoters * sysConfig.instantThreshold);

  if (yesCount >= threshold) {
    law.status = 'approved'; law.executedAt = Date.now();
    executeLaw(law, state);
    db.saveLaw(law); db.saveState(state);
    return res.json({ success: true, law, message: '⚡ Ley aprobada y ejecutada', executed: true });
  }

  db.saveLaw(law);
  res.json({ success: true, law, message: `Voto "${vote}" registrado`, executed: false });
});

// ─── Helpers internos ─────────────────────────────────────────────────────────

function getVoters(state, votingBody) {
  if (votingBody === 'leader')     return [state.leaderId].filter(Boolean);
  if (votingBody === 'parliament') return state.members.filter(m => ['leader','parliament','minister'].includes(m.role)).map(m => m.id);
  return state.members.map(m => m.id); // 'members' = todos
}

function executeLaw(law, state) {
  try {
    switch (law.type) {

      case 'tax_income': {
        const val = Math.max(0, Math.min(50, parseInt(law.value)));
        const regions = law.targetRegionId
          ? [db.getRegion(law.targetRegionId)]
          : (state.regions||[]).map(id => db.getRegion(id));
        regions.filter(Boolean).forEach(r => {
          if (!r.taxes) r.taxes = { income: 10, factory: 8 };
          r.taxes.income = val;
          db.saveRegion(r);
        });
        break;
      }

      case 'tax_factory': {
        const val = Math.max(0, Math.min(50, parseInt(law.value)));
        const regions = law.targetRegionId
          ? [db.getRegion(law.targetRegionId)]
          : (state.regions||[]).map(id => db.getRegion(id));
        regions.filter(Boolean).forEach(r => {
          if (!r.taxes) r.taxes = { income: 10, factory: 8 };
          r.taxes.factory = val;
          db.saveRegion(r);
        });
        break;
      }

      case 'medicine': {
        const cost = parseInt(law.value) || 10000;
        if ((state.treasury||0) < cost) break;
        const region = db.getRegion(law.targetRegionId);
        if (region) {
          region.medicine = Math.min(10, (region.medicine||1) + 1);
          state.treasury  = (state.treasury||0) - cost;
          db.saveRegion(region);
        }
        break;
      }

      case 'education_inv': {
        const cost = parseInt(law.value) || 10000;
        if ((state.treasury||0) < cost) break;
        const region = db.getRegion(law.targetRegionId);
        if (region) {
          region.education = Math.min(10, (region.education||1) + 1);
          state.treasury   = (state.treasury||0) - cost;
          db.saveRegion(region);
        }
        break;
      }

      case 'infrastructure': {
        const cost = parseInt(law.value) || 10000;
        if ((state.treasury||0) < cost) break;
        const region = db.getRegion(law.targetRegionId);
        if (region) {
          region.infrastructure = Math.min(10, (region.infrastructure||1) + 1);
          state.treasury        = (state.treasury||0) - cost;
          db.saveRegion(region);
        }
        break;
      }

      case 'transfer_budget': {
        const amount = parseInt(law.value) || 0;
        if ((state.treasury||0) < amount) break;
        const region = db.getRegion(law.targetRegionId);
        if (region) {
          region.treasury  = (region.treasury||0) + amount;
          state.treasury   = (state.treasury||0) - amount;
          db.saveRegion(region);
        }
        break;
      }

      case 'salary_minimum': {
        const minSalary = parseInt(law.value) || 0;
        // Aplicar a todas las fábricas de las regiones controladas
        (state.regions||[]).forEach(rId => {
          db.getFactoriesByRegion(rId).forEach(f => {
            if (f.salary < minSalary) {
              f.salary = minSalary;
              db.saveFactory(f);
            }
          });
        });
        // Guardar en estado para nuevas fábricas
        state.minimumSalary = minSalary;
        break;
      }

      case 'declare_war': {
        const targetName = law.targetState || (law.fields && law.fields.targetState);
        if (!targetName) break;
        const targetState = db.getStateByName(targetName.trim());
        if (!targetState) break;
        if (!state.enemies) state.enemies = [];
        if (!targetState.enemies) targetState.enemies = [];
        if (!state.enemies.includes(targetState.id)) state.enemies.push(targetState.id);
        if (!targetState.enemies.includes(state.id)) targetState.enemies.push(state.id);
        // Remover de aliados si los había
        state.allies = (state.allies||[]).filter(id => id !== targetState.id);
        targetState.allies = (targetState.allies||[]).filter(id => id.id !== state.id);
        db.saveState(targetState);
        // Notificar al estado enemigo
        targetState.members.forEach(m => {
          const p = db.getPlayer(m.id);
          if (!p) return;
          if (!p.notifications) p.notifications = [];
          p.notifications.unshift({ id: uuidv4(), type: 'war_declared',
            text: `⚔️ ${state.name} te ha declarado la guerra a ${targetState.name}`, read: false, timestamp: Date.now() });
          db.savePlayer(p);
        });
        db.addChatMessage('guerra', { id: uuidv4(), type: 'system',
          text: `⚔️ ${state.name} declaró la guerra a ${targetState.name}`, timestamp: Date.now() });
        break;
      }

      case 'peace_treaty': {
        const targetName = law.targetState || (law.fields && law.fields.targetState);
        if (!targetName) break;
        const targetState = db.getStateByName(targetName.trim());
        if (!targetState) break;
        state.enemies = (state.enemies||[]).filter(id => id !== targetState.id);
        targetState.enemies = (targetState.enemies||[]).filter(id => id !== state.id);
        db.saveState(targetState);
        db.addChatMessage('global', { id: uuidv4(), type: 'system',
          text: `🕊️ ${state.name} y ${targetState.name} firmaron un tratado de paz`, timestamp: Date.now() });
        break;
      }

      case 'alliance': {
        const targetName = law.targetState || (law.fields && law.fields.targetState);
        if (!targetName) break;
        const targetState = db.getStateByName(targetName.trim());
        if (!targetState) break;
        if (!state.allies) state.allies = [];
        if (!targetState.allies) targetState.allies = [];
        if (!state.allies.includes(targetState.id)) state.allies.push(targetState.id);
        if (!targetState.allies.includes(state.id)) targetState.allies.push(state.id);
        db.saveState(targetState);
        db.addChatMessage('global', { id: uuidv4(), type: 'system',
          text: `🤝 ${state.name} y ${targetState.name} formaron una alianza`, timestamp: Date.now() });
        break;
      }

      case 'change_system': {
        const newSys = law.newSystem || (law.fields && law.fields.newSystem);
        if (!newSys || !POLITICAL_SYSTEMS[newSys]) break;
        const oldSystem     = state.politicalSystem;
        state.politicalSystem = newSys;
        state.leaderTitle   = getLeaderTitle(newSys);
        db.addChatMessage('global', { id: uuidv4(), type: 'system',
          text: `🏛️ ${state.name} cambió de ${POLITICAL_SYSTEMS[oldSystem]?.name || oldSystem} a ${POLITICAL_SYSTEMS[newSys].name}`,
          timestamp: Date.now() });
        break;
      }
    }

    db.saveState(state);
    console.log(`[Politics] Ley ejecutada: ${law.type} en ${state.name}`);
  } catch(e) {
    console.error('[Politics] Error ejecutando ley:', e.message);
  }
}

function enrichState(state) {
  const sysConfig = POLITICAL_SYSTEMS[state.politicalSystem] || {};
  const regions   = (state.regions||[]).map(id => {
    const r = db.getRegion(id);
    return r ? { id: r.id, name: r.name } : null;
  }).filter(Boolean);

  const activeLaws = (state.laws||[]).map(id => db.getLaw(id))
    .filter(l => l && l.status === 'voting').length;

  return {
    ...state,
    systemName:      sysConfig.name        || state.politicalSystem,
    systemIcon:      sysConfig.icon        || '🏛️',
    systemDesc:      sysConfig.description || '',
    lawRequiresVote: sysConfig.lawRequiresVote,
    votingBody:      sysConfig.votingBody,
    memberCount:     (state.members||[]).length,
    regionDetails:   regions,
    activeLaws
  };
}

function getLeaderTitle(system) {
  const titles = {
    republic_parliamentary: 'Primer Ministro',
    republic_presidential:  'Presidente',
    dictatorship:           'Dictador',
    unipartidist:           'Secretario General',
    monarchy_executive:     'Rey/Reina',
    monarchy_parliamentary: 'Monarca'
  };
  return titles[system] || 'Líder';
}

module.exports = router;
module.exports.executeLaw        = executeLaw;
module.exports.POLITICAL_SYSTEMS = POLITICAL_SYSTEMS;
module.exports.LAW_TYPES         = LAW_TYPES;

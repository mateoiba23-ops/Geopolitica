'use strict';
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db  = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

const PARTY_FOUNDING_TO_ELECTION = 24 * 3600000;
const PRIMARY_DURATION           = 12 * 3600000;
const PRIMARY_START_BEFORE       = 13 * 3600000;
const PARLIAMENTARY_DURATION     = 24 * 3600000;
const PRESIDENTIAL_DELAY         = 48 * 3600000;
const PRESIDENTIAL_DURATION      = 24 * 3600000;
const PARTY_CREATION_COST        = { money: 5000, gold: 10 };
const LAW_SYSTEM_CHANGE_THRESHOLD = 0.70;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getParties()    { return db.readAll('parties')    || {}; }
function saveParties(p)  { db.write('parties', p); }
function getElections()  { return db.readAll('elections')  || {}; }
function saveElections(e){ db.write('elections', e); }
function getParliaments(){ return db.readAll('parliaments')|| {}; }
function saveParliaments(p){ db.write('parliaments', p); }

function getParty(id)   { return getParties()[id] || null; }
function getPartyByName(name) {
  return Object.values(getParties()).find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}
function getPartiesByRegion(regionId) {
  return Object.values(getParties()).filter(p => p.regionId === regionId && p.active);
}
function getElectionsByRegion(regionId) {
  return Object.values(getElections()).filter(e => e.regionId === regionId);
}
function getParliament(stateId) { return getParliaments()[stateId] || null; }
function isResident(player, regionId) {
  const res = (player.residencies || {})[regionId];
  return res && res.status === 'approved';
}
function enrichParty(party) {
  return { ...party, memberCount: (party.members||[]).length, region: db.getRegion(party.regionId)?.name || party.regionId };
}

// ─── GET /parties/:regionId ───────────────────────────────────────────────────
router.get('/parties/:regionId', authMiddleware, (req, res) => {
  const parties = getPartiesByRegion(req.params.regionId).map(p => enrichParty(p));
  res.json({ parties });
});

// ─── GET /my-party ────────────────────────────────────────────────────────────
router.get('/my-party', authMiddleware, (req, res) => {
  const p = req.player;
  if (!p.partyId) return res.json({ party: null });
  const party = getParty(p.partyId);
  res.json({ party: party ? enrichParty(party) : null });
});

// ─── GET /elections/:regionId ─────────────────────────────────────────────────
router.get('/elections/:regionId', authMiddleware, (req, res) => {
  const elections = getElectionsByRegion(req.params.regionId)
    .sort((a,b) => b.createdAt - a.createdAt).slice(0, 20);
  res.json({ elections });
});

// ─── GET /parliament/:stateId ─────────────────────────────────────────────────
router.get('/parliament/:stateId', authMiddleware, (req, res) => {
  const parliament = getParliament(req.params.stateId);
  res.json({ parliament: parliament || null });
});

// ─── POST /found-party ────────────────────────────────────────────────────────
router.post('/found-party', authMiddleware, (req, res) => {
  const { name, ideology, color, description } = req.body;
  const player = req.player;

  if (!name || !ideology || !color) return res.status(400).json({ error: 'Nombre, ideología y color requeridos' });
  if (name.length < 3 || name.length > 40) return res.status(400).json({ error: 'Nombre: 3-40 caracteres' });
  if (player.partyId) return res.status(400).json({ error: 'Ya perteneces a un partido' });
  if (getPartyByName(name)) return res.status(409).json({ error: 'Ya existe un partido con ese nombre' });
  if (player.money < PARTY_CREATION_COST.money) return res.status(400).json({ error: `Necesitas $${PARTY_CREATION_COST.money}` });
  if (player.gold < PARTY_CREATION_COST.gold) return res.status(400).json({ error: `Necesitas ${PARTY_CREATION_COST.gold} ⚱️` });

  const partyId = uuidv4();
  const now = Date.now();
  const party = {
    id: partyId, name, ideology, color,
    description: description || '',
    regionId:    player.regionId,
    leaderId:    player.id,
    leaderNickname: player.nickname,
    members: [{ id: player.id, nickname: player.nickname, role: 'leader', joinedAt: now }],
    foundedAt: now, active: true
  };

  player.money   -= PARTY_CREATION_COST.money;
  player.gold    -= PARTY_CREATION_COST.gold;
  player.partyId  = partyId;
  player.partyRole = 'leader';

  const parties = getParties();
  parties[partyId] = party;
  saveParties(parties);
  db.savePlayer(player);

  checkTriggerElection(player.regionId, partyId, now);

  db.addChatMessage('global', {
    id: uuidv4(), type: 'system',
    text: `🏳️ ${player.nickname} fundó el partido "${name}" en ${db.getRegion(player.regionId)?.name || player.regionId}`,
    timestamp: now
  });

  const safe = { ...player }; delete safe.password;
  res.json({ success: true, party, player: safe, message: `Partido "${name}" fundado` });
});

// ─── POST /join-party ─────────────────────────────────────────────────────────
router.post('/join-party', authMiddleware, (req, res) => {
  const { partyId } = req.body;
  const player = req.player;
  if (player.partyId) return res.status(400).json({ error: 'Ya perteneces a un partido' });
  const parties = getParties();
  const party = parties[partyId];
  if (!party || !party.active) return res.status(404).json({ error: 'Partido no encontrado' });
  party.members.push({ id: player.id, nickname: player.nickname, role: 'member', joinedAt: Date.now() });
  player.partyId = partyId; player.partyRole = 'member';
  saveParties(parties); db.savePlayer(player);
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, party: enrichParty(party), player: safe, message: `Te uniste a ${party.name}` });
});

// ─── POST /leave-party ────────────────────────────────────────────────────────
router.post('/leave-party', authMiddleware, (req, res) => {
  const player = req.player;
  if (!player.partyId) return res.status(400).json({ error: 'No perteneces a ningún partido' });
  const parties = getParties();
  const party = parties[player.partyId];
  if (party) {
    if (party.leaderId === player.id && party.members.length > 1)
      return res.status(400).json({ error: 'Transfiere el liderazgo antes de salir' });
    party.members = party.members.filter(m => m.id !== player.id);
    if (party.members.length === 0) party.active = false;
    saveParties(parties);
  }
  player.partyId = null; player.partyRole = null;
  db.savePlayer(player);
  const safe = { ...player }; delete safe.password;
  res.json({ success: true, player: safe, message: 'Saliste del partido' });
});

// ─── POST /register-candidate ─────────────────────────────────────────────────
router.post('/register-candidate', authMiddleware, (req, res) => {
  const { electionId } = req.body;
  const player = req.player;
  const elections = getElections();
  const election = elections[electionId];
  if (!election) return res.status(404).json({ error: 'Elección no encontrada' });
  if (election.type !== 'primary') return res.status(400).json({ error: 'Solo en primarias' });
  if (election.status !== 'open') return res.status(400).json({ error: 'Primarias cerradas' });
  if (Date.now() > election.endsAt) return res.status(400).json({ error: 'Tiempo agotado' });
  if (player.partyId !== election.partyId) return res.status(403).json({ error: 'No eres miembro de este partido' });
  if (election.candidates[player.id]) return res.status(400).json({ error: 'Ya estás registrado' });
  election.candidates[player.id] = { id: player.id, nickname: player.nickname, level: player.level, votes: 0, registeredAt: Date.now() };
  elections[electionId] = election;
  saveElections(elections);
  res.json({ success: true, message: '¡Registrado como candidato en primarias!' });
});

// ─── POST /vote-primary ───────────────────────────────────────────────────────
router.post('/vote-primary', authMiddleware, (req, res) => {
  const { electionId, candidateId } = req.body;
  const voter = req.player;
  const elections = getElections();
  const election = elections[electionId];
  if (!election) return res.status(404).json({ error: 'Elección no encontrada' });
  if (election.type !== 'primary') return res.status(400).json({ error: 'No es primaria' });
  if (election.status !== 'open' || Date.now() > election.endsAt) return res.status(400).json({ error: 'Primarias cerradas' });
  if (voter.partyId !== election.partyId) return res.status(403).json({ error: 'Solo miembros del partido votan en primarias' });
  if (election.votes[voter.id]) return res.status(400).json({ error: 'Ya votaste' });
  if (!election.candidates[candidateId]) return res.status(400).json({ error: 'Candidato inválido' });
  election.votes[voter.id] = candidateId;
  election.candidates[candidateId].votes = (election.candidates[candidateId].votes || 0) + 1;
  elections[electionId] = election;
  saveElections(elections);
  res.json({ success: true, message: `Voto registrado para ${election.candidates[candidateId].nickname}` });
});

// ─── POST /vote-parliamentary ─────────────────────────────────────────────────
router.post('/vote-parliamentary', authMiddleware, (req, res) => {
  const { electionId, partyId } = req.body;
  const voter = req.player;
  const elections = getElections();
  const election = elections[electionId];
  if (!election) return res.status(404).json({ error: 'Elección no encontrada' });
  if (election.type !== 'parliamentary') return res.status(400).json({ error: 'No es parlamentaria' });
  if (election.status !== 'open' || Date.now() > election.endsAt) return res.status(400).json({ error: 'Elecciones cerradas' });
  if (!isResident(voter, election.regionId)) return res.status(403).json({ error: 'Solo residentes de la región pueden votar' });
  if (election.votes[voter.id]) return res.status(400).json({ error: 'Ya votaste' });
  if (!election.parties[partyId]) return res.status(400).json({ error: 'Partido inválido' });
  election.votes[voter.id] = partyId;
  election.parties[partyId].votes = (election.parties[partyId].votes || 0) + 1;
  elections[electionId] = election;
  saveElections(elections);
  res.json({ success: true, message: `Voto registrado para ${election.parties[partyId].name}` });
});

// ─── POST /vote-presidential ──────────────────────────────────────────────────
router.post('/vote-presidential', authMiddleware, (req, res) => {
  const { electionId, candidateId } = req.body;
  const voter = req.player;
  const elections = getElections();
  const election = elections[electionId];
  if (!election) return res.status(404).json({ error: 'Elección no encontrada' });
  if (election.type !== 'presidential') return res.status(400).json({ error: 'No es presidencial' });
  if (election.status !== 'open' || Date.now() > election.endsAt) return res.status(400).json({ error: 'Elecciones cerradas' });
  if (!isResident(voter, election.regionId)) return res.status(403).json({ error: 'Solo residentes pueden votar' });
  if (election.votes[voter.id]) return res.status(400).json({ error: 'Ya votaste' });
  if (!election.candidates[candidateId]) return res.status(400).json({ error: 'Candidato inválido' });
  election.votes[voter.id] = candidateId;
  election.candidates[candidateId].votes = (election.candidates[candidateId].votes || 0) + 1;
  elections[electionId] = election;
  saveElections(elections);
  res.json({ success: true, message: `Voto registrado para ${election.candidates[candidateId].nickname}` });
});

// ─── POST /parliament-vote-law ────────────────────────────────────────────────
router.post('/parliament-vote-law', authMiddleware, (req, res) => {
  const { lawId, vote } = req.body;
  const player = req.player;
  if (!['yes','no','abstain'].includes(vote)) return res.status(400).json({ error: 'Voto inválido' });
  const law = db.getLaw(lawId);
  if (!law) return res.status(404).json({ error: 'Ley no encontrada' });
  if (law.status !== 'voting') return res.status(400).json({ error: 'Ley no en votación' });
  if (Date.now() > law.votingEndsAt) return res.status(400).json({ error: 'Votación cerrada' });
  const state = db.getState(law.stateId);
  if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
  const parliament = getParliament(law.stateId);
  if (!parliament) return res.status(400).json({ error: 'Sin parlamento constituido' });
  const seat = parliament.seats.find(s => s.playerId === player.id);
  if (!seat) return res.status(403).json({ error: 'Solo miembros del parlamento votan en leyes' });
  law.votes.yes     = (law.votes.yes||[]).filter(id => id !== player.id);
  law.votes.no      = (law.votes.no||[]).filter(id => id !== player.id);
  law.votes.abstain = (law.votes.abstain||[]).filter(id => id !== player.id);
  law.votes[vote].push(player.id);
  const totalSeats = parliament.seats.length;
  const yesCount = law.votes.yes.length;
  const threshold = law.type === 'change_system' ? LAW_SYSTEM_CHANGE_THRESHOLD : 0.60;
  if (yesCount / totalSeats >= threshold) {
    law.status = 'approved'; law.executedAt = Date.now();
    try { const { executeLaw } = require('./politics'); executeLaw(law, state); } catch {}
    db.saveLaw(law);
    return res.json({ success: true, law, message: '⚡ Ley aprobada y ejecutada', executed: true });
  }
  db.saveLaw(law);
  res.json({ success: true, law, message: `Voto "${vote}" registrado`, executed: false });
});

// ─── Election processing (called by scheduler) ────────────────────────────────
function checkTriggerElection(regionId, newPartyId, now) {
  const existing = getPartiesByRegion(regionId).filter(p => p.active && p.id !== newPartyId);
  if (existing.length > 0) return; // Not first party

  const elections = getElections();
  const alreadyQueued = Object.values(elections).some(
    e => e.regionId === regionId && e.type === 'parliamentary' && (e.status === 'pending' || e.status === 'open')
  );
  if (alreadyQueued) return;

  const parliamentaryStart = now + PARTY_FOUNDING_TO_ELECTION;
  const parliamentaryEnd   = parliamentaryStart + PARLIAMENTARY_DURATION;
  const primaryStart       = parliamentaryEnd - PRIMARY_START_BEFORE;
  const primaryEnd         = primaryStart + PRIMARY_DURATION;

  const electionId = uuidv4();
  elections[electionId] = {
    id: electionId, regionId, type: 'parliamentary', status: 'pending',
    startsAt: parliamentaryStart, endsAt: parliamentaryEnd,
    primaryStart, primaryEnd,
    parties: {}, votes: {}, results: null, createdAt: now,
    description: 'Primeras elecciones parlamentarias'
  };
  saveElections(elections);

  const region = db.getRegion(regionId);
  db.addChatMessage('global', {
    id: uuidv4(), type: 'system',
    text: `🗳️ Primer partido en ${region?.name || regionId}. Elecciones parlamentarias en 24h.`,
    timestamp: now
  });
}

function processElections() {
  const now = Date.now();
  const elections = getElections();
  let changed = false;

  Object.values(elections).forEach(election => {
    // Activate parliamentary elections + open primaries
    if (election.type === 'parliamentary' && election.status === 'pending' && now >= election.startsAt) {
      const parties = getPartiesByRegion(election.regionId);
      parties.forEach(party => {
        const primaryId = `primary_${party.id}_${election.id}`;
        if (!elections[primaryId]) {
          elections[primaryId] = {
            id: primaryId, regionId: election.regionId,
            type: 'primary', partyId: party.id,
            partyName: party.name, partyColor: party.color,
            parentElectionId: election.id, status: 'open',
            startsAt: election.primaryStart, endsAt: election.primaryEnd,
            candidates: {}, votes: {}, results: null, createdAt: now
          };
          changed = true;
        }
        election.parties[party.id] = election.parties[party.id] || {
          id: party.id, name: party.name, color: party.color,
          ideology: party.ideology, votes: 0, seats: 0, candidate: null
        };
      });
      election.status = 'open'; changed = true;
      db.addChatMessage('global', {
        id: uuidv4(), type: 'system',
        text: `🗳️ Elecciones parlamentarias abiertas en ${db.getRegion(election.regionId)?.name || election.regionId}. ¡Vota! (24h)`,
        timestamp: now
      });
    }

    // Close primaries
    if (election.type === 'primary' && election.status === 'open' && now >= election.endsAt) {
      election.status = 'closed';
      const sorted = Object.values(election.candidates).sort((a,b) => b.votes - a.votes);
      election.results = { winner: sorted[0]||null, ranking: sorted };
      if (sorted[0] && election.parentElectionId && elections[election.parentElectionId]) {
        const parent = elections[election.parentElectionId];
        if (parent.parties[election.partyId]) {
          parent.parties[election.partyId].candidate = { id: sorted[0].id, nickname: sorted[0].nickname, votes: sorted[0].votes };
        }
      }
      changed = true;
      if (sorted[0]) {
        db.addChatMessage('global', {
          id: uuidv4(), type: 'system',
          text: `🏆 Primarias ${election.partyName}: ${sorted[0].nickname} representará al partido.`,
          timestamp: now
        });
      }
    }

    // Close parliamentary
    if (election.type === 'parliamentary' && election.status === 'open' && now >= election.endsAt) {
      closeParliamentary(election, elections); changed = true;
    }

    // Open/Close presidential
    if (election.type === 'presidential' && election.status === 'pending' && now >= election.startsAt) {
      election.status = 'open'; changed = true;
      db.addChatMessage('global', {
        id: uuidv4(), type: 'system',
        text: `🎖️ Elecciones presidenciales abiertas en ${db.getRegion(election.regionId)?.name||election.regionId}. ¡Vota! (24h)`,
        timestamp: now
      });
    }
    if (election.type === 'presidential' && election.status === 'open' && now >= election.endsAt) {
      closePresidential(election); changed = true;
    }
  });

  if (changed) saveElections(elections);
}

function closeParliamentary(election, elections) {
  election.status = 'closed';
  const totalVotes = Object.values(election.parties).reduce((s,p) => s + (p.votes||0), 0);
  const TOTAL_SEATS = 20;
  const partyList = Object.values(election.parties).filter(p => p.votes > 0).sort((a,b) => b.votes - a.votes);

  let seatsLeft = TOTAL_SEATS;
  partyList.forEach(p => {
    p.percentage = totalVotes > 0 ? ((p.votes/totalVotes)*100).toFixed(1) : 0;
    p.seats = totalVotes > 0 ? Math.round((p.votes/totalVotes)*TOTAL_SEATS) : 0;
    seatsLeft -= p.seats;
  });
  if (partyList.length > 0 && seatsLeft !== 0) partyList[0].seats += seatsLeft;
  election.results = { totalVotes, parties: partyList, totalSeats: TOTAL_SEATS };

  // Build parliament seats
  const parliamentSeats = [];
  partyList.forEach(party => {
    const partyObj = getParty(party.id);
    const candidate = party.candidate;
    let filled = 0;
    if (candidate && filled < party.seats) {
      parliamentSeats.push({ playerId:candidate.id, nickname:candidate.nickname, partyId:party.id, partyName:party.name, partyColor:party.color, role:'representative' });
      filled++;
    }
    const others = (partyObj?.members||[]).filter(m => m.id !== candidate?.id).slice(0, party.seats - filled);
    others.forEach(m => parliamentSeats.push({ playerId:m.id, nickname:m.nickname, partyId:party.id, partyName:party.name, partyColor:party.color, role:'member' }));
  });

  // Create/update state
  let state = db.getAllStates().find(s => (s.regions||[]).includes(election.regionId));
  if (!state) {
    const stateId = uuidv4();
    const region = db.getRegion(election.regionId);
    state = { id:stateId, name:`Estado de ${region?.name||election.regionId}`, shield:'🏛️', color:'#00d4ff',
      politicalSystem:'republic_parliamentary', regions:[election.regionId], members:[], budget:0, treasury:0,
      parliament:[], allies:[], enemies:[], laws:[], active:true, foundedAt:Date.now(), description:'' };
  }

  // Update parliament members in state
  parliamentSeats.forEach(seat => {
    const p = db.getPlayer(seat.playerId); if (!p) return;
    if (!state.members.find(m => m.id === seat.playerId))
      state.members.push({ id:seat.playerId, nickname:seat.nickname, role:'parliament', joinedAt:Date.now() });
    p.stateId = state.id; p.stateRole = 'parliament';
    db.savePlayer(p);
  });
  db.saveState(state);

  const parliaments = getParliaments();
  parliaments[state.id] = { stateId:state.id, regionId:election.regionId, seats:parliamentSeats,
    totalSeats:TOTAL_SEATS, electionId:election.id, constitutedAt:Date.now(), partyResults:partyList };
  saveParliaments(parliaments);

  // Schedule presidential elections
  const presId = uuidv4();
  const presStart = Date.now() + PRESIDENTIAL_DELAY;
  elections[presId] = {
    id:presId, regionId:election.regionId, stateId:state.id,
    type:'presidential', status:'pending',
    startsAt:presStart, endsAt:presStart+PRESIDENTIAL_DURATION,
    candidates:buildPresidentialCandidates(partyList),
    votes:{}, results:null, createdAt:Date.now()
  };

  db.addChatMessage('global', {
    id:uuidv4(), type:'system',
    text:`🏛️ Parlamento constituido en ${db.getRegion(election.regionId)?.name||election.regionId}. Presidenciales en 48h.`,
    timestamp:Date.now()
  });
}

function buildPresidentialCandidates(partyResults) {
  const candidates = {};
  partyResults.forEach(party => {
    if (party.candidate) {
      candidates[party.candidate.id] = { id:party.candidate.id, nickname:party.candidate.nickname,
        partyId:party.id, partyName:party.name, partyColor:party.color, votes:0 };
    }
  });
  return candidates;
}

function closePresidential(election) {
  election.status = 'closed';
  const sorted = Object.values(election.candidates).sort((a,b) => b.votes - a.votes);
  election.results = { winner:sorted[0]||null, ranking:sorted };
  if (!sorted[0]) return;

  const winner = sorted[0];
  const state = db.getState(election.stateId);
  if (!state) return;

  state.leaderId = winner.id; state.leaderNickname = winner.nickname; state.leaderTitle = 'Presidente';
  state.members = state.members.map(m => ({ ...m, role: m.id === winner.id ? 'leader' : m.role }));
  db.saveState(state);

  const president = db.getPlayer(winner.id);
  if (president) {
    president.stateRole = 'leader';
    if (!president.notifications) president.notifications = [];
    president.notifications.unshift({ id:uuidv4(), type:'elected',
      text:`🎉 ¡Fuiste elegido Presidente de ${state.name}!`, read:false, timestamp:Date.now() });
    db.savePlayer(president);
  }

  db.addChatMessage('global', {
    id:uuidv4(), type:'system',
    text:`🎉 ${winner.nickname} elegido Presidente de ${state.name} con ${winner.votes} votos.`,
    timestamp:Date.now()
  });
}

module.exports = router;
module.exports.processElections = processElections;
module.exports.isResident = isResident;

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');

const VALID_CHANNELS_STATIC = ['global', 'politica', 'economia', 'guerra'];

function isValidChannel(channel) {
  if (VALID_CHANNELS_STATIC.includes(channel)) return true;
  if (channel.startsWith('region_')) return true;
  if (channel.startsWith('state_'))  return true;
  return false;
}

// GET /api/chat/:channel - get chat messages
router.get('/:channel', authMiddleware, async (req, res) => {
  const { channel } = req.params;
  if (!isValidChannel(channel)) {
    return res.status(400).json({ error: 'Canal inválido' });
  }

  const messages = (await db.getChatAsync(channel)).slice(-100);

  // Enrich with player info
  const enriched = messages.map(m => {
    if (m.type === 'system') return m;
    const player = m.playerId ? db.getPlayer(m.playerId) : null;
    return {
      ...m,
      nickname: player ? player.nickname : m.nickname || 'Unknown',
      level: player ? player.level : m.level || 1,
      premium: player ? player.premium : false
    };
  });

  res.json({ messages: enriched, channel });
});

// POST /api/chat/:channel - send message
router.post('/:channel', authMiddleware, (req, res) => {
  const { channel } = req.params;
  const { text } = req.body;
  const player = req.player;

  if (!isValidChannel(channel)) {
    return res.status(400).json({ error: 'Canal inválido' });
  }

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Mensaje vacío' });
  }

  if (text.length > 300) {
    return res.status(400).json({ error: 'Mensaje demasiado largo (máx 300 caracteres)' });
  }

  const message = {
    id: uuidv4(),
    type: 'player',
    playerId: player.id,
    nickname: player.nickname,
    level: player.level,
    regionId: player.regionId,
    premium: player.premium,
    role: player.role,
    text: text.trim(),
    timestamp: Date.now()
  };

  db.addChatMessage(channel, message);

  res.json({ success: true, message });
});

// GET /api/chat/channels/list
router.get('/channels/list', authMiddleware, async (req, res) => {
  const player = req.player;
  const channels = [...VALID_CHANNELS_STATIC];

  // Add player's regional channel
  if (player.regionId) channels.push('region_' + player.regionId);

  // Add player's state channel
  if (player.stateId) channels.push('state_' + player.stateId);

  const channelInfo = await Promise.all(channels.map(async ch => {
    const messages = await db.getChatAsync(ch);
    const last = messages.length > 0 ? messages[messages.length - 1] : null;
    return {
      id:           ch,
      name:         getChannelName(ch, player),
      icon:         getChannelIcon(ch),
      messageCount: messages.length,
      lastMessage:  last
    };
  }));
  res.json({ channels: channelInfo });
});

function getChannelName(ch, player) {
  const names = {
    global: 'Chat Global', politica: 'Política',
    economia: 'Economía',  guerra: 'Guerra'
  };
  if (names[ch]) return names[ch];
  if (ch.startsWith('region_')) {
    const db2  = require('../utils/db');
    const region = db2.getRegion(ch.replace('region_', ''));
    return region ? 'Regional: ' + region.name : 'Regional';
  }
  if (ch.startsWith('state_')) {
    const db2  = require('../utils/db');
    const state = db2.getState(ch.replace('state_', ''));
    return state ? state.shield + ' ' + state.name : 'Estado';
  }
  return ch;
}

function getChannelIcon(ch) {
  if (ch === 'global')    return '🌍';
  if (ch === 'politica')  return '🏛️';
  if (ch === 'economia')  return '💰';
  if (ch === 'guerra')    return '⚔️';
  if (ch.startsWith('region_')) return '📍';
  if (ch.startsWith('state_'))  return '🏳️';
  return '💬';
}



module.exports = router;

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────

async function renderChat() {
  const content = document.getElementById('game-content');
  const p       = STATE.player;

  // Build channel list dynamically
  const channels = [
    { id: 'global',              icon: '🌍', name: 'GLOBAL'    },
    { id: 'politica',            icon: '🏛️', name: 'POLÍTICA'  },
    { id: 'economia',            icon: '💰', name: 'ECONOMÍA'  },
    { id: 'guerra',              icon: '⚔️', name: 'GUERRA'    }
  ];

  if (p.regionId) {
    const region = STATE.regions.find(r => r.id === p.regionId);
    channels.push({
      id: 'region_' + p.regionId,
      icon: '📍',
      name: region ? region.name.toUpperCase().slice(0,8) : 'REGIONAL'
    });
  }

  if (p.stateId) {
    // Try to get state name from cache
    const stateName = window._myStateName || 'ESTADO';
    channels.push({
      id: 'state_' + p.stateId,
      icon: window._myStateShield || '🏳️',
      name: stateName.slice(0,8).toUpperCase()
    });
    // Load state name async
    API.getMyState().then(d => {
      if (d.state) {
        window._myStateName  = d.state.name;
        window._myStateShield = d.state.shield;
      }
    }).catch(() => {});
  }

  if (!STATE.chatChannel || !channels.find(c => c.id === STATE.chatChannel)) {
    STATE.chatChannel = 'global';
  }

  content.innerHTML = `
    <div class="chat-wrap">
      <div class="chat-channels" id="chat-channel-tabs">
        ${channels.map(ch => `
          <button class="chat-channel-btn ${ch.id === STATE.chatChannel ? 'active' : ''}"
            onclick="switchChannel('${ch.id}')">
            ${ch.icon} ${ch.name}
          </button>`).join('')}
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="loading">⏳ Cargando mensajes...</div>
      </div>
      <div class="chat-input-wrap">
        <input type="text" id="chat-input" placeholder="Escribe un mensaje..."
          maxlength="300" onkeydown="if(event.key==='Enter') sendChatMessage()">
        <button class="chat-send-btn" onclick="sendChatMessage()">➤</button>
      </div>
    </div>`;

  await loadChatMessages(STATE.chatChannel);
  startChatPolling(STATE.chatChannel);
}

async function loadChatMessages(channel) {
  try {
    const data     = await API.getChat(channel);
    const messages = data.messages || [];
    const el       = document.getElementById('chat-messages');
    if (!el) return;

    if (messages.length === 0) {
      el.innerHTML = `<div class="empty">No hay mensajes aún.<br>
        <span style="font-size:12px;color:var(--text-dim)">¡Sé el primero en escribir!</span></div>`;
      return;
    }

    el.innerHTML = messages.map(m => renderChatMessage(m)).join('');
    el.scrollTop = el.scrollHeight;
  } catch {}
}

function renderChatMessage(m) {
  if (m.type === 'system') {
    return `<div class="chat-msg chat-msg-system">
      <div class="chat-msg-text">— ${m.text} —</div>
    </div>`;
  }

  const me       = STATE.player;
  const isMe     = m.playerId === me.id || m.nickname === me.nickname;
  const nickClass = m.role === 'admin' ? 'admin-nick' : m.premium ? 'premium-nick' : '';
  const badge     = m.role === 'admin' ? ' 👑' : m.premium ? ' ⭐' : '';

  return `
    <div class="chat-msg" style="${isMe ? 'padding-left:20px' : ''}">
      <div class="chat-msg-header">
        <span class="chat-msg-nick ${nickClass}"
          onclick="showPublicProfile('${m.nickname}')"
          style="cursor:pointer">${m.nickname}${badge}</span>
        <span class="chat-msg-lv">Nv.${m.level||1}</span>
        <span class="chat-msg-time">${formatTime(m.timestamp)}</span>
      </div>
      <div class="chat-msg-text" style="${isMe ? 'color:var(--text-primary)' : ''}">${escapeHtml(m.text)}</div>
    </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  const channel = STATE.chatChannel || 'global';

  try {
    const data = await API.sendChat(channel, text);
    if (data.error) return showToast(data.error, 'error');

    const el = document.getElementById('chat-messages');
    if (el && data.message) {
      const p   = STATE.player;
      const msg = {
        ...data.message,
        level:   p.level,
        premium: p.premium,
        role:    p.role
      };
      // Remove empty state if present
      const empty = el.querySelector('.empty');
      if (empty) empty.remove();

      el.innerHTML += renderChatMessage(msg);
      el.scrollTop  = el.scrollHeight;
    }
  } catch { showToast('Error al enviar', 'error'); }
}

async function switchChannel(channel) {
  STATE.chatChannel = channel;

  // Update active tab
  document.querySelectorAll('.chat-channel-btn').forEach(btn => {
    const btnChannel = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    btn.classList.toggle('active', btnChannel === channel);
  });

  const el = document.getElementById('chat-messages');
  if (el) el.innerHTML = '<div class="loading">⏳ Cargando...</div>';

  if (STATE.chatPolling) {
    clearInterval(STATE.chatPolling);
    STATE.chatPolling = null;
  }

  await loadChatMessages(channel);
  startChatPolling(channel);
}

function startChatPolling(channel) {
  if (STATE.chatPolling) clearInterval(STATE.chatPolling);
  STATE.chatPolling = setInterval(async () => {
    if (STATE.currentPanel !== 'chat') {
      clearInterval(STATE.chatPolling);
      STATE.chatPolling = null;
      return;
    }
    await loadChatMessages(channel);
  }, 8000);
}

const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');

const GOLD_PACKAGES = {
  starter:   { gold: 800,   bonus: 0     },
  explorer:  { gold: 2000,  bonus: 500   },
  commander: { gold: 5000,  bonus: 2000  },
  general:   { gold: 12000, bonus: 6000  },
  president: { gold: 30000, bonus: 20000 }
};

const PREMIUM_PLANS = {
  premium_7:   { days: 7   },
  premium_30:  { days: 30  },
  premium_90:  { days: 90  },
  premium_365: { days: 365 }
};

function deliverPayment(payment) {
  const player = db.getPlayer(payment.playerId);
  if (!player) {
    console.error(`[PaymentEngine] Player not found: ${payment.playerId}`);
    return false;
  }

  let notifText = '';

  if (payment.type === 'gold') {
    const pkg = GOLD_PACKAGES[payment.itemId];
    if (!pkg) { console.error('[PaymentEngine] Unknown package:', payment.itemId); return false; }
    const totalGold = pkg.gold + pkg.bonus;
    player.gold += totalGold;
    notifText = `✅ Pago aprobado: +${totalGold.toLocaleString()} ⚱️ (${pkg.gold.toLocaleString()} + ${pkg.bonus.toLocaleString()} bonus) por "${payment.itemName}"`;

  } else if (payment.type === 'premium') {
    const plan = PREMIUM_PLANS[payment.itemId];
    if (!plan) { console.error('[PaymentEngine] Unknown plan:', payment.itemId); return false; }
    player.premium = true;
    const now  = Date.now();
    const base = player.premiumUntil && player.premiumUntil > now ? player.premiumUntil : now;
    player.premiumUntil = base + plan.days * 86400000;
    notifText = `⭐ PREMIUM ACTIVADO por ${plan.days} días. Vence: ${new Date(player.premiumUntil).toLocaleDateString('es-CO')}. ¡Disfruta el trabajo automático!`;

  } else {
    console.error('[PaymentEngine] Unknown type:', payment.type);
    return false;
  }

  if (!player.notifications) player.notifications = [];
  player.notifications.unshift({
    id: uuidv4(), type: 'payment_approved',
    text: notifText, read: false, timestamp: Date.now()
  });

  db.savePlayer(player);

  db.addChatMessage('global', {
    id: uuidv4(), type: 'system',
    text: `🎉 ¡${player.nickname} adquirió "${payment.itemName}"! ¡Gracias por apoyar el juego!`,
    timestamp: Date.now()
  });

  db.addTransaction({
    id: uuidv4(), type: 'payment',
    fromId: player.id, toId: 'JUEGO',
    fromNickname: player.nickname, toNickname: 'Tienda',
    amount: Math.floor(payment.usdAmount * 100), fee: 0,
    currency: 'usd',
    description: `Compra: ${payment.itemName}`,
    timestamp: Date.now()
  });

  console.log(`[PaymentEngine] ✅ Entregado: ${payment.itemName} → ${player.nickname}`);
  return true;
}

module.exports = { deliverPayment };

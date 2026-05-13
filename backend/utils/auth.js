const db = require('./db');

function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'] || req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const player = db.getPlayer(session.playerId);
  if (!player) {
    return res.status(401).json({ error: 'Player not found' });
  }

  if (player.banned) {
    return res.status(403).json({ error: 'Account banned' });
  }

  // Update last seen
  player.lastSeen = Date.now();
  db.savePlayer(player);

  req.player = player;
  req.playerId = player.id;
  next();
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.player.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { authMiddleware, adminMiddleware };

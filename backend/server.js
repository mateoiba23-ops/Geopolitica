'use strict';

require('dotenv').config();

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Routes (registradas ANTES del listen) ───────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/player',       require('./routes/player'));
app.use('/api/factory',      require('./routes/factory'));
app.use('/api/region',       require('./routes/region'));
app.use('/api/market',       require('./routes/market'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/work',         require('./routes/work'));
app.use('/api/economy',      require('./routes/economy'));
app.use('/api/store',        require('./routes/store'));
app.use('/api/payment',      require('./routes/payment'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/politics',     require('./routes/politics'));
app.use('/api/rankings',     require('./routes/rankings'));
app.use('/api/autowork',     require('./routes/autowork'));
app.use('/api/politics2',    require('./routes/politics2'));
app.use('/api/war',          require('./routes/war'));

// ─── SPA fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error handler global ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    const { initData } = require('./utils/db');
    await initData();

    require('./systems/scheduler').startScheduler();

    app.listen(PORT, HOST, () => {
      console.log(`\n🌍 GEOPOLITICA SERVER RUNNING`);
      console.log(`📡 http://localhost:${PORT}`);
      console.log(`🎮 Game is live!\n`);
    });
  } catch (err) {
    console.error('❌ Bootstrap failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

bootstrap();

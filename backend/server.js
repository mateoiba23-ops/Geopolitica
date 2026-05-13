const express = require('express');
const path    = require('path');
const cors    = require('cors');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Data dir
const DB_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });

const { initData } = require('./utils/db');
initData();

// Routes
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

require('./systems/scheduler').startScheduler();

app.listen(PORT, () => {
  console.log(`\n🌍 GEOPOLITICA SERVER RUNNING`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🎮 Game is live!\n`);
});

module.exports = app;

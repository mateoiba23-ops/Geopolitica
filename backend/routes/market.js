const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/db');
const { authMiddleware } = require('../utils/auth');
const { MARKET_FEE } = require('../utils/constants');
const { v4: uuidv4m } = require('uuid');
const db2 = require('../utils/db');

// GET /api/market/listings - view all market listings
router.get('/listings', authMiddleware, (req, res) => {
  const market = db.getMarket();
  const listings = (market.listings || []).map(l => {
    const seller = db.getPlayer(l.sellerId);
    return { ...l, sellerNickname: seller ? seller.nickname : '?' };
  });
  res.json({ listings });
});

// POST /api/market/sell - create a listing
router.post('/sell', authMiddleware, (req, res) => {
  const { resourceType, amount, pricePerUnit } = req.body;
  const player = req.player;

  if (!resourceType || !amount || !pricePerUnit) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const qty = parseInt(amount);
  const price = parseFloat(pricePerUnit);

  if (qty <= 0 || price <= 0) return res.status(400).json({ error: 'Valores inválidos' });

  const available = player.warehouse[resourceType] || 0;
  if (available < qty) {
    return res.status(400).json({ error: `No tienes suficiente ${resourceType} en tu almacén` });
  }

  // Remove from warehouse
  player.warehouse[resourceType] -= qty;
  if (player.warehouse[resourceType] <= 0) delete player.warehouse[resourceType];

  const listing = {
    id: uuidv4(),
    sellerId: player.id,
    resourceType,
    amount: qty,
    pricePerUnit: price,
    totalPrice: qty * price,
    createdAt: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };

  const market = db.getMarket();
  if (!market.listings) market.listings = [];
  market.listings.push(listing);
  market.lastUpdated = Date.now();

  db.saveMarket(market);
  db.savePlayer(player);

  res.json({ success: true, listing, message: `Publicaste ${qty} ${resourceType} en el mercado` });
});

// POST /api/market/buy - buy a listing
router.post('/buy', authMiddleware, (req, res) => {
  const { listingId, amount } = req.body;
  const buyer = req.player;

  const market = db.getMarket();
  const listingIdx = market.listings.findIndex(l => l.id === listingId);

  if (listingIdx === -1) return res.status(404).json({ error: 'Oferta no encontrada' });

  const listing = market.listings[listingIdx];

  if (listing.sellerId === buyer.id) {
    return res.status(400).json({ error: 'No puedes comprarte a ti mismo' });
  }

  const qty = Math.min(parseInt(amount || listing.amount), listing.amount);
  const totalCost = qty * listing.pricePerUnit;
  const fee = Math.floor(totalCost * MARKET_FEE);
  const totalWithFee = totalCost + fee;

  if (buyer.money < totalWithFee) {
    return res.status(400).json({ error: `Necesitas $${totalWithFee} (incluye ${Math.floor(MARKET_FEE * 100)}% comisión)` });
  }

  // Check buyer warehouse
  const currentWarehouse = Object.values(buyer.warehouse).reduce((a, b) => a + b, 0);
  if (currentWarehouse + qty > buyer.warehouseLimit) {
    return res.status(400).json({ error: 'Almacén personal lleno' });
  }

  // Transfer resources
  buyer.money -= totalWithFee;
  if (!buyer.warehouse[listing.resourceType]) buyer.warehouse[listing.resourceType] = 0;
  buyer.warehouse[listing.resourceType] += qty;

  // Pay seller
  const seller = db.getPlayer(listing.sellerId);
  if (seller) {
    seller.money += totalCost;
    db.savePlayer(seller);
  }

  // Update listing
  listing.amount -= qty;
  if (listing.amount <= 0) {
    market.listings.splice(listingIdx, 1);
  }

  db.saveMarket(market);
  db.savePlayer(buyer);

  // Log transaction
  db.addTransaction({
    id: uuidv4m(),
    type: 'market_buy',
    fromId: buyer.id,
    toId: listing.sellerId,
    fromNickname: buyer.nickname,
    toNickname: listing.sellerNickname || '?',
    amount: totalWithFee,
    fee,
    currency: 'money',
    resource: listing.resourceType,
    description: `Compra: ${qty} ${listing.resourceType} a $${listing.pricePerUnit}/u`,
    timestamp: Date.now()
  });

  // Update price history
  if (!market.priceHistory) market.priceHistory = {};
  if (!market.priceHistory[listing.resourceType]) market.priceHistory[listing.resourceType] = [];
  market.priceHistory[listing.resourceType].push({ price: listing.pricePerUnit, timestamp: Date.now() });
  if (market.priceHistory[listing.resourceType].length > 50) {
    market.priceHistory[listing.resourceType] = market.priceHistory[listing.resourceType].slice(-50);
  }
  db.saveMarket(market);

  res.json({
    success: true,
    message: `Compraste ${qty} ${listing.resourceType} por $${totalWithFee}`,
    bought: qty,
    totalPaid: totalWithFee
  });
});

// DELETE /api/market/cancel/:listingId - cancel own listing
router.delete('/cancel/:listingId', authMiddleware, (req, res) => {
  const player = req.player;
  const market = db.getMarket();

  const listingIdx = market.listings.findIndex(l => l.id === req.params.listingId && l.sellerId === player.id);
  if (listingIdx === -1) return res.status(404).json({ error: 'Oferta no encontrada o no es tuya' });

  const listing = market.listings[listingIdx];

  // Return to warehouse
  if (!player.warehouse[listing.resourceType]) player.warehouse[listing.resourceType] = 0;
  player.warehouse[listing.resourceType] += listing.amount;

  market.listings.splice(listingIdx, 1);
  db.saveMarket(market);
  db.savePlayer(player);

  res.json({ success: true, message: 'Oferta cancelada, recursos devueltos al almacén' });
});

// GET /api/market/prices - price history
router.get('/prices', authMiddleware, (req, res) => {
  const market = db.getMarket();
  res.json({ priceHistory: market.priceHistory || {} });
});

module.exports = router;

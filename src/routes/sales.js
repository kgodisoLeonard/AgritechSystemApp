'use strict';

const express = require('express');

function salesRouter(db) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { farmerId, item, amount, quantity, latitude, longitude } = req.body || {};
    if (!farmerId || !item || amount === undefined) {
      return res.status(400).json({ error: 'farmerId, item and amount are required' });
    }
    const result = db
      .prepare(
        `INSERT INTO sales (farmer_id, item, amount, quantity, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(farmerId, item, amount, quantity || null, latitude || null, longitude || null);
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(sale);
  });

  router.get('/', (req, res) => {
    const { farmerId } = req.query;
    const sales = farmerId
      ? db.prepare('SELECT * FROM sales WHERE farmer_id = ? ORDER BY recorded_at DESC').all(farmerId)
      : db.prepare('SELECT * FROM sales ORDER BY recorded_at DESC').all();
    res.json(sales);
  });

  return router;
}

module.exports = salesRouter;

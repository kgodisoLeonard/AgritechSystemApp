'use strict';

const express = require('express');

function expensesRouter(db) {
  const router = express.Router();

  // Farmers log expenses (including buying an input normally from anywhere).
  router.post('/', (req, res) => {
    const { farmerId, item, category, amount, quantity, latitude, longitude, supplierId } =
      req.body || {};
    if (!farmerId || !item || amount === undefined) {
      return res.status(400).json({ error: 'farmerId, item and amount are required' });
    }
    const result = db
      .prepare(
        `INSERT INTO expenses (farmer_id, item, category, amount, quantity, latitude, longitude, supplier_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        farmerId,
        item,
        category || null,
        amount,
        quantity || null,
        latitude || null,
        longitude || null,
        supplierId || null
      );
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(expense);
  });

  router.get('/', (req, res) => {
    const { farmerId } = req.query;
    const expenses = farmerId
      ? db.prepare('SELECT * FROM expenses WHERE farmer_id = ? ORDER BY recorded_at DESC').all(farmerId)
      : db.prepare('SELECT * FROM expenses ORDER BY recorded_at DESC').all();
    res.json(expenses);
  });

  return router;
}

module.exports = expensesRouter;

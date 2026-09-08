'use strict';

const express = require('express');

function farmersRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const farmers = db.prepare('SELECT * FROM farmers ORDER BY id').all();
    res.json(farmers);
  });

  router.post('/', (req, res) => {
    const { name, phone, latitude, longitude } = req.body || {};
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'name, latitude and longitude are required' });
    }
    const result = db
      .prepare('INSERT INTO farmers (name, phone, latitude, longitude) VALUES (?, ?, ?, ?)')
      .run(name, phone || null, latitude, longitude);
    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(farmer);
  });

  router.get('/:id', (req, res) => {
    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
    if (!farmer) return res.status(404).json({ error: 'farmer not found' });
    res.json(farmer);
  });

  router.get('/:id/summary', (req, res) => {
    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(req.params.id);
    if (!farmer) return res.status(404).json({ error: 'farmer not found' });

    const totalExpenses =
      db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE farmer_id = ?').get(req.params.id)
        .total || 0;
    const totalSales =
      db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM sales WHERE farmer_id = ?').get(req.params.id)
        .total || 0;

    res.json({
      farmer,
      totalExpenses,
      totalSales,
      profit: totalSales - totalExpenses,
    });
  });

  return router;
}

module.exports = farmersRouter;

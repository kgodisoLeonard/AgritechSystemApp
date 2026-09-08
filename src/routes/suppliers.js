'use strict';

const express = require('express');

function suppliersRouter(db) {
  const router = express.Router();

  // Suppliers are manually onboarded (researched local agri-stores/co-ops).
  router.post('/', (req, res) => {
    const { name, contact, latitude, longitude, notes } = req.body || {};
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'name, latitude and longitude are required' });
    }
    const result = db
      .prepare(
        'INSERT INTO suppliers (name, contact, latitude, longitude, notes) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name, contact || null, latitude, longitude, notes || null);
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(supplier);
  });

  router.get('/', (req, res) => {
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY id').all();
    res.json(suppliers);
  });

  router.get('/:id', (req, res) => {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'supplier not found' });
    const products = db.prepare('SELECT * FROM products WHERE supplier_id = ?').all(req.params.id);
    res.json({ ...supplier, products });
  });

  // Simple listing: suppliers add the products/inputs they stock.
  router.post('/:id/products', (req, res) => {
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'supplier not found' });

    const { name, unitPrice, bulkMinQuantity, bulkPrice } = req.body || {};
    if (!name || unitPrice === undefined) {
      return res.status(400).json({ error: 'name and unitPrice are required' });
    }
    const result = db
      .prepare(
        `INSERT INTO products (supplier_id, name, unit_price, bulk_min_quantity, bulk_price)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(req.params.id, name, unitPrice, bulkMinQuantity || null, bulkPrice || null);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  });

  // Notifications received when a group order forms nearby.
  router.get('/:id/notifications', (req, res) => {
    const notifications = db
      .prepare('SELECT * FROM notifications WHERE supplier_id = ? ORDER BY created_at DESC')
      .all(req.params.id);
    res.json(notifications);
  });

  return router;
}

module.exports = suppliersRouter;

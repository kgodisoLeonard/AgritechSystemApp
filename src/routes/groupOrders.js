'use strict';

const express = require('express');
const matching = require('../services/matching');

function groupOrdersRouter(db) {
  const router = express.Router();

  // Runs the matching engine for an item and forms group orders out of any
  // clusters of nearby farmers who qualify (>= minGroupSize).
  router.post('/match', (req, res) => {
    const { item, windowDays, radiusKm, minGroupSize } = req.body || {};
    if (!item) return res.status(400).json({ error: 'item is required' });

    const groups = matching.suggestGroups(db, { item, windowDays, radiusKm, minGroupSize });
    const created = groups.map((cluster) =>
      matching.createGroupOrderFromCluster(db, cluster, { radiusKm })
    );

    res.status(201).json({ groupsFormed: created.length, groupOrders: created });
  });

  router.get('/', (req, res) => {
    const groupOrders = db.prepare('SELECT * FROM group_orders ORDER BY id DESC').all();
    res.json(groupOrders);
  });

  router.get('/:id', (req, res) => {
    const groupOrder = db.prepare('SELECT * FROM group_orders WHERE id = ?').get(req.params.id);
    if (!groupOrder) return res.status(404).json({ error: 'group order not found' });
    const members = db
      .prepare('SELECT * FROM group_order_members WHERE group_order_id = ?')
      .all(req.params.id);
    res.json({ ...groupOrder, members });
  });

  // A farmer joins an existing (forming) group order to unlock bulk pricing.
  router.post('/:id/join', (req, res) => {
    const groupOrder = db.prepare('SELECT * FROM group_orders WHERE id = ?').get(req.params.id);
    if (!groupOrder) return res.status(404).json({ error: 'group order not found' });

    const { farmerId, quantity } = req.body || {};
    if (!farmerId) return res.status(400).json({ error: 'farmerId is required' });

    const farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId);
    if (!farmer) return res.status(404).json({ error: 'farmer not found' });

    db.prepare(
      'INSERT OR IGNORE INTO group_order_members (group_order_id, farmer_id, quantity) VALUES (?, ?, ?)'
    ).run(req.params.id, farmerId, quantity || null);

    const members = db
      .prepare('SELECT * FROM group_order_members WHERE group_order_id = ?')
      .all(req.params.id);
    res.status(200).json({ ...groupOrder, members });
  });

  return router;
}

module.exports = groupOrdersRouter;

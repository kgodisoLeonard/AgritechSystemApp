'use strict';

const { createDatabase } = require('../src/db');
const matching = require('../src/services/matching');

function seedFarmer(db, name, lat, lon) {
  return db
    .prepare('INSERT INTO farmers (name, latitude, longitude) VALUES (?, ?, ?)')
    .run(name, lat, lon).lastInsertRowid;
}

function seedExpense(db, farmerId, item, lat, lon, amount = 100) {
  return db
    .prepare(
      'INSERT INTO expenses (farmer_id, item, amount, latitude, longitude) VALUES (?, ?, ?, ?, ?)'
    )
    .run(farmerId, item, amount, lat, lon).lastInsertRowid;
}

describe('matching service', () => {
  let db;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  test('groups nearby farmers buying the same input', () => {
    const f1 = seedFarmer(db, 'Alice', -1.2921, 36.8219); // Nairobi
    const f2 = seedFarmer(db, 'Bob', -1.3, 36.83); // ~1km from Alice
    const f3 = seedFarmer(db, 'Carol', 40.7128, -74.006); // New York, far away

    seedExpense(db, f1, 'Fertilizer', -1.2921, 36.8219);
    seedExpense(db, f2, 'Fertilizer', -1.3, 36.83);
    seedExpense(db, f3, 'Fertilizer', 40.7128, -74.006);

    const groups = matching.suggestGroups(db, {
      item: 'Fertilizer',
      radiusKm: 15,
      minGroupSize: 2,
    });

    expect(groups).toHaveLength(1);
    const farmerIds = groups[0].members.map((m) => m.farmerId).sort();
    expect(farmerIds).toEqual([f1, f2].sort());
  });

  test('does not group farmers who are farther than the radius apart', () => {
    const f1 = seedFarmer(db, 'Alice', -1.2921, 36.8219);
    const f2 = seedFarmer(db, 'Distant', -1.9, 37.5); // ~100km away

    seedExpense(db, f1, 'Seed', -1.2921, 36.8219);
    seedExpense(db, f2, 'Seed', -1.9, 37.5);

    const groups = matching.suggestGroups(db, { item: 'Seed', radiusKm: 15, minGroupSize: 2 });
    expect(groups).toHaveLength(0);
  });

  test('ignores expenses outside the matching time window', () => {
    const f1 = seedFarmer(db, 'Alice', -1.2921, 36.8219);
    const f2 = seedFarmer(db, 'Bob', -1.3, 36.83);

    seedExpense(db, f1, 'Pesticide', -1.2921, 36.8219);
    const oldExpenseId = seedExpense(db, f2, 'Pesticide', -1.3, 36.83);
    db.prepare("UPDATE expenses SET recorded_at = datetime('now', '-60 days') WHERE id = ?").run(
      oldExpenseId
    );

    const groups = matching.suggestGroups(db, {
      item: 'Pesticide',
      windowDays: 14,
      radiusKm: 15,
      minGroupSize: 2,
    });
    expect(groups).toHaveLength(0);
  });

  test('creates a group order and notifies the nearest matching supplier', () => {
    const f1 = seedFarmer(db, 'Alice', -1.2921, 36.8219);
    const f2 = seedFarmer(db, 'Bob', -1.3, 36.83);
    seedExpense(db, f1, 'Fertilizer', -1.2921, 36.8219);
    seedExpense(db, f2, 'Fertilizer', -1.3, 36.83);

    const supplierId = db
      .prepare('INSERT INTO suppliers (name, latitude, longitude) VALUES (?, ?, ?)')
      .run('Nairobi Agri Co-op', -1.295, 36.825).lastInsertRowid;
    db.prepare(
      'INSERT INTO products (supplier_id, name, unit_price, bulk_min_quantity, bulk_price) VALUES (?, ?, ?, ?, ?)'
    ).run(supplierId, 'Fertilizer', 50, 10, 40);

    const groups = matching.suggestGroups(db, { item: 'Fertilizer', radiusKm: 15, minGroupSize: 2 });
    expect(groups).toHaveLength(1);

    const { groupOrderId, supplier } = matching.createGroupOrderFromCluster(db, groups[0]);
    expect(supplier.id).toBe(supplierId);

    const members = db
      .prepare('SELECT * FROM group_order_members WHERE group_order_id = ?')
      .all(groupOrderId);
    expect(members).toHaveLength(2);

    const notifications = db
      .prepare('SELECT * FROM notifications WHERE supplier_id = ?')
      .all(supplierId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toMatch(/Fertilizer/);
  });
});

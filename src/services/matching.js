'use strict';

const { distanceKm } = require('./geo');

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_RADIUS_KM = 15;
const DEFAULT_MIN_GROUP_SIZE = 2;

/**
 * Spending-pattern matching engine.
 *
 * This is a rule-based heuristic that stands in for a more advanced ML model:
 * it looks at recent expenses for a given input/item, groups farmers who
 * logged that purchase within the same time window, and clusters them by
 * geographic proximity. Clusters that reach the minimum group size become
 * candidate group orders that unlock bulk pricing.
 */
function findRecentExpensesByItem(db, item, windowDays = DEFAULT_WINDOW_DAYS) {
  return db
    .prepare(
      `SELECT e.id, e.farmer_id, e.item, e.amount, e.quantity, e.latitude, e.longitude, e.recorded_at
       FROM expenses e
       WHERE e.item = ?
         AND e.latitude IS NOT NULL
         AND e.longitude IS NOT NULL
         AND e.recorded_at >= datetime('now', ?)
       ORDER BY e.recorded_at DESC`
    )
    .all(item, `-${windowDays} days`);
}

/**
 * Greedily clusters expenses so that every pair of farmers within a cluster
 * is within radiusKm of at least one other member (single-linkage clustering).
 * Only the most recent expense per farmer is considered.
 */
function clusterByProximity(expenses, radiusKm = DEFAULT_RADIUS_KM) {
  const latestByFarmer = new Map();
  for (const expense of expenses) {
    if (!latestByFarmer.has(expense.farmer_id)) {
      latestByFarmer.set(expense.farmer_id, expense);
    }
  }
  const points = Array.from(latestByFarmer.values());
  const visited = new Set();
  const clusters = [];

  for (const point of points) {
    if (visited.has(point.farmer_id)) continue;
    const cluster = [point];
    visited.add(point.farmer_id);

    let frontier = [point];
    while (frontier.length > 0) {
      const next = [];
      for (const anchor of frontier) {
        for (const candidate of points) {
          if (visited.has(candidate.farmer_id)) continue;
          const dist = distanceKm(
            anchor.latitude,
            anchor.longitude,
            candidate.latitude,
            candidate.longitude
          );
          if (dist <= radiusKm) {
            visited.add(candidate.farmer_id);
            cluster.push(candidate);
            next.push(candidate);
          }
        }
      }
      frontier = next;
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Finds groups of nearby farmers who purchased the same input around the
 * same time, large enough to justify forming a group order.
 */
function suggestGroups(db, options = {}) {
  const {
    item,
    windowDays = DEFAULT_WINDOW_DAYS,
    radiusKm = DEFAULT_RADIUS_KM,
    minGroupSize = DEFAULT_MIN_GROUP_SIZE,
  } = options;

  if (!item) {
    throw new Error('item is required to suggest groups');
  }

  const expenses = findRecentExpensesByItem(db, item, windowDays);
  const clusters = clusterByProximity(expenses, radiusKm);

  return clusters
    .filter((cluster) => cluster.length >= minGroupSize)
    .map((cluster) => ({
      item,
      members: cluster.map((expense) => ({
        farmerId: expense.farmer_id,
        quantity: expense.quantity,
        latitude: expense.latitude,
        longitude: expense.longitude,
        recordedAt: expense.recorded_at,
      })),
    }));
}

/**
 * Finds the nearest supplier that stocks the given item, within radiusKm of
 * the given centroid coordinates.
 */
function findNearestSupplierForItem(db, item, latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) {
  const suppliers = db
    .prepare(
      `SELECT s.id, s.name, s.latitude, s.longitude
       FROM suppliers s
       JOIN products p ON p.supplier_id = s.id
       WHERE p.name = ?`
    )
    .all(item);

  let nearest = null;
  let nearestDistance = Infinity;
  for (const supplier of suppliers) {
    const dist = distanceKm(latitude, longitude, supplier.latitude, supplier.longitude);
    if (dist <= radiusKm && dist < nearestDistance) {
      nearest = supplier;
      nearestDistance = dist;
    }
  }
  return nearest;
}

function centroidOf(members) {
  const total = members.length;
  const lat = members.reduce((sum, m) => sum + m.latitude, 0) / total;
  const lon = members.reduce((sum, m) => sum + m.longitude, 0) / total;
  return { latitude: lat, longitude: lon };
}

/**
 * Persists a candidate group (from suggestGroups) as a group order, enrolling
 * each matched farmer as a member, matching the nearest supplier that stocks
 * the item, and queuing a notification for that supplier.
 */
function createGroupOrderFromCluster(db, cluster, { radiusKm = DEFAULT_RADIUS_KM } = {}) {
  const { latitude, longitude } = centroidOf(cluster.members);
  const supplier = findNearestSupplierForItem(db, cluster.item, latitude, longitude, radiusKm);

  const insertGroupOrder = db.prepare(
    `INSERT INTO group_orders (item, supplier_id, status) VALUES (?, ?, ?)`
  );
  const result = insertGroupOrder.run(cluster.item, supplier ? supplier.id : null, supplier ? 'matched' : 'forming');
  const groupOrderId = result.lastInsertRowid;

  const insertMember = db.prepare(
    `INSERT OR IGNORE INTO group_order_members (group_order_id, farmer_id, quantity) VALUES (?, ?, ?)`
  );
  for (const member of cluster.members) {
    insertMember.run(groupOrderId, member.farmerId, member.quantity || null);
  }

  if (supplier) {
    db.prepare(
      `INSERT INTO notifications (supplier_id, group_order_id, message) VALUES (?, ?, ?)`
    ).run(
      supplier.id,
      groupOrderId,
      `A group order for "${cluster.item}" has formed near you with ${cluster.members.length} farmer(s). Bulk pricing may apply.`
    );
  }

  return { groupOrderId, supplier };
}

module.exports = {
  findRecentExpensesByItem,
  clusterByProximity,
  suggestGroups,
  findNearestSupplierForItem,
  createGroupOrderFromCluster,
  DEFAULT_WINDOW_DAYS,
  DEFAULT_RADIUS_KM,
  DEFAULT_MIN_GROUP_SIZE,
};

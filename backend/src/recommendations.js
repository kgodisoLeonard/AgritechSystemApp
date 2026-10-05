import { query } from './db.js';
import { kmeans } from './kmeans.js';

// Maps a farmer's dominant expense category to keywords we'd expect to find
// in a supplier's product name, so a cluster of farmers who mostly spend on
// (say) fertilizer can be matched to a real open "NPK Fertilizer 50kg" group
// order rather than a generic/unrelated one.
const CATEGORY_KEYWORDS = {
  fertilizer: ['fertil', 'lan', 'npk', 'compost'],
  fertiliser: ['fertil', 'lan', 'npk', 'compost'],
  seed: ['seed'],
  seeds: ['seed'],
  pesticide: ['pesticide', 'herbicide', 'spray', 'insecticide'],
  equipment: ['equipment', 'tool', 'tractor', 'irrigation'],
  feed: ['feed'],
  fuel: ['fuel', 'diesel'],
};

function keywordsFor(category) {
  const key = (category || '').trim().toLowerCase();
  return CATEGORY_KEYWORDS[key] || (key ? [key] : []);
}

/**
 * Clusters all farmers by the shape of their expense spending (which
 * categories they spend on, relative to their own total) using k-means,
 * then recommends any open group order whose product matches the dominant
 * category of a farmer's cluster. Writes real rows into ai_recommendations
 * (via the existing add_recommendation() SQL function) so the "AI insights"
 * panel and group-buying matches reflect a genuine computed clustering,
 * not static or random copy.
 *
 * Safe to call repeatedly: it skips farmer/group-order pairs that already
 * have a recommendation, so re-running it is idempotent.
 */
export async function generateRecommendations() {
  const farmersResult = await query('SELECT id, name, location FROM farmers');
  const farmers = farmersResult.rows;
  if (farmers.length < 2) return { clustered: 0, created: 0 };

  const expenseTotals = await query(`
    SELECT farmer_id, category, SUM(amount) AS total
    FROM expenses
    WHERE category IS NOT NULL AND category <> ''
    GROUP BY farmer_id, category
  `);

  const byFarmer = new Map();
  const categorySet = new Set();
  for (const row of expenseTotals.rows) {
    const cat = row.category.trim().toLowerCase();
    categorySet.add(cat);
    if (!byFarmer.has(row.farmer_id)) byFarmer.set(row.farmer_id, new Map());
    byFarmer.get(row.farmer_id).set(cat, Number(row.total));
  }

  const categories = [...categorySet];
  const farmersWithSpend = farmers.filter((f) => byFarmer.has(f.id));
  if (farmersWithSpend.length < 2 || categories.length === 0) return { clustered: 0, created: 0 };

  // Feature vector per farmer: share of total expense spend in each known
  // category, so farmers are grouped by *what kind* of input they buy, not
  // by how much money they have.
  const vectors = farmersWithSpend.map((f) => {
    const totals = byFarmer.get(f.id);
    const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
    return categories.map((c) => (totals.get(c) || 0) / sum);
  });

  const k = Math.min(4, Math.max(1, Math.floor(farmersWithSpend.length / 2)));
  const { assignments, centroids } = kmeans(vectors, k);

  const openOrders = await query(`
    SELECT go.id, go.product_id, go.discount_rate, sp.product_name,
           s.name AS supplier_name, s.location AS supplier_location
    FROM group_orders go
    JOIN supplier_products sp ON sp.id = go.product_id
    JOIN suppliers s ON s.id = go.supplier_id
    WHERE go.status = 'open'
  `);

  const existingResult = await query('SELECT farmer_id, suggested_group_order_id FROM ai_recommendations');
  const existing = new Set(existingResult.rows.map((r) => `${r.farmer_id}:${r.suggested_group_order_id}`));

  const clusterSizes = new Map();
  assignments.forEach((c) => clusterSizes.set(c, (clusterSizes.get(c) || 0) + 1));

  let created = 0;
  for (let i = 0; i < farmersWithSpend.length; i++) {
    const farmer = farmersWithSpend[i];
    const clusterIndex = assignments[i];
    const centroid = centroids[clusterIndex];
    const dominantIdx = centroid.indexOf(Math.max(...centroid));
    const dominantCategory = categories[dominantIdx];
    const peers = clusterSizes.get(clusterIndex) - 1;
    if (peers < 1) continue; // need at least one other farmer in the cluster to call it a match

    const keywords = keywordsFor(dominantCategory);
    if (!keywords.length) continue;

    for (const order of openOrders.rows) {
      const key = `${farmer.id}:${order.id}`;
      if (existing.has(key)) continue;
      const productName = order.product_name.toLowerCase();
      if (!keywords.some((kw) => productName.includes(kw))) continue;

      const discount = order.discount_rate ? Number(order.discount_rate) : 0;
      const reason = `Clustered with ${peers} other farmer${peers === 1 ? '' : 's'} who also spend mostly on `
        + `${dominantCategory} \u2014 join the ${order.product_name} pool from ${order.supplier_name}`
        + `${discount ? ` for ${discount}% off` : ''}.`;

      await query('SELECT add_recommendation($1, $2, $3, $4)', [farmer.id, order.product_id, order.id, reason]);
      existing.add(key);
      created += 1;
    }
  }

  return { clustered: farmersWithSpend.length, created };
}

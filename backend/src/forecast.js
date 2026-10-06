import { query } from './db.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Best-effort call to the standalone PyTorch ml-service for a second,
// independent forecast. Never throws - if the service is unreachable or
// slow, callers fall back to the OLS forecast computed below so the loan
// readiness endpoint's core behavior never depends on this extra service.
async function getMlForecast(history) {
  if (history.length < 2) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.forecastNextMonth ?? null;
  } catch {
    return null;
  }
}

// Simple ordinary-least-squares linear regression: given y values indexed
// 0..n-1, returns { slope, intercept } for the best-fit line through them.
function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Builds a genuine profit forecast + loan-readiness score for a farmer from
 * their real monthly expense/income history, instead of the simple
 * "count the good months" heuristic the frontend used on its own:
 *  - a least-squares trend line over monthly profit to predict next month
 *  - a consistency component based on how volatile monthly profit is
 *  - a record-depth component (lenders want ~6 months of history)
 */
export async function getLoanReadiness(farmerId) {
  const monthsResult = await query(
    `SELECT month, SUM(income) AS income, SUM(expense) AS expense FROM (
       SELECT date_trunc('month', date) AS month, amount AS income, 0 AS expense FROM income WHERE farmer_id = $1
       UNION ALL
       SELECT date_trunc('month', date) AS month, 0 AS income, amount AS expense FROM expenses WHERE farmer_id = $1
     ) combined
     GROUP BY month
     ORDER BY month ASC`,
    [farmerId]
  );

  const rows = monthsResult.rows.map((r) => ({
    month: r.month,
    profit: Number(r.income) - Number(r.expense),
  }));

  if (rows.length === 0) {
    return {
      history: [],
      forecastNextMonth: 0,
      mlForecastNextMonth: null,
      trend: 'flat',
      score: 0,
      label: 'Keep logging',
      monthsRecorded: 0,
      profitableMonths: 0,
    };
  }

  const profits = rows.map((r) => r.profit);
  const { slope, intercept } = linearRegression(profits);
  const forecastNextMonth = Math.round(intercept + slope * profits.length);
  const trend = slope > 1 ? 'up' : slope < -1 ? 'down' : 'flat';

  const profitableMonths = profits.filter((p) => p > 0).length;
  const monthsRecorded = rows.length;

  // Consistency: lower volatility relative to average spend is better.
  // Expressed as 0-1 (1 = very steady), used to temper the score when a
  // farmer's numbers swing wildly month to month.
  const avgAbsProfit = profits.reduce((a, b) => a + Math.abs(b), 0) / profits.length || 1;
  const volatility = stdDev(profits) / avgAbsProfit;
  const consistency = Math.max(0, 1 - Math.min(volatility, 1));

  const depthScore = Math.min(monthsRecorded / 6, 1) * 40; // up to 40 pts for 6+ months of records
  const profitabilityScore = (profitableMonths / monthsRecorded) * 35; // up to 35 pts
  const trendScore = (trend === 'up' ? 1 : trend === 'flat' ? 0.5 : 0.15) * 15; // up to 15 pts
  const consistencyScore = consistency * 10; // up to 10 pts

  const score = Math.round(Math.min(100, depthScore + profitabilityScore + trendScore + consistencyScore));
  const label = score >= 80 ? 'Ready to show a lender' : score >= 50 ? 'Getting there' : 'Keep logging';

  const mlForecastNextMonth = await getMlForecast(profits);

  return {
    history: rows.map((r) => ({ month: r.month, profit: Math.round(r.profit) })),
    forecastNextMonth,
    mlForecastNextMonth,
    trend,
    score,
    label,
    monthsRecorded,
    profitableMonths,
  };
}

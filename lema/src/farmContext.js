export function buildFarmContext(entries) {
  const valid = (entries || []).filter((e) =>
    ['sale', 'expense'].includes(e.type) && e.amount != null &&
    Number.isFinite(Number(e.amount)) && Number(e.amount) >= 0);
  if (!valid.length) return undefined;
  let sales = 0;
  let expenses = 0;
  const categories = new Map();
  for (const entry of valid) {
    const amount = Number(entry.amount);
    if (entry.type === 'sale') sales += amount;
    else {
      expenses += amount;
      const category = entry.category || 'general';
      categories.set(category, (categories.get(category) || 0) + amount);
    }
  }
  const money = (value) => value.toFixed(2);
  const parts = [`Supplied ledger records (${valid.length} entries, not necessarily a complete period): R${money(sales)} in sales, R${money(expenses)} in expenses, profit R${money(sales - expenses)}.`];
  const top = [...categories].sort((a, b) => b[1] - a[1])[0];
  if (top) parts.push(`Biggest expense category in these records: ${top[0]} (R${money(top[1])}).`);
  return parts.join(' ');
}

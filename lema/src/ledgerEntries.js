export function normalizeLedgerEntry(record, type) {
  const raw = record.amount;
  const numeric = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
  const amount = numeric ? Number(raw) : NaN;
  return { ...record, type, amount: Number.isFinite(amount) && amount >= 0 ? amount : NaN };
}

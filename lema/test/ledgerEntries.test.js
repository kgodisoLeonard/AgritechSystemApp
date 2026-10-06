import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLedgerEntry } from '../src/ledgerEntries.js';

test('database decimal strings add numerically for expenses, sales and profit', () => {
  const expenses = ['100.00', '50.50'].map((amount) => normalizeLedgerEntry({ amount }, 'expense'));
  const income = ['200.00', '25.50'].map((amount) => normalizeLedgerEntry({ amount }, 'sale'));
  const sum = (entries) => entries.reduce((total, entry) => total + entry.amount, 0);
  assert.equal(sum(expenses), 150.5);
  assert.equal(sum(income), 225.5);
  assert.equal(sum(income) - sum(expenses), 75);
});

test('newly saved entries use the same numeric representation without altering records', () => {
  const record = { id: '1', amount: '12.50', date: '2026-10-07', item: 'Seed' };
  const normalized = normalizeLedgerEntry(record, 'expense');
  assert.equal(normalized.amount, 12.5);
  assert.equal(normalized.item, 'Seed');
  assert.equal(record.amount, '12.50');
  assert.equal(normalizeLedgerEntry({ amount: 0 }, 'expense').amount, 0);
});

test('invalid or missing amounts remain unknown rather than becoming zero', () => {
  for (const amount of [undefined, null, '', ' ', 'invalid', 'Infinity', Infinity, -1, true]) {
    assert.ok(Number.isNaN(normalizeLedgerEntry({ amount }, 'expense').amount));
  }
});

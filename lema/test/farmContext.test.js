import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmContext } from '../src/farmContext.js';

test('does not invent a period or concatenate database numeric strings', () => {
  const context = buildFarmContext([
    { type: 'sale', amount: '1000', month: 'Jan' },
    { type: 'sale', amount: '200', month: 'Dec' },
    { type: 'expense', amount: '300', category: 'seed' },
    { type: 'expense', amount: 100, category: 'seed' },
  ]);
  assert.match(context, /R1200\.00 in sales, R400\.00 in expenses, profit R800\.00/);
  assert.match(context, /seed \(R400\.00\)/);
  assert.doesNotMatch(context, /last.*month/);
});

test('missing or invalid ledger data stays unknown', () => {
  assert.equal(buildFarmContext([]), undefined);
  assert.equal(buildFarmContext([{ type: 'expense', amount: 'invalid' }]), undefined);
});

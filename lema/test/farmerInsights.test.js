import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownBuyingGroup, hasRecordedActivity, matchReason, spendingAlert } from '../src/farmerInsights.js';

test('finds the signed-in farmers group and excludes them from the count', () => {
  const data = { clusters: [
    { clusterId: 0, farmers: [{ farmer: { farmerId: 'other' } }] },
    { clusterId: 2, farmers: [{ farmer: { farmerId: 7 } }, { farmer: { farmerId: '8' } }] },
  ] };
  assert.equal(ownBuyingGroup(data, '7').others, 1);
  assert.equal(ownBuyingGroup(data, 'missing'), null);
  assert.equal(ownBuyingGroup(data, null), null);
});

test('does not present zero recorded activity as a useful match', () => {
  assert.equal(hasRecordedActivity({ expenseCount: 0, orderCount: 0 }), false);
  assert.equal(hasRecordedActivity({ expenseCount: '1', orderCount: 0 }), true);
});

test('matching reasons do not promise geographic proximity', () => {
  assert.equal(matchReason('same location'), 'Same recorded area');
  assert.equal(matchReason('shared products or expense terms: maize'), 'Recorded items in common: maize');
});

test('alerts compare with other farmers rather than inventing a time trend', () => {
  const alert = spendingAlert({ type: 'expense_spike', metric: 'totalExpense', value: 2500, baseline: 800 });
  assert.equal(alert.title, 'Higher recorded expenses');
  assert.match(alert.comparison, /Average across farmers/);
  assert.match(alert.comparison, /2.?500/);
  assert.doesNotMatch(alert.comparison, /month|increase|previous/);
  const count = spendingAlert({ type: 'low_data_signal', metric: 'expenseCount', value: 1, baseline: 7 });
  assert.doesNotMatch(count.comparison, /R\s*1/);
  assert.match(count.action, /less reliable/);
});

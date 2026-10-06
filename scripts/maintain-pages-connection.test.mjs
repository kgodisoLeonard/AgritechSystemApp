import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceConnection } from './maintain-pages-connection.mjs';

const expected = [{ name: 'LEMA_API_URL', value: 'https://old/node/api' }, { name: 'LEMA_FINANCE_API_URL', value: 'https://old/fin/api' }];

test('preserves a concurrent backend URL change without publishing or deploying', async () => {
  const calls = [];
  const api = async (...args) => { calls.push(args); return { variables: [...expected.slice(0, 1), { name: 'LEMA_FINANCE_API_URL', value: 'https://other/fin/api' }] }; };
  assert.equal(await replaceConnection(api, expected, 'https://new'), false);
  assert.equal(calls.length, 1);
});

test('updates both endpoints before triggering Pages deployment', async () => {
  const calls = [];
  const api = async (...args) => { calls.push(args); return { variables: expected }; };
  assert.equal(await replaceConnection(api, expected, 'https://new'), true);
  assert.equal(calls.length, 4);
  assert.equal(calls[1][2].value, 'https://new/node/api');
  assert.equal(calls[2][2].value, 'https://new/fin/api');
  assert.equal(calls[3][1], 'POST');
  assert.deepEqual(calls[3][2], { ref: 'main' });
});

test('rolls back its endpoint updates if deployment cannot be triggered', async () => {
  const variables = structuredClone(expected);
  const api = async (path, method, body) => {
    if (!method) return { variables: structuredClone(variables) };
    if (method === 'POST') throw new Error('Deployment unavailable');
    const variable = variables.find((item) => item.name === body.name);
    variable.value = body.value;
  };
  await assert.rejects(replaceConnection(api, expected, 'https://new'), /Deployment unavailable/);
  assert.deepEqual(variables, expected);
});

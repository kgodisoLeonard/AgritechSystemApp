import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('health endpoint returns ok', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('farmers endpoint returns JSON array', async () => {
  const response = await request(app).get('/api/farmers');
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});

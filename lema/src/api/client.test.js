import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, financeApi, askAI } from './client.js';

test('chat uses the frontend proxy and preserves the Qwen response', async () => {
  assert.equal(api.defaults.baseURL, '/node/api');
  assert.equal(financeApi.defaults.baseURL, '/fin/api');
  financeApi.defaults.adapter = async (config) => {
    assert.equal(config.url, '/chat');
    assert.ok(config.timeout > 240000);
    assert.deepEqual(JSON.parse(config.data), { prompt: 'Hello', context: 'Farm expenses R100' });
    return { data: { model: 'qwen2.5:0.5b', response: 'Hello, farmer!' }, status: 200, config };
  };
  assert.deepEqual(await askAI('Hello', 'Farm expenses R100'), {
    data: { model: 'qwen2.5:0.5b', response: 'Hello, farmer!' }, error: null,
  });
});

test('chat rejects empty answers and HTML pages returned by incorrect routing', async () => {
  for (const data of [{ response: '  ' }, '<html>GitHub Pages</html>', null]) {
    financeApi.defaults.adapter = async (config) => ({ data, status: 200, config });
    const result = await askAI('Hello');
    assert.equal(result.data, null);
    assert.match(result.error, /empty reply/);
  }
});

test('chat exposes backend errors for the retry state', async () => {
  financeApi.defaults.adapter = async () => {
    throw { response: { data: { detail: 'Ollama is unavailable' } } };
  };
  assert.deepEqual(await askAI('Hello'), { data: null, error: 'Ollama is unavailable' });
});

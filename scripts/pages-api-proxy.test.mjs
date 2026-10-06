import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('chat bridge permits Pages chat, strips Origin, and denies data routes and other origins', async () => {
  const upstream = createServer(async (request, response) => {
    assert.equal(request.url, '/api/chat');
    assert.equal(request.headers.origin, undefined);
    let body = '';
    for await (const chunk of request) body += chunk;
    assert.equal(JSON.parse(body).prompt, 'Hello');
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ model: 'qwen2.5:0.5b', response: 'Hello, farmer!' }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const proxy = spawn(process.execPath, ['scripts/pages-api-proxy.mjs'], {
    env: { ...process.env, PORT: '8788', FINANCE_ORIGIN: `http://127.0.0.1:${upstream.address().port}`, ENABLE_DATA_API: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await Promise.race([
      once(proxy.stdout, 'data'),
      once(proxy, 'exit').then(([code]) => { throw new Error(`Proxy exited: ${code}`); }),
    ]);
    const url = 'http://127.0.0.1:8788/fin/api/chat';
    const origin = 'https://kgodisoleonard.github.io';
    const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    const reply = await fetch(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{"prompt":"Hello"}' });
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { model: 'qwen2.5:0.5b', response: 'Hello, farmer!' });
    assert.equal((await fetch(url, { method: 'POST', headers: { Origin: 'https://example.com' }, body: '{}' })).status, 403);
    assert.equal((await fetch('http://127.0.0.1:8788/fin/api/farmers')).status, 404);
    assert.equal((await fetch('http://127.0.0.1:8788/node/api/farmers')).status, 404);
    assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(32769) })).status, 413);
  } finally {
    proxy.kill();
    await once(proxy, 'exit');
    upstream.close();
    upstream.closeAllConnections();
  }
});

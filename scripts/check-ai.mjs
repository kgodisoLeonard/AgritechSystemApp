const url = process.env.AI_CHAT_URL || 'http://localhost/fin/api/chat';
const origin = process.env.AI_CHAT_ORIGIN;
if (origin) {
  const preflight = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
    signal: AbortSignal.timeout(10000),
  });
  const allowedOrigin = preflight.headers.get('access-control-allow-origin');
  if (!preflight.ok) {
    throw new Error(`AI endpoint preflight failed with HTTP ${preflight.status} at ${url}. Check that the HTTPS server or tunnel is running.`);
  }
  if (!['*', origin].includes(allowedOrigin)
      || !preflight.headers.get('access-control-allow-methods')?.split(',').some((method) => method.trim() === 'POST')
      || !preflight.headers.get('access-control-allow-headers')?.toLowerCase().split(',').some((header) => ['*', 'content-type'].includes(header.trim()))) {
    throw new Error(`AI API does not allow browser requests from ${origin}. Check backend CORS configuration.`);
  }
}
const result = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
  body: JSON.stringify({ prompt: 'Say hello to a farmer in one short sentence.' }),
  signal: AbortSignal.timeout(240000),
});
if (!result.ok) throw new Error(`AI chat failed with HTTP ${result.status} at ${url}`);
if (origin && !['*', origin].includes(result.headers.get('access-control-allow-origin'))) {
  throw new Error('AI reply is missing the CORS header required by GitHub Pages.');
}
const reply = await result.json();
if (typeof reply.response !== 'string' || !reply.response.trim()) {
  throw new Error('AI chat returned no answer.');
}
if (typeof reply.model !== 'string' || !/^qwen/i.test(reply.model)) {
  throw new Error(`Expected Qwen, received model ${reply.model || '(missing)'}.`);
}
console.log(`${reply.model}: ${reply.response.trim()}`);

const nodeApi = process.env.VITE_API_URL?.replace(/\/+$/, '');
const financeApi = process.env.VITE_FINANCE_API_URL?.replace(/\/+$/, '');
const origin = process.env.AI_CHAT_ORIGIN || 'https://kgodisoleonard.github.io';

for (const [name, value] of [['VITE_API_URL', nodeApi], ['VITE_FINANCE_API_URL', financeApi]]) {
  if (!value) throw new Error(`${name} is required.`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)) {
    throw new Error(`${name} must be a public HTTPS API URL.`);
  }
}

async function request(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
}

const health = await request(`${nodeApi}/health`);
if (!health.ok) throw new Error(`Node API health check failed with HTTP ${health.status}.`);
const healthBody = await health.json();
if (healthBody.status !== 'ok' || healthBody.database !== 'connected') {
  throw new Error('Node API is reachable but its database is not connected.');
}

for (const path of ['suppliers', 'products', 'group-orders', 'notifications']) {
  const response = await request(`${nodeApi}/${path}`);
  if (!response.ok) throw new Error(`Node API ${path} check failed with HTTP ${response.status}.`);
}

const loginUrl = `${financeApi}/farmers/login`;
const preflight = await request(loginUrl, {
  method: 'OPTIONS',
  headers: {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
  },
});
if (!preflight.ok || !['*', origin].includes(preflight.headers.get('access-control-allow-origin'))) {
  throw new Error(`Login API CORS preflight failed with HTTP ${preflight.status}.`);
}
const allowedMethods = preflight.headers.get('access-control-allow-methods')?.split(',').map((method) => method.trim());
const allowedHeaders = preflight.headers.get('access-control-allow-headers')?.toLowerCase().split(',').map((header) => header.trim());
if (!allowedMethods?.includes('POST') || !allowedHeaders?.some((header) => ['*', 'content-type'].includes(header))) {
  throw new Error('Login API CORS preflight does not allow POST with JSON.');
}

const login = await request(loginUrl, {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ contact: 'pages-health-check-invalid-user', password: 'invalid-password' }),
});
if (login.status !== 401) throw new Error(`Login API check expected HTTP 401 for an invalid user, received ${login.status}.`);
if (!['*', origin].includes(login.headers.get('access-control-allow-origin'))) {
  throw new Error('Login API response is missing the GitHub Pages CORS header.');
}

console.log('Node data APIs, database, login endpoint, and GitHub Pages CORS are responding.');

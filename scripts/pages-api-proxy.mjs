import { createServer } from 'node:http';

const origin = process.env.PAGES_ORIGIN || 'https://kgodisoleonard.github.io';
const port = Number(process.env.PORT || 8787);
const chatOnly = process.env.ENABLE_DATA_API !== 'true';
const services = [
  ['/fin/api', process.env.FINANCE_ORIGIN || 'http://localhost:8081'],
  ['/node/api', process.env.NODE_ORIGIN || 'http://localhost:3000'],
];
const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

createServer(async (request, response) => {
  response.setHeader('Vary', 'Origin');
  if (request.headers.origin && request.headers.origin !== origin) {
    response.writeHead(403).end();
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Max-Age', '600');
  const url = new URL(request.url, 'http://localhost');
  if (chatOnly && (url.pathname !== '/fin/api/chat' || !['POST', 'OPTIONS'].includes(request.method))) {
    response.writeHead(404).end();
    return;
  }
  const service = services.find(([prefix]) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  if (!service) {
    response.writeHead(404).end();
    return;
  }
  if (!methods.includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 32768) {
        response.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const [prefix, upstream] = service;
    const path = url.pathname.slice(prefix.indexOf('/api'));
    const target = new URL(upstream);
    target.pathname = path;
    target.search = url.search;
    // The browser's Origin is checked above; do not forward it to the local API.
    const result = await fetch(target, {
      method: request.method,
      headers: {
        'Content-Type': request.headers['content-type'] || 'application/json',
        ...(request.headers.authorization ? { Authorization: request.headers.authorization } : {}),
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.concat(chunks),
      signal: AbortSignal.timeout(240000),
      redirect: 'error',
    });
    const body = Buffer.from(await result.arrayBuffer());
    response.setHeader('Content-Type', result.headers.get('content-type') || 'application/json');
    response.writeHead(result.status).end(body);
  } catch (error) {
    response.setHeader('Content-Type', 'application/json');
    response.writeHead(error.name === 'TimeoutError' ? 504 : 502).end(JSON.stringify({
      message: 'The local API could not complete the request. Check that the API and Ollama are running.',
    }));
  }
}).listen(port, '127.0.0.1', () => console.log(`Pages API proxy listening at http://127.0.0.1:${port}`));

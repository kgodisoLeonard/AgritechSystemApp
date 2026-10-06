import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, appendFileSync, openSync, writeFileSync, readFileSync, unlinkSync, closeSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = join(root, '.pages-runtime');
const repo = process.env.PAGES_REPOSITORY || 'kgodisoLeonard/AgritechSystemApp';
const variablePath = `/repos/${repo}/actions/variables`;
const financeName = 'LEMA_FINANCE_API_URL';
const nodeName = 'LEMA_API_URL';
const log = (message) => appendFileSync(join(runtime, 'recovery.log'), `${new Date().toISOString()} ${message}\n`);

async function github(path, method = 'GET', body) {
  const raw = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
    cwd: root, timeout: 15000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const token = raw.split(/\r?\n/).find((line) => line.startsWith('password='))?.slice(9);
  if (!token) throw new Error('GitHub credential is unavailable.');
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GitHub ${method} failed: HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function replaceConnection(api, expected, base) {
  const current = (await api(variablePath)).variables;
  for (const name of [nodeName, financeName]) {
    if (current.find((item) => item.name === name)?.value !== expected.find((item) => item.name === name)?.value) return false;
  }
  const replacements = [[nodeName, '/node/api'], [financeName, '/fin/api']];
  try {
    for (const [name, path] of replacements) {
      await api(`${variablePath}/${name}`, 'PATCH', { name, value: `${base}${path}` });
    }
    await api(`/repos/${repo}/actions/workflows/deploy-pages.yml/dispatches`, 'POST', { ref: 'main' });
  } catch (error) {
    const latest = (await api(variablePath)).variables;
    for (const [name, path] of replacements) {
      if (latest.find((item) => item.name === name)?.value === `${base}${path}`) {
        await api(`${variablePath}/${name}`, 'PATCH', expected.find((item) => item.name === name));
      }
    }
    throw error;
  }
  return true;
}

async function healthy(variables) {
  try {
    const nodeApi = variables.find((item) => item.name === nodeName)?.value;
    const financeApi = variables.find((item) => item.name === financeName)?.value;
    if (!nodeApi || !financeApi) return false;
    const health = await fetch(`${nodeApi}/health`, { signal: AbortSignal.timeout(10000) });
    if (!health.ok || (await health.json()).database !== 'connected') return false;
    const login = await fetch(`${financeApi}/farmers/login`, {
      method: 'OPTIONS', headers: {
        Origin: 'https://kgodisoleonard.github.io',
        'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
      }, signal: AbortSignal.timeout(10000),
    });
    return login.ok && ['*', 'https://kgodisoleonard.github.io'].includes(login.headers.get('access-control-allow-origin'));
  } catch { return false; }
}

async function startTunnel() {
  const binary = process.env.CLOUDFLARED_BIN || join(runtime, 'cloudflared.exe');
  const child = spawn(binary, ['tunnel', '--url', 'http://127.0.0.1:8787', '--protocol', 'http2', '--no-autoupdate'], {
    cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Tunnel startup timed out.')); }, 60000);
    const read = (chunk) => {
      const text = chunk.toString();
      appendFileSync(join(runtime, 'tunnel.log'), text);
      output = (output + text).slice(-8192);
      const base = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
      if (base) { clearTimeout(timer); resolve({ child, base }); }
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Tunnel exited before becoming available.')); });
  });
}

async function run() {
  mkdirSync(runtime, { recursive: true });
  const lock = join(runtime, 'supervisor.pid');
  try {
    const oldPid = Number(readFileSync(lock, 'utf8'));
    process.kill(oldPid, 0);
    throw new Error(`Connection monitor is already running (PID ${oldPid}).`);
  } catch (error) {
    if (error.message.startsWith('Connection monitor')) throw error;
    try { unlinkSync(lock); } catch {}
  }
  const descriptor = openSync(lock, 'wx');
  writeFileSync(descriptor, String(process.pid));
  closeSync(descriptor);
  let ownedTunnel;
  process.once('exit', () => { ownedTunnel?.kill(); try { unlinkSync(lock); } catch {} });
  log('Connection monitor started.');
  let failures = 0;
  while (true) {
    try {
      const expected = (await github(variablePath)).variables;
      if (await healthy(expected)) {
        if (failures) log('Public APIs are healthy again.');
        failures = 0;
      } else if (++failures >= 2) {
        const local = await fetch('http://127.0.0.1:8787/node/api/health', { signal: AbortSignal.timeout(5000) });
        if (!local.ok || (await local.json()).database !== 'connected') throw new Error('Local API is not ready; leaving remote configuration unchanged.');
        log('Public connection failed twice; creating a replacement tunnel.');
        const tunnel = await startTunnel();
        const replacement = [{ name: nodeName, value: `${tunnel.base}/node/api` }, { name: financeName, value: `${tunnel.base}/fin/api` }];
        let ready = false;
        for (let attempt = 0; attempt < 10; attempt++) {
          if (await healthy(replacement)) { ready = true; break; }
          await delay(3000);
        }
        if (!ready) { tunnel.child.kill(); throw new Error('Replacement tunnel failed verification.'); }
        if (await replaceConnection(github, expected, tunnel.base)) {
          ownedTunnel?.kill();
          ownedTunnel = tunnel.child;
          log(`Published verified connection ${tunnel.base}; Pages redeployment triggered.`);
          failures = 0;
        } else {
          tunnel.child.kill();
          log('Another person changed the API URLs; preserving their configuration.');
        }
      }
    } catch (error) { log(error.message); }
    await delay(30000);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

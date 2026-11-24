import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import test, { after, before } from 'node:test';

const port = 35_000 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
let dataDir = '';
let server: ChildProcess | undefined;
let ownerCookie = '';

async function waitForHealth() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError || new Error('Timed out waiting for Next server health endpoint.');
}

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'uplineagent-p0-e2e-'));
  const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      UPLINE_DATA_DIR: dataDir,
      AUTH_SECRET: 'p0-e2e-test-only-auth-secret',
      AGENTS_CONFIG_JSON: JSON.stringify([
        { id: 'abel', name: 'Abel', lang: 'en', username: 'owner-test', password: 'owner-test-password', role: 'internal' },
      ]),
      OWNER_LOGIN_EMAIL: '',
      OWNER_LOGIN_ENFORCED: '',
      GITHUB_DATA_TOKEN: '',
      GITHUB_DATA_REPO: '',
      GITHUB_DATA_PATH: '',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '',
      UPLINE_SHEETS_SPREADSHEET_ID: '',
      UPLINE_FB_LEADS_SHEET_ID: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      PUBLIC_BASE_URL: '',
    },
    stdio: 'ignore',
  });
  await waitForHealth();

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'owner-test', password: 'owner-test-password' }),
  });
  assert.equal(login.status, 200);
  ownerCookie = login.headers.get('set-cookie')?.split(';', 1)[0] || '';
  assert.match(ownerCookie, /^oc_agent=/);
});

after(async () => {
  server?.kill('SIGTERM');
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

test('health endpoint returns liveness with a request ID', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('x-request-id') || '', /^[A-Za-z0-9_-]{8,128}$/);
  assert.equal((await response.json()).ok, true);
});

test('Ops routes render controlled unavailable states when hosted Sheets is absent', async () => {
  const api = await fetch(`${baseUrl}/api/ops/summary`, { headers: { cookie: ownerCookie } });
  assert.equal(api.status, 503);
  assert.match(api.headers.get('content-type') || '', /application\/json/);
  const body = await api.json();
  assert.equal(body.error.code, 'SHEETS_UNCONFIGURED');
  assert.match(api.headers.get('x-request-id') || '', /^[A-Za-z0-9_-]{8,128}$/);

  const expectations = new Map([
    ['/ops', 'Ops data is unavailable'],
    ['/ops/pipeline', 'Pipeline data is unavailable'],
    ['/ops/call-queue', 'Call queue is unavailable'],
    ['/ops/dialer', 'Power Dialer is safely unavailable'],
  ]);
  for (const [path, expected] of expectations) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: ownerCookie } });
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(expected), path);
  }
});

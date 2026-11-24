import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

const port = 36_000 + Math.floor(Math.random() * 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
let dataDir = '';
let server: ChildProcess | undefined;
let qaCookie = '';

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
  throw lastError || new Error('Timed out waiting for local preview health endpoint.');
}

async function page(pathname: string) {
  return fetch(`${baseUrl}${pathname}`, { headers: { cookie: qaCookie }, redirect: 'manual' });
}

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'upline-command-preview-'));
  const nextBin = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      UPLINE_PREVIEW_DEMO: 'true',
      UPLINE_DATA_DIR: dataDir,
      AUTH_SECRET: 'local-preview-test-only-secret',
      AGENTS_CONFIG_JSON: JSON.stringify([
        { id: 'qa-preview', name: 'Preview QA', lang: 'en', username: 'preview-qa@example.test', password: 'not-a-real-password', role: 'internal' },
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
    body: JSON.stringify({ username: 'preview-qa@example.test', password: 'not-a-real-password' }),
  });
  assert.equal(login.status, 200);
  qaCookie = login.headers.get('set-cookie')?.split(';', 1)[0] || '';
  assert.match(qaCookie, /^oc_agent=/);
});

after(async () => {
  server?.kill('SIGTERM');
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

test('the dashboard remains authenticated and loads fictional Preview data', async () => {
  const anonymous = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
  assert.equal(anonymous.status, 307);
  assert.equal(anonymous.headers.get('location'), '/agent/login?returnTo=%2Fdashboard');

  const response = await page('/dashboard');
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /Upline Agent/);
  assert.match(body, /Command Center/);
  assert.match(body, /PREVIEW DEMO DATA.*FICTIONAL/);
  assert.match(body, /Preview QA/);
});

test('every direct Command Center route renders in the isolated Preview workspace', async () => {
  const routes = new Map([
    ['/quoter', 'Smart Quoter'],
    ['/recruiting', 'Recruiting'],
    ['/leads', 'Leads'],
    ['/messaging', 'Messaging'],
    ['/dialer', 'Dialer'],
    ['/power-dialer', 'Power Dialer'],
    ['/messaging-setup', 'Messaging Setup'],
    ['/leaderboard', 'Leaderboard'],
    ['/announcements', 'Announcements'],
    ['/resources', 'Resources'],
    ['/inbound-calls', 'Inbound Calls'],
    ['/ai', 'AI Upline'],
    ['/log-a-sale', 'Log a Sale'],
    ['/book-of-business', 'Book of Business'],
    ['/agency-control', 'Agency Control'],
    ['/agent-approvals', 'Agent Approvals'],
    ['/agents', 'Agents'],
    ['/lead-catalog', 'Lead Catalog'],
    ['/call-queue', 'Call Queue'],
    ['/system-health', 'System Health'],
    ['/settings', 'Settings'],
  ]);

  for (const [pathname, title] of routes) {
    const response = await page(pathname);
    assert.equal(response.status, 200, pathname);
    const body = await response.text();
    assert.match(body, new RegExp(title), pathname);
    assert.match(body, /PREVIEW DEMO DATA.*FICTIONAL/, pathname);
  }
});

test('legacy Ops routes use the unified Preview shell only when the demo gate is enabled', async () => {
  const redirects = new Map([
    ['/ops', '/agency-control'],
    ['/ops/pipeline', '/leads'],
    ['/ops/call-queue', '/call-queue'],
    ['/ops/dialer', '/power-dialer'],
    ['/ops/calls', '/inbound-calls'],
    ['/ops/agents', '/agents'],
    ['/ops/agent-approvals', '/agent-approvals'],
    ['/ops/lead-purchase', '/lead-catalog'],
    ['/ops/admin', '/system-health'],
    ['/agent', '/inbound-calls'],
  ]);

  for (const [pathname, destination] of redirects) {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'manual' });
    assert.equal(response.status, 307, pathname);
    assert.equal(response.headers.get('location'), destination, pathname);
  }
});

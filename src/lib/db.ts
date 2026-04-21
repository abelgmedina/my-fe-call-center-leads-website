import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  create table if not exists agent_state (
    agent_id text primary key,
    status text not null,
    updated_at integer not null
  );

  create table if not exists take_tokens (
    token text primary key,
    created_at integer not null,
    expires_at integer not null,
    used_at integer,
    caller_from text,
    call_sid text
  );

  create table if not exists sms_events (
    id integer primary key autoincrement,
    received_at integer not null,
    from_number text not null,
    to_number text not null,
    body text not null,
    message_sid text,
    action text not null,
    handled_at integer
  );

  create table if not exists sms_outbound_events (
    id integer primary key autoincrement,
    created_at integer not null,
    lead_id text,
    to_number text not null,
    template text not null,
    body text not null,
    status text not null,
    message_sid text,
    error text
  );

  create table if not exists call_events (
    id integer primary key autoincrement,
    created_at integer not null,
    lead_id text,
    call_type text,
    from_number text,
    to_number text not null,
    state text,
    bucket text,
    call_sid text,
    status text not null,
    error text,
    recording_sid text,
    recording_status text,
    recording_url text
  );

  -- Canonical calls ledger (used by /ops/calls)
  create table if not exists calls (
    call_sid text primary key,
    created_at integer not null,
    direction text not null,
    from_number text,
    to_number text,
    buyer_code text,
    campaign_code text,
    language text,
    status text,
    duration_seconds integer,
    qualified_90s integer not null default 0,
    billable_call integer not null default 0,
    billable_qualified integer not null default 0,
    billable_transfer integer not null default 0,
    recording_sid text,
    recording_status text,
    recording_url text
  );

  create table if not exists ai_intake (
    call_sid text primary key,
    created_at integer not null,
    from_number text,
    lang text,
    name text,
    state text,
    hobby text,
    phone_confirmed integer,
    callback_pref text
  );

  create table if not exists call_worksheets (
    call_sid text primary key,
    updated_at integer not null,
    agent_id text,
    from_number text,
    fields_json text,
    notes text
  );

  create table if not exists dept_controls (
    dept_id text primary key,
    mode text not null,
    updated_at integer not null
  );

  create table if not exists dept_health_state (
    dept_id text primary key,
    health text not null,
    last_changed_at integer not null,
    last_checked_at integer not null,
    last_alerted_health text,
    last_alerted_at integer
  );

  create table if not exists dept_alert_events (
    id integer primary key autoincrement,
    dept_id text not null,
    prev_health text,
    next_health text not null,
    message text not null,
    created_at integer not null,
    notified integer not null default 0
  );

  create table if not exists agent_access_requests (
    id integer primary key autoincrement,
    full_name text not null,
    email text not null,
    phone text not null,
    npn text,
    agency_name text,
    notes text,
    status text not null default 'pending',
    created_at integer not null,
    updated_at integer not null
  );
`);

// Lightweight migrations for existing local DBs.
try { db.prepare('alter table call_events add column call_type text').run(); } catch {}
try { db.prepare('alter table call_events add column from_number text').run(); } catch {}
// Call recording schema additions
try { db.prepare('alter table call_events add column recording_sid text').run(); } catch {}
try { db.prepare('alter table call_events add column recording_status text').run(); } catch {}
try { db.prepare('alter table call_events add column recording_url text').run(); } catch {}
// AI intake schema additions
try { db.prepare('alter table ai_intake add column age text').run(); } catch {}

// Migrate legacy single-row schema if it exists.
try {
  db.prepare('select id from agent_state limit 1').get();
  // legacy table exists with id=1; convert it.
  const legacy = db.prepare('select status, updated_at from agent_state where id = 1').get() as any;
  if (legacy?.status) {
    db.exec('alter table agent_state rename to agent_state_legacy');
    db.exec(`create table if not exists agent_state (
      agent_id text primary key,
      status text not null,
      updated_at integer not null
    );`);
    db.prepare('insert into agent_state (agent_id, status, updated_at) values (?, ?, ?)').run('abel', legacy.status, legacy.updated_at || Date.now());
  }
} catch {
  // new schema already
}

export type AgentStatus = 'AVAILABLE' | 'AWAY' | 'BREAK' | 'OFF_WORK' | 'IN_CALL';

export type AgentCallMode = 'browser' | 'cell' | 'unknown';

export function ensureAgentCallContext(agentId: string) {
  try {
    db.exec(`create table if not exists agent_call_context (
      agent_id text primary key,
      mode text,
      call_sid text,
      updated_at integer not null
    );`);
  } catch {}

  const row = db.prepare('select agent_id from agent_call_context where agent_id = ?').get(agentId) as any;
  if (!row) {
    db.prepare('insert into agent_call_context (agent_id, mode, call_sid, updated_at) values (?, ?, ?, ?)').run(
      agentId,
      'unknown',
      null,
      Date.now()
    );
  }
}

export function setAgentCallContext(agentId: string, mode: AgentCallMode, callSid: string | null) {
  ensureAgentCallContext(agentId);
  db.prepare('update agent_call_context set mode = ?, call_sid = ?, updated_at = ? where agent_id = ?').run(
    mode,
    callSid,
    Date.now(),
    agentId
  );
}

export function getAgentCallContext(agentId: string): { mode: AgentCallMode; call_sid: string | null; updated_at: number } {
  ensureAgentCallContext(agentId);
  const r = db
    .prepare('select mode, call_sid, updated_at from agent_call_context where agent_id = ?')
    .get(agentId) as any;
  return {
    mode: (String(r?.mode || 'unknown') as AgentCallMode) || 'unknown',
    call_sid: (r?.call_sid as string) || null,
    updated_at: Number(r?.updated_at || 0),
  };
}

export function ensureAgentRow(agentId: string) {
  const now = Date.now();
  const row = db.prepare('select agent_id from agent_state where agent_id = ?').get(agentId) as any;
  if (!row) db.prepare('insert into agent_state (agent_id, status, updated_at) values (?, ?, ?)').run(agentId, 'OFF_WORK', now);
}

export function getAgentStatus(agentId: string): AgentStatus {
  ensureAgentRow(agentId);
  const r = db.prepare('select status from agent_state where agent_id = ?').get(agentId) as { status: AgentStatus };
  return r.status;
}

export function setAgentStatus(agentId: string, status: AgentStatus) {
  ensureAgentRow(agentId);
  db.prepare('update agent_state set status = ?, updated_at = ? where agent_id = ?').run(status, Date.now(), agentId);
}

export type DeptMode = 'normal' | 'isolated';

export function getDeptMode(deptId: string): DeptMode {
  const row = db.prepare('select mode from dept_controls where dept_id = ?').get(deptId) as { mode: DeptMode } | undefined;
  return row?.mode === 'isolated' ? 'isolated' : 'normal';
}

export function setDeptMode(deptId: string, mode: DeptMode) {
  const now = Date.now();
  db.prepare(
    `insert into dept_controls (dept_id, mode, updated_at)
     values (?, ?, ?)
     on conflict(dept_id) do update set mode = excluded.mode, updated_at = excluded.updated_at`
  ).run(deptId, mode, now);
}

export function listDeptModes() {
  return db.prepare('select dept_id, mode, updated_at from dept_controls').all() as Array<{ dept_id: string; mode: DeptMode; updated_at: number }>;
}

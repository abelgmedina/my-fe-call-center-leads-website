import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireInternalAgent } from '@/lib/auth';

export const runtime = 'nodejs';

function ensure() {
  db.exec(`
    create table if not exists agent_presence (
      agent_id text primary key,
      updated_at integer not null,
      visible integer,
      device_ready integer
    );
  `);
}

export async function GET(req: Request) {
  try {
    await requireInternalAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  ensure();
  const { searchParams } = new URL(req.url);
  const agentId = String(searchParams.get('agent') || '').trim();
  if (!agentId) return NextResponse.json({ error: 'agent required' }, { status: 400 });

  const row = db.prepare('select * from agent_presence where agent_id = ?').get(agentId) as any;
  return NextResponse.json({
    ok: true,
    agent: agentId,
    found: !!row,
    visible: row ? !!row.visible : false,
    device_ready: row ? !!row.device_ready : false,
    updated_at: row?.updated_at || null,
  });
}

export async function POST(req: Request) {
  let agent;
  try {
    agent = await requireInternalAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  ensure();
  const body = (await req.json().catch(() => null)) as any;
  const requestedAgentId = String(body?.agent || body?.agent_id || '').trim();
  if (requestedAgentId && requestedAgentId !== agent.id) {
    return NextResponse.json({ error: 'cannot update another agent presence' }, { status: 403 });
  }
  const agentId = agent.id;

  const visible = body?.visible ? 1 : 0;
  const deviceReady = body?.device_ready ? 1 : 0;

  db.prepare(
    `insert into agent_presence (agent_id, updated_at, visible, device_ready)
     values (?, ?, ?, ?)
     on conflict(agent_id) do update set
       updated_at=excluded.updated_at,
       visible=excluded.visible,
       device_ready=excluded.device_ready`
  ).run(agentId, Date.now(), visible, deviceReady);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getAgentStatus, setAgentStatus, type AgentStatus } from '@/lib/db';
import { requireInternalAgent } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  let agent;
  try {
    agent = await requireInternalAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  return NextResponse.json({ status: getAgentStatus(agent.id) });
}

export async function POST(req: Request) {
  let agent;
  try {
    agent = await requireInternalAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { status?: AgentStatus } | null;
  if (!body?.status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });

  const allowed: AgentStatus[] = ['AVAILABLE', 'AWAY', 'BREAK', 'OFF_WORK', 'IN_CALL'];
  if (!allowed.includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  setAgentStatus(agent.id, body.status);
  return NextResponse.json({ ok: true, status: getAgentStatus(agent.id) });
}

import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { setAgentStatus, type AgentStatus } from '@/lib/db';

export const runtime = 'nodejs';

const ALLOWED: AgentStatus[] = ['AVAILABLE', 'AWAY', 'BREAK', 'OFF_WORK', 'IN_CALL'];

function isManager(agentId: string) {
  const raw = process.env.MANAGER_AGENT_IDS || 'abel,mark';
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(agentId);
}

export async function POST(req: Request) {
  const me = await requireAgent();
  if (!isManager(me.id)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const agent_id = String(body?.agent_id || '').trim();
  const status = String(body?.status || '').trim() as AgentStatus;
  if (!agent_id) return NextResponse.json({ ok: false, error: 'agent_id required' }, { status: 400 });
  if (!ALLOWED.includes(status)) return NextResponse.json({ ok: false, error: 'invalid status' }, { status: 400 });

  setAgentStatus(agent_id, status);
  return NextResponse.json({ ok: true, agent_id, status });
}

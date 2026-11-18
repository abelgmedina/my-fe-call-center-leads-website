import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireOpsAccess } from '@/lib/ops-access';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const denied = await requireOpsAccess(req, 'internal');
  if (denied) return denied;
  const agents = getAgents();
  const rows = db
    .prepare('select agent_id, status, updated_at from agent_state')
    .all() as Array<{ agent_id: string; status: string; updated_at: number }>;
  const map = new Map(rows.map((r) => [r.agent_id, r]));

  return NextResponse.json({
    ok: true,
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      lang: a.lang,
      username: a.username,
      status: map.get(a.id)?.status || 'OFF_WORK',
      updated_at: map.get(a.id)?.updated_at || null,
    })),
    updatedAt: new Date().toISOString(),
  });
}

import { NextResponse } from 'next/server';
import { getAgentCallContext } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agent = String(searchParams.get('agent') || '').trim();
  if (!agent) return NextResponse.json({ error: 'agent required' }, { status: 400 });
  const ctx = getAgentCallContext(agent);
  return NextResponse.json({ ok: true, agent, ...ctx });
}

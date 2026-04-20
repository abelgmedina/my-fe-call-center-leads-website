import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { assignBuyer } from '@/lib/ledger';

export const runtime = 'nodejs';

function isManager(agentId: string) {
  return agentId === 'abel';
}

export async function POST(req: Request) {
  let me: any;
  try {
    me = await requireAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (!isManager(me.id)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as any;
  const call_sid = String(body?.call_sid || '').trim();
  const buyer_code = String(body?.buyer_code || '').trim();
  const campaign_code = body?.campaign_code ? String(body.campaign_code).trim() : null;

  if (!call_sid) return NextResponse.json({ ok: false, error: 'call_sid required' }, { status: 400 });
  if (!buyer_code) return NextResponse.json({ ok: false, error: 'buyer_code required' }, { status: 400 });

  assignBuyer(call_sid, buyer_code, campaign_code);
  return NextResponse.json({ ok: true, call_sid, buyer_code, campaign_code });
}

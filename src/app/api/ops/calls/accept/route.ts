import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { acceptTransfer } from '@/lib/ledger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const me = await requireAgent();
  const body = (await req.json().catch(() => null)) as any;
  const callSid = String(body?.callSid || '').trim();
  if (!callSid) return NextResponse.json({ ok: false, error: 'callSid required' }, { status: 400 });

  // Billable transfer event: when buyer answers/accepts.
  if ((me.role || 'internal') === 'buyer' && me.buyer_code) {
    acceptTransfer(callSid, me.id);
  }

  return NextResponse.json({ ok: true });
}

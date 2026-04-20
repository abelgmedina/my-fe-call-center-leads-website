import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  let me: any;
  try {
    me = await requireAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || '50')));

  // Manager sees all; buyer sees only their buyer_code.
  const role = me.role || 'internal';
  const buyer_code = me.buyer_code || null;

  let rows: any[] = [];
  if (role === 'buyer' && buyer_code) {
    rows = db
      .prepare(
        `select call_sid, created_at, direction, from_number, to_number, buyer_code, campaign_code, status, duration_seconds, qualified_90s, billable_call, billable_qualified, billable_transfer,
                recording_sid, recording_status, recording_url
         from calls where buyer_code = ? order by created_at desc limit ?`
      )
      .all(buyer_code, limit) as any[];
  } else {
    rows = db
      .prepare(
        `select call_sid, created_at, direction, from_number, to_number, buyer_code, campaign_code, status, duration_seconds, qualified_90s, billable_call, billable_qualified, billable_transfer,
                recording_sid, recording_status, recording_url
         from calls order by created_at desc limit ?`
      )
      .all(limit) as any[];
  }

  return NextResponse.json({ ok: true, role, buyer_code, rows, updatedAt: new Date().toISOString() });
}

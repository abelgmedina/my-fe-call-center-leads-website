import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const callSid = searchParams.get('callSid') || '';
  if (!callSid) return NextResponse.json({ error: 'callSid required' }, { status: 400 });

  const row = db
    .prepare(
      `select created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status
       from call_events
       where call_sid = ?
       order by id desc
       limit 1`
    )
    .get(callSid) as any;

  if (!row) {
    return NextResponse.json({ ok: true, callSid, call_type: 'UNKNOWN' });
  }

  return NextResponse.json({ ok: true, ...row });
}

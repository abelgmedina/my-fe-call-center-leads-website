import { NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Start an outbound power dialer attempt.
 * Body: { to: "+1...", lead_id?: string, state?: string }
 * Logs call_events with call_type=POWER_DIALER (so status-callback auto-disposition does NOT run).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as any;
  const to = String(body?.to || '').trim();
  const lead_id = body?.lead_id ? String(body.lead_id).trim() : null;
  const state = body?.state ? String(body.state).trim() : null;

  if (!to) return NextResponse.json({ error: 'to required' }, { status: 400 });

  const from = process.env.TWILIO_SMS_FROM;
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!from) return NextResponse.json({ error: 'TWILIO_SMS_FROM missing' }, { status: 500 });
  if (!base) return NextResponse.json({ error: 'PUBLIC_BASE_URL missing' }, { status: 500 });

  const url = `${base}/api/twilio/voice/outbound`;
  const statusCallback = `${base}/api/twilio/voice/status-callback`;

  const createdAt = Date.now();
  try {
    const client = getTwilioClient();
    const call = await client.calls.create({
      to,
      from,
      url,
      method: 'POST',
      statusCallback,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    db.prepare(
      `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status)
       values (?, ?, 'POWER_DIALER', null, ?, ?, null, ?, 'started')`
    ).run(createdAt, lead_id, to, state, call.sid);

    return NextResponse.json({ ok: true, callSid: call.sid });
  } catch (e: any) {
    db.prepare(
      `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status, error)
       values (?, ?, 'POWER_DIALER', null, ?, ?, null, null, 'error', ?)`
    ).run(createdAt, lead_id, to, state, e?.message || String(e));

    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

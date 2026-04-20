import { NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

// Call attempt policy (v2): user-requested burst retries.
// - Up to 3 attempts per bucket (morning/afternoon/evening)
// - Up to 9 attempts per lead per local day
// - Minimum spacing to prevent accidental rapid-fire clicks
// Buckets (lead-local time):
// - morning: 08:00–11:59
// - afternoon: 12:00–15:59
// - evening: 16:00–20:59
// Outside 08:00–20:59 => blocked.

const MAX_PER_BUCKET = 3;
const MAX_PER_DAY = 9;
const MIN_SPACING_MS = 60 * 1000; // 1 minute

function tzForState(state: string | null | undefined): string {
  const s = (state || '').trim().toUpperCase();
  if (s === 'CA') return 'America/Los_Angeles';
  if (s === 'TX') return 'America/Chicago';
  if (s === 'FL') return 'America/New_York';
  // default to Pacific if unknown (conservative: matches your ops hours)
  return 'America/Los_Angeles';
}

function localParts(timeZone: string, ts = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour') || '0'),
    minute: Number(get('minute') || '0'),
  };
}

function bucketForHour(h: number): 'morning' | 'afternoon' | 'evening' | null {
  if (h >= 8 && h <= 11) return 'morning';
  if (h >= 12 && h <= 15) return 'afternoon';
  if (h >= 16 && h <= 20) return 'evening';
  return null;
}

/**
 * Start an outbound call to a lead and place them into the queue.
 * This is the call-first equivalent of inbound SMS "CALL".
 *
 * Body: { to: "+1...", lead_id?: string, state?: string }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as any;
  const to = String(body?.to || '').trim();
  const lead_id = body?.lead_id ? String(body.lead_id).trim() : null;
  const state = body?.state ? String(body.state).trim() : null;

  if (!to) return NextResponse.json({ error: 'to required' }, { status: 400 });

  const timeZone = tzForState(state);
  const lp = localParts(timeZone);
  const bucket = bucketForHour(lp.hour);
  if (!bucket) {
    return NextResponse.json(
      { error: `Outside calling windows for lead local time (${timeZone}). Current local hour=${lp.hour}.` },
      { status: 429 }
    );
  }

  // Enforce attempt caps per lead per local day.
  if (lead_id) {
    const sinceLocalMidnight = Date.now() - 36 * 60 * 60 * 1000; // just for scan; we filter by ymd string
    const rows = db
      .prepare(
        `select created_at, bucket from call_events where lead_id = ? and created_at >= ? and status = 'started'`
      )
      .all(lead_id, sinceLocalMidnight) as Array<{ created_at: number; bucket: string | null }>;

    const sameDay = rows.filter((r) => localParts(timeZone, r.created_at).ymd === lp.ymd);
    const total = sameDay.length;
    const inBucket = sameDay.filter((r) => r.bucket === bucket);

    // Spacing guardrail (prevents double-click bursts)
    const mostRecent = sameDay
      .map((r) => r.created_at)
      .sort((a, b) => b - a)[0];
    if (mostRecent && Date.now() - mostRecent < MIN_SPACING_MS) {
      return NextResponse.json(
        { error: `Please wait ${Math.ceil((MIN_SPACING_MS - (Date.now() - mostRecent)) / 1000)}s before retrying this lead.` },
        { status: 429 }
      );
    }

    if (total >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: `Max daily call attempts reached for this lead (${MAX_PER_DAY}/day). Lead local date ${lp.ymd}.` },
        { status: 429 }
      );
    }

    if (inBucket.length >= MAX_PER_BUCKET) {
      return NextResponse.json(
        { error: `Max ${bucket} attempts reached for this lead (${MAX_PER_BUCKET} per ${bucket} window).` },
        { status: 429 }
      );
    }
  }

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
       values (?, ?, ?, ?, ?, ?, ?, ?, 'started')`
    ).run(createdAt, lead_id, 'OUTBOUND_DIALER', null, to, state, bucket, call.sid);

    return NextResponse.json({
      ok: true,
      callSid: call.sid,
      status: call.status,
      bucket,
      leadLocalDate: lp.ymd,
      timeZone,
      policy: { maxPerBucket: MAX_PER_BUCKET, maxPerDay: MAX_PER_DAY, minSpacingSeconds: MIN_SPACING_MS / 1000 },
    });
  } catch (e: any) {
    db.prepare(
      `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status, error)
       values (?, ?, ?, ?, ?, ?, ?, ?, 'error', ?)`
    ).run(createdAt, lead_id, 'OUTBOUND_DIALER', null, to, state, bucket, null, e?.message || String(e));

    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tzForState, localParts } from '@/lib/timezones';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lead_id = (searchParams.get('lead_id') || '').trim();
  const state = (searchParams.get('state') || '').trim();
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  const timeZone = tzForState(state);
  const today = localParts(timeZone).ymd;

  const rows = db
    .prepare(
      `select created_at, bucket, status from call_events where lead_id = ? and status in ('started','ringing','in-progress','completed','busy','no-answer','failed','canceled','error')`
    )
    .all(lead_id) as Array<{ created_at: number; bucket: string | null; status: string }>;

  const sameDay = rows.filter((r) => localParts(timeZone, r.created_at).ymd === today);

  const byBucket: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const r of sameDay) {
    if (r.bucket && byBucket[r.bucket] !== undefined) byBucket[r.bucket]++;
  }

  return NextResponse.json({
    ok: true,
    lead_id,
    timeZone,
    localDate: today,
    totalToday: sameDay.length,
    bucketsToday: byBucket,
    lastEvent: sameDay.sort((a, b) => b.created_at - a.created_at)[0] || null,
  });
}

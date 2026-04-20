import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function startOfDayPacificMs() {
  // Ops session stats are Pacific-day (operator day), not per-lead local.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ymd = fmt.format(now); // YYYY-MM-DD
  const start = new Date(`${ymd}T00:00:00-08:00`);
  return start.getTime();
}

export async function GET() {
  const since = startOfDayPacificMs();
  const rows = db
    .prepare(
      `select call_type, status from call_events where created_at >= ? and call_type in ('OUTBOUND_DIALER','CALLBACK')`
    )
    .all(since) as Array<{ call_type: string | null; status: string }>;

  const callsToday = rows.length;
  const connects = rows.filter((r) => String(r.status).toLowerCase() === 'answered').length;
  const completed = rows.filter((r) => String(r.status).toLowerCase() === 'completed').length;
  const connectRate = callsToday ? Math.round((connects / callsToday) * 100) : 0;

  // Placeholder until we store durations per call.
  const avgHandle = '—';
  const abandons = 0;

  return NextResponse.json({
    ok: true,
    callsToday,
    connects,
    completed,
    connectRate,
    avgHandle,
    abandons,
    updatedAt: new Date().toISOString(),
  });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'node:child_process';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Twilio sends application/x-www-form-urlencoded
  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch {
    form = null;
  }

  const callSid = String(form?.get('CallSid') ?? '').trim();
  const recordingSid = String(form?.get('RecordingSid') ?? '').trim();
  const recordingStatus = String(form?.get('RecordingStatus') ?? '').trim();
  const recordingUrl = String(form?.get('RecordingUrl') ?? '').trim();

  if (callSid) {
    // Best-effort: attach recording info to call_events row (if present)
    try {
      // add columns if missing
      try { db.prepare('alter table call_events add column recording_sid text').run(); } catch {}
      try { db.prepare('alter table call_events add column recording_status text').run(); } catch {}
      try { db.prepare('alter table call_events add column recording_url text').run(); } catch {}

      db.prepare(
        `update call_events
         set recording_sid = coalesce(?, recording_sid),
             recording_status = ?,
             recording_url = coalesce(?, recording_url)
         where call_sid = ?`
      ).run(recordingSid || null, recordingStatus || null, recordingUrl || null, callSid);
    } catch {}

    // Canonical calls ledger (used by /ops/calls)
    try {
      db.prepare(
        `insert into calls (call_sid, created_at, direction, from_number, to_number, buyer_code, campaign_code, status,
          qualified_90s, billable_call, billable_qualified, billable_transfer,
          recording_sid, recording_status, recording_url)
         values (?, ?, 'inbound', null, null, 'upline_internal', 'unattributed', null, 0, 0, 0, 0, ?, ?, ?)
         on conflict(call_sid) do update set
           recording_sid=coalesce(excluded.recording_sid, calls.recording_sid),
           recording_status=coalesce(excluded.recording_status, calls.recording_status),
           recording_url=coalesce(excluded.recording_url, calls.recording_url)`
      ).run(callSid, Date.now(), recordingSid || null, recordingStatus || null, recordingUrl || null);
    } catch {}
  }

  // Kick off post-call coaching when recording completes (best-effort, non-blocking).
  if (callSid && recordingUrl && recordingStatus && recordingStatus.toLowerCase() === 'completed') {
    try {
      const base = process.env.INTERNAL_BASE_URL || 'http://127.0.0.1:3001';
      const cmd = `bash scripts/coach_from_recording.sh ${callSid} ${recordingUrl} ${base}`;
      exec(cmd, { cwd: process.cwd(), env: process.env }, () => {});
    } catch {}
  }

  return NextResponse.json({ ok: true });
}

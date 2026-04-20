import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gogJson } from '@/lib/gog';
import { tzForState, localParts, nextBucketIso } from '@/lib/timezones';

export const runtime = 'nodejs';

const ACCOUNT = 'openclaw@uplineagent.com';
const ABEL_ACTIVE_SHEET_ID = '1473l2syLNz5ipDyo7olvetRdNsKdtPiC_nB9nLzEbbI';

function idx(headers: string[], name: string) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Missing column: ${name}`);
  return i;
}

function colLetter(n0: number) {
  let n = n0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Twilio calls status callback (POST form-encoded)
// https://www.twilio.com/docs/voice/api/call-resource#statuscallback
export async function POST(req: Request) {
  const form = await req.formData();
  const callSid = String(form.get('CallSid') ?? '');
  const callStatus = String(form.get('CallStatus') ?? '');
  const callDuration = Number(String(form.get('CallDuration') ?? '0'));

  if (!callSid) return NextResponse.json({ ok: false, error: 'CallSid missing' }, { status: 400 });

  // Update latest row for this callSid.
  let event: any = null;
  try {
    event = db
      .prepare(
        `select id, lead_id, state, bucket, call_type, to_number from call_events where call_sid = ? order by id desc limit 1`
      )
      .get(callSid) as any;
    if (event?.id) {
      db.prepare(`update call_events set status = ? where id = ?`).run(callStatus, event.id);
    }
  } catch {}

  // Update canonical ledger (duration + 90s qualification)
  try {
    const { updateQualification, upsertCall } = await import('@/lib/ledger');
    // Ensure call exists
    upsertCall({ call_sid: callSid, direction: 'outbound', status: callStatus, duration_seconds: Number.isFinite(callDuration) ? callDuration : 0 });
    if (Number.isFinite(callDuration)) updateQualification(callSid, callDuration, callStatus);
  } catch {}

  // Auto-disposition (v1): for OUTBOUND_DIALER + CALLBACK.
  // - no-answer/busy/failed/canceled => set lead NO_ANSWER + next_action_at to next bucket
  // - completed with very short duration => treat as no-answer
  try {
    if (!event?.lead_id) return NextResponse.json({ ok: true });
    if (!['OUTBOUND_DIALER', 'CALLBACK'].includes(String(event.call_type || ''))) return NextResponse.json({ ok: true });

    const terminal = ['completed', 'busy', 'no-answer', 'failed', 'canceled'];
    if (!terminal.includes(callStatus)) return NextResponse.json({ ok: true });

    const treatAsNoAnswer = callStatus !== 'completed' || callDuration <= 10;
    if (!treatAsNoAnswer) return NextResponse.json({ ok: true });

    const state = String(event.state || '').trim();
    const tz = tzForState(state);
    const today = localParts(tz).ymd;

    // Bucket should exist for dialer calls; if missing, do conservative next day.
    const bucket = (event.bucket as 'morning' | 'afternoon' | 'evening' | null) || 'evening';
    const next = nextBucketIso(tz, bucket);

    // Update sheet: status, next_action_at, last_outcome
    const headerResp = await gogJson(
      ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'],
      { account: ACCOUNT }
    );
    const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
    const dataResp = await gogJson(
      ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A2:AO5000'],
      { account: ACCOUNT }
    );
    const rows: string[][] = (dataResp.values ?? []) as string[][];

    const iLead = idx(headers, 'lead_id');
    const iStatus = idx(headers, 'status');
    const iNext = idx(headers, 'next_action_at');
    const iOutcome = idx(headers, 'last_outcome');

    let rowIndex: number | null = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const id = (r[iLead] ?? '').toString().trim();
      if (id === String(event.lead_id).trim()) {
        rowIndex = i + 2;
        break;
      }
    }
    if (!rowIndex) return NextResponse.json({ ok: true });

    const minCol = Math.min(iStatus, iNext, iOutcome);
    const maxCol = Math.max(iStatus, iNext, iOutcome);
    const values: string[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      if (c === iStatus) values.push('NO_ANSWER');
      else if (c === iNext) values.push(next.iso);
      else if (c === iOutcome) values.push('NO_ANSWER');
      else values.push('');
    }

    const range = `MASTER_LEADS!${colLetter(minCol)}${rowIndex}:${colLetter(maxCol)}${rowIndex}`;
    await gogJson(
      ['sheets', 'update', ABEL_ACTIVE_SHEET_ID, range, '--values-json', JSON.stringify([values]), '--input', 'USER_ENTERED'],
      { account: ACCOUNT }
    );
  } catch (e) {
    // best-effort; never break callback
    console.error('auto-disposition failed:', e);
  }

  return NextResponse.json({ ok: true });
}

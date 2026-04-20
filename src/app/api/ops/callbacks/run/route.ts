import { NextResponse } from 'next/server';
import { gogJson } from '@/lib/gog';
import { db, getAgentStatus } from '@/lib/db';
import { getTwilioClient } from '@/lib/twilio';
import { tzForState, localParts, bucketForHour } from '@/lib/timezones';

export const runtime = 'nodejs';

const ACCOUNT = 'openclaw@uplineagent.com';
const ABEL_ACTIVE_SHEET_ID = '1473l2syLNz5ipDyo7olvetRdNsKdtPiC_nB9nLzEbbI';

function idx(headers: string[], name: string) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Missing column: ${name}`);
  return i;
}

function normalizePhone(raw: string) {
  const s = (raw || '').trim();
  if (!s) return '';
  if (s.startsWith('+')) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return s;
}

function anyAgentAvailable(agentIds: string[]) {
  for (const id of agentIds) {
    const st = getAgentStatus(id);
    if (st === 'AVAILABLE') return id;
  }
  return null;
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

function isTestLead(leadId: string, phone: string) {
  const id = (leadId || '').trim();
  const p = (phone || '').trim();
  if (!id && !p) return false;
  return id.startsWith('AI_CB_') || p === '+19998887777';
}

/**
 * One-shot callback runner.
 * Finds due CALL_APPT_SET leads and dials ONE at a time if any agent is AVAILABLE.
 *
 * Query params:
 * - limit (default 1, max 5)
 */
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(5, Number(searchParams.get('limit') || '1')));

  // v1: fixed agent order, "first available" (user chose A)
  const agentIds = ['mark', 'walter', 'walfred', 'abel'];
  const availableAgent = anyAgentAvailable(agentIds);
  if (!availableAgent) return NextResponse.json({ ok: true, didDial: false, reason: 'no agents available' });

  const headerResp = await gogJson(['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'], { account: ACCOUNT });
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  const dataResp = await gogJson(['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A2:AO5000'], { account: ACCOUNT });
  const rows: string[][] = (dataResp.values ?? []) as string[][];

  const iLeadId = idx(headers, 'lead_id');
  const iStatus = idx(headers, 'status');
  const iName = idx(headers, 'full_name');
  const iPhone = idx(headers, 'phone_primary');
  const iState = idx(headers, 'address_state');
  const iNext = idx(headers, 'next_action_at');

  const now = Date.now();
  const due: any[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const status = String(row[iStatus] ?? '').trim();
    if (status !== 'CALL_APPT_SET') continue;

    const next = String(row[iNext] ?? '').trim();
    if (!next) continue;

    const ts = Date.parse(next);
    if (!Number.isFinite(ts) || ts > now) continue;

    const phone = normalizePhone(String(row[iPhone] ?? '').trim());
    if (!phone) continue;

    const state = String(row[iState] ?? '').trim();
    const tz = tzForState(state);
    const lp = localParts(tz);
    const bucket = bucketForHour(lp.hour);
    if (!bucket) continue; // outside call window

    const leadId = String(row[iLeadId] ?? '').trim();
    if (isTestLead(leadId, phone)) continue;

    due.push({
      rowIndex: ri + 2,
      lead_id: leadId,
      name: String(row[iName] ?? '').trim(),
      phone,
      state,
      tz,
      bucket,
      next_action_at: next,
    });

    if (due.length >= limit) break;
  }

  if (due.length === 0) return NextResponse.json({ ok: true, didDial: false, reason: 'no due callbacks' });

  const from = process.env.TWILIO_SMS_FROM;
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!from) return NextResponse.json({ error: 'TWILIO_SMS_FROM missing' }, { status: 500 });
  if (!base) return NextResponse.json({ error: 'PUBLIC_BASE_URL missing' }, { status: 500 });

  const voiceUrl = `${base}/api/twilio/voice/outbound`;
  const statusCallback = `${base}/api/twilio/voice/status-callback`;

  const client = getTwilioClient();

  const dialed: any[] = [];
  for (const item of due) {
    const createdAt = Date.now();
    try {
      const call = await client.calls.create({
        to: item.phone,
        from,
        url: voiceUrl,
        method: 'POST',
        statusCallback,
        statusCallbackMethod: 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      db.prepare(
        `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status)
         values (?, ?, 'CALLBACK', ?, ?, ?, ?, ?, 'started')`
      ).run(createdAt, item.lead_id || null, from, item.phone, item.state || null, item.bucket, call.sid);

      // Cooldown lock: prevent rapid repeat dialing before status callback disposition lands.
      // Keep status as CALL_APPT_SET, but move next_action_at out by 20 minutes.
      try {
        const lockUntilIso = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const nextCol = colLetter(iNext);
        const nextRange = `MASTER_LEADS!${nextCol}${item.rowIndex}:${nextCol}${item.rowIndex}`;
        await gogJson(
          ['sheets', 'update', ABEL_ACTIVE_SHEET_ID, nextRange, '--values-json', JSON.stringify([[lockUntilIso]]), '--input', 'USER_ENTERED'],
          { account: ACCOUNT }
        );
      } catch (e) {
        console.error('callback lock update failed:', e);
      }

      dialed.push({ lead_id: item.lead_id, to: item.phone, callSid: call.sid, bucket: item.bucket, agentTarget: availableAgent });
    } catch (e: any) {
      db.prepare(
        `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status, error)
         values (?, ?, 'CALLBACK', ?, ?, ?, ?, null, 'error', ?)`
      ).run(createdAt, item.lead_id || null, from, item.phone, item.state || null, item.bucket, e?.message || String(e));
      dialed.push({ lead_id: item.lead_id, to: item.phone, error: e?.message || String(e) });
    }
  }

  return NextResponse.json({ ok: true, didDial: dialed.length > 0, count: dialed.length, dialed });
}

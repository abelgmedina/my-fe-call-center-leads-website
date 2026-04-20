import { NextResponse } from 'next/server';
import { gogJson } from '@/lib/gog';
import { db } from '@/lib/db';
import { renderTemplate, sendOutboundSms } from '@/lib/sms';

export const runtime = 'nodejs';

const ACCOUNT = 'openclaw@uplineagent.com';
const ABEL_ACTIVE_SHEET_ID = '1473l2syLNz5ipDyo7olvetRdNsKdtPiC_nB9nLzEbbI';

function idx(headers: string[], name: string) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Missing column: ${name}`);
  return i;
}

function tzForState(state: string | null | undefined): string {
  const s = (state || '').trim().toUpperCase();
  if (s === 'CA') return 'America/Los_Angeles';
  if (s === 'TX') return 'America/Chicago';
  if (s === 'FL') return 'America/New_York';
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
  };
}

function bucketForHour(h: number): 'morning' | 'afternoon' | 'evening' | null {
  if (h >= 8 && h <= 11) return 'morning';
  if (h >= 12 && h <= 15) return 'afternoon';
  if (h >= 16 && h <= 20) return 'evening';
  return null;
}

function firstName(full: string) {
  const n = (full || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0] || '';
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get('dryRun') !== '0';

  // Load sheet
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

  const iLeadId = idx(headers, 'lead_id');
  const iStatus = idx(headers, 'status');
  const iName = idx(headers, 'full_name');
  const iPhone = idx(headers, 'phone_primary');
  const iState = idx(headers, 'address_state');

  const now = Date.now();

  const results: any[] = [];
  let considered = 0;
  let sent = 0;

  for (const r of rows) {
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const lead_id = String(row[iLeadId] ?? '').trim();
    const status = String(row[iStatus] ?? '').trim();
    const full_name = String(row[iName] ?? '').trim();
    const phone = String(row[iPhone] ?? '').trim();
    const state = String(row[iState] ?? '').trim();

    if (!lead_id || !phone) continue;
    if (['OPT_OUT', 'BAD_NUMBER'].includes(status)) continue;

    const tz = tzForState(state);
    const lp = localParts(tz, now);
    const bucket = bucketForHour(lp.hour);
    if (!bucket) continue;

    // Only fire SMS after call rounds fail.
    // - SMS#1: after >=3 morning calls, if no 'initial' SMS today.
    // - SMS#2: after >=3 evening calls, if initial already sent today and no evening_bump today.

    // Count calls in the relevant bucket today.
    const callRows = db
      .prepare(`select created_at, bucket from call_events where lead_id = ? and status = 'started'`)
      .all(lead_id) as Array<{ created_at: number; bucket: string | null }>;

    const sameDayCalls = callRows.filter((c) => localParts(tz, c.created_at).ymd === lp.ymd);
    const callsInBucket = sameDayCalls.filter((c) => c.bucket === bucket).length;

    const smsRows = db
      .prepare(`select created_at, template from sms_outbound_events where lead_id = ?`)
      .all(lead_id) as Array<{ created_at: number; template: string }>;
    const sameDaySms = smsRows.filter((s) => localParts(tz, s.created_at).ymd === lp.ymd);

    const hasInitial = sameDaySms.some((s) => s.template === 'initial');
    const hasBump = sameDaySms.some((s) => s.template === 'evening_bump');

    // Avoid sending if they replied today.
    const inbound = db
      .prepare(`select received_at from sms_events where from_number = ? and received_at >= ? limit 1`)
      .get(phone, now - 24 * 60 * 60 * 1000) as any;
    if (inbound) continue;

    let template: 'initial' | 'evening_bump' | null = null;
    if (bucket === 'morning' && callsInBucket >= 3 && !hasInitial) template = 'initial';
    if (bucket === 'evening' && callsInBucket >= 3 && hasInitial && !hasBump) template = 'evening_bump';

    if (!template) continue;

    considered++;

    const body = renderTemplate({ template, name: firstName(full_name) });

    const out = await sendOutboundSms({
      lead_id,
      to: phone,
      body,
      template,
      dryRun,
    });

    results.push({ lead_id, phone, state, bucket, template, dryRun, ok: out.ok });
    if (out.ok) sent++;

    if (results.length >= 50) break; // safety cap per run
  }

  return NextResponse.json({ ok: true, dryRun, considered, sent, results, updatedAt: new Date().toISOString() });
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gogJson } from '@/lib/gog';

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

/**
 * AI setter uses this to mark a lead as qualified + ready to transfer.
 * Optionally log a callSid so /agent can label it as AI_TRANSFER.
 *
 * Body: { lead_id, from_number?, to_number?, callSid?, qualification_summary }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as any;
  const lead_id = String(body?.lead_id || '').trim();
  const qualification_summary = String(body?.qualification_summary || '').trim();

  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
  if (!qualification_summary) return NextResponse.json({ error: 'qualification_summary required' }, { status: 400 });

  const from_number = body?.from_number ? String(body.from_number).trim() : null;
  const to_number = body?.to_number ? String(body.to_number).trim() : null;
  const callSid = body?.callSid ? String(body.callSid).trim() : null;

  // 1) Log call event (best-effort)
  try {
    db.prepare(
      `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status)
       values (?, ?, 'AI_TRANSFER', ?, ?, null, null, ?, 'qualified')`
    ).run(Date.now(), lead_id, from_number, to_number, callSid);
  } catch {}

  // 2) Update Google Sheet lead fields
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
  const iNotes = idx(headers, 'notes');
  const iOutcome = idx(headers, 'last_outcome');

  let rowIndex: number | null = null;
  let existingNotes = '';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = (r[iLead] ?? '').toString().trim();
    if (id === lead_id) {
      rowIndex = i + 2;
      existingNotes = String(r[iNotes] ?? '').trim();
      break;
    }
  }
  if (!rowIndex) return NextResponse.json({ error: 'lead not found' }, { status: 404 });

  const newNotes = `${existingNotes ? existingNotes + '\n' : ''}AI QUALIFIED: ${qualification_summary}`;

  const minCol = Math.min(iStatus, iNotes, iOutcome);
  const maxCol = Math.max(iStatus, iNotes, iOutcome);

  const values: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    if (c === iStatus) values.push('QUALIFIED_TRANSFER_NOW');
    else if (c === iOutcome) values.push('QUALIFIED_BY_AI');
    else if (c === iNotes) values.push(newNotes);
    else values.push('');
  }

  const range = `MASTER_LEADS!${colLetter(minCol)}${rowIndex}:${colLetter(maxCol)}${rowIndex}`;
  await gogJson(
    ['sheets', 'update', ABEL_ACTIVE_SHEET_ID, range, '--values-json', JSON.stringify([values]), '--input', 'USER_ENTERED'],
    { account: ACCOUNT }
  );

  return NextResponse.json({ ok: true, lead_id, rowIndex, status: 'QUALIFIED_TRANSFER_NOW' });
}

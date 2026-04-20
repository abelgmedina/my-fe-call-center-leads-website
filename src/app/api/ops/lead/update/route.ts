import { NextResponse } from 'next/server';
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
  // 0-based index -> A1 letter
  let n = n0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as any;
  const lead_id = (body?.lead_id || '').trim();
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

  const patch = body?.patch || {};
  const allowed = ['status', 'next_action_at', 'notes', 'last_outcome'] as const;
  const keys = Object.keys(patch).filter((k) => (allowed as readonly string[]).includes(k));
  if (keys.length === 0) return NextResponse.json({ error: 'no allowed fields in patch' }, { status: 400 });

  // Load headers and data to locate row index.
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
  let rowIndex: number | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const id = (r[iLead] ?? '').toString().trim();
    if (id === lead_id) {
      rowIndex = i + 2; // sheet row
      break;
    }
  }
  if (!rowIndex) return NextResponse.json({ error: 'lead not found' }, { status: 404 });

  // Build update range + values in sheet column order
  const colIdxs = keys.map((k) => idx(headers, k));
  const minCol = Math.min(...colIdxs);
  const maxCol = Math.max(...colIdxs);

  const values: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    const header = headers[c];
    if (keys.includes(header)) values.push(String(patch[header] ?? ''));
    else values.push('');
  }

  const range = `MASTER_LEADS!${colLetter(minCol)}${rowIndex}:${colLetter(maxCol)}${rowIndex}`;
  await gogJson(
    [
      'sheets',
      'update',
      ABEL_ACTIVE_SHEET_ID,
      range,
      '--values-json',
      JSON.stringify([values]),
      '--input',
      'USER_ENTERED',
    ],
    { account: ACCOUNT }
  );

  return NextResponse.json({ ok: true, lead_id, rowIndex, updatedFields: keys });
}

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leadId = (searchParams.get('lead_id') || '').trim();
  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 });

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

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    if ((row[iLeadId] ?? '').trim() === leadId) {
      const record: Record<string, string> = {};
      headers.forEach((h, j) => {
        record[h] = (row[j] ?? '').toString();
      });
      return NextResponse.json({
        lead_id: leadId,
        rowIndex: i + 2, // sheet row number
        record,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ error: 'not found' }, { status: 404 });
}

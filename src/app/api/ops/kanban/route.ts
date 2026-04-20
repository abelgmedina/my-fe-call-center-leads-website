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

const COLUMNS = [
  'READY_FOR_SMS',
  'SMS_IN_PROGRESS',
  'SMS_HOT',
  'SMS_APPT_SET',
  'QUALIFIED_TRANSFER_NOW',
  'TRANSFERRED_TO_ABEL',
  'CLOSED_WON',
  'CLOSED_LOST',
  'OPT_OUT',
] as const;

export async function GET() {
  const headerResp = await gogJson(
    ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'],
    { account: ACCOUNT }
  );
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  if (!headers.length) throw new Error('No headers found');

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
  const iLast = idx(headers, 'last_contact_at');
  const iNext = idx(headers, 'next_action_at');

  const grouped: Record<string, any[]> = Object.fromEntries(COLUMNS.map((c) => [c, []]));
  const other: any[] = [];

  for (const r of rows) {
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const status = (row[iStatus] ?? '').trim();
    const card = {
      lead_id: (row[iLeadId] ?? '').trim(),
      name: (row[iName] ?? '').trim(),
      phone: (row[iPhone] ?? '').trim(),
      state: (row[iState] ?? '').trim(),
      status,
      last_contact_at: (row[iLast] ?? '').trim(),
      next_action_at: (row[iNext] ?? '').trim(),
    };

    if (!status) continue;
    if (grouped[status]) grouped[status].push(card);
    else other.push(card);
  }

  // Sort each column by next_action_at then last_contact_at for a usable queue.
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => {
      const na = a.next_action_at || '';
      const nb = b.next_action_at || '';
      if (na !== nb) return na.localeCompare(nb);
      const la = a.last_contact_at || '';
      const lb = b.last_contact_at || '';
      return la.localeCompare(lb);
    });
  }

  return NextResponse.json({
    sheetId: ABEL_ACTIVE_SHEET_ID,
    columns: COLUMNS,
    grouped,
    otherCount: other.length,
    updatedAt: new Date().toISOString(),
  });
}

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

const COLUMNS = ['READY_FOR_CALL', 'NO_ANSWER', 'CALL_APPT_SET', 'QUALIFIED_TRANSFER_NOW', 'BAD_NUMBER', 'OPT_OUT'] as const;

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
  const otherCallable: any[] = [];

  const testPhoneDigits = new Set([
    // Abel test line
    '18303183675',
    '8303183675',
  ]);

  for (const r of rows) {
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const status = (row[iStatus] ?? '').trim();

    if (!status) continue;

    const phoneRaw = (row[iPhone] ?? '').trim();
    const phoneDigits = String(phoneRaw).replace(/\D/g, '');
    const leadId = (row[iLeadId] ?? '').trim();

    // Hide test/dummy leads from the live queue (keeps production clean).
    if (leadId.startsWith('AI_CB_') || testPhoneDigits.has(phoneDigits)) {
      continue;
    }

    const card = {
      lead_id: leadId,
      name: (row[iName] ?? '').trim(),
      phone: phoneRaw,
      state: (row[iState] ?? '').trim(),
      status,
      last_contact_at: (row[iLast] ?? '').trim(),
      next_action_at: (row[iNext] ?? '').trim(),
    };

    if (grouped[status]) grouped[status].push(card);
    else {
      other.push(card);
      // Treat non-DNC/non-bad buckets as callable for dialer when explicit statuses aren't set.
      if (phoneDigits && leadId) otherCallable.push(card);
    }
  }

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
    otherCallableCount: otherCallable.length,
    otherCallablePreview: otherCallable.slice(0, 200),
    updatedAt: new Date().toISOString(),
  });
}

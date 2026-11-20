import { NextResponse } from 'next/server';
import { sheetsJson } from '@/lib/hosted-sheets';
import { requireOpsAccess } from '@/lib/ops-access';
import { withApiErrorHandling } from '@/lib/api-errors';

export const runtime = 'nodejs';

const ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || 'hosted-service-account';
const ABEL_ACTIVE_SHEET_ID = process.env.UPLINE_SHEETS_SPREADSHEET_ID?.trim() || '';

function idx(headers: string[], name: string) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Missing column: ${name}`);
  return i;
}

async function getSummary(req: Request) {
  const denied = await requireOpsAccess(req, 'owner');
  if (denied) return denied;
  const headerResp = await sheetsJson(
    ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'],
    { account: ACCOUNT }
  );
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  if (!headers.length) throw new Error('No headers found');

  const dataResp = await sheetsJson(
    ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A2:AO5000'],
    { account: ACCOUNT }
  );
  const rows: string[][] = (dataResp.values ?? []) as string[][];

  const iStatus = idx(headers, 'status');
  const iApptStart = idx(headers, 'appointment_start');
  const iApptEnd = idx(headers, 'appointment_end');
  const iName = idx(headers, 'full_name');
  const iPhone = idx(headers, 'phone_primary');
  const iState = idx(headers, 'address_state');

  const counts: Record<string, number> = {
    READY_FOR_SMS: 0,
    SMS_IN_PROGRESS: 0,
    SMS_HOT: 0,
    SMS_APPT_SET: 0,
    QUALIFIED_TRANSFER_NOW: 0,
    OPT_OUT: 0,
  };

  const appts: Array<{ start: string; end: string; name: string; phone: string; state: string }> = [];

  for (const r of rows) {
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const status = (row[iStatus] ?? '').trim();
    if (status && counts[status] !== undefined) counts[status]++;

    if (status === 'SMS_APPT_SET') {
      appts.push({
        start: (row[iApptStart] ?? '').trim(),
        end: (row[iApptEnd] ?? '').trim(),
        name: (row[iName] ?? '').trim(),
        phone: (row[iPhone] ?? '').trim(),
        state: (row[iState] ?? '').trim(),
      });
    }
  }

  appts.sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  return NextResponse.json({
    sheetId: ABEL_ACTIVE_SHEET_ID,
    counts,
    appointments: appts.slice(0, 50),
    updatedAt: new Date().toISOString(),
  });
}

export const GET = withApiErrorHandling('/api/ops/summary', getSummary);

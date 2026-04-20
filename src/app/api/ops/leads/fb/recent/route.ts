import { NextResponse } from 'next/server';
import { gogJson } from '@/lib/gog';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';

const ACCOUNT = 'openclaw@uplineagent.com';
const FB_LEADS_SHEET_ID = '1VyR9uIaPPJjxXQqUle8RQZNWYdKn6G4_SN4fIrlMFKU';

function normPhone(v: string) {
  const digits = String(v || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith('+')) return digits;
  return `+${digits}`;
}

function idx(headers: string[], name: string) {
  const want = String(name || '').trim().toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === want) return i;
  }
  return -1;
}

export async function GET(req: Request) {
  await requireAgent();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)));

  // Read headers + rows from first tab.
  const headerResp = await gogJson(['sheets', 'get', FB_LEADS_SHEET_ID, 'A1:AZ1'], { account: ACCOUNT });
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  const dataResp = await gogJson(['sheets', 'get', FB_LEADS_SHEET_ID, 'A2:AZ5000'], { account: ACCOUNT });
  const rows: string[][] = (dataResp.values ?? []) as string[][];

  const iName = idx(headers, 'name');
  const iPhone = (() => {
    const candidates = ['phone number', 'phone', 'phone_number', 'phone_primary', 'mobile'];
    for (const c of candidates) {
      const i = idx(headers, c);
      if (i >= 0) return i;
    }
    return -1;
  })();
  const iDob = idx(headers, 'dob');
  const iTobacco = idx(headers, 'tobacco');
  const iBeneficiary = idx(headers, 'beneficiary');
  const iEmail = idx(headers, 'email');
  const iDate = idx(headers, 'date');

  const out: any[] = [];
  for (let r = rows.length - 1; r >= 0; r--) {
    const row = rows[r] || [];
    const name = iName >= 0 ? String(row[iName] || '').trim() : '';
    const phoneRaw = iPhone >= 0 ? String(row[iPhone] || '').trim() : '';
    const phone = normPhone(phoneRaw);
    // Keep the row even if name missing; but phone is required.
    if (!phone) continue;

    out.push({
      rowIndex: r + 2,
      name,
      phone,
      phoneRaw,
      dob: iDob >= 0 ? String(row[iDob] || '').trim() : '',
      tobacco: iTobacco >= 0 ? String(row[iTobacco] || '').trim() : '',
      beneficiary: iBeneficiary >= 0 ? String(row[iBeneficiary] || '').trim() : '',
      email: iEmail >= 0 ? String(row[iEmail] || '').trim() : '',
      submittedAt: iDate >= 0 ? String(row[iDate] || '').trim() : '',
      record: Object.fromEntries(headers.map((h, j) => [h, String(row[j] || '')])),
    });
    if (out.length >= limit) break;
  }

  return NextResponse.json({ ok: true, sheetId: FB_LEADS_SHEET_ID, limit, leads: out, updatedAt: new Date().toISOString() });
}

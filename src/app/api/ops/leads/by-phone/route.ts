import { NextResponse } from 'next/server';
import { sheetsJson } from '@/lib/hosted-sheets';
import { requireOpsAccess } from '@/lib/ops-access';
import { withApiErrorHandling } from '@/lib/api-errors';

export const runtime = 'nodejs';

const ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
// External lead sync target; configured only in the hosting secret store.
const FB_LEADS_SHEET_ID = process.env.UPLINE_FB_LEADS_SHEET_ID?.trim() || '';

function normPhone(v: string) {
  const digits = String(v || '').replace(/\D+/g, '');
  if (!digits) return '';
  // US: drop leading 1
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function idx(headers: string[], name: string) {
  const want = String(name || '').trim().toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === want) return i;
  }
  return -1;
}

async function findLeadByPhone(req: Request) {
  const denied = await requireOpsAccess(req, 'internal');
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get('phone') || '').trim();
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const needle = normPhone(phone);
  if (!needle) return NextResponse.json({ error: 'invalid phone' }, { status: 400 });

  // We intentionally use ranges without an explicit sheet tab name to target the first sheet.
  const headerResp = await sheetsJson(['sheets', 'get', FB_LEADS_SHEET_ID, 'A1:AZ1'], { account: ACCOUNT });
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  if (!headers.length) return NextResponse.json({ error: 'missing headers' }, { status: 500 });

  const dataResp = await sheetsJson(['sheets', 'get', FB_LEADS_SHEET_ID, 'A2:AZ5000'], { account: ACCOUNT });
  const rows: string[][] = (dataResp.values ?? []) as string[][];

  // Try a few common phone column names.
  const phoneCols = ['phone', 'phone_number', 'phone number', 'phone_primary', 'mobile'];
  const iPhone = phoneCols.map((c) => idx(headers, c)).find((i) => typeof i === 'number' && i >= 0);
  if (typeof iPhone !== 'number' || iPhone < 0) {
    const debug = String(searchParams.get('debug') || '') === '1';
    return NextResponse.json(
      {
        error: `No phone column found in sheet. Tried: ${phoneCols.join(', ')}`,
        headers: debug ? headers : undefined,
      },
      { status: 500 }
    );
  }

  // Scan bottom-up (most recent Zapier append wins).
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i] || [];
    const row = r.length < headers.length ? [...r, ...Array(headers.length - r.length).fill('')] : r;
    const p = normPhone(String(row[iPhone] ?? ''));
    if (p && p === needle) {
      const record: Record<string, string> = {};
      headers.forEach((h, j) => {
        const key = String(h || '').trim();
        if (!key) return;
        record[key] = String(row[j] ?? '');
      });
      return NextResponse.json({
        ok: true,
        matched: true,
        sheet_id: FB_LEADS_SHEET_ID,
        rowIndex: i + 2,
        phone: phone,
        phone_norm: needle,
        record,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true, matched: false, phone: phone, phone_norm: needle, updatedAt: new Date().toISOString() });
}

export const GET = withApiErrorHandling('/api/ops/leads/by-phone', findLeadByPhone);

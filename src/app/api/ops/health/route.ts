import { NextResponse } from 'next/server';
import { sheetsJson } from '@/lib/hosted-sheets';
import { requireOpsAccess } from '@/lib/ops-access';
import { withApiErrorHandling } from '@/lib/api-errors';

export const runtime = 'nodejs';

const ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
const ABEL_ACTIVE_SHEET_ID = process.env.UPLINE_SHEETS_SPREADSHEET_ID?.trim() || '';

function okEnv(name: string) {
  // Outgoing calls are optional; keep health green for inbound even if TWIML app SID is not set.
  if (name === 'TWILIO_TWIML_APP_SID') return true;
  return !!process.env[name];
}

async function getOpsHealth(req: Request) {
  const denied = await requireOpsAccess(req, 'internal');
  if (denied) return denied;
  const checks: Array<{ name: string; ok: boolean; detail?: any; ms?: number }> = [];

  // 1) Env sanity (presence only; no secrets)
  const envNames = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_SMS_FROM',
    'TWILIO_API_KEY_SID',
    'TWILIO_API_KEY_SECRET',
    'TWILIO_TWIML_APP_SID',
    'PUBLIC_BASE_URL',
    'AUTH_SECRET',
    'AGENTS_CONFIG_JSON',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'UPLINE_SHEETS_SPREADSHEET_ID',
  ];
  for (const n of envNames) {
    checks.push({ name: `env:${n}`, ok: okEnv(n) });
  }

  // 2) Google Sheets read check (headers row)
  const t0 = Date.now();
  try {
    const headerResp = await sheetsJson(
      ['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'],
      { account: ACCOUNT }
    );
    const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
    const required = ['lead_id', 'full_name', 'phone_primary', 'status'];
    const missing = required.filter((k) => !headers.includes(k));

    checks.push({
      name: 'sheets:abel_active_headers',
      ok: headers.length > 0 && missing.length === 0,
      detail: {
        headerCount: headers.length,
        missingRequired: missing,
      },
      ms: Date.now() - t0,
    });
  } catch (e: any) {
    checks.push({
      name: 'sheets:abel_active_headers',
      ok: false,
      detail: { error: 'unavailable' },
      ms: Date.now() - t0,
    });
  }

  // 3) Public base URL format check
  const pb = process.env.PUBLIC_BASE_URL || '';
  checks.push({
    name: 'public_base_url:format',
    ok: pb.length > 0 && /^https?:\/\//i.test(pb),
    detail: pb ? { protocol: pb.split('://')[0] } : { error: 'missing' },
  });

  const overallOk = checks.every((c) => c.ok);

  return NextResponse.json(
    {
      ok: overallOk,
      service: 'twilio-call-center',
      checks,
      now: new Date().toISOString(),
    },
    { status: overallOk ? 200 : 503 }
  );
}

export const GET = withApiErrorHandling('/api/ops/health', getOpsHealth);

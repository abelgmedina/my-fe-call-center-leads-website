import { NextResponse } from 'next/server';
import { requirePortalAccount } from '@/lib/auth';
import { isGitHubStoreConfigured, updatePortalAccountProfileInStore } from '@/lib/github-store';
import { consumeRateLimit, requestFingerprint } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limits = {
  full_name: 120,
  phone: 40,
  npn: 40,
  residence_state: 80,
  license_state: 80,
  agency_name: 180,
  sales_model: 120,
};

function clean(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max);
}

export async function GET() {
  try {
    const account = await requirePortalAccount();
    return NextResponse.json({ ok: true, account });
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  let account;
  try {
    account = await requirePortalAccount();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const attempt = consumeRateLimit('portal-profile', requestFingerprint(req, account.id), 30, 15 * 60 * 1000);
  if (!attempt.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many profile changes. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(attempt.retryAfterSeconds) } }
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });

  const profile = {
    full_name: clean(body.full_name, limits.full_name),
    phone: clean(body.phone, limits.phone),
    npn: clean(body.npn, limits.npn),
    residence_state: clean(body.residence_state, limits.residence_state),
    license_state: clean(body.license_state, limits.license_state),
    agency_name: clean(body.agency_name, limits.agency_name),
    sales_model: clean(body.sales_model, limits.sales_model),
  };

  try {
    if (isGitHubStoreConfigured()) {
      await updatePortalAccountProfileInStore(account.id, profile);
    } else {
      const { db } = await import('@/lib/db');
      db.prepare(
        `update portal_accounts
         set full_name = ?, phone = ?, npn = ?, residence_state = ?, license_state = ?,
             agency_name = ?, sales_model = ?, updated_at = ?
         where id = ? and status = 'active'`
      ).run(
        profile.full_name,
        profile.phone,
        profile.npn,
        profile.residence_state,
        profile.license_state,
        profile.agency_name,
        profile.sales_model,
        Date.now(),
        account.id
      );
    }
    const updated = await requirePortalAccount();
    return NextResponse.json({ ok: true, account: updated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not save your profile right now.' }, { status: 500 });
  }
}

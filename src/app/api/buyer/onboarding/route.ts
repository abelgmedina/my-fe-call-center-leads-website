import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireSignedInBuyer() {
  const account = await requireAgent();
  if ((account.role || 'internal') !== 'buyer' || !account.buyer_code) throw new Error('FORBIDDEN');
  return account;
}

// The former policy review and OTP flow is intentionally retired. It was a
// post-login obstacle, and it also triggered unnecessary email/SMS sends.
export async function GET() {
  try {
    await requireSignedInBuyer();
    return NextResponse.json({
      ok: true,
      status: {
        onboarding_required: false,
        verification_required: false,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
}

export async function POST() {
  try {
    await requireSignedInBuyer();
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: 'Policy and phone/email verification are no longer required after sign-in.',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
}

import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { resetConfiguredOwnerPassword, setSession } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';
import { consumeRateLimit, requestFingerprint } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

function validRecoveryToken(candidate: string) {
  const expected = String(process.env.OWNER_RESET_TOKEN || '');
  const expiresAt = Number(process.env.OWNER_RESET_EXPIRES_AT || 0);
  if (!expected || !candidate || !expiresAt || Date.now() >= expiresAt) return false;
  const supplied = Buffer.from(candidate, 'utf8');
  const configured = Buffer.from(expected, 'utf8');
  return supplied.length === configured.length && crypto.timingSafeEqual(supplied, configured);
}

export async function POST(req: Request) {
  const attempt = consumeRateLimit('owner-reset', requestFingerprint(req), 5, 15 * 60 * 1000);
  if (!attempt.allowed) {
    return response({ ok: false, error: 'Too many attempts. Please wait and try again.' }, 429);
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const token = String(body?.token || '');
  const password = String(body?.password || '');
  const confirmation = String(body?.confirmation || '');

  // Deliberately do not disclose whether an owner account or a reset token is
  // configured. A caller without the private one-time token sees a 404.
  if (!validRecoveryToken(token)) return response({ ok: false, error: 'Not found.' }, 404);
  if (password.length < 14) return response({ ok: false, error: 'Use a password with at least 14 characters.' }, 400);
  if (password !== confirmation) return response({ ok: false, error: 'Passwords do not match.' }, 400);

  try {
    const resetTokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    const ownerSessionVersion = await resetConfiguredOwnerPassword({ passwordHash: hashPassword(password), resetTokenHash });
    await setSession({ kind: 'env', agentId: 'abel', ownerSessionVersion });
    return response({ ok: true, redirectTo: '/dashboard' });
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'OWNER_ACCOUNT_NOT_FOUND'
      || error.message === 'OWNER_RESET_ALREADY_USED'
      || error.message === 'OWNER_RESET_UNAVAILABLE'
      || error.message === 'OWNER_ACCOUNT_EXISTS'
      || error.message === 'OWNER_EMAIL_IN_USE'
    )) {
      return response({ ok: false, error: 'Not found.' }, 404);
    }
    return response({ ok: false, error: 'Unable to reset the owner password. Please try again.' }, 500);
  }
}

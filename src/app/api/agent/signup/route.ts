import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAgents, setSession } from '@/lib/auth';
import { createPortalAccountInStore, isGitHubStoreConfigured } from '@/lib/github-store';
import { hashPassword } from '@/lib/passwords';
import { consumeRateLimit, requestFingerprint } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SignupBody = {
  email?: unknown;
  password?: unknown;
  full_name?: unknown;
};

function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max);
}

function validEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const attempt = consumeRateLimit('portal-signup', requestFingerprint(req), 8, 60 * 60 * 1000);
  if (!attempt.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many account attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(attempt.retryAfterSeconds) } }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as SignupBody | null;
    const email = cleanText(body?.email, 254).toLowerCase();
    const password = String(body?.password || '');
    const full_name = cleanText(body?.full_name, 120);

    if (!validEmail(email)) return jsonError('Enter a valid email address.', 400);
    if (password.length < 12 || password.length > 128) {
      return jsonError('Use a password between 12 and 128 characters.', 400);
    }

    // Do not let a public account shadow an existing internal login.
    if (getAgents().some((agent) => agent.username.toLowerCase() === email)) {
      return jsonError('An account already exists for this email. Sign in instead.', 409);
    }

    const password_hash = hashPassword(password);
    let account: { id: string; email: string; full_name?: string };

    if (isGitHubStoreConfigured()) {
      account = await createPortalAccountInStore({ email, full_name, password_hash });
    } else {
      const { db } = await import('@/lib/db');
      const existingBuyer = db.prepare('select username from buyer_users where lower(username) = lower(?)').get(email) as { username: string } | undefined;
      const existingPortal = db.prepare('select id from portal_accounts where lower(email) = lower(?)').get(email) as { id: string } | undefined;
      if (existingBuyer || existingPortal) throw new Error('ACCOUNT_EXISTS');

      const now = Date.now();
      account = { id: `portal_${crypto.randomUUID()}`, email, full_name };
      db.prepare(
        `insert into portal_accounts (
          id, email, full_name, password_hash, status, created_at, updated_at
        ) values (?, ?, ?, ?, 'active', ?, ?)`
      ).run(account.id, email, full_name, password_hash, now, now);
    }

    await setSession({ kind: 'portal', accountId: account.id, email: account.email });
    return NextResponse.json({
      ok: true,
      account: { email: account.email, full_name: account.full_name || '' },
      redirectTo: '/dashboard',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'ACCOUNT_EXISTS') {
      return jsonError('An account already exists for this email. Sign in instead.', 409);
    }
    return jsonError('We could not create your account right now. Please try again.', 500);
  }
}

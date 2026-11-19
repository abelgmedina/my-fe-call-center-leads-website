import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAgents, setSession } from '@/lib/auth';
import { createOwnerAccountInStore, isGitHubStoreConfigured } from '@/lib/github-store';
import { hashPassword } from '@/lib/passwords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function configuredEmail() {
  return String(process.env.OWNER_LOGIN_EMAIL || '').trim().toLowerCase();
}

function validSetupToken(candidate: string) {
  const expected = String(process.env.OWNER_SETUP_TOKEN || '');
  const expiresAt = Number(process.env.OWNER_SETUP_EXPIRES_AT || 0);
  if (!expected || !candidate || !expiresAt || Date.now() >= expiresAt) return false;
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const token = String(body?.token || '');
  const password = String(body?.password || '');
  const confirmation = String(body?.confirmation || '');
  const email = configuredEmail();

  // Return a generic 404 for any invalid, expired, or unconfigured setup link.
  if (!email || !validSetupToken(token)) return response({ ok: false, error: 'Not found.' }, 404);
  if (!password || password.length < 14) return response({ ok: false, error: 'Use a password with at least 14 characters.' }, 400);
  if (password !== confirmation) return response({ ok: false, error: 'Passwords do not match.' }, 400);
  if (!getAgents().some((agent) => agent.id === 'abel' && (!agent.role || agent.role === 'internal'))) {
    return response({ ok: false, error: 'Owner configuration is unavailable.' }, 503);
  }

  try {
    const passwordHash = hashPassword(password);
    if (isGitHubStoreConfigured()) {
      await createOwnerAccountInStore({ email, password_hash: passwordHash });
    } else {
      const { db } = await import('@/lib/db');
      const existing = db.prepare('select email from owner_accounts where lower(email) = lower(?)').get(email) as { email: string } | undefined;
      if (existing) throw new Error('OWNER_ACCOUNT_EXISTS');
      const existingBuyer = db.prepare('select username from buyer_users where lower(username) = lower(?)').get(email) as { username: string } | undefined;
      const existingPortal = db.prepare('select id from portal_accounts where lower(email) = lower(?)').get(email) as { id: string } | undefined;
      if (existingBuyer || existingPortal) throw new Error('OWNER_EMAIL_IN_USE');
      const now = Date.now();
      db.prepare(
        `insert into owner_accounts (email, password_hash, status, created_at, updated_at)
         values (?, ?, 'active', ?, ?)`
      ).run(email, passwordHash, now, now);
    }

    await setSession({ kind: 'env', agentId: 'abel' });
    return response({ ok: true, redirectTo: '/dashboard' });
  } catch (error) {
    if (error instanceof Error && error.message === 'OWNER_ACCOUNT_EXISTS') {
      return response({ ok: false, error: 'This setup link has already been used.' }, 409);
    }
    if (error instanceof Error && error.message === 'OWNER_EMAIL_IN_USE') {
      return response({ ok: false, error: 'That email is already assigned to another account type.' }, 409);
    }
    return response({ ok: false, error: 'Unable to complete secure setup. Please try again.' }, 500);
  }
}

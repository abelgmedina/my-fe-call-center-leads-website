import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireInternalAgent, requireOwner } from '@/lib/auth';

type OpsLevel = 'internal' | 'owner';

function suppliedOpsKey(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice('Bearer '.length).trim();
  return req.headers.get('x-upline-ops-key')?.trim() || '';
}

function validOpsKey(req: Request) {
  const expected = process.env.OPS_API_KEY || '';
  const supplied = suppliedOpsKey(req);
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(supplied, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/**
 * Gates operational APIs at the server boundary. The optional OPS_API_KEY is
 * for trusted server-to-server automation; browser traffic must hold a valid
 * internal or owner session. Restricted portal accounts never pass either.
 */
export async function requireOpsAccess(req: Request, level: OpsLevel = 'internal') {
  if (validOpsKey(req)) return null;
  try {
    if (level === 'owner') await requireOwner();
    else await requireInternalAgent();
    return null;
  } catch {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }
}

export function internalOpsHeaders(): Record<string, string> {
  const key = process.env.OPS_API_KEY || '';
  return key ? { authorization: `Bearer ${key}` } : {};
}

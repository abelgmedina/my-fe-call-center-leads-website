import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export type AgentConfig = {
  id: string; // e.g. mark
  name: string; // display name
  lang: 'en' | 'es';
  username: string;
  password: string; // v1: plaintext from env (local-only)
  role?: 'internal' | 'buyer';
  buyer_code?: string;
};

const COOKIE = 'oc_agent';

type SessionPayload =
  | { kind: 'env'; agentId: string; iat: number }
  | { kind: 'buyer'; username: string; buyer_code: string; buyer_role: 'buyer_admin' | 'buyer_agent'; iat: number };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function getAgents(): AgentConfig[] {
  const raw = process.env.AGENTS_CONFIG_JSON;
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as AgentConfig[];
}

function sign(payload: string) {
  const secret = requireEnv('AUTH_SECRET');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function setSession(payload: Omit<SessionPayload, 'iat'>) {
  const full = JSON.stringify({ ...payload, iat: Date.now() });
  const b64 = Buffer.from(full, 'utf8').toString('base64url');
  const sig = sign(b64);
  const c = await cookies();
  c.set(COOKIE, `${b64}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function clearSession() {
  const c = await cookies();
  c.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  if (!v) return null;
  const [b64, sig] = v.split('.');
  if (!b64 || !sig) return null;
  if (sign(b64) !== sig) return null;
  try {
    const json = Buffer.from(b64, 'base64url').toString('utf8');
    const data = JSON.parse(json) as SessionPayload;
    if (!data?.kind) return null;
    if (data.kind === 'env' && (data as any).agentId) return data;
    if (data.kind === 'buyer' && (data as any).username && (data as any).buyer_code) return data;
    return null;
  } catch {
    return null;
  }
}

export async function requireAgent() {
  const sess = await getSession();
  if (!sess) throw new Error('UNAUTHENTICATED');

  if (sess.kind === 'env') {
    const agent = getAgents().find((a) => a.id === sess.agentId);
    if (!agent) throw new Error('UNAUTHENTICATED');
    return agent;
  }

  // Buyer session: expose as AgentConfig-like object
  return {
    id: sess.username,
    name: sess.username,
    lang: 'en' as const,
    username: sess.username,
    password: '',
    role: 'buyer' as const,
    buyer_code: sess.buyer_code,
    buyer_role: sess.buyer_role,
  } as any;
}

export async function verifyLogin(username: string, password: string) {
  // 1) Internal/env agents
  const agents = getAgents();
  const agent = agents.find((a) => a.username.toLowerCase() === username.toLowerCase());
  if (agent) {
    const a = Buffer.from(agent.password);
    const b = Buffer.from(password);
    if (a.length !== b.length) return null;
    const ok = crypto.timingSafeEqual(a, b);
    return ok ? ({ kind: 'env' as const, agent } ) : null;
  }

  // 2) Buyer DB users
  const { db } = await import('@/lib/db');
  const { verifyPassword } = await import('@/lib/passwords');

  const row = db
    .prepare('select username, buyer_code, role, password_hash, disabled from buyer_users where lower(username) = lower(?)')
    .get(username) as any;
  if (!row || row.disabled) return null;

  const ok = verifyPassword(password, row.password_hash);
  if (!ok) return null;

  // update last_login
  try {
    db.prepare('update buyer_users set last_login_at = ?, updated_at = ? where username = ?').run(Date.now(), Date.now(), row.username);
  } catch {}

  return {
    kind: 'buyer' as const,
    buyer: {
      username: row.username,
      buyer_code: row.buyer_code,
      buyer_role: row.role as 'buyer_admin' | 'buyer_agent',
    },
  };
}

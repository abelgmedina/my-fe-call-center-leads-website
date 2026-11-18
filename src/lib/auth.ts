import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export type AgentConfig = {
  id: string;
  name: string;
  lang: 'en' | 'es';
  username: string;
  password: string;
  role?: 'internal' | 'buyer';
  buyer_code?: string;
};

export type PortalAccountProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  npn: string;
  residence_state: string;
  license_state: string;
  agency_name: string;
  sales_model: string;
  status: 'active' | 'disabled';
  created_at: number;
  updated_at: number;
  last_login_at?: number;
};

type BuyerPrincipal = {
  id: string;
  name: string;
  lang: 'en';
  username: string;
  password: '';
  role: 'buyer';
  buyer_code: string;
  buyer_role: 'buyer_admin' | 'buyer_agent';
};

type DatabasePortalAccount = Record<string, unknown>;
type LocalBuyerRow = {
  username: string;
  buyer_code: string;
  role: 'buyer_admin' | 'buyer_agent';
  password_hash: string;
  disabled: number;
};

const COOKIE = 'oc_agent';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload =
  | { kind: 'env'; agentId: string; iat: number; exp: number }
  | { kind: 'buyer'; username: string; buyer_code: string; buyer_role: 'buyer_admin' | 'buyer_agent'; iat: number; exp: number }
  | { kind: 'portal'; accountId: string; email: string; iat: number; exp: number };

type SessionInput =
  | { kind: 'env'; agentId: string }
  | { kind: 'buyer'; username: string; buyer_code: string; buyer_role: 'buyer_admin' | 'buyer_agent' }
  | { kind: 'portal'; accountId: string; email: string };

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function sign(payload: string) {
  const secret = requireEnv('AUTH_SECRET');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function signaturesMatch(a: string, b: string) {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function publicPortalAccount(account: DatabasePortalAccount): PortalAccountProfile {
  return {
    id: String(account.id),
    email: normalizedEmail(String(account.email || '')),
    full_name: String(account.full_name || ''),
    phone: String(account.phone || ''),
    npn: String(account.npn || ''),
    residence_state: String(account.residence_state || ''),
    license_state: String(account.license_state || ''),
    agency_name: String(account.agency_name || ''),
    sales_model: String(account.sales_model || ''),
    status: account.status === 'disabled' ? 'disabled' : 'active',
    created_at: Number(account.created_at || 0),
    updated_at: Number(account.updated_at || 0),
    last_login_at: account.last_login_at ? Number(account.last_login_at) : undefined,
  };
}

export function getAgents(): AgentConfig[] {
  const raw = process.env.AGENTS_CONFIG_JSON;
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as AgentConfig[];
}

export async function setSession(payload: SessionInput) {
  const now = Date.now();
  const full: SessionPayload = { ...payload, iat: now, exp: now + SESSION_TTL_SECONDS * 1000 } as SessionPayload;
  const b64 = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const sig = sign(b64);
  const c = await cookies();
  c.set(COOKIE, `${b64}.${sig}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.set(COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value;
  if (!v) return null;
  const [b64, sig] = v.split('.');
  if (!b64 || !sig || !signaturesMatch(sign(b64), sig)) return null;

  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as Record<string, unknown>;
    const iat = Number(data.iat || 0);
    const exp = Number(data.exp || 0);
    if (!data.kind || !iat || !exp || exp <= Date.now()) return null;
    if (data.kind === 'env' && typeof data.agentId === 'string') return { kind: 'env', agentId: data.agentId, iat, exp };
    if (data.kind === 'buyer' && typeof data.username === 'string' && typeof data.buyer_code === 'string' && (data.buyer_role === 'buyer_admin' || data.buyer_role === 'buyer_agent')) {
      return { kind: 'buyer', username: data.username, buyer_code: data.buyer_code, buyer_role: data.buyer_role, iat, exp };
    }
    if (data.kind === 'portal' && typeof data.accountId === 'string' && typeof data.email === 'string') return { kind: 'portal', accountId: data.accountId, email: data.email, iat, exp };
    return null;
  } catch {
    return null;
  }
}

/** Telephony/internal principal only. Restricted portal accounts never pass this helper. */
export async function requireAgent(): Promise<AgentConfig | BuyerPrincipal> {
  const sess = await getSession();
  if (!sess || sess.kind === 'portal') throw new Error('UNAUTHENTICATED');

  if (sess.kind === 'env') {
    const agent = getAgents().find((a) => a.id === sess.agentId);
    if (!agent) throw new Error('UNAUTHENTICATED');
    return agent;
  }

  return {
    id: sess.username,
    name: sess.username,
    lang: 'en' as const,
    username: sess.username,
    password: '',
    role: 'buyer' as const,
    buyer_code: sess.buyer_code,
    buyer_role: sess.buyer_role,
  };
}

export async function requireInternalAgent() {
  const agent = await requireAgent();
  if (agent.role && agent.role !== 'internal') throw new Error('FORBIDDEN');
  return agent;
}

export async function requireOwner() {
  const agent = await requireInternalAgent();
  if (agent.id !== 'abel') throw new Error('FORBIDDEN');
  return agent;
}

export async function requirePortalAccount(): Promise<PortalAccountProfile> {
  const sess = await getSession();
  if (!sess || sess.kind !== 'portal') throw new Error('UNAUTHENTICATED');

  const { getPortalAccountByIdInStore, isGitHubStoreConfigured } = await import('@/lib/github-store');
  let account: DatabasePortalAccount | null = null;
  if (isGitHubStoreConfigured()) {
    account = await getPortalAccountByIdInStore(sess.accountId) as DatabasePortalAccount | null;
  } else {
    const { db } = await import('@/lib/db');
    account = db.prepare('select * from portal_accounts where id = ?').get(sess.accountId) as DatabasePortalAccount | undefined || null;
  }

  if (!account || String(account.status || '') !== 'active' || normalizedEmail(String(account.email || '')) !== normalizedEmail(sess.email)) {
    throw new Error('UNAUTHENTICATED');
  }
  return publicPortalAccount(account);
}

export async function verifyLogin(username: string, password: string) {
  const login = username.trim();
  const agents = getAgents();
  const agent = agents.find((a) => a.username.toLowerCase() === login.toLowerCase());
  if (agent) {
    const a = Buffer.from(agent.password);
    const b = Buffer.from(password);
    if (a.length !== b.length) return null;
    return crypto.timingSafeEqual(a, b) ? ({ kind: 'env' as const, agent }) : null;
  }

  const { verifyPassword } = await import('@/lib/passwords');
  const {
    findBuyerInStore,
    findPortalAccountInStore,
    isGitHubStoreConfigured,
    markBuyerLoginInStore,
    markPortalAccountLoginInStore,
  } = await import('@/lib/github-store');

  if (isGitHubStoreConfigured()) {
    const buyerRow = await findBuyerInStore(login);
    if (buyerRow && !buyerRow.disabled && verifyPassword(password, buyerRow.password_hash)) {
      try { await markBuyerLoginInStore(buyerRow.username); } catch {}
      return {
        kind: 'buyer' as const,
        buyer: {
          username: buyerRow.username,
          buyer_code: buyerRow.buyer_code,
          buyer_role: buyerRow.role as 'buyer_admin' | 'buyer_agent',
        },
      };
    }

    const portalRow = await findPortalAccountInStore(login);
    if (!portalRow || portalRow.status !== 'active' || !verifyPassword(password, portalRow.password_hash)) return null;
    try { await markPortalAccountLoginInStore(portalRow.id); } catch {}
    return { kind: 'portal' as const, account: publicPortalAccount(portalRow) };
  }

  const { db } = await import('@/lib/db');
  const buyerRow = db
    .prepare('select username, buyer_code, role, password_hash, disabled from buyer_users where lower(username) = lower(?)')
    .get(login) as LocalBuyerRow | undefined;
  if (buyerRow && !buyerRow.disabled && verifyPassword(password, buyerRow.password_hash)) {
    try {
      db.prepare('update buyer_users set last_login_at = ?, updated_at = ? where username = ?').run(Date.now(), Date.now(), buyerRow.username);
    } catch {}
    return {
      kind: 'buyer' as const,
      buyer: {
        username: buyerRow.username,
        buyer_code: buyerRow.buyer_code,
        buyer_role: buyerRow.role as 'buyer_admin' | 'buyer_agent',
      },
    };
  }

  const portalRow = db.prepare('select * from portal_accounts where lower(email) = lower(?)').get(login) as DatabasePortalAccount | undefined;
  if (!portalRow || String(portalRow.status || '') !== 'active' || !verifyPassword(password, String(portalRow.password_hash || ''))) return null;
  try {
    db.prepare('update portal_accounts set last_login_at = ?, updated_at = ? where id = ?').run(Date.now(), Date.now(), portalRow.id);
  } catch {}
  return { kind: 'portal' as const, account: publicPortalAccount(portalRow) };
}

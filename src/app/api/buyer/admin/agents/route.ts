import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

export const runtime = 'nodejs';

function assertBuyerAdmin(me: any) {
  if ((me.role || 'internal') !== 'buyer') throw new Error('FORBIDDEN');
  if (!me.buyer_code) throw new Error('FORBIDDEN');
  if (me.buyer_role !== 'buyer_admin') throw new Error('FORBIDDEN');
}

export async function GET() {
  const me = await requireAgent();
  try {
    assertBuyerAdmin(me);
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const rows = db
    .prepare(
      `select username, role, disabled, created_at, updated_at, last_login_at
       from buyer_users where buyer_code = ? order by created_at desc`
    )
    .all(me.buyer_code) as any[];

  return NextResponse.json({ ok: true, buyer_code: me.buyer_code, rows });
}

export async function POST(req: Request) {
  const me = await requireAgent();
  try {
    assertBuyerAdmin(me);
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '').trim();
  const role = (String(body?.role || 'buyer_agent').trim() || 'buyer_agent') as 'buyer_admin' | 'buyer_agent';

  if (!username || username.length < 3) return NextResponse.json({ ok: false, error: 'username required' }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ ok: false, error: 'password must be >= 8 chars' }, { status: 400 });
  if (!['buyer_admin', 'buyer_agent'].includes(role)) return NextResponse.json({ ok: false, error: 'invalid role' }, { status: 400 });

  const now = Date.now();
  try {
    db.prepare(
      `insert into buyer_users (username, buyer_code, role, password_hash, disabled, created_at, updated_at)
       values (?, ?, ?, ?, 0, ?, ?)`
    ).run(username, me.buyer_code, role, hashPassword(password), now, now);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

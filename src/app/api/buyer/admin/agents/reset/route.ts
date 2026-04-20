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
  if (!username) return NextResponse.json({ ok: false, error: 'username required' }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ ok: false, error: 'password must be >= 8 chars' }, { status: 400 });

  const row = db.prepare('select username from buyer_users where username = ? and buyer_code = ?').get(username, me.buyer_code) as any;
  if (!row) return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });

  db.prepare('update buyer_users set password_hash = ?, updated_at = ? where username = ?').run(hashPassword(password), Date.now(), username);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { setSession, verifyLogin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as any;
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 });

  const resu = await verifyLogin(username, password);
  if (!resu) return NextResponse.json({ ok: false, error: 'Invalid login' }, { status: 401 });

  if (resu.kind === 'env') {
    await setSession({ kind: 'env', agentId: resu.agent.id } as any);
    return NextResponse.json({ ok: true, agent: { id: resu.agent.id, name: resu.agent.name, lang: resu.agent.lang, role: resu.agent.role || 'internal' } });
  }

  await setSession({ kind: 'buyer', username: resu.buyer.username, buyer_code: resu.buyer.buyer_code, buyer_role: resu.buyer.buyer_role } as any);
  return NextResponse.json({ ok: true, agent: { id: resu.buyer.username, name: resu.buyer.username, lang: 'en', role: 'buyer', buyer_code: resu.buyer.buyer_code, buyer_role: resu.buyer.buyer_role } });
}

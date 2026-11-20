import { NextResponse } from 'next/server';
import { setSession, verifyLogin } from '@/lib/auth';
import { consumeRateLimit, requestFingerprint } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getJsonErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');
    if (!username || !password) return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 });

    const attempt = consumeRateLimit('login', requestFingerprint(req, username.toLowerCase()), 10, 15 * 60 * 1000);
    if (!attempt.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many sign-in attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(attempt.retryAfterSeconds) } }
      );
    }

    const resu = await verifyLogin(username, password);
    if (!resu) return NextResponse.json({ ok: false, error: 'Invalid login' }, { status: 401 });

    if (resu.kind === 'env') {
      await setSession({ kind: 'env', agentId: resu.agent.id } as any);
      return NextResponse.json({ ok: true, agent: { id: resu.agent.id, name: resu.agent.name, lang: resu.agent.lang, role: resu.agent.role || 'internal' } });
    }

    if (resu.kind === 'portal') {
      await setSession({ kind: 'portal', accountId: resu.account.id, email: resu.account.email });
      return NextResponse.json({
        ok: true,
        agent: {
          id: resu.account.id,
          name: resu.account.full_name || resu.account.email,
          email: resu.account.email,
          lang: 'en',
          role: 'restricted_agent',
        },
      });
    }

    await setSession({ kind: 'buyer', username: resu.buyer.username, buyer_code: resu.buyer.buyer_code, buyer_role: resu.buyer.buyer_role } as any);
    return NextResponse.json({ ok: true, agent: { id: resu.buyer.username, name: resu.buyer.username, lang: 'en', role: 'buyer', buyer_code: resu.buyer.buyer_code, buyer_role: resu.buyer.buyer_role } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getJsonErrorMessage(error) }, { status: 500 });
  }
}

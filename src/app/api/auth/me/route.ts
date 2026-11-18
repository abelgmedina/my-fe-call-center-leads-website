import { NextResponse } from 'next/server';
import { getSession, getAgents, requirePortalAccount } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ ok: false }, { status: 401 });

  if (sess.kind === 'env') {
    const agent = getAgents().find((a) => a.id === sess.agentId);
    if (!agent) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, agent: { id: agent.id, name: agent.name, lang: agent.lang, username: agent.username } });
  }

  if (sess.kind === 'portal') {
    try {
      const account = await requirePortalAccount();
      return NextResponse.json({
        ok: true,
        agent: {
          id: account.id,
          name: account.full_name || account.email,
          email: account.email,
          lang: 'en',
          role: 'restricted_agent',
        },
      });
    } catch {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  return NextResponse.json({
    ok: true,
    agent: { id: sess.username, name: sess.username, lang: 'en', username: sess.username, buyer_code: sess.buyer_code, buyer_role: sess.buyer_role },
  });
}

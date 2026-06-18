import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';
import { updateAgentAccessRequestDecisionInSheet } from '@/lib/agent-access-sheets';
import { decideAccessRequestInStore, isGitHubStoreConfigured, listAccessRequestsFromStore } from '@/lib/github-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buyerCodeFrom(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);
  return base ? `buyer_${base}` : `buyer_${Date.now()}`;
}

function assertOps(me: any) {
  if (me.id !== 'abel') throw new Error('FORBIDDEN');
}

function getJsonErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export async function GET() {
  const me = await requireAgent();
  try {
    assertOps(me);
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  if (isGitHubStoreConfigured()) {
    const rows = await listAccessRequestsFromStore();
    return NextResponse.json({ ok: true, rows });
  }

  const rows = db
    .prepare(
      `select id, full_name, email, phone, npn, residence_state, license_state,
              fmo, imo, agency_name, sales_model, notes, status, decision_notes,
              decided_at, decided_by, buyer_username, buyer_code, created_at, updated_at
       from agent_access_requests
       order by case status when 'pending' then 0 when 'approved' then 1 else 2 end, created_at desc`
    )
    .all() as any[];

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const me = await requireAgent();
  try {
    assertOps(me);
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const id = Number(body?.id || 0);
  const decision = String(body?.decision || '').trim();
  const decisionNotes = String(body?.decision_notes || '').trim();
  const tempPassword = String(body?.password || '').trim();

  if (!id) return NextResponse.json({ ok: false, error: 'request id required' }, { status: 400 });
  if (!['approved', 'denied'].includes(decision)) return NextResponse.json({ ok: false, error: 'decision must be approved or denied' }, { status: 400 });

  if (isGitHubStoreConfigured()) {
    try {
      if (decision === 'denied') {
        await decideAccessRequestInStore({
          id,
          decision: 'denied',
          decisionNotes,
          decidedBy: me.id,
        });

        let sheetWarning: string | null = null;
        try {
          await updateAgentAccessRequestDecisionInSheet({
            requestId: String(id),
            status: 'denied',
            decisionNotes,
          });
        } catch (sheetError) {
          sheetWarning = getJsonErrorMessage(sheetError);
        }

        return NextResponse.json({ ok: true, status: 'denied', sheetWarning });
      }

      if (!tempPassword || tempPassword.length < 8) {
        return NextResponse.json({ ok: false, error: 'temporary password must be at least 8 characters' }, { status: 400 });
      }

      const requests = await listAccessRequestsFromStore();
      const request = requests.find((row) => row.id === id) as any;
      if (!request) return NextResponse.json({ ok: false, error: 'request not found' }, { status: 404 });

      const username = String(request.email || '').trim().toLowerCase();
      if (!username) return NextResponse.json({ ok: false, error: 'request email missing' }, { status: 400 });

      let buyerCode = buyerCodeFrom(request.agency_name || request.full_name || username);
      const buyer = await decideAccessRequestInStore({
        id,
        decision: 'approved',
        decisionNotes,
        decidedBy: me.id,
        buyerUsername: username,
        buyerCode,
        passwordHash: hashPassword(tempPassword),
      });

      if (buyer.buyer_code) buyerCode = buyer.buyer_code;

      let sheetWarning: string | null = null;
      try {
        await updateAgentAccessRequestDecisionInSheet({
          requestId: String(id),
          status: 'approved',
          decisionNotes,
          buyerUsername: username,
          buyerCode,
        });
      } catch (sheetError) {
        sheetWarning = getJsonErrorMessage(sheetError);
      }

      return NextResponse.json({ ok: true, status: 'approved', username, buyer_code: buyerCode, sheetWarning });
    } catch (error) {
      return NextResponse.json({ ok: false, error: getJsonErrorMessage(error) }, { status: 500 });
    }
  }

  const request = db.prepare('select * from agent_access_requests where id = ?').get(id) as any;
  if (!request) return NextResponse.json({ ok: false, error: 'request not found' }, { status: 404 });

  const now = Date.now();

  if (decision === 'denied') {
    db.prepare(
      `update agent_access_requests
       set status = 'denied', decision_notes = ?, decided_at = ?, decided_by = ?, updated_at = ?
       where id = ?`
    ).run(decisionNotes, now, me.id, now, id);

    let sheetWarning: string | null = null;
    try {
      await updateAgentAccessRequestDecisionInSheet({
        requestId: String(id),
        status: 'denied',
        decisionNotes,
      });
    } catch (sheetError) {
      sheetWarning = getJsonErrorMessage(sheetError);
    }

    return NextResponse.json({ ok: true, status: 'denied', sheetWarning });
  }

  if (!tempPassword || tempPassword.length < 8) {
    return NextResponse.json({ ok: false, error: 'temporary password must be at least 8 characters' }, { status: 400 });
  }

  const username = String(request.email || '').trim().toLowerCase();
  if (!username) return NextResponse.json({ ok: false, error: 'request email missing' }, { status: 400 });

  const existing = db.prepare('select username from buyer_users where lower(username) = lower(?)').get(username) as any;
  if (existing) return NextResponse.json({ ok: false, error: 'a login already exists for this email' }, { status: 409 });

  let buyerCode = buyerCodeFrom(request.agency_name || request.full_name || username);
  const dupe = db.prepare('select buyer_code from buyer_users where buyer_code = ? limit 1').get(buyerCode) as any;
  if (dupe) buyerCode = `${buyerCode}_${id}`;

  const tx = db.transaction(() => {
    db.prepare(
      `insert into buyer_users (username, buyer_code, role, password_hash, disabled, created_at, updated_at)
       values (?, ?, 'buyer_agent', ?, 0, ?, ?)`
    ).run(username, buyerCode, hashPassword(tempPassword), now, now);

    db.prepare(
      `update agent_access_requests
       set status = 'approved', decision_notes = ?, decided_at = ?, decided_by = ?,
           buyer_username = ?, buyer_code = ?, updated_at = ?
       where id = ?`
    ).run(decisionNotes, now, me.id, username, buyerCode, now, id);
  });

  tx();

  let sheetWarning: string | null = null;
  try {
    await updateAgentAccessRequestDecisionInSheet({
      requestId: String(id),
      status: 'approved',
      decisionNotes,
      buyerUsername: username,
      buyerCode,
    });
  } catch (sheetError) {
    sheetWarning = getJsonErrorMessage(sheetError);
  }

  return NextResponse.json({ ok: true, status: 'approved', username, buyer_code: buyerCode, sheetWarning });
}

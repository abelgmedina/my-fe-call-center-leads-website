import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let me: any;
  try {
    me = await requireAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const callSid = String(body?.callSid || '').trim();
  if (!callSid) return NextResponse.json({ ok: false, error: 'MISSING_CALL_SID' }, { status: 400 });

  const from = String(body?.from || '').trim();
  const fields = body?.fields ?? {};
  const notes = String(body?.notes ?? '');

  const now = Date.now();
  db.prepare(
    `insert into call_worksheets (call_sid, updated_at, agent_id, from_number, fields_json, notes)
     values (?, ?, ?, ?, ?, ?)
     on conflict(call_sid) do update set
       updated_at=excluded.updated_at,
       agent_id=excluded.agent_id,
       from_number=excluded.from_number,
       fields_json=excluded.fields_json,
       notes=excluded.notes`
  ).run(callSid, now, me?.agent?.id ?? null, from || null, JSON.stringify(fields || {}), notes);

  return NextResponse.json({ ok: true, callSid, updated_at: now });
}

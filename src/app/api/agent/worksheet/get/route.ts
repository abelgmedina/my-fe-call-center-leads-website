import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const callSid = String(searchParams.get('callSid') || '').trim();
  if (!callSid) return NextResponse.json({ ok: false, error: 'MISSING_CALL_SID' }, { status: 400 });

  const row = db
    .prepare('select call_sid, updated_at, agent_id, from_number, fields_json, notes from call_worksheets where call_sid = ?')
    .get(callSid) as any;

  if (!row) return NextResponse.json({ ok: true, found: false });

  let fields: any = {};
  try {
    fields = JSON.parse(row.fields_json || '{}');
  } catch {
    fields = {};
  }

  return NextResponse.json({
    ok: true,
    found: true,
    worksheet: {
      callSid: row.call_sid,
      updated_at: row.updated_at,
      agent_id: row.agent_id,
      from: row.from_number,
      fields,
      notes: row.notes || '',
    },
  });
}

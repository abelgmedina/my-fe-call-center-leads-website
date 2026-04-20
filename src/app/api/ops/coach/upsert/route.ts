import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

function ensure() {
  db.exec(`
    create table if not exists call_coaching (
      call_sid text primary key,
      created_at integer not null,
      updated_at integer not null,
      transcript text,
      analysis_json text
    );
  `);
}

export async function POST(req: Request) {
  ensure();
  const body = (await req.json()) as any;
  const callSid = String(body?.callSid || body?.call_sid || '').trim();
  if (!callSid) return NextResponse.json({ error: 'callSid required' }, { status: 400 });

  const transcript = String(body?.transcript || '').trim();
  const analysisJson = body?.analysis ? JSON.stringify(body.analysis) : String(body?.analysis_json || '').trim();

  db.prepare(
    `insert into call_coaching (call_sid, created_at, updated_at, transcript, analysis_json)
     values (?, ?, ?, ?, ?)
     on conflict(call_sid) do update set
       updated_at=excluded.updated_at,
       transcript=coalesce(excluded.transcript, call_coaching.transcript),
       analysis_json=coalesce(excluded.analysis_json, call_coaching.analysis_json)`
  ).run(callSid, Date.now(), Date.now(), transcript || null, analysisJson || null);

  return NextResponse.json({ ok: true });
}

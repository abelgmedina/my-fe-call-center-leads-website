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

export async function GET(req: Request) {
  ensure();
  const { searchParams } = new URL(req.url);
  const callSid = String(searchParams.get('callSid') || '').trim();
  if (!callSid) return NextResponse.json({ error: 'callSid required' }, { status: 400 });

  const row = db.prepare('select * from call_coaching where call_sid = ?').get(callSid) as any;
  if (!row) return NextResponse.json({ ok: true, found: false });

  let analysis: any = null;
  try {
    analysis = row.analysis_json ? JSON.parse(row.analysis_json) : null;
  } catch {
    analysis = null;
  }

  return NextResponse.json({
    ok: true,
    found: true,
    callSid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    transcript: row.transcript || '',
    analysis,
  });
}

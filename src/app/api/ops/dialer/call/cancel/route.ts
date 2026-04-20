import { NextResponse } from 'next/server';
import { getTwilioClient } from '@/lib/twilio';

export const runtime = 'nodejs';

/** Cancel an in-flight attempt (best-effort). Body: { callSid } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as any;
  const callSid = String(body?.callSid || '').trim();
  if (!callSid) return NextResponse.json({ error: 'callSid required' }, { status: 400 });

  try {
    const client = getTwilioClient();
    // Setting status=completed is the supported way to end a call.
    await client.calls(callSid).update({ status: 'completed' });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

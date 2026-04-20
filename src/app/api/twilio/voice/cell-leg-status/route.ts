import { NextResponse } from 'next/server';
import { setAgentCallContext, setAgentStatus } from '@/lib/db';

export const runtime = 'nodejs';

// Twilio <Number> statusCallback for the forwarded-to-cell leg.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const agent = String(searchParams.get('agent') || 'abel').trim();
  const parentCallSid = String(searchParams.get('parentCallSid') || '').trim();

  const form = await req.formData().catch(() => null);
  const callStatus = String(form?.get('CallStatus') ?? '').trim().toLowerCase();
  const callSid = String(form?.get('CallSid') ?? '').trim();

  if (callStatus === 'in-progress' || callStatus === 'answered') {
    setAgentStatus(agent, 'IN_CALL');
    setAgentCallContext(agent, 'cell', callSid || parentCallSid || null);
  }

  if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(callStatus)) {
    // If the cell leg ends, drop context; status will be set by agent console if on browser.
    setAgentCallContext(agent, 'unknown', null);
    // If you're not in a browser call, return to AVAILABLE.
    try {
      setAgentStatus(agent, 'AVAILABLE');
    } catch {}
  }

  return NextResponse.json({ ok: true });
}

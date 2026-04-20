import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const attemptRaw = String(searchParams.get('attempt') ?? '1');
  const attemptNum = Number(attemptRaw);
  const attempt = Number.isFinite(attemptNum) ? attemptNum : 1;
  const agent = String(searchParams.get('agent') ?? 'abel');
  const callSidQ = String(searchParams.get('callSid') ?? '');
  const fromQ = String(searchParams.get('from') ?? '');

  const form = await req.formData();
  const dialStatus = String(form.get('DialCallStatus') ?? '');
  const from = String(form.get('From') ?? fromQ ?? '');
  const callSid = String(form.get('CallSid') ?? callSidQ ?? '');

  const failed = ['no-answer', 'busy', 'failed', 'canceled'];
  const vr = new twilio.twiml.VoiceResponse();

  if (failed.includes(dialStatus)) {
    // Attempt 1: ring browser for ~15s (about 3–4 rings). If missed, forward to cell.
    if (attempt === 1) {
      const fallbackCell = (process.env.ABEL_FALLBACK_CELL || '+18303183675').trim();
      const dial = vr.dial({
        timeout: 20,
        action: `${publicBaseUrl()}/api/twilio/voice/dial-status?attempt=cell&agent=${encodeURIComponent(agent)}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
        method: 'POST',
        record: 'record-from-answer',
        recordingStatusCallback: `${publicBaseUrl()}/api/twilio/voice/recording-status`,
        recordingStatusCallbackMethod: 'POST',
      });
      // Status callback so the Agent Console can show "On call (cell forward)".
      dial.number(
        {
          statusCallback: `${publicBaseUrl()}/api/twilio/voice/cell-leg-status?agent=${encodeURIComponent(agent)}&parentCallSid=${encodeURIComponent(callSid)}`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST',
        } as any,
        fallbackCell
      );
      return xml(vr);
    }

    // Attempt=cell: if the cell didn't answer, offer hold or callback intake.
    if (attemptRaw === 'cell') {
      vr.redirect(
        { method: 'POST' },
        `${publicBaseUrl()}/api/twilio/voice/busy-menu?step=menu&lang=en&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`
      );
      return xml(vr);
    }

    // Default: offer hold/callback.
    vr.redirect(
      { method: 'POST' },
      `${publicBaseUrl()}/api/twilio/voice/busy-menu?step=menu&lang=en&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`
    );
    return xml(vr);
  }

  vr.hangup();
  return xml(vr);
}

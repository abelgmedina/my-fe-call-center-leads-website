import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { publicBaseUrl, requireEnv } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// TwiML for browser-initiated outbound calls (manual dial pad).
// Twilio Voice SDK sends params: To
export async function POST(req: Request) {
  const form = await req.formData();
  const toRaw = String(form.get('To') ?? '').trim();

  const vr = new twilio.twiml.VoiceResponse();
  if (!toRaw) {
    vr.say('Missing destination number.');
    vr.hangup();
    return xml(vr);
  }

  const callerId = requireEnv('TWILIO_SMS_FROM');
  vr.say({ voice: 'alice' }, 'Connecting your call.');

  const dial = vr.dial({
    callerId,
    timeout: 20,
    record: 'record-from-answer',
    recordingStatusCallback: `${publicBaseUrl()}/api/twilio/voice/recording-status`,
    recordingStatusCallbackMethod: 'POST',
  });
  dial.number(toRaw);

  return xml(vr);
}

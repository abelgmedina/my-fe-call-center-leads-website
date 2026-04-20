import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

/**
 * TwiML for outbound calls we place to a lead after they text "CALL".
 * We enqueue them so the agent can take from the /agent UI (take token dequeues oldest).
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const to = String(form.get('To') ?? '');

  const vr = new twilio.twiml.VoiceResponse();

  // Short greeting then queue (hold music can be configured in Twilio later)
  vr.say({ voice: 'alice' }, 'Thanks. Please hold while we connect you.');
  vr.pause({ length: 1 });
  vr.enqueue('support_queue');

  return xml(vr);
}

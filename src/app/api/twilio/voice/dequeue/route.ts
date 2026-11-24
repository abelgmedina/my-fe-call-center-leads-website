import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { parseVerifiedTwilioWebhook } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const verified = await parseVerifiedTwilioWebhook(req);
  if (!verified.ok) return verified.response;

  const { searchParams } = new URL(req.url);
  const identity = searchParams.get('identity') ?? (process.env.AGENT_IDENTITY ?? 'agent_abel');

  const vr = new twilio.twiml.VoiceResponse();
  const dial = vr.dial({ timeout: 30 });
  dial.client(identity);
  return xml(vr);
}

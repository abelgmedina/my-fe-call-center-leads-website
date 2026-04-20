import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const identity = searchParams.get('identity') ?? (process.env.AGENT_IDENTITY ?? 'agent_abel');

  const vr = new twilio.twiml.VoiceResponse();
  const dial = vr.dial({ timeout: 30 });
  dial.client(identity);
  return xml(vr);
}

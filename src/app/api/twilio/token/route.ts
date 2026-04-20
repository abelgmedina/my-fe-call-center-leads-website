import { NextResponse } from 'next/server';
import { jwt } from 'twilio';
import { requireEnv } from '@/lib/twilio';

export const runtime = 'nodejs';

import { requireAgent } from '@/lib/auth';

export async function GET() {
  let identity = '';
  try {
    const agent = await requireAgent();
    identity = `agent_${agent.id}`;
  } catch {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const apiKey = requireEnv('TWILIO_API_KEY_SID');
  const apiSecret = requireEnv('TWILIO_API_KEY_SECRET');

  const AccessToken = jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  const grant = new VoiceGrant({
    // Outgoing is optional (manual dialpad). If TWIML app SID isn't set, inbound still works.
    outgoingApplicationSid: twimlAppSid || undefined,
    incomingAllow: true,
  });

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 60 * 60, // 1h
  });

  token.addGrant(grant);

  return NextResponse.json({ identity, token: token.toJwt(), outgoingEnabled: !!twimlAppSid });
}

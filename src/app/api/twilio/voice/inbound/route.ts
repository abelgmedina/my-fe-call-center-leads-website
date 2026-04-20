import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/db';
import { publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const step = String(searchParams.get('step') ?? '');

  let form: FormData | null = null;
  try {
    form = await req.formData();
  } catch {
    form = null;
  }
  const from = String(form?.get('From') ?? searchParams.get('from') ?? '');
  const callSid = String(form?.get('CallSid') ?? searchParams.get('callSid') ?? '');

  // Log inbound calls so /agent can label them + ledger them for reporting.
  try {
    db.prepare(
      `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status)
       values (?, null, 'INBOUND_ADS', ?, null, null, null, ?, 'received')`
    ).run(Date.now(), from, callSid);
  } catch {}

  try {
    // canonical ledger
    const { upsertCall } = await import('@/lib/ledger');
    upsertCall({
      call_sid: callSid || 'UNKNOWN',
      direction: 'inbound',
      from_number: from,
      to_number: String(form?.get('To') ?? ''),
      buyer_code: 'upline_internal',
      campaign_code: 'unattributed',
      status: 'received',
    });
  } catch {}

  const vr = new twilio.twiml.VoiceResponse();

  // If Twilio didn't send the expected payload, fail gracefully (prevents "application error").
  if (!callSid) {
    vr.say('Sorry—there was a system error. Please try again in a moment.');
    vr.hangup();
    return xml(vr);
  }

  // Recording disclosure (CA is two-party consent; keep disclosure first).
  vr.say('This call may be recorded for quality and training.');

  // Direct route: always try Abel first.
  // Ring browser for ~15s (about 3–4 rings). If missed, /dial-status forwards to cell then busy menu.
  const dial = vr.dial({
    timeout: 15,
    action: `${publicBaseUrl()}/api/twilio/voice/dial-status?attempt=1&agent=abel&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
    method: 'POST',
    record: 'record-from-answer',
    recordingStatusCallback: `${publicBaseUrl()}/api/twilio/voice/recording-status`,
    recordingStatusCallbackMethod: 'POST',
  });
  dial.client('agent_abel');
  return xml(vr);
}


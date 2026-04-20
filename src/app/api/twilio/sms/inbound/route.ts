import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/db';
import { requireEnv, publicBaseUrl, getTwilioClient } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.MessagingResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function classify(bodyRaw: string) {
  const body = bodyRaw.trim().toLowerCase();
  if (!body) return { action: 'EMPTY' as const };
  if ([
    'stop',
    'unsubscribe',
    'cancel',
    'end',
    'quit',
    'stopall',
  ].includes(body.replace(/\s+/g, ''))) {
    return { action: 'OPT_OUT' as const };
  }
  if (body === 'call') return { action: 'CALL_REQUEST' as const };
  return { action: 'MESSAGE' as const };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const from = String(form.get('From') ?? '');
  const to = String(form.get('To') ?? '');
  const body = String(form.get('Body') ?? '');
  const messageSid = String(form.get('MessageSid') ?? '');

  const { action } = classify(body);

  db.prepare(
    `insert into sms_events (received_at, from_number, to_number, body, message_sid, action)
     values (?, ?, ?, ?, ?, ?)`
  ).run(Date.now(), from, to, body, messageSid, action);

  const client = getTwilioClient();

  // If they reply CALL, we place an outbound call to them and queue it.
  // Then the agent can "Take" from /agent (dequeues oldest).
  if (action === 'CALL_REQUEST') {
    try {
      const fromNumber = process.env.TWILIO_SMS_FROM;
      if (!fromNumber) throw new Error('Missing TWILIO_SMS_FROM');

      const voiceUrl = `${publicBaseUrl()}/api/twilio/voice/outbound`;
      const call = await client.calls.create({
        to: from,
        from: fromNumber,
        url: voiceUrl,
        method: 'POST',
      });

      // Log so /agent can label as SMS_CALL_REPLY.
      try {
        db.prepare(
          `insert into call_events (created_at, lead_id, call_type, from_number, to_number, state, bucket, call_sid, status)
           values (?, null, 'SMS_CALL_REPLY', ?, ?, null, null, ?, 'started')`
        ).run(Date.now(), fromNumber, from, call.sid);
      } catch {}
    } catch (e) {
      console.error('Failed to create outbound call for CALL request:', e);
    }
  }

  // Notify owner by SMS (best-effort)
  try {
    const alertTo = requireEnv('ALERT_TO');
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const smsFrom = process.env.TWILIO_SMS_FROM;

    const dashboardUrl = `${publicBaseUrl()}/agent`;
    const alertBody = `SMS reply from ${from}: "${body}" (action=${action}). Agent: ${dashboardUrl}`;

    if (!messagingServiceSid && !smsFrom) throw new Error('Need TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM');

    await client.messages.create({
      ...(messagingServiceSid ? { messagingServiceSid } : { from: smsFrom! }),
      to: alertTo,
      body: alertBody.slice(0, 1500),
    });
  } catch (e) {
    console.error('Failed to send SMS owner alert:', e);
  }

  // Twilio requires valid TwiML response.
  const mr = new twilio.twiml.MessagingResponse();
  // For now: no auto-reply. Later: AI agent replies here.
  return xml(mr);
}

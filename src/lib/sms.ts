import { getTwilioClient, publicBaseUrl, requireEnv } from '@/lib/twilio';
import { db } from '@/lib/db';

function pickFrom() {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const smsFrom = process.env.TWILIO_SMS_FROM;
  if (messagingServiceSid) return { messagingServiceSid } as const;
  if (smsFrom) return { from: smsFrom } as const;
  throw new Error('Need TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM');
}

export function renderTemplate({
  template,
  name,
}: {
  template: 'initial' | 'evening_bump';
  name?: string;
}) {
  const who = name ? `${name}, ` : '';
  const agentUrl = `${publicBaseUrl()}/agent`;

  if (template === 'initial') {
    return `Hi ${who}this is Abel’s team. Tried reaching you about burial/cremation expense coverage. Reply CALL to talk now or text a good time. STOP to opt out. ${agentUrl}`;
  }

  // evening bump (softer)
  return `Just following up from earlier today — still want info on burial/cremation expense coverage? Reply CALL to talk. STOP to opt out. ${agentUrl}`;
}

export async function sendOutboundSms(params: {
  lead_id?: string | null;
  to: string;
  body: string;
  template: string;
  dryRun: boolean;
}) {
  const createdAt = Date.now();

  if (params.dryRun) {
    db.prepare(
      `insert into sms_outbound_events (created_at, lead_id, to_number, template, body, status, message_sid, error)
       values (?, ?, ?, ?, ?, 'dry_run', null, null)`
    ).run(createdAt, params.lead_id ?? null, params.to, params.template, params.body);
    return { ok: true, dryRun: true };
  }

  const client = getTwilioClient();

  try {
    const msg = await client.messages.create({
      ...pickFrom(),
      to: params.to,
      body: params.body.slice(0, 1500),
    } as any);

    db.prepare(
      `insert into sms_outbound_events (created_at, lead_id, to_number, template, body, status, message_sid, error)
       values (?, ?, ?, ?, ?, 'sent', ?, null)`
    ).run(createdAt, params.lead_id ?? null, params.to, params.template, params.body, msg.sid);

    return { ok: true, dryRun: false, sid: msg.sid };
  } catch (e: any) {
    db.prepare(
      `insert into sms_outbound_events (created_at, lead_id, to_number, template, body, status, message_sid, error)
       values (?, ?, ?, ?, ?, 'error', null, ?)`
    ).run(createdAt, params.lead_id ?? null, params.to, params.template, params.body, e?.message || String(e));

    return { ok: false, error: e?.message || String(e) };
  }
}

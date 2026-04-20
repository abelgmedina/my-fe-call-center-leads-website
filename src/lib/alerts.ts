import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { getTwilioClient, publicBaseUrl, requireEnv } from '@/lib/twilio';

export function createTakeToken(params: { callerFrom?: string; callSid?: string }) {
  const token = crypto.randomBytes(24).toString('hex');
  const createdAt = Date.now();
  const expiresAt = createdAt + 10 * 60 * 1000; // 10 min

  db.prepare(
    `insert into take_tokens (token, created_at, expires_at, used_at, caller_from, call_sid)
     values (?, ?, ?, null, ?, ?)`
  ).run(token, createdAt, expiresAt, params.callerFrom ?? null, params.callSid ?? null);

  return { token, createdAt, expiresAt };
}

export function getTakeToken(token: string) {
  return db
    .prepare('select token, created_at, expires_at, used_at, caller_from, call_sid from take_tokens where token = ?')
    .get(token) as
    | {
        token: string;
        created_at: number;
        expires_at: number;
        used_at: number | null;
        caller_from: string | null;
        call_sid: string | null;
      }
    | undefined;
}

export function markTokenUsed(token: string) {
  db.prepare('update take_tokens set used_at = ? where token = ? and used_at is null').run(Date.now(), token);
}

export async function sendWaitingSmsAlert(params: { token: string; callerFrom?: string; status: string }) {
  const client = getTwilioClient();
  const from = requireEnv('TWILIO_SMS_FROM');
  const to = requireEnv('ALERT_TO');

  const takeUrl = `${publicBaseUrl()}/take?token=${encodeURIComponent(params.token)}`;
  const caller = params.callerFrom ? ` from ${params.callerFrom}` : '';

  const body = `Caller waiting${caller}. Status: ${params.status}. Tap to take: ${takeUrl}`;

  await client.messages.create({ from, to, body });
}

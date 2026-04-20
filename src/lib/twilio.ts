import twilio from 'twilio';

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getTwilioClient() {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  return twilio(accountSid, authToken);
}

export function publicBaseUrl() {
  // Must be https and publicly reachable (ngrok/cloudflared)
  return requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '');
}

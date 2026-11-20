import twilio from 'twilio';
import { NextResponse } from 'next/server';

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
  // Must be the externally reachable HTTPS base URL for this hosted app.
  return requireEnv('PUBLIC_BASE_URL').replace(/\/$/, '');
}

type VerifiedTwilioWebhook =
  | { ok: true; form: FormData }
  | { ok: false; response: NextResponse };

function webhookFailure(status: number, error: 'INVALID_WEBHOOK' | 'WEBHOOK_VERIFICATION_UNAVAILABLE') {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

function callbackUrlForRequest(req: Request): string | null {
  const configuredBase = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '');
  if (!configuredBase) return null;

  try {
    const base = new URL(configuredBase);
    const incoming = new URL(req.url);

    // Twilio signs the exact callback URL. Require a public HTTPS base instead
    // of trusting an arbitrary Host header supplied to a serverless runtime.
    if (base.protocol !== 'https:') return null;

    return `${base.origin}${incoming.pathname}${incoming.search}`;
  } catch {
    return null;
  }
}

function formParameters(form: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    // Twilio's form webhooks use string values. Ignore an unexpected uploaded
    // file rather than accidentally coercing it into a signature parameter.
    if (typeof value === 'string') params[key] = value;
  });
  return params;
}

/**
 * Parses and authenticates a Twilio form webhook before the route can make any
 * state change. The configured public base URL is deliberately required: a
 * fallback to a request Host header would weaken signature verification behind
 * a proxy/serverless host.
 */
export async function parseVerifiedTwilioWebhook(req: Request): Promise<VerifiedTwilioWebhook> {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const signature = req.headers.get('x-twilio-signature')?.trim();
  const callbackUrl = callbackUrlForRequest(req);

  if (!authToken || !callbackUrl) {
    console.warn('twilio_webhook_verification_unavailable', {
      path: new URL(req.url).pathname,
      hasAuthToken: Boolean(authToken),
      hasPublicBaseUrl: Boolean(callbackUrl),
    });
    return { ok: false, response: webhookFailure(503, 'WEBHOOK_VERIFICATION_UNAVAILABLE') };
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, response: webhookFailure(400, 'INVALID_WEBHOOK') };
  }

  let isValid = false;
  try {
    isValid = Boolean(signature) && twilio.validateRequest(authToken, signature!, callbackUrl, formParameters(form));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    console.warn('twilio_webhook_signature_rejected', {
      path: new URL(req.url).pathname,
    });
    return { ok: false, response: webhookFailure(403, 'INVALID_WEBHOOK') };
  }

  return { ok: true, form };
}

import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { getTwilioClient, publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

/**
 * Redirect an active Twilio call into the AI Intake IVR (speech gather).
 * Body: { callSid: string, lang?: 'en'|'es' }
 */
export async function POST(req: Request) {
  try {
    await requireAgent();
  } catch {
    return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const callSid = String(body?.callSid || '').trim();
  const from = String(body?.from || '').trim();
  const lang = (String(body?.lang || 'en').trim().toLowerCase() === 'es' ? 'es' : 'en') as 'en' | 'es';

  if (!callSid) return NextResponse.json({ ok: false, error: 'callSid required' }, { status: 400 });

  const url = `${publicBaseUrl()}/api/twilio/voice/ai-intake?step=welcome&lang=${encodeURIComponent(lang)}&callSid=${encodeURIComponent(callSid)}${from ? `&from=${encodeURIComponent(from)}` : ''}`;

  const client = getTwilioClient();
  try {
    await client.calls(callSid).update({
      url,
      method: 'POST',
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    // Twilio SDK often includes status/code in message; return it so the UI can show something actionable.
    return NextResponse.json({ ok: false, error: `TWILIO_UPDATE_FAILED: ${msg}`, callSid }, { status: 500 });
  }

  return NextResponse.json({ ok: true, callSid, lang, url });
}

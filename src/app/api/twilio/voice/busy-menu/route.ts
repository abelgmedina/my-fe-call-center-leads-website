import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const step = String(searchParams.get('step') ?? 'menu');
  const lang = (String(searchParams.get('lang') ?? 'en').toLowerCase() === 'es' ? 'es' : 'en') as 'en' | 'es';

  const form = await req.formData();
  const from = String(form.get('From') ?? searchParams.get('from') ?? '');
  const callSid = String(form.get('CallSid') ?? searchParams.get('callSid') ?? '');

  const vr = new twilio.twiml.VoiceResponse();

  if (step === 'menu') {
    // Two options: hold with music, or callback intake.
    const gather = vr.gather({
      numDigits: 1,
      timeout: 7,
      action: `${publicBaseUrl()}/api/twilio/voice/busy-menu?step=choose&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
      method: 'POST',
    });

    // Keep wording compliant and short.
    gather.say(
      lang === 'es'
        ? 'Todos nuestros agentes estan ocupados. Oprima 1 para esperar en la linea con musica. Oprima 2 si prefiere una llamada de regreso.'
        : 'All agents are currently busy. Press 1 to hold with music. Press 2 if you prefer a call back.'
    );

    // No input -> default to hold.
    vr.redirect({ method: 'POST' }, `${publicBaseUrl()}/api/twilio/voice/hold?lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  const digits = String(form.get('Digits') ?? '').trim();
  if (digits === '2') {
    vr.redirect(
      { method: 'POST' },
      `${publicBaseUrl()}/api/twilio/voice/ai-intake?step=welcome&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`
    );
    return xml(vr);
  }

  // Default: hold
  vr.redirect({ method: 'POST' }, `${publicBaseUrl()}/api/twilio/voice/hold?lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
  return xml(vr);
}

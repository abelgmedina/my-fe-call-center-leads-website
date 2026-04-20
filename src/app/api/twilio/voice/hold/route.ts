import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getAgentStatus } from '@/lib/db';
import { publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

function t(lang: 'en' | 'es', en: string, es: string) {
  return lang === 'es' ? es : en;
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const lang = (String(searchParams.get('lang') ?? 'en').toLowerCase() === 'es' ? 'es' : 'en') as 'en' | 'es';
  const from = String(searchParams.get('from') ?? '').trim();
  const callSid = String(searchParams.get('callSid') ?? '').trim();
  const loops = Number(String(searchParams.get('loops') ?? '0')) || 0;

  const vr = new twilio.twiml.VoiceResponse();

  // If agent becomes available, connect immediately.
  try {
    const st = getAgentStatus('abel');
    if (st === 'AVAILABLE') {
      vr.say(t(lang, 'Thanks for holding. Connecting you now.', 'Gracias por esperar. Le conecto ahora.'));
      const dial = vr.dial({
        timeout: 20,
        action: `${publicBaseUrl()}/api/twilio/voice/dial-status?attempt=1&agent=abel&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
        method: 'POST',
        record: 'record-from-answer',
        recordingStatusCallback: `${publicBaseUrl()}/api/twilio/voice/recording-status`,
        recordingStatusCallbackMethod: 'POST',
      });
      dial.client('agent_abel');
      return xml(vr);
    }
  } catch {
    // If status read fails, keep holding.
  }

  // Hold loop: offer callback option during hold, and provide an estimated wait message.
  const gather = vr.gather({
    numDigits: 1,
    timeout: 3,
    action: `${publicBaseUrl()}/api/twilio/voice/busy-menu?step=choose&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
    method: 'POST',
  });

  if (loops % 2 == 0) {
    gather.say(
      t(
        lang,
        'Please hold. Estimated wait time is about two minutes. To request a callback instead, press 2.',
        'Por favor espere. El tiempo de espera es de aproximadamente dos minutos. Para recibir una llamada de regreso, oprima 2.'
      )
    );
  }

  // Classic Twilio demo hold music (short segment), then re-check.
  gather.play({ loop: 1 }, 'https://demo.twilio.com/docs/classic.mp3');

  vr.redirect(
    { method: 'POST' },
    `${publicBaseUrl()}/api/twilio/voice/hold?lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}&loops=${loops + 1}`
  );

  return xml(vr);
}

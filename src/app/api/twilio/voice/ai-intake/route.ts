import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db, getAgentStatus } from '@/lib/db';
import { createTakeToken, sendWaitingSmsAlert } from '@/lib/alerts';
import { gogJson } from '@/lib/gog';
import { tzForState, localParts } from '@/lib/timezones';
import { publicBaseUrl } from '@/lib/twilio';

export const runtime = 'nodejs';

const ACCOUNT = 'openclaw@uplineagent.com';
const ABEL_ACTIVE_SHEET_ID = '1473l2syLNz5ipDyo7olvetRdNsKdtPiC_nB9nLzEbbI';

function xml(res: twilio.twiml.VoiceResponse) {
  return new NextResponse(res.toString(), { headers: { 'Content-Type': 'text/xml' } });
}

function t(lang: 'en' | 'es', en: string, es: string) {
  return lang === 'es' ? es : en;
}

// Basic storage for intake fields keyed by callSid.
function ensureTable() {
  db.exec(`
    create table if not exists ai_intake (
      call_sid text primary key,
      created_at integer not null,
      from_number text,
      lang text,
      name text,
      age text,
      state text,
      hobby text,
      phone_confirmed integer,
      callback_pref text
    );
  `);
  // Lightweight migration for older DBs
  try { db.prepare('alter table ai_intake add column age text').run(); } catch {}
}

function upsert(callSid: string, patch: Record<string, any>) {
  ensureTable();
  const existing = db.prepare('select call_sid from ai_intake where call_sid = ?').get(callSid) as any;
  if (!existing) {
    db.prepare('insert into ai_intake (call_sid, created_at, from_number, lang, phone_confirmed) values (?, ?, ?, ?, 0)').run(
      callSid,
      Date.now(),
      patch.from_number ?? null,
      patch.lang ?? 'en',
    );
  }
  const keys = Object.keys(patch);
  for (const k of keys) {
    if (k === 'call_sid' || k === 'created_at') continue;
    db.prepare(`update ai_intake set ${k} = ? where call_sid = ?`).run(patch[k], callSid);
  }
}

function get(callSid: string) {
  ensureTable();
  return db.prepare('select * from ai_intake where call_sid = ?').get(callSid) as any;
}

function idx(headers: string[], name: string) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Missing column: ${name}`);
  return i;
}

function colLetter(n0: number) {
  let n = n0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function updateLeadByPhone(params: { phone: string; summary: string; nextActionIso: string; name?: string; callSid?: string }) {
  // Find lead row by phone_primary (simple v1; if duplicates, updates first match)
  const headerResp = await gogJson(['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A1:AO1'], { account: ACCOUNT });
  const headers: string[] = (headerResp.values?.[0] ?? []) as string[];
  const dataResp = await gogJson(['sheets', 'get', ABEL_ACTIVE_SHEET_ID, 'MASTER_LEADS!A2:AO5000'], { account: ACCOUNT });
  const rows: string[][] = (dataResp.values ?? []) as string[][];

  const iPhone = idx(headers, 'phone_primary');
  const iName = headers.indexOf('full_name');
  const iStatus = idx(headers, 'status');
  const iNext = idx(headers, 'next_action_at');
  const iOutcome = idx(headers, 'last_outcome');
  const iNotes = idx(headers, 'notes');

  let rowIndex: number | null = null;
  let existingNotes = '';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const p = String(r[iPhone] ?? '').trim();
    if (p === params.phone) {
      rowIndex = i + 2;
      existingNotes = String(r[iNotes] ?? '').trim();
      break;
    }
  }
  if (!rowIndex) {
    // Append a new lead row so it shows up in /ops/call-queue.
    const nowIso = new Date().toISOString();
    const row: string[] = Array(headers.length).fill('');

    const getI = (col: string) => headers.indexOf(col);
    const setIf = (col: string, val: string) => {
      const i = getI(col);
      if (i >= 0) row[i] = val;
    };

    const leadId = `AI_CB_${(params.callSid || 'NO_SID').slice(0, 10)}_${Date.now()}`;

    setIf('lead_id', leadId);
    setIf('full_name', params.name || '');
    setIf('phone_primary', params.phone);
    setIf('status', 'CALL_APPT_SET');
    setIf('next_action_at', params.nextActionIso);
    setIf('last_contact_at', nowIso);
    setIf('last_outcome', 'CALLBACK_REQUESTED');
    setIf('notes', `AI INTAKE CALLBACK (new lead): ${params.summary}`);
    setIf('owner', 'Abel');
    setIf('language', 'en');

    await gogJson(
      [
        'sheets',
        'append',
        ABEL_ACTIVE_SHEET_ID,
        'MASTER_LEADS!A:AO',
        '--values-json',
        JSON.stringify([row]),
        '--insert',
        'INSERT_ROWS',
        '--input',
        'USER_ENTERED',
      ],
      { account: ACCOUNT }
    );

    return { ok: true, appended: true, leadId } as any;
  }

  const newNotes = `${existingNotes ? existingNotes + '\n' : ''}AI INTAKE CALLBACK: ${params.summary}`;

  const cols = [iStatus, iNext, iOutcome, iNotes].filter((n) => n >= 0);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  const values: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    if (c === iStatus) values.push('CALL_APPT_SET');
    else if (c === iNext) values.push(params.nextActionIso);
    else if (c === iOutcome) values.push('CALLBACK_REQUESTED');
    else if (c === iNotes) values.push(newNotes);
    else values.push('');
  }

  const range = `MASTER_LEADS!${colLetter(minCol)}${rowIndex}:${colLetter(maxCol)}${rowIndex}`;
  await gogJson(['sheets', 'update', ABEL_ACTIVE_SHEET_ID, range, '--values-json', JSON.stringify([values]), '--input', 'USER_ENTERED'], { account: ACCOUNT });

  // Best-effort: if full_name is blank and we collected a name, set it.
  try {
    if (iName >= 0 && params.name) {
      const existingName = String((rows[rowIndex - 2] || [])[iName] ?? '').trim();
      if (!existingName) {
        const r2 = `MASTER_LEADS!${colLetter(iName)}${rowIndex}:${colLetter(iName)}${rowIndex}`;
        await gogJson(['sheets', 'update', ABEL_ACTIVE_SHEET_ID, r2, '--values-json', JSON.stringify([[params.name]]), '--input', 'USER_ENTERED'], { account: ACCOUNT });
      }
    }
  } catch {}

  return { ok: true, rowIndex };
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const step = String(searchParams.get('step') ?? 'welcome');
  const lang = (String(searchParams.get('lang') ?? 'en').toLowerCase() === 'es' ? 'es' : 'en') as 'en' | 'es';

  const form = await req.formData();
  const from = String(form.get('From') ?? searchParams.get('from') ?? '');
  const callSid = String(form.get('CallSid') ?? searchParams.get('callSid') ?? '');

  const vr = new twilio.twiml.VoiceResponse();

  if (!callSid) {
    vr.say('Missing call identifier.');
    vr.hangup();
    return xml(vr);
  }

  upsert(callSid, { from_number: from, lang });

  // Twilio SpeechResult often includes punctuation or extra words. Use word-boundary matching.
  const yesRe = /\b(yes|yeah|yep|yup|si|sí|simon|claro|correcto|afirmativo)\b/i;
  const noRe = /\b(no|nope|nah|negativo)\b/i;

  if (step === 'welcome') {
    vr.say(
      t(
        lang,
        "All agents are busy right now. If you'd like, I can take a few quick details and a licensed agent will call you back shortly.",
        'Todos nuestros agentes estan ocupados. Si gusta, puedo tomar unos datos rapidos y un agente con licencia le devolvera la llamada en breve.'
      )
    );
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=phone_confirm_speech&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'phone_confirm_speech') {
    // Accept speech OR keypad in one shot (speech can be flaky on some carriers).
    const gather = vr.gather({
      input: ['speech', 'dtmf'],
      numDigits: 1,
      speechTimeout: 'auto',
      timeout: 6,
      action: `/api/twilio/voice/ai-intake?step=phone_confirm_mix_result&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`,
      method: 'POST',
    });
    gather.say(
      t(
        lang,
        `To confirm, is ${from} the best number to call you back? Say yes, or press 1. Say no, or press 2.`,
        `Para confirmar, ${from} es el mejor numero para devolver la llamada? Diga si o oprima 1. Diga no u oprima 2.`
      )
    );
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=phone_confirm_speech&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'phone_confirm_mix_result') {
    const digits = String(form.get('Digits') ?? '').trim();
    const saidRaw = String(form.get('SpeechResult') ?? '').trim();
    const said = saidRaw
      .toLowerCase()
      .replace(/[\u2019']/g, "'")
      .replace(/[^a-z0-9\sáéíóúüñ']/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const isYes = digits === '1' || yesRe.test(said);
    const isNo = digits === '2' || noRe.test(said);

    if (isYes) {
      upsert(callSid, { phone_confirmed: 1 });
      vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=benefits_confirm&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
      return xml(vr);
    }

    if (isNo) {
      upsert(callSid, { phone_confirmed: 0 });
      vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=phone_capture&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
      return xml(vr);
    }

    // unclear -> ask again (same combined prompt)
    console.error('AI intake phone confirm unclear', { callSid, digits, saidRaw });
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=phone_confirm_speech&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'phone_capture') {
    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 6, action: `/api/twilio/voice/ai-intake?step=benefits_confirm&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'Please say the best phone number to call you back.', 'Por favor diga el mejor numero de telefono para devolverle la llamada.'));
    // Store whatever they say into notes/summary later; not used for routing yet.
    const spoken = String(form.get('SpeechResult') ?? '').trim();
    if (spoken) upsert(callSid, { from_number: spoken });
    return xml(vr);
  }

  if (step === 'benefits_confirm') {
    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 5, action: `/api/twilio/voice/ai-intake?step=benefits_confirm_result&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'Just to confirm, are you calling about funeral insurance benefits? Please say yes or no.', 'Para confirmar, esta llamando por beneficios de seguro funerario? Diga si o no.'));
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=benefits_confirm&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'benefits_confirm_result') {
    const said = String(form.get('SpeechResult') ?? '').trim();
    if (noRe.test(said)) {
      vr.say(t(lang, 'Thanks. A licensed agent will call you back shortly.', 'Gracias. Un agente con licencia le devolvera la llamada pronto.'));
      vr.hangup();
      return xml(vr);
    }
    // default yes/unclear -> proceed
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=state&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'state') {
    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 6, action: `/api/twilio/voice/ai-intake?step=first_name&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'What state are you calling from?', 'De que estado esta llamando?'));
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=state&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'first_name') {
    const stateSpoken = String(form.get('SpeechResult') ?? '').trim();
    if (stateSpoken) upsert(callSid, { state: stateSpoken });

    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 6, action: `/api/twilio/voice/ai-intake?step=age&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'What is your first name?', 'Cual es su primer nombre?'));
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=first_name&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'age') {
    const name = String(form.get('SpeechResult') ?? '').trim();
    if (name) upsert(callSid, { name });

    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 6, action: `/api/twilio/voice/ai-intake?step=hobby&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'What is your age?', 'Cual es su edad?'));
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=age&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'hobby') {
    const age = String(form.get('SpeechResult') ?? '').trim();
    if (age) upsert(callSid, { age });

    const gather = vr.gather({ input: ['speech'], speechTimeout: 'auto', timeout: 6, action: `/api/twilio/voice/ai-intake?step=finish&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`, method: 'POST' });
    gather.say(t(lang, 'Last question — what is your favorite hobby?', 'Ultima pregunta — cual es su pasatiempo favorito?'));
    vr.say(t(lang, "Sorry, I didn't catch that.", 'Perdon, no lo entendi.'));
    vr.redirect({ method: 'POST' }, `/api/twilio/voice/ai-intake?step=hobby&lang=${lang}&callSid=${encodeURIComponent(callSid)}&from=${encodeURIComponent(from)}`);
    return xml(vr);
  }

  if (step === 'finish') {
    const hobby = String(form.get('SpeechResult') ?? '').trim();
    if (hobby) upsert(callSid, { hobby });

    const s = get(callSid);
    const nextAction = new Date(Date.now() + 15 * 60 * 1000);

    const summary = `reason=funeral_benefits; state=${s.state || ''}; name=${s.name || ''}; age=${s.age || ''}; phone_confirmed=${s.phone_confirmed ? 'yes' : 'no'}; hobby=${s.hobby || ''};`;

    // Best-effort: update lead in master sheet so it shows up in the call queue.
    try {
      await updateLeadByPhone({ phone: from, summary, nextActionIso: nextAction.toISOString(), name: s.name || '', callSid });
    } catch (e) {
      console.error('updateLeadByPhone failed', e);
    }

    // If Abel is available, offer immediate warm connect; otherwise complete callback capture.
    try {
      const abel = getAgentStatus('abel');
      if (abel === 'AVAILABLE') {
        vr.say(t(lang, 'Thank you. Please hold while I connect you to a licensed agent.', 'Gracias. Por favor espere mientras le conecto con un agente con licencia.'));
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
    } catch {}

    vr.say(
      t(
        lang,
        'Thank you. A state-licensed agent will call you back shortly at the number you confirmed. Goodbye.',
        'Gracias. Un agente con licencia le devolvera la llamada pronto al numero que confirmo. Adios.'
      )
    );
    vr.hangup();
    return xml(vr);
  }

  vr.say('Ok.');
  vr.hangup();
  return xml(vr);
}

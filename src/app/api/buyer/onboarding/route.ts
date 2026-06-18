import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAgent } from '@/lib/auth';
import { getTwilioClient } from '@/lib/twilio';
import { getBuyerOnboardingFromStore, updateBuyerInStore } from '@/lib/github-store';
import { hashPassword, verifyPassword } from '@/lib/passwords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function code() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function ipFrom(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function requireBuyer() {
  const me: any = await requireAgent();
  if ((me.role || 'internal') !== 'buyer' || !me.buyer_code) throw new Error('FORBIDDEN');
  return me;
}

export async function GET() {
  try {
    const me = await requireBuyer();
    const status = await getBuyerOnboardingFromStore(me.username);
    return NextResponse.json({ ok: true, status });
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
}

export async function POST(req: Request) {
  let me: any;
  try {
    me = await requireBuyer();
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const action = String(body?.action || '').trim();

  if (action === 'agree_policies') {
    const reviews = body?.reviews || {};
    if (!reviews.terms || !reviews.privacy || !reviews.lead_replacement) {
      return NextResponse.json({ ok: false, error: 'all policies must be reviewed and checked' }, { status: 400 });
    }

    const buyer = await updateBuyerInStore(me.username, (row) => {
      row.policy_reviews = {
        terms: Date.now(),
        privacy: Date.now(),
        lead_replacement: Date.now(),
      };
      row.policies_agreed_at = Date.now();
      row.agreement_ip = ipFrom(req);
    });

    return NextResponse.json({ ok: true, status: buyer });
  }

  if (action === 'send_email_code') {
    const pin = code();
    await updateBuyerInStore(me.username, (row) => {
      row.email_code_hash = hashPassword(pin);
      row.email_code_expires_at = Date.now() + 10 * 60 * 1000;
    });

    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: 'RESEND_API_KEY is not configured' }, { status: 500 });

    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: 'UplineAgent Verification <onboarding@resend.dev>',
      to: [me.username],
      subject: 'Your UplineAgent verification code',
      text: `Your UplineAgent email verification code is ${pin}. It expires in 10 minutes.`,
    });

    if (result.error) return NextResponse.json({ ok: false, error: result.error.message || 'email send failed' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'verify_email_code') {
    const pin = String(body?.code || '').trim();
    const status = await getBuyerOnboardingFromStore(me.username);
    const buyer = await updateBuyerInStore(me.username, (row) => {
      if (!row.email_code_hash || !row.email_code_expires_at || row.email_code_expires_at < Date.now()) throw new Error('email code expired');
      if (!verifyPassword(pin, row.email_code_hash)) throw new Error('invalid email code');
      row.email_verified_at = Date.now();
    });
    return NextResponse.json({ ok: true, status: { ...status, email_verified_at: buyer.email_verified_at } });
  }

  if (action === 'send_phone_code') {
    const status = await getBuyerOnboardingFromStore(me.username);
    const phone = String(body?.phone || status?.phone || '').trim();
    if (!phone) return NextResponse.json({ ok: false, error: 'phone is required' }, { status: 400 });

    const pin = code();
    await updateBuyerInStore(me.username, (row) => {
      row.phone = phone;
      row.phone_code_hash = hashPassword(pin);
      row.phone_code_expires_at = Date.now() + 10 * 60 * 1000;
    });

    const from = process.env.TWILIO_MESSAGING_SERVICE_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : process.env.TWILIO_SMS_FROM
        ? { from: process.env.TWILIO_SMS_FROM }
        : null;
    if (!from) return NextResponse.json({ ok: false, error: 'TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM is not configured' }, { status: 500 });

    const client = getTwilioClient();
    await client.messages.create({
      ...from,
      to: phone,
      body: `Your UplineAgent phone verification code is ${pin}. It expires in 10 minutes.`,
    } as any);

    return NextResponse.json({ ok: true });
  }

  if (action === 'verify_phone_code') {
    const pin = String(body?.code || '').trim();
    const status = await getBuyerOnboardingFromStore(me.username);
    const buyer = await updateBuyerInStore(me.username, (row) => {
      if (!row.phone_code_hash || !row.phone_code_expires_at || row.phone_code_expires_at < Date.now()) throw new Error('phone code expired');
      if (!verifyPassword(pin, row.phone_code_hash)) throw new Error('invalid phone code');
      row.phone_verified_at = Date.now();
    });
    return NextResponse.json({ ok: true, status: { ...status, phone_verified_at: buyer.phone_verified_at } });
  }

  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}

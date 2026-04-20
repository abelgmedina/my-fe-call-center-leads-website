import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim();
    const phone = String(body?.phone || '').trim();
    const inquiry = String(body?.inquiry || '').trim();

    if (!name || !email || !phone || !inquiry) {
      return NextResponse.json({ ok: false, error: 'All fields are required.' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing RESEND_API_KEY' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'UplineAgent Contact <onboarding@resend.dev>',
      to: ['agm@uplineagent.com'],
      replyTo: email,
      subject: `New contact inquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nInquiry:\n${inquiry}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to send inquiry.' }, { status: 500 });
  }
}

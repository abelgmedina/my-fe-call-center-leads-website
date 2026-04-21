import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as any;
    const full_name = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim();
    const phone = String(body?.phone || '').trim();
    const npn = String(body?.npn || '').trim();
    const agency_name = String(body?.agency_name || '').trim();
    const notes = String(body?.notes || '').trim();

    if (!full_name || !email || !phone) {
      return NextResponse.json({ ok: false, error: 'Name, email, and phone are required.' }, { status: 400 });
    }

    const now = Date.now();
    const result = db
      .prepare(
        `insert into agent_access_requests (full_name, email, phone, npn, agency_name, notes, status, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .run(full_name, email, phone, npn || null, agency_name || null, notes || null, now, now);

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'UplineAgent Access <onboarding@resend.dev>',
          to: ['agm@uplineagent.com'],
          replyTo: email,
          subject: `New agent access request: ${full_name}`,
          text:
            `New agent access request\n\n` +
            `Name: ${full_name}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone}\n` +
            `NPN: ${npn || '-'}\n` +
            `Agency: ${agency_name || '-'}\n` +
            `Notes: ${notes || '-'}\n` +
            `Request ID: ${result.lastInsertRowid}`,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true, requestId: result.lastInsertRowid });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to submit request.' }, { status: 500 });
  }
}

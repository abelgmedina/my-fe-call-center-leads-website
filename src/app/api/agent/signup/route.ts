import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Resend } from 'resend';

export const runtime = 'nodejs';

function getJsonErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to submit request.';
}

export async function POST(req: Request) {
  let requestId: number | bigint | null = null;

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

    requestId = result.lastInsertRowid;

    let emailWarning: string | null = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const mailResult = await resend.emails.send({
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
            `Request ID: ${String(requestId)}`,
        });

        if ((mailResult as any)?.error) {
          emailWarning = typeof (mailResult as any).error?.message === 'string'
            ? (mailResult as any).error.message
            : 'Notification email failed, but the request was saved.';
        }
      } catch (emailError) {
        emailWarning = getJsonErrorMessage(emailError);
      }
    }

    return NextResponse.json({ ok: true, requestId: String(requestId), emailWarning });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: getJsonErrorMessage(error), requestId: requestId ? String(requestId) : null },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

function getJsonErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to submit request.';
}

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

    const requestId = String(Date.now());
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
            `Request ID: ${requestId}`,
        });

        if ((mailResult as any)?.error) {
          emailWarning = typeof (mailResult as any).error?.message === 'string'
            ? (mailResult as any).error.message
            : 'Notification email failed, but the request was received.';
        }
      } catch (emailError) {
        emailWarning = getJsonErrorMessage(emailError);
      }
    } else {
      emailWarning = 'RESEND_API_KEY is not configured, so no notification email was sent.';
    }

    return NextResponse.json({ ok: true, requestId, emailWarning });
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: getJsonErrorMessage(error) }, { status: 500 });
  }
}

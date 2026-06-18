import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendAgentAccessRequestSms } from '@/lib/agent-access-alerts';
import { appendAgentAccessRequestToSheet } from '@/lib/agent-access-sheets';
import { appendAccessRequestToStore, isGitHubStoreConfigured } from '@/lib/github-store';

export const runtime = 'nodejs';

type SignupBody = {
  full_name?: unknown;
  email?: unknown;
  phone?: unknown;
  npn?: unknown;
  residence_state?: unknown;
  license_state?: unknown;
  fmo?: unknown;
  imo?: unknown;
  agency_name?: unknown;
  sales_model?: unknown;
  notes?: unknown;
};

function getJsonErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to submit request.';
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as SignupBody | null;
    const full_name = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim();
    const phone = String(body?.phone || '').trim();
    const npn = String(body?.npn || '').trim();
    const residence_state = String(body?.residence_state || '').trim();
    const license_state = String(body?.license_state || body?.residence_state || '').trim();
    const fmo = String(body?.fmo || '').trim();
    const imo = String(body?.imo || '').trim();
    const agency_name = String(body?.agency_name || '').trim();
    const sales_model = String(body?.sales_model || '').trim();
    const notes = String(body?.notes || '').trim();

    if (!full_name || !email || !phone || !npn || !residence_state || !agency_name || !sales_model) {
      return NextResponse.json({
        ok: false,
        error: 'Full name, email, phone, NPN, home state insurance license, current IMO/FMO/brokerage/captive agency, and sales model are required.',
      }, { status: 400 });
    }

    let requestId = String(Date.now());
    let emailWarning: string | null = null;
    let sheetWarning: string | null = null;
    let smsWarning: string | null = null;
    let storageWarning: string | null = null;

    try {
      const now = Date.now();
      if (isGitHubStoreConfigured()) {
        const request = await appendAccessRequestToStore({
          full_name,
          email,
          phone,
          npn,
          residence_state,
          license_state,
          fmo,
          imo,
          agency_name,
          sales_model,
          notes,
        });
        requestId = String(request.id);
      } else {
        const { db } = await import('@/lib/db');
        const result = db.prepare(
          `insert into agent_access_requests (
            full_name, email, phone, npn, residence_state, license_state,
            fmo, imo, agency_name, sales_model, notes, status, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).run(
          full_name,
          email,
          phone,
          npn,
          residence_state,
          license_state,
          fmo,
          imo,
          agency_name,
          sales_model,
          notes,
          now,
          now
        );
        if (result.lastInsertRowid) requestId = String(result.lastInsertRowid);
      }

      const submittedAt = new Date(now).toISOString();
      try {
        await appendAgentAccessRequestToSheet({
          submittedAt,
          requestId,
          status: 'pending',
          fullName: full_name,
          email,
          phone,
          npn,
          residenceState: residence_state,
          agencyName: agency_name,
          salesModel: sales_model,
          notes,
        });
      } catch (sheetError) {
        sheetWarning = getJsonErrorMessage(sheetError);
      }
    } catch (storageError) {
      storageWarning = getJsonErrorMessage(storageError);
    }

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
            `Home state insurance license: ${residence_state || '-'}\n` +
            `Current IMO/FMO/brokerage/captive agency: ${agency_name || '-'}\n` +
            `Primary sales model: ${sales_model || '-'}\n` +
            `Notes: ${notes || '-'}\n` +
            `Request ID: ${requestId}`,
        });

        if (mailResult.error) {
          emailWarning = typeof mailResult.error.message === 'string'
            ? mailResult.error.message
            : 'Notification email failed, but the request was received.';
        }
      } catch (emailError) {
        emailWarning = getJsonErrorMessage(emailError);
      }
    } else {
      emailWarning = 'RESEND_API_KEY is not configured, so no notification email was sent.';
    }

    try {
      await sendAgentAccessRequestSms({
        requestId,
        fullName: full_name,
        email,
        phone,
        npn,
        residenceState: residence_state,
        agencyName: agency_name,
        salesModel: sales_model,
        notes,
      });
    } catch (smsError) {
      smsWarning = getJsonErrorMessage(smsError);
    }

    return NextResponse.json({ ok: true, requestId, emailWarning, sheetWarning, smsWarning, storageWarning });
  } catch (error: unknown) {
    return NextResponse.json({ ok: false, error: getJsonErrorMessage(error) }, { status: 500 });
  }
}

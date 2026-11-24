import { NextResponse } from 'next/server';
import { captureException, logServerEvent, requestHeaders, requestIdFor } from '@/lib/observability';
import { requireOpsAccess } from '@/lib/ops-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DependencyState = 'healthy' | 'configured_unverified' | 'not_configured';

type DependencyCheck = {
  name: 'database' | 'twilio' | 'sheets' | 'ai_provider';
  state: DependencyState;
  configured: boolean;
  detail: string;
  missing?: string[];
};

function configCheck(
  name: DependencyCheck['name'],
  required: string[],
  configuredDetail: string,
  missingDetail: string
): DependencyCheck {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    return { name, state: 'not_configured', configured: false, detail: missingDetail, missing };
  }
  // Configuration is intentionally not reported as a provider success. Provider
  // probes are added only with a durable adapter and an explicit safe test plan.
  return { name, state: 'configured_unverified', configured: true, detail: configuredDetail };
}

/**
 * Dependency status is private because even env-presence metadata is useful to
 * an attacker. It never returns values, provider IDs, phone numbers, or DSNs.
 */
export async function GET(req: Request) {
  const requestId = requestIdFor(req);
  const denied = await requireOpsAccess(req, 'internal');
  if (denied) {
    denied.headers.set('x-request-id', requestId);
    denied.headers.set('cache-control', 'no-store');
    return denied;
  }

  try {
    const checks: DependencyCheck[] = [
      configCheck(
        'database',
        ['DATABASE_URL'],
        'Database URL configured; no durable database adapter probe is enabled yet.',
        'Database URL is not configured.'
      ),
      configCheck(
        'twilio',
        ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
        'Twilio credentials are configured; no outbound provider call was made.',
        'Twilio credentials are not configured.'
      ),
      configCheck(
        'sheets',
        ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'UPLINE_SHEETS_SPREADSHEET_ID'],
        'Hosted Google Sheets credentials are configured; no provider read was made.',
        'Hosted Google Sheets credentials are not configured.'
      ),
      configCheck(
        'ai_provider',
        ['AI_PROVIDER_API_KEY', 'AI_PROVIDER_MODEL'],
        'AI provider configuration is present; no model request was made.',
        'AI provider configuration is not configured.'
      ),
    ];
    const healthy = checks.every((check) => check.state === 'healthy');
    const now = new Date().toISOString();
    logServerEvent('info', 'health_check', {
      requestId,
      kind: 'dependencies',
      states: checks.map((check) => ({ name: check.name, state: check.state })),
    });

    return NextResponse.json(
      {
        ok: healthy,
        status: healthy ? 'healthy' : 'degraded',
        service: 'uplineagent',
        now,
        requestId,
        checks,
      },
      { status: healthy ? 200 : 503, headers: requestHeaders(requestId) }
    );
  } catch (error) {
    await captureException(error, { requestId, route: '/api/health/deps' });
    return NextResponse.json(
      { ok: false, status: 'down', service: 'uplineagent', requestId, error: 'HEALTH_CHECK_FAILED' },
      { status: 503, headers: requestHeaders(requestId) }
    );
  }
}

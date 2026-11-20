import { NextResponse } from 'next/server';
import { logServerEvent, requestHeaders, requestIdFor } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shallow, public liveness endpoint. It deliberately does not claim that
 * external providers are healthy; use the authenticated deps endpoint for that.
 */
export async function GET(req: Request) {
  const requestId = requestIdFor(req);
  const now = new Date().toISOString();
  logServerEvent('info', 'health_check', { requestId, kind: 'app' });

  return NextResponse.json(
    {
      ok: true,
      status: 'healthy',
      service: 'uplineagent',
      now,
      requestId,
    },
    { headers: requestHeaders(requestId) }
  );
}

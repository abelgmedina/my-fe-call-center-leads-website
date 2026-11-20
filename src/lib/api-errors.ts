import { NextResponse } from 'next/server';
import { isHostedSheetsError } from '@/lib/hosted-sheets';
import { captureException, logServerEvent, requestHeaders, requestIdFor } from '@/lib/observability';

type RouteHandler = (request: Request) => Promise<Response>;

/**
 * Ensures a provider failure can never become an empty 500 body. It also adds
 * a traceable request ID to successful responses from wrapped handlers.
 */
export function withApiErrorHandling(route: string, handler: RouteHandler) {
  return async function handledRoute(request: Request): Promise<Response> {
    const requestId = requestIdFor(request);
    try {
      const response = await handler(request);
      response.headers.set('x-request-id', requestId);
      response.headers.set('cache-control', response.headers.get('cache-control') || 'no-store');
      return response;
    } catch (error) {
      if (isHostedSheetsError(error)) {
        logServerEvent('warn', 'hosted_dependency_unavailable', {
          requestId,
          route,
          dependency: 'google_sheets',
          code: error.code,
          status: error.status,
        });
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
            },
            requestId,
          },
          { status: 503, headers: requestHeaders(requestId) }
        );
      }

      await captureException(error, { requestId, route });
      return NextResponse.json(
        { ok: false, error: { code: 'INTERNAL_ERROR', message: 'The operation could not be completed.' }, requestId },
        { status: 500, headers: requestHeaders(requestId) }
      );
    }
  };
}

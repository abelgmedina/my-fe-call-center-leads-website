import { NextResponse, type NextRequest } from 'next/server';

/**
 * The preview demo replaces the legacy Ops pages with the unified Command
 * Center.  It deliberately does nothing in production or on unflagged
 * previews, preserving the P0 hosted-runtime routes and their safeguards.
 */
export function middleware(request: NextRequest) {
  const previewDemo = process.env.VERCEL_ENV === 'preview' && process.env.UPLINE_PREVIEW_DEMO === 'true';
  if (!previewDemo) return NextResponse.next();

  const destinations: Record<string, string> = {
    '/ops': '/agency-control',
    '/ops/pipeline': '/leads',
    '/ops/call-queue': '/call-queue',
    '/ops/dialer': '/power-dialer',
    '/ops/calls': '/inbound-calls',
    '/ops/agents': '/agents',
    '/ops/agent-approvals': '/agent-approvals',
    '/ops/lead-purchase': '/lead-catalog',
    '/ops/admin': '/system-health',
    '/agent': '/inbound-calls',
  };
  const destination = destinations[request.nextUrl.pathname];
  if (!destination) return NextResponse.next();
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = { matcher: ['/ops/:path*', '/agent'] };

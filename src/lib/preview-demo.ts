import 'server-only';

/**
 * Preview data must never be enabled by a production deployment or by a
 * developer machine.  The branch-scoped Vercel variable is deliberately a
 * second lock in addition to Vercel's environment marker.
 */
export function isPreviewDemoMode() {
  return process.env.VERCEL_ENV === 'preview' && process.env.UPLINE_PREVIEW_DEMO === 'true';
}

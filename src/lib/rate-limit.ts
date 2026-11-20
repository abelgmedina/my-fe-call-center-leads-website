type RateWindow = { count: number; resetAt: number };

// This is deliberately a best-effort edge guard, not an authorization source.
// The restricted account role remains safe even if a serverless instance resets.
const windows = new Map<string, RateWindow>();

export function consumeRateLimit(scope: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const id = `${scope}:${key || 'unknown'}`;
  const current = windows.get(id);
  if (!current || current.resetAt <= now) {
    windows.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function requestFingerprint(req: Request, extra = '') {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const userAgent = req.headers.get('user-agent')?.slice(0, 160) || '';
  return `${forwarded || realIp || 'unknown'}:${userAgent}:${extra}`;
}

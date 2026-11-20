import 'server-only';

import { randomUUID } from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|api[_-]?key|private[_-]?key|access[_-]?key|phone|email|ssn|dob|bank|account[_-]?number|message|body|form)/i;
const MAX_STRING_LENGTH = 512;
const MAX_COLLECTION_SIZE = 25;

function redactText(value: string) {
  const withoutQuery = value.replace(/(https?:\/\/[^\s?]+)\?[^\s]*/gi, '$1?[redacted]');
  const withoutEmail = withoutQuery.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]');
  const withoutPhone = withoutEmail.replace(/\+?\d[\d().\s-]{7,}\d/g, '[redacted-phone]');
  const withoutSsn = withoutPhone.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]');
  const withoutBearer = withoutSsn.replace(/\b(Bearer|Basic)\s+[^\s]+/gi, '$1 [redacted]');
  return withoutBearer.length > MAX_STRING_LENGTH
    ? `${withoutBearer.slice(0, MAX_STRING_LENGTH)}…[truncated]`
    : withoutBearer;
}

/**
 * Produces a bounded, PII-conscious value for server logs and error tracking.
 * Callers should still avoid placing sensitive values in a context in the first place.
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated-depth]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return redactText(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, MAX_COLLECTION_SIZE).map((item) => redactForLog(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).slice(0, MAX_COLLECTION_SIZE)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactForLog(entry, depth + 1);
    }
    return output;
  }
  return redactText(String(value));
}

export function requestIdFor(req: Request) {
  const supplied = req.headers.get('x-request-id')?.trim() || '';
  return SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

export function requestHeaders(requestId: string) {
  return {
    'cache-control': 'no-store',
    'x-request-id': requestId,
  };
}

export function logServerEvent(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = redactForLog({
    ...context,
    at: new Date().toISOString(),
    level,
    event,
    service: 'uplineagent',
  });
  const text = JSON.stringify(entry);

  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else if (level === 'debug') console.debug(text);
  else console.info(text);
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const withDigest = error as Error & { digest?: unknown; code?: unknown };
    return {
      name: redactText(error.name || 'Error'),
      message: redactText(error.message || 'Unknown error'),
      digest: typeof withDigest.digest === 'string' ? redactText(withDigest.digest) : undefined,
      code: typeof withDigest.code === 'string' || typeof withDigest.code === 'number' ? withDigest.code : undefined,
      stack: error.stack ? redactText(error.stack) : undefined,
    };
  }
  return { name: 'UnknownError', message: redactText(String(error)) };
}

function sentryEnvelopeUrl(dsn: string) {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.split('/').filter(Boolean).at(-1);
    const publicKey = parsed.username;
    if (!projectId || !publicKey) return null;
    return `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`;
  } catch {
    return null;
  }
}

/**
 * Logs every exception locally and, when SENTRY_DSN is configured, sends a
 * scrubbed Sentry envelope. It intentionally never throws or leaks a DSN.
 */
export async function captureException(error: unknown, context: LogContext = {}) {
  const details = errorDetails(error);
  const safeContext = redactForLog(context) as LogContext;
  logServerEvent('error', 'server_exception', { ...safeContext, error: details });

  const dsn = process.env.SENTRY_DSN?.trim();
  const endpoint = dsn ? sentryEnvelopeUrl(dsn) : null;
  if (!endpoint) return { reported: false };

  const eventId = randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: now,
    platform: 'node',
    level: 'error',
    logger: 'uplineagent',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    tags: {
      service: 'uplineagent',
      request_id: typeof safeContext.requestId === 'string' ? safeContext.requestId : undefined,
    },
    extra: safeContext,
    exception: {
      values: [{ type: details.name, value: details.message, stacktrace: details.stack ? { frames: [] } : undefined }],
    },
  };
  const envelope = `${JSON.stringify({ event_id: eventId, sent_at: now })}\n${JSON.stringify({ type: 'event', content_type: 'application/json' })}\n${JSON.stringify(event)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body: envelope,
      signal: AbortSignal.timeout(2_500),
    });
    if (!response.ok) {
      logServerEvent('warn', 'sentry_delivery_failed', {
        requestId: typeof safeContext.requestId === 'string' ? safeContext.requestId : undefined,
        status: response.status,
      });
    }
    return { reported: response.ok };
  } catch {
    logServerEvent('warn', 'sentry_delivery_failed', {
      requestId: typeof safeContext.requestId === 'string' ? safeContext.requestId : undefined,
    });
    return { reported: false };
  }
}

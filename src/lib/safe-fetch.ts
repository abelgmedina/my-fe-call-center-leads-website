export type SafeFetchResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

function errorMessage(status: number) {
  if (status === 401 || status === 403) return 'Your session does not have access to this operational data.';
  if (status === 503) return 'The operational data service is not configured or is temporarily unavailable.';
  return 'The operational data service returned an unexpected response.';
}

/**
 * Read JSON without allowing an empty or malformed upstream body to take down a
 * server-rendered route. It intentionally does not echo an upstream response
 * body, which can contain PII or provider details.
 */
export async function safeFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<SafeFetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, status: 503, message: 'The operational data service could not be reached.' };
  }

  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return { ok: false, status: response.status || 502, message: errorMessage(response.status || 502) };
  }

  let data: T | null = null;
  if (raw.trim()) {
    try {
      data = JSON.parse(raw) as T;
    } catch {
      return { ok: false, status: response.status || 502, message: errorMessage(response.status || 502) };
    }
  }

  if (!response.ok || data === null) {
    return { ok: false, status: response.status || 502, message: errorMessage(response.status || 502) };
  }
  return { ok: true, status: response.status, data };
}

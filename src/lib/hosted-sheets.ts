import { createSign } from 'node:crypto';

type SheetValuesResponse = { values?: string[][]; [key: string]: unknown };

type HostedSheetsErrorCode =
  | 'SHEETS_UNCONFIGURED'
  | 'SHEETS_INVALID_REQUEST'
  | 'SHEETS_AUTH_FAILED'
  | 'SHEETS_REQUEST_FAILED';

/**
 * A safe, public-facing error for Google Sheets dependency failures. The
 * underlying provider response is deliberately not included: it can contain
 * sheet metadata or credentials supplied by Google.
 */
export class HostedSheetsError extends Error {
  readonly code: HostedSheetsErrorCode;
  readonly status?: number;

  constructor(code: HostedSheetsErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'HostedSheetsError';
    this.code = code;
    this.status = status;
  }
}

export function isHostedSheetsError(error: unknown): error is HostedSheetsError {
  return error instanceof HostedSheetsError;
}

export function hostedSheetsConfiguration() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || '';
  return {
    configured: Boolean(email && privateKey),
    missing: [!email ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL' : '', !privateKey ? 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY' : ''].filter(Boolean),
  };
}

type AccessTokenCache = { accessToken: string; expiresAt: number };
let cachedAccessToken: AccessTokenCache | null = null;

function base64url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function assertSpreadsheetId(value: string) {
  if (!/^[A-Za-z0-9_-]{20,}$/.test(value)) {
    throw new HostedSheetsError(
      'SHEETS_INVALID_REQUEST',
      'Google Sheets is not configured for this workspace. Set UPLINE_SHEETS_SPREADSHEET_ID in the hosting environment.'
    );
  }
  return value;
}

async function parseJson(response: Response) {
  const body = await response.text();
  if (!body.trim()) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

async function googleAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.accessToken;
  }

  const { configured } = hostedSheetsConfiguration();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();

  if (!configured) {
    throw new HostedSheetsError(
      'SHEETS_UNCONFIGURED',
      'Google Sheets sync is not configured in this environment. CRM data is unavailable until a hosted service account is added.'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claims}`;

  let assertion: string;
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    assertion = `${signingInput}.${signer.sign(privateKey, 'base64url')}`;
  } catch {
    throw new HostedSheetsError('SHEETS_AUTH_FAILED', 'Google Sheets service-account credentials could not be used.');
  }

  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });
  } catch {
    throw new HostedSheetsError('SHEETS_AUTH_FAILED', 'Google Sheets authentication service is unreachable.');
  }

  const tokenPayload = (await parseJson(response)) as { access_token?: unknown; expires_in?: unknown } | null;
  if (!response.ok || typeof tokenPayload?.access_token !== 'string') {
    throw new HostedSheetsError('SHEETS_AUTH_FAILED', 'Google Sheets authentication failed.', response.status);
  }

  const expiresIn = typeof tokenPayload.expires_in === 'number' ? tokenPayload.expires_in : 3000;
  cachedAccessToken = {
    accessToken: tokenPayload.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
  return cachedAccessToken.accessToken;
}

async function googleSheetsRequest(
  spreadsheetId: string,
  range: string,
  init: { method: 'GET' | 'PUT' | 'POST'; valueInputOption?: 'RAW' | 'USER_ENTERED'; values?: string[][] }
) {
  const id = assertSpreadsheetId(spreadsheetId);
  if (!range.trim()) {
    throw new HostedSheetsError('SHEETS_INVALID_REQUEST', 'Google Sheets range is required.');
  }

  const token = await googleAccessToken();
  const actionSuffix = init.method === 'POST' ? ':append' : '';
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}${actionSuffix}`);
  if (init.valueInputOption) url.searchParams.set('valueInputOption', init.valueInputOption);

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.method === 'GET' ? {} : { 'content-type': 'application/json' }),
      },
      body: init.method === 'GET' ? undefined : JSON.stringify({ values: init.values || [] }),
      cache: 'no-store',
    });
  } catch {
    throw new HostedSheetsError('SHEETS_REQUEST_FAILED', 'Google Sheets is unreachable.');
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new HostedSheetsError('SHEETS_REQUEST_FAILED', 'Google Sheets request failed.', response.status);
  }
  return (payload || {}) as SheetValuesResponse;
}

/**
 * Compatibility adapter for the narrow Sheets command shape previously sent to
 * the local `gog` CLI. It is intentionally backed only by the hosted Google
 * Sheets API; it never spawns a local binary or reads host credentials.
 */
export async function sheetsJson(args: string[], _legacy: { account: string }): Promise<SheetValuesResponse> {
  const [service, operation, spreadsheetId, range] = args;
  if (service !== 'sheets' || !['get', 'append', 'update'].includes(operation) || !spreadsheetId || !range) {
    if (!spreadsheetId) {
      throw new HostedSheetsError(
        'SHEETS_UNCONFIGURED',
        'Google Sheets sync is not configured in this environment. Set UPLINE_SHEETS_SPREADSHEET_ID in the hosting environment.'
      );
    }
    throw new HostedSheetsError('SHEETS_INVALID_REQUEST', 'Unsupported hosted Google Sheets operation.');
  }

  if (!hostedSheetsConfiguration().configured) {
    throw new HostedSheetsError(
      'SHEETS_UNCONFIGURED',
      'Google Sheets sync is not configured in this environment. CRM data is unavailable until a hosted service account is added.'
    );
  }

  if (operation === 'get') {
    return googleSheetsRequest(spreadsheetId, range, { method: 'GET' });
  }

  const valuesIndex = args.indexOf('--values-json');
  const rawValues = valuesIndex >= 0 ? args[valuesIndex + 1] : '';
  let values: string[][];
  try {
    const parsed = JSON.parse(rawValues);
    if (!Array.isArray(parsed) || !parsed.every((row) => Array.isArray(row))) throw new Error('invalid values');
    values = parsed.map((row) => row.map((cell) => String(cell ?? '')));
  } catch {
    throw new HostedSheetsError('SHEETS_INVALID_REQUEST', 'Google Sheets write values are invalid.');
  }

  const inputIndex = args.indexOf('--input');
  const input = inputIndex >= 0 && args[inputIndex + 1] === 'RAW' ? 'RAW' : 'USER_ENTERED';
  return googleSheetsRequest(spreadsheetId, range, {
    method: operation === 'append' ? 'POST' : 'PUT',
    valueInputOption: input,
    values,
  });
}

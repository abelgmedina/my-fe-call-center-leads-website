import assert from 'node:assert/strict';
import test from 'node:test';
import { safeFetchJson } from '../../src/lib/safe-fetch';

test('safeFetchJson turns an empty upstream error body into a controlled failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
  try {
    const result = await safeFetchJson<{ value: string }>('https://example.invalid/data');
    assert.deepEqual(result, {
      ok: false,
      status: 503,
      message: 'The operational data service is not configured or is temporarily unavailable.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetchJson refuses malformed success bodies instead of throwing JSON.parse errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response('not-json', { status: 200 })) as typeof fetch;
  try {
    const result = await safeFetchJson<{ value: string }>('https://example.invalid/data');
    assert.equal(result.ok, false);
    assert.equal(result.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

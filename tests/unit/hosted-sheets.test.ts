import assert from 'node:assert/strict';
import test from 'node:test';
import { HostedSheetsError, hostedSheetsConfiguration, sheetsJson } from '../../src/lib/hosted-sheets';

function withEnv<T>(changes: Record<string, string | undefined>, run: () => Promise<T> | T) {
  const before = Object.fromEntries(Object.keys(changes).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('hosted Sheets reports missing service-account configuration without falling back to a local CLI', async () => {
  await withEnv(
    {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: undefined,
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: undefined,
    },
    async () => {
      const config = hostedSheetsConfiguration();
      assert.equal(config.configured, false);
      assert.deepEqual(config.missing.sort(), ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY']);

      await assert.rejects(
        () => sheetsJson(['sheets', 'get', 'abcdefghijklmnopqrst', 'MASTER_LEADS!A1:AO1'], { account: 'ignored' }),
        (error: unknown) => error instanceof HostedSheetsError && error.code === 'SHEETS_UNCONFIGURED'
      );
    }
  );
});

test('hosted Sheets rejects an invalid spreadsheet target before any provider request', async () => {
  await withEnv(
    {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test-service@example.invalid',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'not-a-real-private-key',
    },
    async () => {
      await assert.rejects(
        () => sheetsJson(['sheets', 'get', 'invalid', 'A1'], { account: 'ignored' }),
        (error: unknown) => error instanceof HostedSheetsError && error.code === 'SHEETS_INVALID_REQUEST'
      );
    }
  );
});

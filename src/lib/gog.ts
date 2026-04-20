import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Minimal wrapper to call the `gog` CLI from the Next.js server runtime.
 *
 * Requires:
 * - gog installed on host
 * - gog auth already completed for the account
 */
export async function gogJson(args: string[], { account }: { account: string }) {
  const fullArgs = [...args, '--json', '--account', account];
  const { stdout, stderr } = await execFileAsync('gog', fullArgs, {
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stderr?.trim()) {
    // gog sometimes writes non-fatal info to stderr, so don’t hard-fail on it.
    // Still surface it for debugging.
    console.warn('gog stderr:', stderr.trim().slice(0, 2000));
  }
  return JSON.parse(stdout);
}

import crypto from 'node:crypto';

// DB password hashing (no external deps): scrypt + random salt.
// Stored format: scrypt$N$r$p$saltB64$hashB64

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const keylen = 32;
  const hash = crypto.scryptSync(password, salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6) return false;
    const [kind, Ns, rs, ps, saltB64, hashB64] = parts;
    if (kind !== 'scrypt') return false;
    const N = Number(Ns);
    const r = Number(rs);
    const p = Number(ps);
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p });
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

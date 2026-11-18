import { headers } from 'next/headers';

/** Forward the signed browser cookie when an authenticated server component calls its own API route. */
export async function currentRequestAuthHeaders(): Promise<Record<string, string>> {
  const incoming = await headers();
  const cookie = incoming.get('cookie');
  return cookie ? { cookie } : {};
}

import { NextResponse } from 'next/server';
import { getTakeToken } from '@/lib/alerts';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return NextResponse.json({ valid: false, error: 'Missing token' }, { status: 400 });

  const row = getTakeToken(token);
  if (!row) return NextResponse.json({ valid: false, error: 'Invalid token' }, { status: 404 });

  const now = Date.now();
  if (row.used_at) return NextResponse.json({ valid: false, error: 'Token already used' }, { status: 410 });
  if (row.expires_at < now) return NextResponse.json({ valid: false, error: 'Token expired' }, { status: 410 });

  return NextResponse.json({
    valid: true,
    callerFrom: row.caller_from,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  });
}

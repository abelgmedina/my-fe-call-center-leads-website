import { NextResponse } from 'next/server';
import { getTakeToken, markTokenUsed } from '@/lib/alerts';
import { getTwilioClient, publicBaseUrl } from '@/lib/twilio';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';

const QUEUE_FRIENDLY_NAME = 'support_queue';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;
  if (!token) return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });

  const row = getTakeToken(token);
  if (!row) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 404 });
  if (row.used_at) return NextResponse.json({ ok: false, error: 'Token already used' }, { status: 410 });
  if (row.expires_at < Date.now()) return NextResponse.json({ ok: false, error: 'Token expired' }, { status: 410 });

  // Mark used early to prevent double dequeues.
  markTokenUsed(token);

  const agent = await requireAgent();
  const identity = `agent_${agent.id}`;
  const client = getTwilioClient();

  // Find queue by friendly name (Twilio helper types don't expose friendlyName filter).
  const queues = await client.queues.list({ limit: 50 });
  const queue = queues.find((q) => q.friendlyName === QUEUE_FRIENDLY_NAME);
  if (!queue) {
    return NextResponse.json({ ok: false, error: 'Queue not found yet (no callers have been enqueued).' }, { status: 409 });
  }

  const queueSid = queue.sid;

  // Oldest waiting member (FIFO)
  const members = await client.queues(queueSid).members.list({ pageSize: 1 });
  if (!members.length) {
    return NextResponse.json({ ok: false, error: 'No callers waiting.' }, { status: 409 });
  }

  const member = members[0];
  const dequeueUrl = `${publicBaseUrl()}/api/twilio/voice/dequeue?identity=${encodeURIComponent(identity)}`;

  await client.queues(queueSid).members(member.callSid).update({
    url: dequeueUrl,
    method: 'POST',
  });

  return NextResponse.json({ ok: true, dequeued: member.callSid });
}

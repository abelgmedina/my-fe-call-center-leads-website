import { headers } from 'next/headers';
import { DialerPanel } from './panel';
import { currentRequestAuthHeaders } from '@/lib/request-auth';
import { safeFetchJson } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CallQueue = { grouped: Record<string, any[]>; otherCallableCount?: number; otherCallablePreview?: any[] };

async function baseUrl(): Promise<string | null> {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

async function getQueue() {
  const base = await baseUrl();
  if (!base) return { ok: false as const, message: 'The request host could not be determined.' };
  return safeFetchJson<CallQueue>(`${base}/api/ops/call/queue`, { cache: 'no-store', headers: await currentRequestAuthHeaders() });
}

export default async function DialerPage() {
  const result = await getQueue();
  const data = result.ok ? result.data : null;
  const failureMessage = result.ok ? '' : result.message;
  const queueCountGrouped = Object.values(data?.grouped || {}).reduce((n: number, arr: any) => n + (arr?.length || 0), 0);
  const queueCount = queueCountGrouped + Number(data?.otherCallableCount || 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">Ops / Power Dialer</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-2xl font-semibold">Power Dialer Ready</div>
          </div>
          <div className="mt-1 text-sm text-neutral-500">{data ? `${queueCount} leads in queue` : 'Queue data is currently unavailable'}</div>
        </div>

        <div className="text-xs text-neutral-500">Ensure agent availability before starting</div>
      </div>

      {!data ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Power Dialer is safely unavailable</div>
          <p className="mt-1 text-amber-100/80">{failureMessage}</p>
          <p className="mt-1 text-xs text-amber-100/70">It cannot start without a hosted lead-data adapter and operational readiness checks.</p>
        </div>
      ) : null}

      <div className="mt-6">
        <DialerPanel grouped={data?.grouped || {}} otherCallablePreview={data?.otherCallablePreview || []} queueCount={queueCount} disabled={!data} />
      </div>
    </div>
  );
}

import { headers } from 'next/headers';
import { DialerPanel } from './panel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function baseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getQueue() {
  const url = `${await baseUrl()}/api/ops/call/queue`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load call queue: ${res.status}`);
  return res.json();
}

export default async function DialerPage() {
  const data = await getQueue();
  const queueCountGrouped = Object.values(data.grouped || {}).reduce((n: number, arr: any) => n + (arr?.length || 0), 0);
  const queueCount = queueCountGrouped + Number(data.otherCallableCount || 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">Ops / Power Dialer</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-2xl font-semibold">Power Dialer Ready</div>
          </div>
          <div className="mt-1 text-sm text-neutral-500">{queueCount} leads in queue</div>
        </div>

        <div className="text-xs text-neutral-500">Ensure agent availability before starting</div>
      </div>

      <div className="mt-6">
        <DialerPanel grouped={data.grouped} otherCallablePreview={data.otherCallablePreview || []} queueCount={queueCount} />
      </div>
    </div>
  );
}

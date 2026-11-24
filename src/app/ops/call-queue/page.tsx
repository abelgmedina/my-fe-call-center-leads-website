import Link from 'next/link';
import { headers } from 'next/headers';
import { DialNextButton } from './DialNextButton';
import { currentRequestAuthHeaders } from '@/lib/request-auth';
import { safeFetchJson } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CallQueue = { columns: string[]; grouped: Record<string, any[]>; updatedAt: string };

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

function Card({ c }: { c: any }) {
  return (
    <Link
      href={`/ops/leads/${encodeURIComponent(c.lead_id || '')}`}
      className="block rounded-md border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700"
    >
      <div className="text-sm font-medium text-neutral-100">{c.name || '—'}</div>
      <div className="mt-1 text-xs text-neutral-400">
        {c.phone || '—'} • {c.state || '—'}
      </div>
      {c.next_action_at ? <div className="mt-1 text-xs text-neutral-500">Next: {c.next_action_at}</div> : null}
    </Link>
  );
}

export default async function CallQueuePage() {
  const result = await getQueue();
  const data = result.ok ? result.data : null;
  const failureMessage = result.ok ? '' : result.message;
  const columns: string[] = data?.columns || [];
  const grouped: Record<string, any[]> = data?.grouped || {};

  const pickNext = () => {
    const buckets = ['QUALIFIED_TRANSFER_NOW', 'READY_FOR_CALL', 'NO_ANSWER', 'CALL_APPT_SET'];
    for (const b of buckets) {
      const arr = grouped[b] || [];
      if (arr.length > 0 && arr[0]?.lead_id) return String(arr[0].lead_id);
    }
    // fallback: first item in any column
    for (const col of columns) {
      const arr = grouped[col] || [];
      if (arr.length > 0 && arr[0]?.lead_id) return String(arr[0].lead_id);
    }
    return null;
  };

  const nextLeadId = pickNext();

  return (
    <main className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Call Queue (Abel Active)</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data
              ? `Click a lead → use “Call lead (queue)” on the lead page. Updated ${new Date(data.updatedAt).toLocaleString()}.`
              : 'Queue data is currently unavailable.'}
          </p>
          <div className="mt-3">
            <DialNextButton leadId={nextLeadId} />
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/ops">Ops Home</Link>
          <Link className="underline" href="/ops/pipeline">Pipeline</Link>
          <Link className="underline" href="/agent">Agent Console</Link>
        </div>
      </div>

      {!data ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Call queue is unavailable</div>
          <p className="mt-1 text-amber-100/80">{failureMessage}</p>
          <p className="mt-1 text-xs text-amber-100/70">Dialing remains blocked until the hosted data adapter is configured.</p>
        </div>
      ) : null}

      {data ? <div
        className="mt-6 grid gap-4 overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}
      >
        {columns.map((col) => (
          <section key={col} className="rounded-lg border border-neutral-900 bg-neutral-950/40">
            <div className="flex items-center justify-between border-b border-neutral-900 p-3">
              <div className="text-sm font-semibold">{col}</div>
              <div className="text-xs text-neutral-500">{(grouped[col] || []).length}</div>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {(grouped[col] || []).slice(0, 50).map((c, i) => (
                <Card key={(c.lead_id || col) + ':' + i} c={c} />
              ))}
              {(grouped[col] || []).length > 50 ? <div className="text-xs text-neutral-500">Showing first 50…</div> : null}
            </div>
          </section>
        ))}
      </div> : null}
    </main>
  );
}

import Link from 'next/link';
import { headers } from 'next/headers';
import { DialNextButton } from './DialNextButton';

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
  const data = await getQueue();
  const columns: string[] = data.columns;
  const grouped: Record<string, any[]> = data.grouped;

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
            Click a lead → use “Call lead (queue)” on the lead page. Updated {new Date(data.updatedAt).toLocaleString()}.
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

      <div
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
      </div>
    </main>
  );
}

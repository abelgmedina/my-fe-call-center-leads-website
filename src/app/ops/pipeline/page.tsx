import Link from 'next/link';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function baseUrl() {
  // In newer Next versions, headers() may be async.
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getKanban() {
  const url = `${await baseUrl()}/api/ops/kanban`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load kanban: ${res.status}`);
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
      {c.next_action_at ? (
        <div className="mt-1 text-xs text-neutral-500">Next: {c.next_action_at}</div>
      ) : null}
    </Link>
  );
}

export default async function PipelinePage() {
  const data = await getKanban();
  const columns: string[] = data.columns;
  const grouped: Record<string, any[]> = data.grouped;

  return (
    <main className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline (Abel Active)</h1>
          <p className="mt-1 text-sm text-neutral-500">Read-only Kanban view (v1). Updated {new Date(data.updatedAt).toLocaleString()}.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/ops">Ops Home</Link>
          <Link className="underline" href="/agent">Agent Console</Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}>
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
              {(grouped[col] || []).length > 50 ? (
                <div className="text-xs text-neutral-500">Showing first 50…</div>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {data.otherCount ? (
        <p className="mt-6 text-xs text-neutral-500">Other statuses not shown: {data.otherCount}</p>
      ) : null}
    </main>
  );
}

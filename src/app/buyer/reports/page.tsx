import Link from 'next/link';
import { headers } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function baseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getCalls() {
  const url = `${await baseUrl()}/api/ops/calls/list?limit=100`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load calls: ${res.status}`);
  return res.json();
}

export default async function BuyerReportsPage() {
  const data = await getCalls();
  const rows: any[] = data.rows || [];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">Buyer Portal</div>
          <h1 className="mt-1 text-2xl font-semibold">Call Reports</h1>
          <div className="mt-1 text-xs text-neutral-500">Last 100 calls delivered to your buyer account.</div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80" href="/agent">
            Agent Console
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Time</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">From</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">To</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Status</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Dur</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Q90</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Xfer</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-[var(--muted-2)]" colSpan={7}>
                  No calls yet.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.call_sid || i} className="border-t border-[var(--border)]">
                  <td className="p-3 text-xs text-[var(--muted-2)]">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{r.from_number || '—'}</td>
                  <td className="p-3">{r.to_number || '—'}</td>
                  <td className="p-3">{r.status || '—'}</td>
                  <td className="p-3">{r.duration_seconds ?? '—'}</td>
                  <td className="p-3">{r.qualified_90s ? '✅' : '—'}</td>
                  <td className="p-3">{r.billable_transfer ? '✅' : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

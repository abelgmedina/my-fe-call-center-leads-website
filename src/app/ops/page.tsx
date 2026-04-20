import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';

async function baseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getSummary() {
  const url = `${await baseUrl()}/api/ops/summary`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ops summary: ${res.status}`);
  return res.json();
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default async function OpsPage() {
  const summary = await getSummary();
  const c = summary.counts as Record<string, number>;
  const appts = summary.appointments as Array<any>;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Ops</div>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
          <div className="mt-1 text-xs text-neutral-500">Updated {new Date(summary.updatedAt).toLocaleString()}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-400/40" href="/agent">Inbound Calls Screen</Link>
          <Link className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:border-blue-400/40" href="/ops/lead-purchase">Lead Purchase</Link>
          <Link className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700" href="/ops/call-queue">Call Queue</Link>
          <Link className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700" href="/ops/dialer">Power Dialer</Link>
          <Link className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700" href="/ops/pipeline">Pipeline</Link>
          <Link className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700" href="/ops/agents">Agents</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Transfer Now" value={c.QUALIFIED_TRANSFER_NOW || 0} />
        <Tile label="Callbacks (CALL_APPT_SET)" value={c.CALL_APPT_SET || 0} />
        <Tile label="SMS Hot" value={c.SMS_HOT || 0} />
        <Tile label="Opt Out" value={c.OPT_OUT || 0} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-200">Upcoming Appointments</h2>
          <div className="text-xs text-neutral-500">(from Abel Active)</div>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-300">
              <tr>
                <th className="p-3 text-xs font-semibold text-neutral-400">Window</th>
                <th className="p-3 text-xs font-semibold text-neutral-400">Lead</th>
                <th className="p-3 text-xs font-semibold text-neutral-400">Phone</th>
                <th className="p-3 text-xs font-semibold text-neutral-400">State</th>
              </tr>
            </thead>
            <tbody>
              {appts.length === 0 ? (
                <tr>
                  <td className="p-4 text-sm text-neutral-500" colSpan={4}>
                    No appointments found.
                  </td>
                </tr>
              ) : (
                appts.map((a, i) => (
                  <tr key={i} className="border-t border-neutral-900">
                    <td className="p-3 text-sm text-neutral-200">{(a.start || '—') + ' → ' + (a.end || '—')}</td>
                    <td className="p-3 text-sm text-neutral-200">{a.name || '—'}</td>
                    <td className="p-3 text-sm text-neutral-200">{a.phone || '—'}</td>
                    <td className="p-3 text-sm text-neutral-200">{a.state || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

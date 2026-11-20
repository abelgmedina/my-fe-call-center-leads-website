import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { currentRequestAuthHeaders } from '@/lib/request-auth';
import { safeFetchJson } from '@/lib/safe-fetch';

type Summary = {
  counts: Record<string, number>;
  appointments: Array<{ start: string; end: string; name: string; phone: string; state: string }>;
  updatedAt: string;
};

async function baseUrl(): Promise<string | null> {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

async function getSummary() {
  const base = await baseUrl();
  if (!base) return { ok: false as const, message: 'The request host could not be determined.' };
  return safeFetchJson<Summary>(`${base}/api/ops/summary`, { cache: 'no-store', headers: await currentRequestAuthHeaders() });
}

function Tile({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{typeof value === 'number' ? value : '—'}</div>
    </div>
  );
}

export default async function OpsPage() {
  const result = await getSummary();
  const summary = result.ok ? result.data : null;
  const failureMessage = result.ok ? '' : result.message;
  const c = summary?.counts || {};
  const appts = summary?.appointments || [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Ops</div>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
          <div className="mt-1 text-xs text-neutral-500">
            {summary ? `Updated ${new Date(summary.updatedAt).toLocaleString()}` : 'Operational data is currently unavailable'}
          </div>
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
        <Tile label="Transfer Now" value={summary ? c.QUALIFIED_TRANSFER_NOW || 0 : undefined} />
        <Tile label="Callbacks (CALL_APPT_SET)" value={summary ? c.CALL_APPT_SET || 0 : undefined} />
        <Tile label="SMS Hot" value={summary ? c.SMS_HOT || 0 : undefined} />
        <Tile label="Opt Out" value={summary ? c.OPT_OUT || 0 : undefined} />
      </div>

      {!summary ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">Ops data is unavailable</div>
          <p className="mt-1 text-amber-100/80">{failureMessage}</p>
          <p className="mt-1 text-xs text-amber-100/70">No lead counts or appointments are shown until the hosted data adapter is configured.</p>
        </div>
      ) : null}

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
              {!summary ? (
                <tr>
                  <td className="p-4 text-sm text-neutral-500" colSpan={4}>
                    Appointment data is unavailable.
                  </td>
                </tr>
              ) : appts.length === 0 ? (
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

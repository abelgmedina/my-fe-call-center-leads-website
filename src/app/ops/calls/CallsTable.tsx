'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  call_sid: string;
  created_at: number;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  buyer_code: string | null;
  campaign_code: string | null;
  status: string | null;
  duration_seconds: number | null;
  qualified_90s: number | null;
  billable_transfer: number | null;
  recording_sid?: string | null;
  recording_status?: string | null;
  recording_url?: string | null;
};

const BUYERS = [
  { code: 'upline_internal', name: 'UplineAgent Internal' },
  { code: 'nobel_agencyllc', name: 'Nobel Agency LLC' },
];

export default function CallsTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ops/calls/list?limit=200', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : null;
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
      setRows((data as any)?.rows || []);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function assign(call_sid: string, buyer_code: string) {
    setMsg(null);
    try {
      const res = await fetch('/api/ops/calls/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_sid, buyer_code }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : null;
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => b.created_at - a.created_at), [rows]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Calls Ledger</div>
          <div className="mt-1 text-sm text-[var(--muted-2)]">Canonical call tracking (Ringba/TrackDrive-lite). Assign calls to buyers while you only have one tracking number.</div>
        </div>
        <button
          className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80 hover:border-[var(--border-strong)] disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {msg ? <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{msg}</div> : null}

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
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Recording</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Buyer</th>
              <th className="p-3 text-xs font-semibold text-[var(--muted-2)]">Assign</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-[var(--muted-2)]" colSpan={10}>
                  No calls yet.
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.call_sid} className="border-t border-[var(--border)]">
                  <td className="p-3 text-xs text-[var(--muted-2)]">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{r.from_number || '—'}</td>
                  <td className="p-3">{r.to_number || '—'}</td>
                  <td className="p-3">{r.status || '—'}</td>
                  <td className="p-3">{r.duration_seconds ?? '—'}</td>
                  <td className="p-3">{r.qualified_90s ? '✅' : '—'}</td>
                  <td className="p-3">{r.billable_transfer ? '✅' : '—'}</td>
                  <td className="p-3 text-xs">
                    {r.recording_sid ? (
                      <a
                        className="text-blue-300 underline decoration-blue-500/30 hover:text-blue-200"
                        href={r.recording_url || undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.recording_status || 'recording'}
                      </a>
                    ) : (
                      <span className="text-[var(--muted-2)]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-[var(--muted-2)]">{r.buyer_code || '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {BUYERS.map((b) => (
                        <button
                          key={b.code}
                          className={
                            'rounded-md px-2 py-1 text-xs font-semibold ' +
                            (r.buyer_code === b.code
                              ? 'bg-blue-600 text-white'
                              : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)]/80 hover:border-[var(--border-strong)]')
                          }
                          onClick={() => assign(r.call_sid, b.code)}
                        >
                          {b.code === 'upline_internal' ? 'Internal' : 'Nobel'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

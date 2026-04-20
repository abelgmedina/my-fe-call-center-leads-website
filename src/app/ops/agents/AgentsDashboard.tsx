'use client';

import { useEffect, useMemo, useState } from 'react';

type AgentRow = {
  id: string;
  name: string;
  lang: 'en' | 'es';
  status: string;
  updated_at: number | null;
};

function badgeClass(status: string) {
  if (status === 'AVAILABLE') return 'bg-green-600/20 text-green-200 border-green-600/30';
  if (status === 'IN_CALL') return 'bg-yellow-600/20 text-yellow-200 border-yellow-600/30';
  if (status === 'AWAY' || status === 'BREAK') return 'bg-orange-600/20 text-orange-200 border-orange-600/30';
  return 'bg-neutral-800 text-neutral-200 border-neutral-700';
}

function fmtAgo(ts: number | null) {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function AgentsDashboard() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ops/agents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAgents(data.agents || []);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [auto]);

  const sorted = useMemo(() => {
    const order = { AVAILABLE: 0, IN_CALL: 1, AWAY: 2, BREAK: 3, OFF_WORK: 4 } as any;
    return [...agents].sort((a, b) => {
      const oa = order[a.status] ?? 99;
      const ob = order[b.status] ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [agents]);

  async function override(agent_id: string, status: string) {
    setMsg(null);
    try {
      const res = await fetch('/api/ops/agents/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      await load();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">All Agents</div>
          <div className="mt-1 text-sm text-neutral-500">Live availability for the browser-phone pool.</div>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200">
            <span>Auto-refresh</span>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          </label>
          <button
            className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700 disabled:opacity-50"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {msg ? <div className="mt-3 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{msg}</div> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((a) => (
          <div key={a.id} className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-sm font-bold">
                    {a.name
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {String(a.lang).toUpperCase()} • last update {fmtAgo(a.updated_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${badgeClass(a.status)}`}>
                    {a.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  onClick={() => override(a.id, 'AVAILABLE')}
                >
                  Override: Available
                </button>
                <button
                  className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700"
                  onClick={() => override(a.id, 'AWAY')}
                >
                  Override: Away
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Calls handled" value="—" />
              <Stat label="Talk time" value="—" />
              <Stat label="Transfers" value="—" />
              <Stat label="Avg handle" value="—" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700"
                onClick={() => alert('Call log: coming next (needs per-agent call attribution).')}
              >
                View Call Log
              </button>
              <button
                className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700"
                onClick={() => alert('Message: coming soon.')}
              >
                Message
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-neutral-500">
        Note: per-agent call metrics/logs require attributing calls to agent_id at accept time. Next step.
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">{value}</div>
    </div>
  );
}

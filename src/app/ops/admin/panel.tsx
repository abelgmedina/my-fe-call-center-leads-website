'use client';

import { useMemo, useState } from 'react';

type Dept = {
  id: string;
  name: string;
  lane: string;
  health: 'healthy' | 'degraded' | 'down';
  mode: 'normal' | 'isolated';
  summary: string;
  checkedAt: string;
  dependencies: string[];
  impacts: string[];
  autoRepairable: boolean;
  runbook: string[];
};

type GraphNode = {
  id: string;
  dependsOn: string[];
  impacts: string[];
  mode: 'normal' | 'isolated';
};

type AlertEvent = {
  id: number;
  dept_id: string;
  prev_health: string | null;
  next_health: string;
  message: string;
  created_at: number;
  notified: number;
};

type Payload = {
  departments: Dept[];
  graph?: GraphNode[];
  alerts?: AlertEvent[];
  updatedAt: string;
};

function badge(health: Dept['health']) {
  if (health === 'healthy') return 'border-green-600/30 bg-green-600/10 text-green-300';
  if (health === 'degraded') return 'border-yellow-600/30 bg-yellow-600/10 text-yellow-300';
  return 'border-red-600/30 bg-red-600/10 text-red-300';
}

export function OpsAdminPanel({ initial }: { initial: Payload }) {
  const [data, setData] = useState<Payload>(initial);
  const [alerts, setAlerts] = useState<AlertEvent[]>(initial.alerts || []);
  const [busy, setBusy] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const totals = useMemo(() => {
    const t = { healthy: 0, degraded: 0, down: 0, isolated: 0 };
    for (const d of data.departments) {
      t[d.health]++;
      if (d.mode === 'isolated') t.isolated++;
    }
    return t;
  }, [data]);

  async function reload() {
    const [resA, resB] = await Promise.all([
      fetch('/api/ops/departments', { cache: 'no-store' }),
      fetch('/api/ops/departments/alerts?limit=20', { cache: 'no-store' }),
    ]);
    const next = await resA.json();
    const alertPayload = await resB.json();
    setData(next);
    setAlerts(alertPayload.alerts || []);
  }

  async function runAlertSweep() {
    setBusy('alerts:sweep');
    setNote('');
    try {
      const res = await fetch('/api/ops/departments/alerts', { method: 'POST' });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      setAlerts(out.events || []);
      setNote(`Alert sweep complete. Changes: ${out.changed || 0}. SMS notified: ${out.notified ? 'yes' : 'no'}.`);
    } catch (e: any) {
      setNote(e?.message || 'Alert sweep failed');
    } finally {
      setBusy('');
    }
  }

  async function run(id: string, action: 'refresh' | 'repair' | 'isolate' | 'restore') {
    setBusy(`${action}:${id}`);
    setNote('');
    try {
      const res = await fetch('/api/ops/departments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || `HTTP ${res.status}`);
      setData({ departments: out.departments, graph: out.graph, updatedAt: out.updatedAt });
      setNote(out?.result?.note || 'Done');
    } catch (e: any) {
      setNote(e?.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">FE Call Center • Admin</div>
          <h1 className="mt-1 text-2xl font-semibold">Operations Control Panel (Phase 2)</h1>
          <div className="mt-1 text-xs text-neutral-500">Updated {new Date(data.updatedAt).toLocaleString()}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-semibold hover:bg-neutral-900">
            Refresh all
          </button>
          <button onClick={runAlertSweep} disabled={!!busy} className="rounded-md border border-amber-700/60 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/40 disabled:opacity-50">
            {busy === 'alerts:sweep' ? 'Sweeping…' : 'Run Alert Sweep'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-sm">
        <Stat label="Healthy" value={totals.healthy} cls="text-green-300" />
        <Stat label="Degraded" value={totals.degraded} cls="text-yellow-300" />
        <Stat label="Down" value={totals.down} cls="text-red-300" />
        <Stat label="Isolated" value={totals.isolated} cls="text-cyan-300" />
      </div>

      {note ? <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300">{note}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data.departments.map((d) => (
          <div key={d.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{d.name}</div>
                <div className="text-xs text-neutral-500">Lane: {d.lane} • Mode: {d.mode.toUpperCase()}</div>
              </div>
              <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${badge(d.health)}`}>{d.health.toUpperCase()}</span>
            </div>
            <div className="mt-3 text-sm text-neutral-300">{d.summary}</div>
            <div className="mt-2 text-[11px] text-neutral-500">Depends on: {d.dependencies.length ? d.dependencies.join(', ') : 'none'}</div>
            <div className="text-[11px] text-neutral-500">Impacts: {d.impacts.length ? d.impacts.join(', ') : 'none'}</div>
            <div className="text-[11px] text-neutral-500">Auto-fix: {d.autoRepairable ? 'enabled' : 'manual only'}</div>
            <div className="mt-1 text-[11px] text-neutral-500">Checked {new Date(d.checkedAt).toLocaleTimeString()}</div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-neutral-400">
              {d.runbook.slice(0, 3).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => run(d.id, 'refresh')} disabled={!!busy} className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-semibold hover:bg-neutral-900 disabled:opacity-50">
                {busy === `refresh:${d.id}` ? 'Refreshing…' : 'Refresh'}
              </button>
              <button onClick={() => run(d.id, 'repair')} disabled={!!busy || !d.autoRepairable} className="rounded-md border border-neutral-700 px-3 py-2 text-xs font-semibold hover:bg-neutral-900 disabled:opacity-50">
                {busy === `repair:${d.id}` ? 'Running fix…' : 'Fix'}
              </button>
              {d.mode === 'normal' ? (
                <button onClick={() => run(d.id, 'isolate')} disabled={!!busy} className="rounded-md border border-cyan-700/50 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-950/40 disabled:opacity-50">
                  {busy === `isolate:${d.id}` ? 'Isolating…' : 'Isolate'}
                </button>
              ) : (
                <button onClick={() => run(d.id, 'restore')} disabled={!!busy} className="rounded-md border border-emerald-700/50 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-50">
                  {busy === `restore:${d.id}` ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
        <h2 className="text-sm font-semibold">Recent Alerts</h2>
        <div className="mt-2 space-y-2 text-xs">
          {alerts.length === 0 ? (
            <div className="text-neutral-500">No alert events yet.</div>
          ) : (
            alerts.slice(0, 10).map((a) => (
              <div key={a.id} className="rounded-md border border-neutral-800 p-2 text-neutral-300">
                <div className="font-semibold">{a.dept_id}: {a.prev_health || 'unknown'} → {a.next_health}</div>
                <div className="text-neutral-400">{new Date(a.created_at).toLocaleString()} • SMS: {a.notified ? 'sent' : 'not sent'}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
        <h2 className="text-sm font-semibold">Dependency Map</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs text-neutral-300">
          {(data.graph || []).map((g) => (
            <div key={g.id} className="rounded-md border border-neutral-800 p-2">
              <div className="font-semibold">{g.id} <span className="text-neutral-500">[{g.mode}]</span></div>
              <div>dependsOn: {g.dependsOn.length ? g.dependsOn.join(', ') : 'none'}</div>
              <div>impacts: {g.impacts.length ? g.impacts.join(', ') : 'none'}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Card = { lead_id: string; phone: string; state?: string; name?: string; status?: string };

function pickNext(grouped: Record<string, Card[]>, otherCallablePreview: Card[]) {
  const buckets = ['QUALIFIED_TRANSFER_NOW', 'READY_FOR_CALL', 'NO_ANSWER', 'CALL_APPT_SET'];
  for (const b of buckets) {
    const arr = grouped[b] || [];
    const c = arr.find((x) => x?.lead_id && x?.phone);
    if (c) return c;
  }
  // fallback: other callable preview (when sheet statuses aren't set)
  const other = (otherCallablePreview || []).find((x) => x?.lead_id && x?.phone);
  if (other) return other;

  // fallback: anything else
  for (const k of Object.keys(grouped)) {
    const c = (grouped[k] || []).find((x) => x?.lead_id && x?.phone);
    if (c) return c;
  }
  return null;
}

export function DialerPanel({
  grouped,
  otherCallablePreview,
  queueCount,
}: {
  grouped: Record<string, Card[]>;
  otherCallablePreview: Card[];
  queueCount: number;
}) {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [active, setActive] = useState<{ lead_id: string; callSid?: string } | null>(null);
  const [attempts, setAttempts] = useState<Array<{ lead_id: string; phone: string; name?: string; state?: string; callSid: string; status?: string }>>([]);
  const timer = useRef<any>(null);

  // UI toggles (v1). These default to ON and may be wired deeper later.
  const [respectWindows, setRespectWindows] = useState(true);
  const [skipOptOuts, setSkipOptOuts] = useState(true);
  const [oneCallPerAgent, setOneCallPerAgent] = useState(true);
  const [previewNext, setPreviewNext] = useState(true);
  const [parallelLines, setParallelLines] = useState(3);

  const next = useMemo(() => pickNext(grouped, otherCallablePreview), [grouped, otherCallablePreview]);

  async function startPack() {
    if (!next) {
      setMsg('No callable leads in queue.');
      return;
    }

    // Readiness gate: Abel must be AVAILABLE + console tab visible + device registered.
    try {
      const agents = await fetch('/api/ops/agents', { cache: 'no-store' }).then((r) => r.json());
      const abel = (agents?.agents || []).find((a: any) => a?.id === 'abel');
      if (!abel || String(abel.status) !== 'AVAILABLE') {
        setMsg('Dialer blocked: Abel must be AVAILABLE in Agent Console.');
        setRunning(false);
        return;
      }
      const pres = await fetch('/api/ops/agents/presence?agent=abel', { cache: 'no-store' }).then((r) => r.json());
      if (!pres?.device_ready || !pres?.visible) {
        setMsg('Dialer blocked: Agent Console must be visible + Browser Phone must be Ready.');
        setRunning(false);
        return;
      }
    } catch {
      setMsg('Dialer blocked: could not verify agent readiness.');
      setRunning(false);
      return;
    }

    // Build a pack of up to N distinct leads.
    const picked: Card[] = [];
    const seen = new Set<string>();

    const pushIf = (c: any) => {
      if (!c?.lead_id || !c?.phone) return;
      // Skip Florida leads (appointment pending)
      try {
        const st = String(c?.state || '').trim().toUpperCase();
        if (st === 'FL' || st === 'FLORIDA') return;
      } catch {}
      const digits = String(c.phone).replace(/\D+/g, '');
      if (digits.length >= 10) {
        const area = digits.slice(-10, -7);
        const flArea = new Set([
          '239','305','321','352','386','407','561','727','754','772','786','813','850','863','904','941','954','689'
        ]);
        if (flArea.has(area)) return;
      }
      const p = digits;
      if (!p) return;
      if (seen.has(p)) return;
      seen.add(p);
      picked.push(c);
    };

    // Iterate buckets in priority order, then fill.
    const buckets = Object.keys(grouped);
    for (const b of ['QUALIFIED_TRANSFER_NOW', 'READY_FOR_CALL', 'NO_ANSWER', 'CALL_APPT_SET', ...buckets]) {
      for (const c of grouped[b] || []) {
        if (picked.length >= parallelLines) break;
        pushIf(c);
      }
      if (picked.length >= parallelLines) break;
    }

    // If explicit queue buckets are empty, pull from other-callable preview.
    if (picked.length < parallelLines) {
      for (const c of otherCallablePreview || []) {
        if (picked.length >= parallelLines) break;
        pushIf(c);
      }
    }

    if (!picked.length) {
      setMsg('No callable leads in queue.');
      return;
    }

    setMsg(`Dialing ${picked.length} lead(s)…`);

    const attempts: any[] = [];
    for (const lead of picked) {
      const raw = (lead.phone || '').trim();
      const to = raw.startsWith('+') ? raw : raw.length === 10 ? `+1${raw}` : raw;
      const res = await fetch('/api/ops/dialer/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, lead_id: lead.lead_id, state: (lead.state || '').trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      attempts.push({ lead_id: lead.lead_id, phone: lead.phone, name: lead.name, state: lead.state, callSid: data.callSid, status: 'started' });
    }

    setAttempts(attempts);
    setActive({ lead_id: attempts[0].lead_id, callSid: attempts[0].callSid } as any);
    setMsg(`Attempts started: ${attempts.map((a) => `${a.name || a.lead_id} (${a.phone})`).join(' • ')}`);
  }

async function tick() {
    if (!running) return;
        if (!attempts.length) {
      // nothing active; start next pack
      try {
        await startPack();
      } catch (e: any) {
        setMsg(`Dialer error: ${e?.message || e}`);
        setRunning(false);
      }
      return;
    }

    // poll call meta/status across attempts; first answered wins.
    try {
      const terminal = ['completed', 'busy', 'no-answer', 'failed', 'canceled'];
      const nextAttempts = attempts.map((x) => ({ ...x }));
      for (const a of nextAttempts) {
        if (!a?.callSid) continue;
        const metaRes = await fetch(`/api/twilio/call/meta?callSid=${encodeURIComponent(a.callSid)}`);
        const meta = await metaRes.json();
        a.status = String(meta?.status || '').toLowerCase();
        if (a.status === 'answered') {
          // winner
          const who = `${a.name || a.lead_id} (${a.phone})`;
          setMsg(`Connected: ${who}`);

          // Desktop notification + audible beep (best-effort)
          try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
              }
              if (Notification.permission === 'granted') {
                new Notification('Dialer connected', { body: who });
              }
            }
          } catch {}

          try {
            const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'sine';
              o.frequency.value = 880;
              g.gain.value = 0.02;
              o.connect(g);
              g.connect(ctx.destination);
              o.start();
              setTimeout(() => {
                try { o.stop(); } catch {}
                try { ctx.close(); } catch {}
              }, 300);
            }
          } catch {}

          // cancel siblings
          for (const b of attempts) {
            if (b.callSid && b.callSid !== a.callSid) {
              fetch('/api/ops/dialer/call/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callSid: b.callSid }),
              }).catch(() => {});
            }
          }
          setAttempts([a]);
          setActive({ lead_id: a.lead_id, callSid: a.callSid });
          setRunning(false);
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          return;
        }
      }

      setAttempts(nextAttempts);

      const allTerminal = nextAttempts.length && nextAttempts.every((x) => terminal.includes(String(x.status || '')));
      if (allTerminal) {
        setMsg('No connects in this pack. Next…');
        setAttempts([]);
        setActive(null);
      }
    } catch {
      // ignore
    }
  }

  function start() {
    if (running) return;
    setRunning(true);
    setMsg('Dialer started.');
    timer.current = setInterval(() => {
      tick();
    }, 2500);
    tick();
  }

  function stop() {
    setRunning(false);
    setMsg('Dialer paused.');
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950/40 p-5 lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-neutral-100">Dialer Rules</div>
            <div className="mt-1 text-xs text-neutral-500">Safety rails to prevent over-contact and abandoned calls.</div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="rounded-md border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-xs font-semibold text-neutral-200"
              value={parallelLines}
              onChange={(e) => setParallelLines(Number(e.target.value))}
              disabled={running}
            >
              <option value={1}>1 line</option>
              <option value={2}>2 lines</option>
              <option value={3}>3 lines</option>
            </select>
            <button
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
              onClick={start}
              disabled={running}
            >
              Start Dialing
            </button>
          </div>
        </div>

        <div className="mt-5 divide-y divide-neutral-900 overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950/40">
          <Rule
            title="Respect contact windows (8am–9pm local)"
            desc="Only dial leads within their local calling hours"
            enabled={respectWindows}
            onToggle={setRespectWindows}
          />
          <Rule
            title="Skip opt-outs automatically"
            desc="Never dial leads marked as DNC or OPT_OUT"
            enabled={skipOptOuts}
            onToggle={setSkipOptOuts}
          />
          <Rule
            title="One call per agent max"
            desc="Prevents abandoned calls — pauses when all agents are busy"
            enabled={oneCallPerAgent}
            onToggle={setOneCallPerAgent}
          />
          <Rule
            title="Preview next lead"
            desc="Show next lead info before auto-dial begins"
            enabled={previewNext}
            onToggle={setPreviewNext}
          />
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-neutral-100">Live dialing feed</div>
          <div className="mt-2 text-xs text-neutral-500">Shows the current call attempts (up to 3) and their statuses.</div>

          <div className="mt-3 space-y-2">
            {attempts.length ? (
              attempts.map((a) => (
                <div key={a.callSid} className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-neutral-100">{a.name || a.lead_id}</div>
                      <div className="mt-1 text-xs text-neutral-500">{a.phone} • {a.state || '—'} • {a.callSid}</div>
                    </div>
                    <span className="rounded-md border border-neutral-800 bg-black px-2 py-1 text-xs font-semibold text-white">
                      {(a.status || 'starting').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-4 text-sm text-neutral-500">
                No active attempts. Click <span className="font-semibold text-neutral-200">Start Dialing</span> to begin.
              </div>
            )}
          </div>

          <div className="mt-6 text-sm font-semibold text-neutral-100">Next in Queue</div>
          <div className="mt-2 text-xs text-neutral-500">Showing next lead from prioritized queue (MASTER_LEADS)</div>
          <div className="mt-3 space-y-2">
            {queueCount === 0 ? (
              <div className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-4 text-sm text-neutral-500">No leads in queue.</div>
            ) : (
              [next].filter(Boolean).slice(0, 1).map((c: any, i: number) => (
                <div key={i} className="rounded-xl border border-neutral-900 bg-neutral-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-100">{c?.name || '—'}</div>
                    <span className="rounded-md border border-neutral-800 bg-black px-2 py-1 text-xs font-semibold text-white">OUTBOUND</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{c?.phone || '—'} • {c?.state || '—'}</div>
                </div>
              ))
            )}
          </div>

          {msg ? <div className="mt-3 text-xs text-neutral-400">{msg}</div> : null}
          {active?.lead_id ? <div className="mt-2 text-xs text-neutral-500">Active lead: {active.lead_id} {active.callSid ? `• ${active.callSid}` : ''}</div> : null}

          <div className="mt-4">
            <button
              className="rounded-md border border-neutral-800 bg-neutral-950/40 px-4 py-2 text-sm font-semibold text-neutral-200 hover:border-neutral-700 disabled:opacity-50"
              onClick={stop}
              disabled={!running}
            >
              Pause
            </button>
          </div>
        </div>
      </div>

      <SessionStats />
    </div>
  );
}

function Rule({
  title,
  desc,
  enabled,
  onToggle,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div>
        <div className="text-sm font-semibold text-neutral-100">{title}</div>
        <div className="mt-1 text-xs text-neutral-500">{desc}</div>
      </div>
      <label className="inline-flex cursor-pointer items-center">
        <input type="checkbox" className="sr-only" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        <span className={
          'relative inline-flex h-6 w-11 items-center rounded-full border transition ' +
          (enabled ? 'bg-green-600/30 border-green-600/30' : 'bg-neutral-900 border-neutral-800')
        }>
          <span className={
            'inline-block h-5 w-5 transform rounded-full bg-white transition ' +
            (enabled ? 'translate-x-5' : 'translate-x-1')
          } />
        </span>
      </label>
    </div>
  );
}

function SessionStats() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch('/api/ops/dialer/stats', { cache: 'no-store' });
        const j = await res.json();
        if (!dead) setData(j);
      } catch {
        if (!dead) setData(null);
      }
    })();
    const t = setInterval(() => {
      fetch('/api/ops/dialer/stats', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j) => setData(j))
        .catch(() => {});
    }, 15000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-neutral-900 bg-neutral-950/40 p-5">
      <div className="text-sm font-semibold text-neutral-100">Session Stats</div>
      <div className="mt-4 space-y-3 text-sm">
        <Row label="Calls today" value={data?.callsToday ?? '—'} />
        <Row label="Connect rate" value={data?.connectRate != null ? `${data.connectRate}%` : '—'} />
        <Row label="Avg handle time" value={data?.avgHandle ?? '—'} />
        <Row label="Abandons" value={data?.abandons ?? '—'} />
      </div>

      <div className="mt-6 rounded-xl border border-neutral-900 bg-neutral-950/40 p-4">
        <div className="text-xs font-semibold text-neutral-400">Hourly Dial Volume</div>
        <div className="mt-3 grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-blue-600/20" />
          ))}
        </div>
        <div className="mt-2 text-[10px] text-neutral-500">(Chart placeholder — we’ll backfill from call_events.)</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-neutral-500">{label}</div>
      <div className="font-semibold text-neutral-100">{value}</div>
    </div>
  );
}
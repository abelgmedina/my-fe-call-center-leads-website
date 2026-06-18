'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AgentShell } from './AgentShell';
import { getCarrier } from '@/lib/carriers';

type AgentStatus = 'AVAILABLE' | 'AWAY' | 'BREAK' | 'OFF_WORK' | 'IN_CALL';

type DeviceState =
  | { kind: 'idle' }
  | { kind: 'initializing' }
  | { kind: 'ready'; identity: string }
  | { kind: 'error'; error: string };

type CallMeta = {
  call_type?: string;
  lead_id?: string | null;
  state?: string | null;
  bucket?: string | null;
};

type CallState =
  | { kind: 'none' }
  | { kind: 'incoming'; from?: string; callSid?: string; meta?: CallMeta }
  | { kind: 'in_call'; with?: string; callSid?: string; meta?: CallMeta };

type QueueCard = {
  lead_id: string;
  name: string;
  phone: string;
  state: string;
  status: string;
  last_contact_at: string;
  next_action_at: string;
};

type QueueData = {
  updatedAt: string;
  grouped: Record<string, QueueCard[]>;
};

function FieldTiny({ k, v }: { k: string; v: string }) {
  const vv = (v || '').trim();
  if (!vv) return null;
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold tracking-[0.14em] text-blue-200/70">{k}</div>
      <div className="mt-1 truncate text-xs text-blue-50">{vv}</div>
    </div>
  );
}

export default function AgentConsole() {
  const [status, setStatus] = useState<AgentStatus>('OFF_WORK');
  const [deviceState, setDeviceState] = useState<DeviceState>({ kind: 'idle' });
  const [callState, setCallState] = useState<CallState>({ kind: 'none' });

  const [lastRecoverAt, setLastRecoverAt] = useState<number>(0);
  const [recoverFailures, setRecoverFailures] = useState<number>(0);

  const [callerLead, setCallerLead] = useState<{ record: Record<string, string>; rowIndex?: number } | null>(null);
  const [callerLeadErr, setCallerLeadErr] = useState<string>('');

  const [msg, setMsg] = useState<string>('');
  const [manualTo, setManualTo] = useState<string>('');
  const [manualDialMsg, setManualDialMsg] = useState<string>('');
  const [manualLog, setManualLog] = useState<Array<{ to: string; at: number }>>([]);

  const [lastAudit, setLastAudit] = useState<any>(null);
  const [lastAuditErr, setLastAuditErr] = useState<string>('');

  const [queue, setQueue] = useState<QueueData | null>(null);
  const [queueErr, setQueueErr] = useState<string>('');
  const [fbLeads, setFbLeads] = useState<any[]>([]);

  const [wsOpen, setWsOpen] = useState(false);
  const [wsMin, setWsMin] = useState(false);
  const [wsPinnedOpen, setWsPinnedOpen] = useState(false);
  const [wsSaving, setWsSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [wsErr, setWsErr] = useState('');
  const [wsFields, setWsFields] = useState({
    state: '',
    calling_for: '',
    primary_first: '',
    primary_last: '',
    primary_dob: '',
    primary_tobacco: '',
    primary_beneficiary: '',
    secondary_first: '',
    secondary_last: '',
    secondary_dob: '',
    secondary_tobacco: '',
    secondary_beneficiary: '',
    coverage_goal: '',
    current_coverage: '',
    payment_type: '',
    income_type: '',
    height: '',
    weight: '',
    conditions: '',
    knockouts: '',
    medications: '',
    underwriting_notes: '',
  });

  const [wsNotes, setWsNotes] = useState('');
  const [wsCarrierId, setWsCarrierId] = useState<'senior_life' | ''>('');
  const wsSaveTimer = useRef<any>(null);

  const twilio = useMemo(() => ({ Device: null as any, device: null as any, activeCall: null as any }), []);
  const selectedCarrier = wsCarrierId ? getCarrier(wsCarrierId as any) : null;

  const [me, setMe] = useState<{ id: string; name: string; lang: string } | null>(null);

  const [watch, setWatch] = useState({
    online: true,
    visible: true,
    lastPingAt: 0,
    pingOk: true,
    pingMs: 0,
  });

  async function loadQueue() {
    try {
      setQueueErr('');
      const res = await fetch('/api/ops/call/queue', { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : null;
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
      setQueue(data as any);

      try {
        const r2 = await fetch('/api/ops/leads/fb/recent?limit=15', { cache: 'no-store' });
        const ct2 = r2.headers.get('content-type') || '';
        const j2 = ct2.includes('application/json') ? await r2.json() : null;
        if (r2.ok && (j2 as any)?.leads) setFbLeads((j2 as any).leads);
      } catch {}
    } catch (e: any) {
      setQueueErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    const onVis = () => setWatch((w) => ({ ...w, visible: document.visibilityState === 'visible' }));
    const onOnline = () => setWatch((w) => ({ ...w, online: true }));
    const onOffline = () => setWatch((w) => ({ ...w, online: false, pingOk: false }));

    try {
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    } catch {}

    let stop = false;
    const tick = async () => {
      const t0 = Date.now();
      try {
        const res = await fetch('/api/ops/health', { cache: 'no-store' });
        const ms = Date.now() - t0;
        setWatch((w) => ({ ...w, lastPingAt: Date.now(), pingOk: res.ok, pingMs: ms }));
      } catch {
        setWatch((w) => ({ ...w, lastPingAt: Date.now(), pingOk: false }));
      }

      try {
        await fetch('/api/ops/agents/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: me?.id || 'abel',
            visible: document.visibilityState === 'visible',
            device_ready: deviceState.kind === 'ready',
          }),
        });
      } catch {}
    };

    tick();
    const iv = setInterval(() => {
      if (stop) return;
      tick();
    }, 15000);

    return () => {
      stop = true;
      try {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      } catch {}
      clearInterval(iv);
    };
  }, [deviceState.kind, me?.id]);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setMe(j?.agent || null))
      .catch(() => setMe(null));
    loadQueue();
  }, []);

  return (
    <AgentShell title="Inbound Calls Screen" subtitle="Set availability, answer inbound calls, and work the intake live.">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel-elevated p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/80">Live agent status</div>
              <h2 className="mt-2 text-2xl font-semibold">Ready for inbound calls</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Use this screen to mark yourself available, confirm browser phone readiness, and answer inbound calls.</p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">
              Status: {status}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <button onClick={() => setStatus('AVAILABLE')} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">Set Available</button>
            <button onClick={() => setStatus('BREAK')} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100">Set Break</button>
            <button onClick={() => setStatus('OFF_WORK')} className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-neutral-100">Set Offline</button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/80">Browser phone</div>
              <div className="mt-2 text-lg font-semibold">{deviceState.kind === 'ready' ? 'Ready' : deviceState.kind === 'initializing' ? 'Initializing' : deviceState.kind === 'error' ? 'Error' : 'Idle'}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">Identity: {deviceState.kind === 'ready' ? deviceState.identity : 'Not connected yet'}</div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Connection watch</div>
              <div className="mt-2 text-lg font-semibold">{watch.pingOk ? 'Healthy' : 'Check connection'}</div>
              <div className="mt-2 text-sm text-[var(--muted)]">Online: {watch.online ? 'Yes' : 'No'} • Visible: {watch.visible ? 'Yes' : 'No'} • Ping: {watch.pingMs} ms</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-300/80">Current call</div>
            <div className="mt-2 text-lg font-semibold">
              {callState.kind === 'incoming' ? `Incoming: ${callState.from || 'Unknown caller'}` : callState.kind === 'in_call' ? `In call with ${callState.with || 'caller'}` : 'No active inbound call'}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <FieldTiny k="Type" v={callState.kind !== 'none' ? callState.meta?.call_type || '' : ''} />
              <FieldTiny k="Lead" v={callState.kind !== 'none' ? callState.meta?.lead_id || '' : ''} />
              <FieldTiny k="State" v={callState.kind !== 'none' ? callState.meta?.state || '' : ''} />
              <FieldTiny k="Bucket" v={callState.kind !== 'none' ? callState.meta?.bucket || '' : ''} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="panel-elevated p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/80">Queue snapshot</div>
            <h2 className="mt-2 text-lg font-semibold">Next leads in queue</h2>
            <div className="mt-4 space-y-3">
              {queue ? Object.values(queue.grouped).flat().slice(0, 5).map((item) => (
                <div key={item.lead_id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="font-semibold">{item.name || 'Unknown lead'}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{item.phone} • {item.state} • {item.status}</div>
                </div>
              )) : <div className="text-sm text-[var(--muted)]">Loading queue...</div>}
              {queueErr ? <div className="text-sm text-red-300">{queueErr}</div> : null}
            </div>
          </div>

          <div className="panel-elevated p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Fresh Facebook leads</div>
            <h2 className="mt-2 text-lg font-semibold">Recent inbound-ready records</h2>
            <div className="mt-4 space-y-3">
              {fbLeads.length ? fbLeads.slice(0, 5).map((lead: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="font-semibold">{lead.name || lead.full_name || 'Unnamed lead'}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{lead.phone || 'No phone'} • {lead.state || 'No state'}</div>
                </div>
              )) : <div className="text-sm text-[var(--muted)]">No recent FB leads loaded.</div>}
            </div>
          </div>
        </section>
      </div>
    </AgentShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

type AccessRequest = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  npn: string | null;
  residence_state: string | null;
  license_state: string | null;
  fmo: string | null;
  imo: string | null;
  agency_name: string | null;
  sales_model: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'denied';
  decision_notes: string | null;
  buyer_username: string | null;
  buyer_code: string | null;
  created_at: number;
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">{label}</div>
      <div className="mt-1 break-words text-sm text-[var(--foreground)]">{value || '—'}</div>
    </div>
  );
}

function statusClass(status: AccessRequest['status']) {
  if (status === 'approved') return 'border-emerald-600/30 bg-emerald-600/10 text-emerald-200';
  if (status === 'denied') return 'border-red-600/30 bg-red-600/10 text-red-200';
  return 'border-amber-600/30 bg-amber-600/10 text-amber-200';
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

export default function AgentApprovalsPage() {
  const [rows, setRows] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const pendingCount = useMemo(() => rows.filter((row) => row.status === 'pending').length, [rows]);

  async function load() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/ops/agent-approvals', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(data.rows || []);
    } catch (error: any) {
      setMsg(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: number, decision: 'approved' | 'denied') {
    setBusyId(id);
    setMsg('');
    try {
      const res = await fetch('/api/ops/agent-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          decision,
          password: passwords[id] || '',
          decision_notes: notes[id] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg(decision === 'approved' ? `Approved ${data.username}. Buyer code: ${data.buyer_code}. Send them their temporary password and /agent/login.` : 'Request denied.');
      await load();
    } catch (error: any) {
      setMsg(error?.message || String(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Access Control</div>
          <h1 className="mt-1 text-2xl font-semibold">Agent Approval Queue</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Review license and agency details, complete your due diligence call, then approve site access or deny the request.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80 hover:border-[var(--border-strong)] disabled:opacity-50">
          {loading ? 'Refreshing...' : `Refresh (${pendingCount} pending)`}
        </button>
      </div>

      {msg ? <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-3 text-sm text-blue-100">{msg}</div> : null}

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted-2)]">No access requests yet.</div>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{row.full_name}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusClass(row.status)}`}>{row.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-2)]">Submitted {new Date(row.created_at).toLocaleString()}</div>
                </div>
                {row.buyer_username ? (
                  <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-xs text-emerald-100">
                    Login: {row.buyer_username} • {row.buyer_code}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Field label="Email" value={row.email} />
                <Field label="Phone" value={row.phone} />
                <Field label="NPN" value={row.npn} />
                <Field label="Home state insurance license" value={row.residence_state || row.license_state} />
                <Field label="Sales model" value={row.sales_model} />
                <Field label="Current IMO/FMO/brokerage/captive agency" value={row.agency_name} />
              </div>

              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-neutral-300">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-2)]">Applicant notes</div>
                <div className="mt-1 whitespace-pre-wrap">{row.notes || '—'}</div>
              </div>

              {row.status === 'pending' ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                  <label className="block">
                    <div className="text-xs font-semibold text-[var(--muted-2)]">Due diligence / decision notes</div>
                    <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" value={notes[row.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))} placeholder="Zoom booked, NPN checked, state verified..." />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-[var(--muted-2)]">Temporary password for approval</div>
                    <div className="mt-2 flex gap-2">
                      <input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" value={passwords[row.id] || ''} onChange={(e) => setPasswords((p) => ({ ...p, [row.id]: e.target.value }))} placeholder="Minimum 8 characters" />
                      <button
                        type="button"
                        onClick={() => setPasswords((p) => ({ ...p, [row.id]: temporaryPassword() }))}
                        className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--foreground)]/80 hover:border-[var(--border-strong)]"
                      >
                        Generate
                      </button>
                    </div>
                  </label>
                  <div className="flex items-end gap-2">
                    <button onClick={() => decide(row.id, 'approved')} disabled={busyId === row.id} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
                      Accept Site Access
                    </button>
                    <button onClick={() => decide(row.id, 'denied')} disabled={busyId === row.id} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                      Deny
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-neutral-300">
                  Decision notes: {row.decision_notes || '—'}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

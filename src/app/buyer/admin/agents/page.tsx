'use client';

import { useEffect, useState } from 'react';

type Row = {
  username: string;
  role: string;
  disabled: number;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
};

export default function BuyerAdminAgentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/buyer/admin/agents', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRows(data.rows || []);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAgent() {
    setMsg(null);
    try {
      const res = await fetch('/api/buyer/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: 'buyer_agent' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setNewUsername('');
      setNewPassword('');
      await load();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function resetPassword(username: string) {
    const pw = window.prompt(`Set a new password for ${username} (min 8 chars):`);
    if (!pw) return;
    setMsg(null);
    try {
      const res = await fetch('/api/buyer/admin/agents/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg(`Password updated for ${username}.`);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    }
  }

  async function setDisabled(username: string, disabled: boolean) {
    setMsg(null);
    try {
      const res = await fetch('/api/buyer/admin/agents/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, disabled }),
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Agents</div>
          <div className="mt-1 text-sm text-[var(--muted-2)]">Create and manage Nobel Agency buyer agent logins.</div>
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="text-sm font-semibold">Create agent</div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-[var(--muted-2)]">Username</label>
            <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-[var(--muted-2)]">Temp password</label>
            <input type="password" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="mt-4 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500" onClick={createAgent}>
            Create
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="text-sm font-semibold">Existing agents</div>
          <div className="mt-3 divide-y divide-[var(--border)]">
            {rows.filter((r) => r.role === 'buyer_agent').length === 0 ? (
              <div className="py-4 text-sm text-[var(--muted-2)]">No buyer agents yet.</div>
            ) : (
              rows
                .filter((r) => r.role === 'buyer_agent')
                .map((r) => (
                  <div key={r.username} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="text-sm font-semibold">{r.username}</div>
                      <div className="mt-0.5 text-xs text-[var(--muted-2)]">Last login: {r.last_login_at ? new Date(r.last_login_at).toLocaleString() : '—'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold" onClick={() => resetPassword(r.username)}>
                        Reset PW
                      </button>
                      <button
                        className={
                          'rounded-md px-2 py-1 text-xs font-semibold ' +
                          (r.disabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                        }
                        onClick={() => setDisabled(r.username, !r.disabled)}
                      >
                        {r.disabled ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

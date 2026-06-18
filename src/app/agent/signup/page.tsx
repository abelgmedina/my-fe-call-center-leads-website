'use client';

import { useState } from 'react';

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export default function AgentSignupPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    npn: '',
    residence_state: '',
    agency_name: '',
    sales_model: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/agent/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setOk(true);
      setForm({
        full_name: '',
        email: '',
        phone: '',
        npn: '',
        residence_state: '',
        agency_name: '',
        sales_model: '',
        notes: '',
      });
      setMsg('Request submitted. We will review your info and send your CRM login after approval.');
    } catch (e: unknown) {
      setOk(false);
      setMsg(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--surface-0)] px-4 py-10 text-[var(--foreground)] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <a href="/agent/login" className="text-sm text-blue-300 hover:text-blue-200">← Back to login</a>

        <div className="mt-6 rounded-[32px] border border-[var(--border-strong)] bg-[color:rgba(8,15,30,0.82)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300/80">Agent approval request</div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Create your Upline Agent account</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Thank you for your interest in Upline Agent AI. We review each agent request to make sure our platform, leads, and tools are the right fit for your business before giving access.
          </p>

          <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Full name</div>
              <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Email</div>
              <input type="email" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Phone</div>
              <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-[var(--muted-2)]">NPN</div>
              <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.npn} onChange={(e) => update('npn', e.target.value)} inputMode="numeric" required />
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Home state insurance license</div>
              <input className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.residence_state} onChange={(e) => update('residence_state', e.target.value)} placeholder="Resident license state, e.g. CA" required />
            </label>

            <label className="block sm:col-span-2">
              <div className="text-xs font-semibold text-[var(--muted-2)]">
                What IMO/FMO/insurance brokerage/captive agency, etc. do you currently work with?
              </div>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20"
                value={form.agency_name}
                onChange={(e) => update('agency_name', e.target.value)}
                placeholder="Tell us who you are currently contracted with or affiliated under."
                required
              />
            </label>

            <label className="block sm:col-span-2">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Primary sales model</div>
              <select className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.sales_model} onChange={(e) => update('sales_model', e.target.value)} required>
                <option value="">Select one</option>
                <option>Final expense telesales</option>
                <option>Final expense field sales</option>
                <option>Hybrid field and telesales</option>
                <option>Agency owner or team leader</option>
              </select>
            </label>

            <label className="block sm:col-span-2">
              <div className="text-xs font-semibold text-[var(--muted-2)]">Anything we should know?</div>
              <textarea className="mt-2 min-h-32 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Markets worked, lead volume needed, team size, production background, or anything helpful for approval." />
            </label>

            <button className="sm:col-span-2 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50" disabled={loading} type="submit">
              {loading ? 'Submitting…' : 'Request Agent Access'}
            </button>
          </form>

          {msg ? (
            <div className={`mt-5 rounded-xl border p-3 text-sm ${ok ? 'border-emerald-900 bg-emerald-950/40 text-emerald-200' : 'border-red-900 bg-red-950/40 text-red-200'}`}>
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

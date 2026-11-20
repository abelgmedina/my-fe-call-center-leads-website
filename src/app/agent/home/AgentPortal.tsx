'use client';

import { useState } from 'react';
import type { PortalAccountProfile } from '@/lib/auth';

type ProfileFields = Pick<
  PortalAccountProfile,
  'full_name' | 'phone' | 'npn' | 'residence_state' | 'license_state' | 'agency_name' | 'sales_model'
>;

function profileFrom(account: PortalAccountProfile): ProfileFields {
  return {
    full_name: account.full_name || '',
    phone: account.phone || '',
    npn: account.npn || '',
    residence_state: account.residence_state || '',
    license_state: account.license_state || '',
    agency_name: account.agency_name || '',
    sales_model: account.sales_model || '',
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not save your profile.';
}

export default function AgentPortal({ initialAccount }: { initialAccount: PortalAccountProfile }) {
  const [account, setAccount] = useState(initialAccount);
  const [form, setForm] = useState<ProfileFields>(() => profileFrom(initialAccount));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function update<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/agent/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setAccount(data.account);
      setForm(profileFrom(data.account));
      setMessage('Profile saved. These details stay optional until you choose a separate activation or contracting step.');
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    window.location.assign('/agent/login');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(850px_circle_at_15%_0%,rgba(37,99,235,0.22),transparent_50%),linear-gradient(160deg,#050813,#090e1d_50%,#060914)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <img src="/brand/uai-logo.png" alt="Upline Agent AI" className="h-11 w-11 rounded-xl border border-blue-300/25 bg-blue-500/10 p-1.5" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-200">Upline Agent AI</div>
              <h1 className="mt-1 text-xl font-semibold">Agent CRM</h1>
            </div>
          </div>
          <button onClick={signOut} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:border-blue-300/50 hover:bg-blue-500/10">
            Sign out
          </button>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-3xl border border-blue-400/25 bg-[linear-gradient(145deg,rgba(37,99,235,0.20),rgba(255,255,255,0.04))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:p-8">
            <div className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">Account active</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">You’re in.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">
              Your email and password created a restricted Agent CRM workspace immediately. NPN, licenses, carrier details, and contracting information are optional until you decide to move forward with a separate activation step.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/70">Signed in as</div>
              <div className="mt-2 font-medium text-white">{account.email}</div>
            </div>
          </article>

          <aside className="rounded-3xl border border-amber-300/20 bg-amber-300/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Operations access</div>
            <h2 className="mt-3 text-xl font-semibold">Not activated yet</h2>
            <p className="mt-3 text-sm leading-6 text-amber-50/75">
              Inbound calls, the power dialer, lead queues, recordings, and owner tools stay locked until an owner explicitly activates an agent. Creating an account never turns on live calling.
            </p>
          </aside>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[rgba(8,15,30,0.78)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/75">Optional profile</div>
              <h2 className="mt-2 text-2xl font-semibold">Complete this when it makes sense</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Nothing below is required to keep or use this restricted workspace.</p>
            </div>
          </div>

          <form onSubmit={save} className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-300">Full name <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="Your name" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Phone <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="(555) 555-5555" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">NPN <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.npn} onChange={(e) => update('npn', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" inputMode="numeric" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Resident license state <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.residence_state} onChange={(e) => update('residence_state', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="CA" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Other license states <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.license_state} onChange={(e) => update('license_state', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="TX, FL" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Agency / IMO / FMO <span className="font-normal text-slate-500">(optional)</span></span>
              <input value={form.agency_name} onChange={(e) => update('agency_name', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Sales model <span className="font-normal text-slate-500">(optional)</span></span>
              <select value={form.sales_model} onChange={(e) => update('sales_model', e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-400">
                <option value="">Choose later</option>
                <option value="Final expense telesales">Final expense telesales</option>
                <option value="Final expense field sales">Final expense field sales</option>
                <option value="Hybrid field and telesales">Hybrid field and telesales</option>
                <option value="Agency owner or team leader">Agency owner or team leader</option>
              </select>
            </label>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.26)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save optional profile'}
              </button>
              {message ? <p className="text-sm text-slate-300" role="status">{message}</p> : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

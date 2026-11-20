'use client';

import { useState } from 'react';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Could not create your account.';
}

export default function AgentSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/agent/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.location.assign(data?.redirectTo || '/agent/home');
    } catch (error: unknown) {
      setMessage(errorMessage(error));
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(850px_circle_at_15%_0%,rgba(37,99,235,0.22),transparent_50%),linear-gradient(160deg,#050813,#090e1d_50%,#060914)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-lg rounded-[32px] border border-white/12 bg-[rgba(8,15,30,0.82)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <a href="/agent/login" className="text-sm font-medium text-blue-200 hover:text-blue-100">← Back to sign in</a>
        <div className="mt-7 flex items-center gap-3">
          <img src="/brand/uai-logo.png" alt="Upline Agent AI" className="h-12 w-12 rounded-xl border border-blue-300/25 bg-blue-500/10 p-1.5" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Upline Agent AI</div>
            <h1 className="mt-1 text-2xl font-semibold">Create your agent account</h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-300">
          Start with just your email and a password. NPN, license, carrier, and contracting details are optional and can be completed later.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Password</span>
            <input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="At least 12 characters" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Confirm password</span>
            <input type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" />
          </label>
          <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account and enter CRM'}
          </button>
        </form>

        {message ? <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-100" role="alert">{message}</div> : null}
        <p className="mt-6 text-xs leading-5 text-slate-400">
          A new account opens a restricted workspace only. Live inbound calls, power dialing, lead queues, and owner tools require separate activation.
        </p>
      </div>
    </main>
  );
}

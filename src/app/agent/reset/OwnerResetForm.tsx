'use client';

import { useEffect, useState } from 'react';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to reset the owner password.';
}

export default function OwnerResetForm() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    setToken(params.get('token') || '');
    // The private recovery token lives only in the URL fragment (never in a
    // request, server log, or referrer) and is immediately removed from view.
    window.history.replaceState(null, '', window.location.pathname);
    setReady(true);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (!token) {
      setMessage('This recovery link is invalid or expired.');
      return;
    }
    if (password !== confirmation) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/owner-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmation }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      window.location.assign(data?.redirectTo || '/dashboard');
    } catch (error: unknown) {
      setMessage(errorMessage(error));
      setLoading(false);
    }
  }

  const unavailable = ready && !token;
  return (
    <main className="min-h-screen bg-[radial-gradient(850px_circle_at_15%_0%,rgba(37,99,235,0.22),transparent_50%),linear-gradient(160deg,#050813,#090e1d_50%,#060914)] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-lg rounded-[32px] border border-white/12 bg-[rgba(8,15,30,0.82)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <img src="/brand/uai-logo.png" alt="Upline Agent AI" className="h-12 w-12 rounded-xl border border-blue-300/25 bg-blue-500/10 p-1.5" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Upline Agent AI</div>
            <h1 className="mt-1 text-2xl font-semibold">Secure owner recovery</h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-300">
          Set a new password for the Upline owner account. For your protection, this signs out older owner sessions.
        </p>

        {unavailable ? (
          <div className="mt-7 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-100" role="alert">
            This recovery link is invalid or expired.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">New password</span>
              <input type="password" autoComplete="new-password" required minLength={14} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" placeholder="At least 14 characters" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Confirm new password</span>
              <input type="password" autoComplete="new-password" required minLength={14} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" />
            </label>
            <button type="submit" disabled={loading || !ready} className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50">
              {loading ? 'Resetting password…' : 'Set new password and sign in'}
            </button>
          </form>
        )}

        {message ? <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-100" role="alert">{message}</div> : null}
      </div>
    </main>
  );
}

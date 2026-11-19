'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function OwnerSetupForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await fetch('/api/auth/owner-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ token, password, confirmation }),
      });
      const data = await result.json().catch(() => null) as { ok?: boolean; error?: string; redirectTo?: string } | null;
      if (!result.ok || !data?.ok) throw new Error(data?.error || 'Unable to complete secure setup.');
      window.location.assign(data.redirectTo || '/dashboard');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete secure setup.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#040812] px-4 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Upline Agent</p>
        <h1 className="mt-3 text-2xl font-semibold">Set your new owner password</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Choose a strong password with at least 14 characters. This one-time setup link will stop working after successful use.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            <span className="text-slate-300">New password</span>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white outline-none focus:border-blue-400"
              minLength={14}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-300">Confirm new password</span>
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white outline-none focus:border-blue-400"
              minLength={14}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
          <button
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
            disabled={saving || !token}
            type="submit"
          >
            {saving ? 'Securing account…' : 'Set password and continue'}
          </button>
          {message ? <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-100">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}

export default function OwnerSetupPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#040812] text-white">Loading secure setup…</main>}>
      <OwnerSetupForm />
    </Suspense>
  );
}

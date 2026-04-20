'use client';

import { useState } from 'react';

export function LogoutButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/agent/login';
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={`${className} inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:border-red-400/40 disabled:opacity-60`}
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  );
}

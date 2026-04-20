'use client';

import { useState } from 'react';

export function DialNextButton({ leadId }: { leadId: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);

  function go() {
    if (!leadId) {
      setMsg('No callable leads found in queue.');
      return;
    }
    window.location.href = `/ops/leads/${encodeURIComponent(leadId)}`;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        onClick={go}
        disabled={!leadId}
      >
        Dial next
      </button>
      {msg ? <div className="text-xs text-neutral-400">{msg}</div> : null}
    </div>
  );
}

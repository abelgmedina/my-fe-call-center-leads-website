'use client';

import { useEffect, useState } from 'react';

type Chip = { label: string; ok: boolean | null };

function cls(ok: boolean | null) {
  if (ok === true) return 'bg-green-600/15 text-green-700 dark:text-green-200 border-green-600/25';
  if (ok === false) return 'bg-red-600/15 text-red-700 dark:text-red-200 border-red-600/25';
  return 'bg-[var(--chip)] text-[var(--foreground)]/80 border-[var(--border)]';
}

export function StatusChips() {
  const [chips, setChips] = useState<Chip[]>([
    { label: 'Twilio', ok: null },
    { label: 'SMS', ok: null },
    { label: 'Sheets', ok: null },
  ]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await fetch('/api/ops/health', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        const envOk = (name: string) => !!(data.checks || []).find((c: any) => c.name === `env:${name}`)?.ok;
        const sheetsOk = !!(data.checks || []).find((c: any) => c.name === 'sheets:abel_active_headers')?.ok;

        const twilioOk = envOk('TWILIO_ACCOUNT_SID') && envOk('TWILIO_AUTH_TOKEN') && envOk('TWILIO_SMS_FROM');
        const smsOk = twilioOk; // A2P approval is separate; this is infra-ready.

        const next: Chip[] = [
          { label: 'Twilio', ok: !!twilioOk },
          { label: 'SMS', ok: !!smsOk },
          { label: 'Sheets', ok: !!sheetsOk },
        ];
        if (!dead) setChips(next);
      } catch {
        if (!dead)
          setChips([
            { label: 'Twilio', ok: false },
            { label: 'SMS', ok: false },
            { label: 'Sheets', ok: false },
          ]);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  return (
    <div className="hidden items-center gap-2 md:flex">
      {chips.map((c) => (
        <span key={c.label} className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${cls(c.ok)}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

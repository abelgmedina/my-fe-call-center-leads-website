'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme';
import { LogoutButton } from '@/components/logout-button';

export function AgentShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Theme-safe futuristic backdrop (matches login) */}
      <header className="relative border-b border-[var(--border)] px-6 py-4 backdrop-blur" style={{ background: "linear-gradient(115deg, #050711 0%, #0b111f 60%, #11182d 100%)", boxShadow: "0 25px 60px rgba(0, 0, 0, 0.45)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative hidden sm:block">
              <div className="pointer-events-none absolute -inset-5 rounded-[28px] bg-[radial-gradient(closest-side,rgba(37,99,235,0.25),transparent_70%)] blur-xl" />
              <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600/20 via-blue-600/0 to-transparent p-2 shadow-[0_0_0_1px_rgba(37,99,235,0.3),0_0_45px_rgba(37,99,235,0.25)]">
                <img src="/brand/uai-logo.png" alt="UPLINE AGENT AI" className="h-10 w-10" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.24em] text-blue-200">UPLINE AGENT AI</div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-blue-200/70">{subtitle}</div> : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end gap-2 text-[11px] text-white md:flex">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-3 py-1 text-xs font-semibold tracking-tight">
                  My number: (916) 249-0849
                </span>
                <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-tight uppercase">NPN: 17214137</span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-tight">CA: 0N15024</span>
                <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-tight">TX: 1901906</span>
                <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-tight">FL: G210240</span>
              </div>
            </div>
            <nav className="hidden items-center gap-2 md:flex">
              <Link
                className="rounded-full border border-blue-400/40 bg-blue-500/15 px-4 py-2 text-xs font-semibold text-blue-50 shadow-[0_0_25px_rgba(37,99,235,0.25)]"
                href="/agent"
              >
                Inbound Calls Screen
              </Link>
              <Link
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_25px_rgba(0,0,0,0.45)]"
                href="/ops"
              >
                Ops
              </Link>
              <Link
                className="rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-black"
                href="/ops/call-queue"
              >
                Queue
              </Link>
              <Link
                className="rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-black"
                href="/ops/calls"
              >
                Calls
              </Link>
            </nav>
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

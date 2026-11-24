'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BACK_NAV, FRONT_NAV, type CommandView, VIEW_TITLES } from '@/lib/command-routes';

type Office = 'front' | 'back';

function BellIcon() {
  return <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
}

export function CommandShell({
  children,
  view,
  displayName,
  role,
  demoEnabled,
  onResetDemo,
}: {
  children: React.ReactNode;
  view: CommandView;
  displayName: string;
  role: string;
  demoEnabled: boolean;
  onResetDemo: () => void;
}) {
  const startsInBack = BACK_NAV.some((item) => item.view === view);
  const [office, setOffice] = useState<Office>(startsInBack ? 'back' : 'front');
  const [showNotices, setShowNotices] = useState(false);
  const nav = office === 'front' ? FRONT_NAV : BACK_NAV;
  const firstName = displayName.trim().split(/\s+/)[0] || 'Agent';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="min-h-screen bg-[#090b0f] text-slate-100 selection:bg-red-500/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(190,24,24,0.14),transparent_25%),radial-gradient(circle_at_100%_100%,rgba(63,24,24,0.16),transparent_24%)]" />
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[254px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0c0e13] px-3 py-4 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.035]">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-red-400/35 bg-red-500/15 text-sm font-black text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.14)]">UA</span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.19em] text-red-300">Upline Agent</span>
              <span className="mt-0.5 block text-sm font-semibold tracking-tight text-white">Command Center</span>
            </span>
          </Link>

          <div className="mt-7 rounded-lg border border-white/[0.09] bg-black/20 p-1" role="tablist" aria-label="Command office">
            <button type="button" onClick={() => setOffice('front')} className={`w-1/2 rounded-md px-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${office === 'front' ? 'bg-red-500 text-white shadow-[0_7px_20px_rgba(239,68,68,0.24)]' : 'text-slate-500 hover:text-slate-300'}`}>Front</button>
            <button type="button" onClick={() => setOffice('back')} className={`w-1/2 rounded-md px-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${office === 'back' ? 'bg-red-500 text-white shadow-[0_7px_20px_rgba(239,68,68,0.24)]' : 'text-slate-500 hover:text-slate-300'}`}>Back</button>
          </div>

          <nav className="mt-5 space-y-1" aria-label={`${office} office navigation`}>
            <p className="px-3 pb-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-300/75">{office} office</p>
            {nav.map((item) => {
              const active = item.view === view;
              return <Link key={item.view} href={item.href} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active ? 'bg-red-500/15 text-white ring-1 ring-inset ring-red-400/35' : 'text-slate-400 hover:bg-white/[0.045] hover:text-white'}`}>
                <span className={`grid h-5 w-5 place-items-center text-sm ${active ? 'text-red-300' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.icon}</span>
                <span className="truncate font-medium">{item.label}</span>
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-400" /> : null}
              </Link>;
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-white/[0.08] bg-white/[0.025] p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Signed in</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{role}</p>
            {demoEnabled ? <button type="button" onClick={onResetDemo} className="mt-3 w-full rounded-md border border-white/[0.1] px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:border-red-400/40 hover:text-white">Reset demo</button> : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0b0d12]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-[1680px] items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-md bg-red-500 text-xs font-black">UA</span><span className="text-xs font-bold tracking-wide">COMMAND</span></Link>
              <div className="hidden min-w-0 lg:block">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-300">{VIEW_TITLES[view]}</p>
                <p className="mt-0.5 text-xs text-slate-500">{greeting}, {firstName} · {role}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <details className="relative lg:hidden">
                  <summary className="list-none rounded-md border border-white/[0.09] px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 marker:content-none">Menu</summary>
                  <div className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-white/[0.1] bg-[#151820] p-2 shadow-2xl">
                    <div className="mb-2 flex rounded-md border border-white/[0.08] p-0.5"><button type="button" onClick={() => setOffice('front')} className={`flex-1 rounded px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] ${office === 'front' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>Front</button><button type="button" onClick={() => setOffice('back')} className={`flex-1 rounded px-2 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] ${office === 'back' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>Back</button></div>
                    <nav className="max-h-[58vh] overflow-auto">{nav.map((item) => <Link key={item.view} href={item.href} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${item.view === view ? 'bg-red-500/15 text-red-100' : 'text-slate-400 hover:bg-white/[0.05]'}`}><span>{item.icon}</span>{item.label}</Link>)}</nav>
                  </div>
                </details>
                <span className={`hidden rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] sm:inline-flex ${demoEnabled ? 'border-red-400/25 bg-red-500/10 text-red-200' : 'border-amber-400/25 bg-amber-500/10 text-amber-100'}`}>{demoEnabled ? 'Preview workspace' : 'Data source offline'}</span>
                <div className="relative">
                  <button type="button" onClick={() => setShowNotices((shown) => !shown)} className="relative grid h-8 w-8 place-items-center rounded-md border border-white/[0.09] text-slate-400 hover:border-red-300/40 hover:text-white" aria-label="Open announcements"><BellIcon /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" /></button>
                  {showNotices ? <div className="absolute right-0 mt-2 w-72 rounded-lg border border-white/[0.1] bg-[#151820] p-3 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Preview notices</p><p className="mt-2 text-xs leading-5 text-slate-400">All CRM records are fictional. Messages, calls, carrier data, and policy values are not sent or connected to a provider.</p><Link href="/announcements" className="mt-3 inline-block text-xs font-semibold text-red-200 hover:text-white">Open announcements →</Link></div> : null}
                </div>
              </div>
            </div>
          </header>

          <div className={`border-b px-4 py-2 sm:px-6 lg:px-8 ${demoEnabled ? 'border-red-400/15 bg-red-500/[0.055]' : 'border-amber-400/15 bg-amber-500/[0.055]'}`}>
            <div className={`mx-auto flex max-w-[1680px] items-center gap-2 text-[10px] font-semibold tracking-wide ${demoEnabled ? 'text-red-100/85' : 'text-amber-100/85'}`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${demoEnabled ? 'bg-red-400' : 'bg-amber-300'}`} /> {demoEnabled ? 'PREVIEW DEMO DATA · FICTIONAL · NO MESSAGES OR CALLS ARE SENT' : 'CRM DATA SOURCE UNAVAILABLE · NO FALLBACK TO PROVIDER OR PRODUCTION DATA'}</div>
          </div>

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><div className="mx-auto max-w-[1680px]">{children}</div></div>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { ThemeToggle } from '@/components/theme';

export type CommandCenterMode = 'owner' | 'operator' | 'buyer' | 'restricted';

type QueueCard = {
  lead_id: string;
  name: string;
  phone: string;
  state: string;
  status: string;
  last_contact_at?: string;
  next_action_at?: string;
};

type QueuePayload = {
  grouped?: Record<string, QueueCard[]>;
  otherCallableCount?: number;
  updatedAt?: string;
};

type AgentPayload = {
  agents?: Array<{ id: string; name: string; status?: string }>;
};

type StatusPayload = { status?: string };

type HealthPayload = {
  ok?: boolean;
  checks?: Array<{ name: string; ok: boolean }>;
};

type SummaryPayload = {
  counts?: Record<string, number>;
};

type ApiResult<T> = { ok: boolean; data: T | null };

type CommandModule = {
  label: string;
  description: string;
  mark: string;
  href: string;
  ownerOnly?: boolean;
};

const FRONT_OFFICE_MODULES: CommandModule[] = [
  { label: 'Home', description: 'Daily scorecard and next actions', mark: 'HM', href: '#today' },
  { label: 'Smart Quoter', description: 'Quote preparation and carrier checks', mark: 'QT', href: '#quote' },
  { label: 'Recruiting', description: 'Review and activate agents', mark: 'RC', href: '/ops/agent-approvals', ownerOnly: true },
  { label: 'Leads', description: 'Pipeline, assignments, and follow-up', mark: 'LD', href: '/ops/pipeline', ownerOnly: true },
  { label: 'Messaging', description: 'Conversation command and follow-up', mark: 'MS', href: '#messaging' },
  { label: 'Dialer', description: 'Inbound phone workspace', mark: 'DL', href: '/agent', ownerOnly: true },
  { label: 'Power Dialer', description: 'Safety-gated three-line command', mark: 'PD', href: '#dialer', ownerOnly: true },
  { label: 'Messaging Setup', description: 'Sender and consent controls', mark: 'MX', href: '#messaging-setup', ownerOnly: true },
  { label: 'Leaderboard', description: 'Team operating scorecard', mark: 'LB', href: '#leaderboard', ownerOnly: true },
  { label: 'Announcements', description: 'Team operating notices', mark: 'AN', href: '#announcements', ownerOnly: true },
  { label: 'Resources', description: 'Guides, scripts, and compliance', mark: 'RS', href: '#resources' },
];

const BACK_OFFICE_MODULES: CommandModule[] = [
  { label: 'Agency Control', description: 'Owner operations and lead intake', mark: 'AC', href: '/ops', ownerOnly: true },
  { label: 'Agent Approvals', description: 'Recruiting and activation review', mark: 'AR', href: '/ops/agent-approvals', ownerOnly: true },
  { label: 'Lead Catalog', description: 'Lead products and fulfillment', mark: 'LC', href: '/ops/lead-purchase', ownerOnly: true },
  { label: 'Call Queue', description: 'Inbound queue and callbacks', mark: 'CQ', href: '/ops/call-queue', ownerOnly: true },
  { label: 'System Health', description: 'Provider and operational checks', mark: 'SH', href: '/ops', ownerOnly: true },
];

async function getJson<T>(url: string): Promise<ApiResult<T>> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, data };
}

function Icon({ name, className = 'h-4 w-4' }: { name: 'home' | 'phone' | 'layers' | 'users' | 'bolt' | 'arrow'; className?: string }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24', 'aria-hidden': true };
  if (name === 'home') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="m3 10.5 9-7 9 7V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5Z" /></svg>;
  if (name === 'phone') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5.7 3.8 8.4 3a1.5 1.5 0 0 1 1.7.7l1.2 2.7a1.5 1.5 0 0 1-.3 1.7L9.7 9.4a13 13 0 0 0 4.9 4.9l1.3-1.3a1.5 1.5 0 0 1 1.7-.3l2.7 1.2a1.5 1.5 0 0 1 .7 1.7l-.8 2.7a1.5 1.5 0 0 1-1.5 1.1C10.3 19.4 4.6 13.7 4.6 5.3a1.5 1.5 0 0 1 1.1-1.5Z" /></svg>;
  if (name === 'layers') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></svg>;
  if (name === 'users') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></svg>;
  if (name === 'bolt') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" /></svg>;
  return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function ModuleMark({ children }: { children: string }) {
  return <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-blue-200/20 bg-blue-400/10 text-[8px] font-black tracking-tight text-blue-100">{children}</span>;
}

function ModuleLink({ module, enabled }: { module: CommandModule; enabled: boolean }) {
  const muted = module.ownerOnly && !enabled;
  const className = `group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${muted ? 'cursor-not-allowed text-slate-600' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;
  const content = <><ModuleMark>{module.mark}</ModuleMark><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{module.label}</span><span className="mt-0.5 block truncate text-[10px] text-slate-600 group-hover:text-slate-500">{module.description}</span></span>{muted ? <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">Owner</span> : null}</>;

  if (muted) return <div className={className} aria-disabled="true">{content}</div>;
  if (module.href.startsWith('#')) return <a href={module.href} className={className}>{content}</a>;
  return <Link href={module.href} className={className}>{content}</Link>;
}

function Chip({ tone, children }: { tone: 'green' | 'amber' | 'slate' | 'blue'; children: React.ReactNode }) {
  const styles = {
    green: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
    slate: 'border-white/10 bg-white/5 text-slate-300',
    blue: 'border-blue-300/25 bg-blue-400/10 text-blue-100',
  };
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[tone]}`}>{children}</span>;
}

function StatCard({ label, value, detail, accent = 'blue' }: { label: string; value: string | number; detail: string; accent?: 'blue' | 'green' | 'amber' | 'violet' }) {
  const accents = {
    blue: 'from-blue-500/20 to-cyan-400/5 border-blue-400/20',
    green: 'from-emerald-500/20 to-teal-400/5 border-emerald-400/20',
    amber: 'from-amber-500/20 to-orange-400/5 border-amber-400/20',
    violet: 'from-violet-500/20 to-fuchsia-400/5 border-violet-400/20',
  };
  return (
    <article className={`rounded-2xl border bg-gradient-to-br p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)] ${accents[accent]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{detail}</div>
    </article>
  );
}

function availabilityTone(status: string) {
  if (status === 'AVAILABLE') return 'green' as const;
  if (status === 'BREAK' || status === 'AWAY') return 'amber' as const;
  return 'slate' as const;
}

function labelForMode(mode: CommandCenterMode) {
  if (mode === 'owner') return 'Owner command center';
  if (mode === 'operator') return 'Agent command center';
  if (mode === 'buyer') return 'Buyer workspace';
  return 'Agent workspace';
}

export default function CommandCenter({
  mode,
  displayName,
  email,
  profileHref,
}: {
  mode: CommandCenterMode;
  displayName: string;
  email: string;
  profileHref?: string;
}) {
  const canOperate = mode === 'owner' || mode === 'operator';
  const isOwner = mode === 'owner';
  const [status, setStatus] = useState('OFF_WORK');
  const [statusMessage, setStatusMessage] = useState('');
  const [queue, setQueue] = useState<QueuePayload | null>(null);
  const [agents, setAgents] = useState<AgentPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [office, setOffice] = useState<'front' | 'back'>('front');

  useEffect(() => {
    if (!canOperate) return;
    let mounted = true;

    async function refresh() {
      const [statusResult, queueResult, agentsResult, healthResult, summaryResult] = await Promise.all([
        getJson<StatusPayload>('/api/status').catch(() => null),
        getJson<QueuePayload>('/api/ops/call/queue').catch(() => null),
        getJson<AgentPayload>('/api/ops/agents').catch(() => null),
        getJson<HealthPayload>('/api/ops/health').catch(() => null),
        isOwner ? getJson<SummaryPayload>('/api/ops/summary').catch(() => null) : Promise.resolve(null),
      ]);
      if (!mounted) return;
      if (statusResult?.data?.status) setStatus(statusResult.data.status);
      if (queueResult?.data) setQueue(queueResult.data);
      if (agentsResult?.data) setAgents(agentsResult.data);
      if (healthResult?.data) setHealth(healthResult.data);
      if (summaryResult?.data) setSummary(summaryResult.data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [canOperate, isOwner]);

  const queueTotal = useMemo(() => {
    const grouped = queue?.grouped || {};
    const groupedCount = Object.values(grouped).reduce((total, cards) => total + cards.length, 0);
    return groupedCount + Number(queue?.otherCallableCount || 0);
  }, [queue]);

  const priorityQueue = useMemo(() => {
    const grouped = queue?.grouped || {};
    const priorities = ['QUALIFIED_TRANSFER_NOW', 'READY_FOR_CALL', 'CALL_APPT_SET', 'NO_ANSWER'];
    return priorities.flatMap((key) => (grouped[key] || []).slice(0, 2)).slice(0, 5);
  }, [queue]);

  const callbacks = queue?.grouped?.CALL_APPT_SET?.length || summary?.counts?.SMS_APPT_SET || 0;
  const availableAgents = (agents?.agents || []).filter((agent) => agent.status === 'AVAILABLE').length;
  const healthReady = health?.ok === true;
  const healthChecksPassing = (health?.checks || []).filter((check) => check.ok).length;
  const activeModules = office === 'front' ? FRONT_OFFICE_MODULES : BACK_OFFICE_MODULES;

  async function updateAvailability(nextStatus: 'AVAILABLE' | 'BREAK' | 'OFF_WORK') {
    if (!canOperate) return;
    setStatusMessage('Saving status…');
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json().catch(() => null)) as StatusPayload | { error?: string } | null;
      if (!response.ok) throw new Error((data as { error?: string } | null)?.error || `HTTP ${response.status}`);
      setStatus((data as StatusPayload | null)?.status || nextStatus);
      setStatusMessage(nextStatus === 'AVAILABLE' ? 'Availability updated. Browser phone stays disabled until voice is configured.' : 'Availability updated.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not update availability.');
    }
  }

  const primaryHref = mode === 'buyer' ? '/buyer/marketplace' : mode === 'owner' ? '/ops' : profileHref;
  const primaryLabel = mode === 'buyer' ? 'Open lead marketplace' : mode === 'owner' ? 'Open owner controls' : mode === 'restricted' ? 'Complete optional profile' : 'Review agent profile';

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-28 h-[34rem] w-[34rem] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute right-[-10rem] top-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-black/20 p-5 lg:flex lg:flex-col">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-300/30 bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-black shadow-[0_0_28px_rgba(59,130,246,0.36)]">UA</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200">Upline Agent</div>
              <div className="mt-0.5 text-sm font-semibold text-white">Command</div>
            </div>
          </Link>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-1.5" role="tablist" aria-label="Command office">
            <button type="button" role="tab" aria-selected={office === 'front'} onClick={() => setOffice('front')} className={`w-1/2 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${office === 'front' ? 'bg-blue-500 text-white shadow-[0_8px_25px_rgba(59,130,246,0.28)]' : 'text-slate-500 hover:text-slate-300'}`}>Front</button>
            <button type="button" role="tab" aria-selected={office === 'back'} onClick={() => setOffice('back')} className={`w-1/2 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.14em] transition ${office === 'back' ? 'bg-blue-500 text-white shadow-[0_8px_25px_rgba(59,130,246,0.28)]' : 'text-slate-500 hover:text-slate-300'}`}>Back</button>
          </div>

          <nav className="mt-5 space-y-0.5" aria-label={`${office} office navigation`}>
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{office === 'front' ? 'Front office' : 'Back office'}</div>
            {activeModules.map((module) => <ModuleLink key={module.label} module={module} enabled={isOwner} />)}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Signed in</div>
            <div className="mt-2 truncate text-sm font-semibold text-white">{displayName}</div>
            {email ? <div className="mt-1 truncate text-xs text-slate-500">{email}</div> : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-9 lg:py-7">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-black">UA</div>
              <div className="text-sm font-semibold">Upline Command</div>
            </div>
            <div className="hidden lg:block">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">{labelForMode(mode)}</div>
              <div className="mt-1 text-xs text-slate-500">Your operational view, without a compliance obstacle course.</div>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-black/20 p-1 lg:hidden" role="tablist" aria-label="Command office">
              <button type="button" role="tab" aria-selected={office === 'front'} onClick={() => setOffice('front')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${office === 'front' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Front</button>
              <button type="button" role="tab" aria-selected={office === 'back'} onClick={() => setOffice('back')} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${office === 'back' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Back</button>
            </div>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Chip tone={healthReady ? 'green' : 'amber'}><span className={`h-1.5 w-1.5 rounded-full ${healthReady ? 'bg-emerald-300' : 'bg-amber-300'}`} /> {canOperate ? (healthReady ? 'Phone preflight needs review' : 'Phone provider not connected') : 'Activation required'}</Chip>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </header>

          <nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:hidden" aria-label={`${office} office navigation`}>
            {activeModules.map((module) => <ModuleLink key={module.label} module={module} enabled={isOwner} />)}
          </nav>

          <section id="today" className="pt-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Welcome back,</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{displayName.split(' ')[0] || 'Agent'}.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">One place for inbound work, callbacks, dialer readiness, and the next best action. Nothing here turns on live calling until the real phone stack passes its provider checks.</p>
              </div>
              {primaryHref ? <Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl border border-blue-300/25 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-50 transition hover:bg-blue-500/25">{primaryLabel}<Icon name="arrow" /></Link> : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Inbound queue" value={canOperate ? queueTotal : '—'} detail={canOperate ? 'Leads waiting across callable queues' : 'Unlocked only after agent activation'} />
              <StatCard label="Callbacks" value={canOperate ? callbacks : '—'} detail={canOperate ? 'Scheduled follow-up work' : 'Your workspace is active'} accent="violet" />
              <StatCard label="Available agents" value={canOperate ? availableAgents : '—'} detail={canOperate ? 'Current team availability' : 'No team data exposed'} accent="green" />
              <StatCard label="Phone system" value={healthReady ? 'Preflight' : 'Offline'} detail={canOperate ? (healthReady ? `${healthChecksPassing} provider checks passing` : 'Provider credentials and callbacks still needed') : 'Requires owner activation'} accent="amber" />
            </div>
          </section>

          <section className="mt-7 grid gap-5 xl:grid-cols-[1.28fr_0.72fr]">
            <article id="inbound" className="overflow-hidden rounded-3xl border border-blue-300/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.17),rgba(15,23,42,0.72)_48%,rgba(9,12,21,0.92))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-300 opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-300" /></span> Inbound command</div>
                  <h2 className="mt-3 text-2xl font-semibold">Ready when the real phone system is.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">The dashboard is live UI. Browser calling stays intentionally disabled until Twilio credentials, public callbacks, and durable call state are configured and tested.</p>
                </div>
                {canOperate ? <Chip tone={availabilityTone(status)}>{status.replace('_', ' ')}</Chip> : <Chip tone="slate">Restricted workspace</Chip>}
              </div>

              {canOperate ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button onClick={() => void updateAvailability('AVAILABLE')} className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15">Available</button>
                  <button onClick={() => void updateAvailability('BREAK')} className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15">On break</button>
                  <button onClick={() => void updateAvailability('OFF_WORK')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Off work</button>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">Your email/password account is active. Lead data, recordings, inbound calls, and dialing require a separate owner approval—they are never granted automatically at sign-up.</div>
              )}
              {statusMessage ? <p className="mt-3 text-xs text-slate-400" role="status">{statusMessage}</p> : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Current inbound</div>
                  <div className="mt-2 text-lg font-semibold">No active call</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Incoming caller details appear here only after the voice provider is verified.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Browser phone</div>
                  <div className="mt-2 text-lg font-semibold">{healthReady ? 'Preflight required' : 'Not connected'}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">No fake Ready button. This activates only after real device registration works.</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Today</div>
                  <h2 className="mt-2 text-xl font-semibold">Next actions</h2>
                </div>
                {lastUpdated ? <span className="text-[11px] text-slate-500">Updated {lastUpdated}</span> : null}
              </div>
              <div className="mt-5 space-y-3">
                {canOperate && priorityQueue.length ? priorityQueue.map((lead) => (
                  <div key={lead.lead_id} className="rounded-2xl border border-white/8 bg-black/20 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate text-sm font-semibold">{lead.name || 'Unnamed lead'}</div><div className="mt-1 truncate text-xs text-slate-500">{lead.phone || 'No phone'} · {lead.state || 'State unavailable'}</div></div>
                      <Chip tone={lead.status === 'QUALIFIED_TRANSFER_NOW' ? 'green' : 'blue'}>{lead.status.replaceAll('_', ' ')}</Chip>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-black/10 p-5 text-sm leading-6 text-slate-400">
                    {canOperate ? 'No callable leads are available from the current queue source.' : mode === 'buyer' ? 'Use the lead marketplace when you are ready to purchase a package.' : 'Complete your optional profile whenever you want. Operations activation is a separate decision.'}
                  </div>
                )}
              </div>
            </article>
          </section>

          <section id="dialer" className="mt-7 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(22,24,42,0.82))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200">Three-line power dialer</div>
                <h2 className="mt-2 text-2xl font-semibold">Three lanes. One disciplined connection flow.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">This is the production dashboard surface for a 1–3 line dialer. Lines remain preflight-only until server-side DNC/consent, calling-window, agent-readiness, abandonment, and provider checks are actually enforced.</p>
              </div>
              <Chip tone={healthReady && canOperate ? 'blue' : 'amber'}>{healthReady && canOperate ? 'Safety review required' : 'Provider setup required'}</Chip>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[1, 2, 3].map((line) => (
                <article key={line} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold">Line {line}</span><span className="h-2.5 w-2.5 rounded-full bg-slate-600" /></div>
                  <div className="mt-5 text-xl font-semibold text-slate-200">Waiting</div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">No lead is dialed from this dashboard until the real provider gate is green.</p>
                  <button disabled className="mt-5 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-semibold text-slate-500">Provider setup required</button>
                </article>
              ))}
            </div>
          </section>

          <section id="quote" className="mt-7 grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
            <article className="rounded-3xl border border-blue-300/15 bg-[linear-gradient(135deg,rgba(30,64,175,0.18),rgba(8,15,30,0.85))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">Smart Quoter</div>
                  <h2 className="mt-2 text-2xl font-semibold">Quote prep that protects the agent and the client.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Upline will build the intake, eligibility notes, carrier-rule verification, beneficiary checklist, and follow-up trail around each quote. It will not invent premiums or replace a licensed agent’s carrier-approved illustration.</p>
                </div>
                <Chip tone="blue">Licensed workflow</Chip>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ['1', 'Prepare', 'Confirm lead identity, state, age, tobacco, contact permission, and the customer’s goal.'],
                  ['2', 'Verify', 'Use current carrier material and underwriting rules before presenting any option.'],
                  ['3', 'Document', 'Save the application outcome, next action, and compliant communication history.'],
                ].map(([step, title, detail]) => <div key={step} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="grid h-7 w-7 place-items-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-100">{step}</div><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>)}
              </div>
              {isOwner ? <Link href="/ops/pipeline" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-blue-300/25 bg-blue-500/15 px-4 py-3 text-sm font-semibold text-blue-50 transition hover:bg-blue-500/25">Open lead pipeline <Icon name="arrow" /></Link> : <p className="mt-6 text-xs text-slate-500">A lead record is required before quote preparation can begin.</p>}
            </article>

            <article id="resources" className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Resources</div>
              <h2 className="mt-2 text-xl font-semibold">One operating library, not scattered tabs.</h2>
              <div className="mt-5 space-y-3">
                {[
                  ['Carrier guides', 'Only current, owner-approved materials can power quote preparation.'],
                  ['Conversation scripts', 'Reusable, compliant discovery and appointment frameworks.'],
                  ['Compliance playbook', 'Consent, DNC, calling-window, and recording requirements.'],
                ].map(([title, detail]) => <div key={title} className="rounded-2xl border border-white/8 bg-black/20 p-3.5"><div className="text-sm font-semibold text-white">{title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}
              </div>
            </article>
          </section>

          <section id="messaging" className="mt-7 grid gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Messaging command</div>
              <h2 className="mt-2 text-xl font-semibold">Every conversation belongs to the lead record.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Text, email, inbound calls, notes, dispositions, and next steps converge on one timeline—so agents stop digging through spreadsheets and personal phones.</p>
              <div className="mt-5 rounded-2xl border border-blue-300/15 bg-blue-500/5 p-4 text-xs leading-5 text-blue-100">The data model and UI are being consolidated behind durable CRM records before any live bulk messaging is enabled.</div>
            </article>
            <article id="messaging-setup" className="rounded-3xl border border-amber-300/15 bg-amber-400/[0.045] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200">Messaging setup</div>
              <h2 className="mt-2 text-xl font-semibold">No send button without the receipts.</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-50/80">
                <li className="flex gap-2"><span className="text-amber-200">•</span>Consent and internal suppression checked per destination.</li>
                <li className="flex gap-2"><span className="text-amber-200">•</span>Approved sender identity, opt-out handling, and template purpose.</li>
                <li className="flex gap-2"><span className="text-amber-200">•</span>Provider delivery status written back to the lead timeline.</li>
              </ul>
            </article>
            <article id="announcements" className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(30,41,59,0.7),rgba(8,15,30,0.9))] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Announcements</div>
              <h2 className="mt-2 text-xl font-semibold">Team direction belongs in the system.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Owner announcements, campaign rules, and operating changes will publish from the back office with an auditable timestamp—not disappear in chat history.</p>
              <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-black/20 p-4 text-xs text-slate-500">No public announcement is active.</div>
            </article>
          </section>

          <section id="leaderboard" className="mt-7 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Leaderboard</div><h2 className="mt-2 text-xl font-semibold">Start with clean operating truth.</h2></div><Chip tone="slate">No vanity ranks</Chip></div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Upline’s leaderboard will rank verified activity and outcomes only after the durable CRM and telephony ledger are in place. Until then, this scorecard shows live operational readiness—not made-up production numbers.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Available</div><div className="mt-2 text-2xl font-semibold">{canOperate ? availableAgents : '—'}</div><div className="mt-1 text-xs text-slate-500">agents ready</div></div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Queue</div><div className="mt-2 text-2xl font-semibold">{canOperate ? queueTotal : '—'}</div><div className="mt-1 text-xs text-slate-500">workable leads</div></div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Callbacks</div><div className="mt-2 text-2xl font-semibold">{canOperate ? callbacks : '—'}</div><div className="mt-1 text-xs text-slate-500">scheduled actions</div></div>
              </div>
            </article>
            <article className="rounded-3xl border border-blue-300/15 bg-blue-500/[0.055] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">Back office</div>
              <h2 className="mt-2 text-xl font-semibold">Recruiting, lead operations, and system control.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">This is where Upline will manage agent approvals, lead products, queue health, and agency policies—separate from the in-call workspace.</p>
              {isOwner ? <div className="mt-5 flex flex-wrap gap-2"><Link href="/ops/agent-approvals" className="rounded-xl border border-blue-300/25 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-500/20">Agent approvals</Link><Link href="/ops/lead-purchase" className="rounded-xl border border-blue-300/25 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-500/20">Lead catalog</Link><Link href="/ops" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">Owner controls</Link></div> : <p className="mt-5 text-xs text-blue-100/70">Back-office controls stay owner-only.</p>}
            </article>
          </section>

          <section id="queue" className="mt-7 grid gap-5 pb-8 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">How access works</div>
              <h2 className="mt-2 text-xl font-semibold">Fast entry. Deliberate phone access.</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
                <div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-200">1</span><p>Anyone can create an email/password workspace without NPN, license, carrier, policy, or OTP gates.</p></div>
                <div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-200">2</span><p>Profile and contracting details stay optional until an activation decision is made.</p></div>
                <div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-200">3</span><p>Calls, lead records, and recordings remain server-gated—not merely hidden in the browser.</p></div>
              </div>
            </article>
            <article className="rounded-3xl border border-blue-300/15 bg-blue-500/[0.055] p-5 sm:p-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">What is next</div>
              <h2 className="mt-2 text-xl font-semibold">Finish phone infrastructure before pressing go.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">The dashboard is ready to become the control plane. The remaining prerequisite is provider configuration and a real end-to-end call test—not another onboarding hoop for agents.</p>
              {isOwner ? <Link href="/ops" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-200 hover:text-white">Review owner controls <Icon name="arrow" /></Link> : profileHref ? <Link href={profileHref} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-200 hover:text-white">{primaryLabel} <Icon name="arrow" /></Link> : null}
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}

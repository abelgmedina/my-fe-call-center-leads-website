'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CommandShell } from './CommandShell';
import type { CommandViewProps } from './types';
import { createDemoWorkspace, createEmptyWorkspace, type AgentAvailability, type DemoCall, type DemoLead } from '@/lib/demo-crm-data';
import type { CommandView } from '@/lib/command-routes';
import { LeadsView, LogSaleView, SmartQuoterView } from './LeadQuoterViews';
import {
  AgencyControlView,
  AgentApprovalsView,
  AgentsView,
  AIUplineView,
  AnnouncementsView,
  BookOfBusinessView,
  CallQueueView,
  LeadCatalogView,
  LeaderboardView,
  RecruitingView,
  ResourcesView,
  SettingsView,
  SystemHealthView,
} from './BackOfficeViews';

const STORAGE_KEY = 'upline-command-preview-demo-v1';

type WorkspaceProps = {
  view: CommandView;
  displayName: string;
  role: string;
  demoEnabled: boolean;
  isOwner: boolean;
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-white/[0.09] bg-[#11141b] ${className}`}>{children}</section>;
}

function Kicker({ children, tone = 'red' }: { children: React.ReactNode; tone?: 'red' | 'slate' | 'green' | 'amber' | 'blue' }) {
  const colors = { red: 'text-red-300', slate: 'text-slate-500', green: 'text-emerald-300', amber: 'text-amber-300', blue: 'text-sky-300' };
  return <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${colors[tone]}`}>{children}</p>;
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' | 'green' | 'amber' | 'blue' }) {
  const colors = {
    slate: 'border-white/[0.1] bg-white/[0.04] text-slate-300',
    red: 'border-red-400/25 bg-red-500/10 text-red-200',
    green: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    amber: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
    blue: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold ${colors[tone]}`}>{children}</span>;
}

function ActionButton({ children, onClick, disabled = false, tone = 'red', className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'red' | 'slate' | 'green'; className?: string }) {
  const colors = {
    red: 'border-red-400/30 bg-red-500/15 text-red-100 hover:bg-red-500/25',
    slate: 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
    green: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
  };
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-md border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${colors[tone]} ${className}`}>{children}</button>;
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function timestamp() {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function usePreviewWorkspace(demoEnabled: boolean) {
  const [workspace, setWorkspace] = useState(() => demoEnabled ? createDemoWorkspace() : createEmptyWorkspace());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!demoEnabled) {
      setWorkspace(createEmptyWorkspace());
      setHydrated(true);
      return;
    }
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.leads) && Array.isArray(parsed.policies)) setWorkspace(parsed);
      }
    } catch {
      // Preview remains usable with a fresh fixture if browser storage is unavailable.
    } finally {
      setHydrated(true);
    }
  }, [demoEnabled]);

  useEffect(() => {
    if (!demoEnabled || !hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // This data is intentionally disposable; storage failure needs no provider fallback.
    }
  }, [demoEnabled, hydrated, workspace]);

  const reset = () => {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
    setWorkspace(createDemoWorkspace());
  };

  return { workspace, setWorkspace, reset };
}

function HomeView({ workspace, setWorkspace, displayName }: CommandViewProps) {
  const activePolicies = workspace.policies.filter((policy) => policy.status === 'Active' || policy.status === 'Pending');
  const activeAP = activePolicies.reduce((total, policy) => total + policy.annualPremium, 0);
  const thisMonthAP = workspace.policies.filter((policy) => policy.draftDate.startsWith('2026-11')).reduce((total, policy) => total + policy.annualPremium, 0);
  const activeClients = new Set(activePolicies.map((policy) => policy.leadId)).size;
  const openRecruits = workspace.recruits.filter((recruit) => recruit.stage !== 'Activated').length;
  const lapseRisk = workspace.policies.filter((policy) => policy.lapseRisk).length;
  const inbound = workspace.calls.filter((call) => call.direction === 'Inbound' && call.disposition === 'Queued').length;
  const callbacks = workspace.leads.filter((lead) => /Today/.test(lead.callbackAt)).length;
  const available = workspace.agents.filter((agent) => agent.availability === 'AVAILABLE').length;
  const pinned = workspace.announcements.filter((announcement) => announcement.pinned).slice(0, 2);
  const recentPolicies = [...workspace.policies].sort((a, b) => b.draftDate.localeCompare(a.draftDate)).slice(0, 4);
  const kpis = [
    ['Active AP', money(activeAP), 'green'], ['This Month AP', money(thisMonthAP), 'red'], ['Active Policies', String(activePolicies.length), 'blue'], ['Active Clients', String(activeClients), 'slate'], ['Open Recruits', String(openRecruits), 'amber'], ['Lapse Risk', String(lapseRisk), lapseRisk ? 'red' : 'green'],
  ] as const;
  const quickAccess = [
    ['Smart Quoter', '/quoter', 'Run an illustrative FEX or Term estimate'], ['Log a Sale', '/log-a-sale', 'Create a local demo policy'], ['Book of Business', '/book-of-business', 'Review policy totals and risk'], ['Recruiting', '/recruiting', 'Move candidates through the pipeline'], ['Leaderboard', '/leaderboard', 'Review demo activity metrics'], ['Resources', '/resources', 'Open the preview library'],
  ];
  const availability = workspace.availability;
  const availabilityTone = availability === 'AVAILABLE' ? 'green' : availability === 'BREAK' ? 'amber' : 'slate';

  return <div className="space-y-5">
    <section className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div><Kicker>Daily command view</Kicker><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Good morning, {displayName.split(' ')[0] || 'Agent'}.</h1><p className="mt-2 text-sm text-slate-400">Independent Agent · Demo contract level · work the next right record.</p></div>
      <div className="flex flex-wrap gap-2"><Badge tone={availabilityTone}>Agent {availability === 'OFF' ? 'Off' : availability[0] + availability.slice(1).toLowerCase()}</Badge><Badge tone="red">Illustrative preview</Badge></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {kpis.map(([label, value, tone]) => <Card key={label} className="p-4"><Kicker tone={tone}>{label}</Kicker><p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-[11px] text-slate-500">Preview calculation</p></Card>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
      <Card className="p-5"><div className="flex items-center justify-between"><div><Kicker>Quick access</Kicker><h2 className="mt-2 text-lg font-semibold">Start where the work is</h2></div><Badge tone="slate">6 workflows</Badge></div><div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{quickAccess.map(([label, href, detail]) => <Link key={label} href={href} className="group rounded-md border border-white/[0.08] bg-black/15 p-3 transition hover:border-red-400/35 hover:bg-red-500/[0.06]"><p className="text-sm font-semibold text-white group-hover:text-red-100">{label} <span className="ml-1 text-red-300">→</span></p><p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p></Link>)}</div></Card>
      <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><Kicker>Team announcements</Kicker><h2 className="mt-2 text-lg font-semibold">Pinned direction</h2></div><Link href="/announcements" className="text-xs font-semibold text-red-200 hover:text-white">View all →</Link></div><div className="mt-4 space-y-3">{pinned.map((announcement) => <div key={announcement.id} className="border-l-2 border-red-400/70 pl-3"><p className="text-xs font-semibold text-white">{announcement.title}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">{announcement.body}</p></div>)}</div></Card>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><Kicker>Recent policies</Kicker><h2 className="mt-1 text-lg font-semibold">Book activity</h2></div><Link href="/log-a-sale" className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20">Add one</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[570px] text-left text-xs"><thead className="bg-white/[0.025] text-[9px] uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Client</th><th className="px-3 py-3">Product</th><th className="px-3 py-3">AP</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{recentPolicies.map((policy) => <tr key={policy.id} className="border-t border-white/[0.06]"><td className="px-5 py-3 font-semibold text-slate-200">{policy.client}<p className="mt-0.5 font-normal text-[10px] text-slate-600">{policy.carrier}</p></td><td className="px-3 py-3 text-slate-400">{policy.product}</td><td className="px-3 py-3 text-slate-200">{money(policy.annualPremium)}</td><td className="px-3 py-3"><Badge tone={policy.lapseRisk ? 'amber' : policy.status === 'Active' ? 'green' : 'slate'}>{policy.status}</Badge></td></tr>)}</tbody></table></div></Card>
      <Card className="p-5"><Kicker>Phone command</Kicker><h2 className="mt-2 text-lg font-semibold">Inbound and dialer readiness</h2><div className="mt-4 grid grid-cols-2 gap-2"><MetricTile label="Inbound queue" value={String(inbound)} href="/inbound-calls" /><MetricTile label="Callbacks" value={String(callbacks)} href="/dialer" /><MetricTile label="Available agents" value={String(available)} href="/agents" /><MetricTile label="3-line dialer" value="Ready" href="/power-dialer" /></div><div className="mt-4 rounded-md border border-red-400/20 bg-red-500/[0.06] p-3 text-[11px] leading-5 text-red-100/85">Demo queue actions are local to this browser. The actual phone provider is not configured and cannot be activated here.</div><div className="mt-4 flex gap-2">{(['AVAILABLE', 'BREAK', 'OFF'] as AgentAvailability[]).map((status) => <ActionButton key={status} tone={status === 'AVAILABLE' ? 'green' : 'slate'} onClick={() => setWorkspace((current) => ({ ...current, availability: status }))} className="flex-1">{status === 'OFF' ? 'Off' : status[0] + status.slice(1).toLowerCase()}</ActionButton>)}</div></Card>
    </section>
  </div>;
}

function MetricTile({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link href={href} className="rounded-md border border-white/[0.08] bg-black/15 p-3 transition hover:border-red-400/30"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></Link>;
}

function MessagingView({ workspace, setWorkspace }: CommandViewProps) {
  const [selectedId, setSelectedId] = useState(workspace.leads[0]?.id || '');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const selected = workspace.leads.find((lead) => lead.id === selectedId) || workspace.leads[0];
  const thread = workspace.messages.filter((message) => message.leadId === selected?.id);
  const matchingLeads = workspace.leads.filter((lead) => `${lead.name} ${lead.phone} ${lead.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const writeInternalNote = () => {
    const body = note.trim();
    if (!body || !selected) return;
    setWorkspace((current) => ({ ...current, messages: [...current.messages, { id: `msg-${Date.now()}`, leadId: selected.id, body: `Internal preview note: ${body}`, at: timestamp(), direction: 'system' }], timeline: [...current.timeline, { id: `evt-${Date.now()}`, leadId: selected.id, kind: 'note', title: 'Internal note added', detail: body, at: timestamp() }] }));
    setNote('');
  };
  return <div className="space-y-5"><PageIntro label="Messaging" title="One lead, one conversation trail." detail="This preview inbox is browser-local. Provider sends are disabled by design." /><Card className="grid min-h-[620px] overflow-hidden lg:grid-cols-[300px_1fr]"><aside className="border-b border-white/[0.08] bg-black/15 lg:border-b-0 lg:border-r"><div className="border-b border-white/[0.08] p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600" /></div><div className="max-h-[550px] overflow-auto">{matchingLeads.map((lead) => { const last = workspace.messages.filter((message) => message.leadId === lead.id).at(-1); const active = lead.id === selected?.id; return <button key={lead.id} type="button" onClick={() => setSelectedId(lead.id)} className={`w-full border-b border-white/[0.06] p-4 text-left transition ${active ? 'bg-red-500/[0.09]' : 'hover:bg-white/[0.04]'}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-white">{lead.name}</span><span className="text-[10px] text-slate-600">{last?.at || lead.lastActivity}</span></div><p className="mt-1 truncate text-xs text-slate-500">{last?.body || 'No preview messages yet'}</p></button>; })}{!matchingLeads.length ? <Empty label="No preview conversations match that search." /> : null}</div></aside><section className="flex min-w-0 flex-col"><div className="border-b border-white/[0.08] p-5"><Kicker>Lead conversation</Kicker><h2 className="mt-2 text-xl font-semibold">{selected?.name || 'Select a lead'}</h2><p className="mt-1 text-xs text-slate-500">{selected?.phone} · {selected?.consent}</p></div><div className="flex-1 space-y-3 p-5">{thread.length ? thread.map((message) => <div key={message.id} className={`max-w-[78%] rounded-lg p-3 text-xs leading-5 ${message.direction === 'inbound' ? 'mr-auto border border-white/[0.1] bg-white/[0.04] text-slate-200' : message.direction === 'outbound' ? 'ml-auto border border-red-400/20 bg-red-500/[0.1] text-red-50' : 'mx-auto border border-white/[0.08] bg-black/20 text-slate-500'}`}><p>{message.body}</p><p className="mt-1 text-[9px] text-slate-500">{message.at}</p></div>) : <Empty label="No preview messages for this lead." />}</div><div className="border-t border-white/[0.08] p-4"><div className="flex gap-2"><input value={note} onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') writeInternalNote(); }} placeholder="Add an internal note (not sent)" className="min-w-0 flex-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-slate-600" /><ActionButton onClick={writeInternalNote}>Save note</ActionButton></div><p className="mt-2 text-[10px] text-slate-600">SMS and email sending stay disabled until an approved provider, consent, sender identity, and delivery test exist.</p></div></section></Card></div>;
}

function DialerView({ workspace, setWorkspace }: CommandViewProps) {
  const queue = workspace.leads.filter((lead) => lead.stage !== 'Closed');
  const [selectedId, setSelectedId] = useState(queue[0]?.id || '');
  const [sessionOn, setSessionOn] = useState(false);
  const [disposition, setDisposition] = useState('Callback');
  const [note, setNote] = useState('');
  const lead = workspace.leads.find((item) => item.id === selectedId) || queue[0];
  const log = () => {
    if (!lead) return;
    const at = timestamp();
    const nextStage = disposition === 'Quoted' ? 'Quoted' : disposition === 'Appointment set' ? 'Appointment' : 'Contacted';
    const call: DemoCall = { id: `call-demo-${workspace.calls.length + 1}`, leadId: lead.id, leadName: lead.name, direction: 'Outbound', disposition, at, duration: 'Demo', note: note || 'Preview dialer disposition logged locally.' };
    setWorkspace((current) => ({ ...current, leads: current.leads.map((item) => item.id === lead.id ? { ...item, stage: nextStage, lastActivity: 'Just now' } : item), calls: [call, ...current.calls], timeline: [...current.timeline, { id: `evt-dialer-${current.timeline.length + 1}`, leadId: lead.id, kind: 'disposition', title: `Dialer disposition · ${disposition}`, detail: note || 'No phone call was placed. This is a preview event.', at }] }));
    setNote('');
  };
  return <div className="space-y-5"><PageIntro label="Dialer" title="Single-line call workflow." detail="Session controls log preview workflow events only. No browser phone or provider API is connected." /><div className="grid gap-5 xl:grid-cols-[320px_1fr]"> <Card className="overflow-hidden"><div className="border-b border-white/[0.08] p-4"><Kicker>Demo queue</Kicker><p className="mt-2 text-sm font-semibold">{queue.length} records waiting</p></div><div className="max-h-[590px] overflow-auto">{queue.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full border-b border-white/[0.06] p-4 text-left ${item.id === lead?.id ? 'bg-red-500/[0.09]' : 'hover:bg-white/[0.04]'}`}><p className="text-sm font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.phone} · {item.stage}</p><p className="mt-2 text-[10px] text-red-200">{item.callbackAt}</p></button>)}</div></Card><Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Kicker>Single-line session</Kicker><h2 className="mt-2 text-2xl font-semibold">{lead?.name || 'Queue empty'}</h2><p className="mt-1 text-sm text-slate-500">{lead?.phone} · {lead?.state} · {lead?.source}</p></div><Badge tone={sessionOn ? 'green' : 'slate'}>{sessionOn ? 'Demo session active' : 'Session paused'}</Badge></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Info label="Consent" value={lead?.consent || '—'} /><Info label="Next action" value={lead?.callbackAt || '—'} /><Info label="Assigned" value={lead?.assignedTo || '—'} /></div><div className="mt-6 rounded-lg border border-red-400/20 bg-red-500/[0.06] p-4"><p className="text-sm font-semibold text-red-100">No call is placed from this screen.</p><p className="mt-1 text-xs leading-5 text-red-100/70">The production gate still requires durable queue reservation, DNC/consent, calling window, device registration, provider callback validation, and abandonment controls.</p></div><div className="mt-5 flex flex-wrap gap-2"><ActionButton tone={sessionOn ? 'slate' : 'green'} onClick={() => setSessionOn((on) => !on)}>{sessionOn ? 'Pause demo session' : 'Start demo session'}</ActionButton><ActionButton tone="slate" onClick={() => setSelectedId(queue[(queue.findIndex((item) => item.id === lead?.id) + 1) % Math.max(queue.length, 1)]?.id || '')}>Preview next lead</ActionButton></div><div className="mt-6 grid gap-3 md:grid-cols-[190px_1fr]"><label className="text-xs text-slate-500">Disposition<select value={disposition} onChange={(event) => setDisposition(event.target.value)} className="mt-2 w-full rounded-md border border-white/[0.1] bg-[#0b0d12] px-3 py-2 text-xs text-white"><option>Callback</option><option>Quoted</option><option>Appointment set</option><option>No answer</option><option>Not interested</option></select></label><label className="text-xs text-slate-500">Call note<textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-[78px] w-full rounded-md border border-white/[0.1] bg-[#0b0d12] px-3 py-2 text-xs text-white" placeholder="Saved to the fictional preview timeline only." /></label></div><ActionButton disabled={!sessionOn || !lead} onClick={log} className="mt-4">Log demo disposition</ActionButton></Card></div></div>;
}

function PowerDialerView({ workspace, setWorkspace }: CommandViewProps) {
  const leads = workspace.leads.filter((lead) => lead.stage !== 'Closed');
  const [running, setRunning] = useState(false);
  const setLineLead = (lineNumber: 1 | 2 | 3, leadId: string) => setWorkspace((current) => ({ ...current, dialerLines: current.dialerLines.map((line) => line.line === lineNumber ? { ...line, leadId: leadId || undefined, state: leadId ? 'Previewing' : 'Ready' } : line) }));
  const cycle = () => setWorkspace((current) => ({ ...current, dialerLines: current.dialerLines.map((line, index) => ({ ...line, leadId: leads[(index + 2) % leads.length]?.id, state: index === 0 ? 'Wrap-up' : 'Previewing' })) }));
  return <div className="space-y-5"><PageIntro label="Power Dialer" title="Three-line operational simulation." detail="This is a queue and wrap-up rehearsal. It is not live dialing and cannot connect a call." /><Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><Kicker>1–3 line control</Kicker><h2 className="mt-2 text-xl font-semibold">Work the queue without inventing a phone system.</h2></div><div className="flex gap-2"><Badge tone={running ? 'green' : 'slate'}>{running ? 'Demo run active' : 'Preflight'}</Badge><ActionButton tone={running ? 'slate' : 'green'} onClick={() => setRunning((value) => !value)}>{running ? 'Stop demo run' : 'Run demo lanes'}</ActionButton></div></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{workspace.dialerLines.map((line) => { const lead = workspace.leads.find((item) => item.id === line.leadId); return <section key={line.line} className="rounded-lg border border-white/[0.1] bg-black/20 p-4"><div className="flex items-center justify-between"><Kicker tone={line.state === 'Wrap-up' ? 'amber' : line.state === 'Previewing' ? 'red' : 'slate'}>Line {line.line}</Kicker><Badge tone={line.state === 'Wrap-up' ? 'amber' : line.state === 'Previewing' ? 'red' : 'slate'}>{line.state}</Badge></div><p className="mt-5 text-lg font-semibold text-white">{lead?.name || 'No lead reserved'}</p><p className="mt-1 text-xs text-slate-500">{lead ? `${lead.phone} · ${lead.stage}` : 'Choose a fictional record to preview.'}</p><select value={line.leadId || ''} onChange={(event) => setLineLead(line.line, event.target.value)} className="mt-5 w-full rounded-md border border-white/[0.1] bg-[#0b0d12] px-3 py-2 text-xs text-white"><option value="">No preview lead</option>{leads.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stage}</option>)}</select><p className="mt-4 text-[10px] leading-4 text-slate-600">No actual dial occurs. Exact-number DNC, consent, local-window, abandonment, and provider checks are still required before real release.</p></section>; })}</div><div className="mt-5 flex flex-wrap gap-2"><ActionButton tone="slate" onClick={cycle}>Advance demo queue</ActionButton><Link href="/call-queue" className="rounded-md border border-white/[0.1] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]">Open Call Queue →</Link></div></Card></div>;
}

function InboundCallsView({ workspace, setWorkspace }: CommandViewProps) {
  const inbound = workspace.calls.filter((call) => call.direction === 'Inbound').slice(0, 6);
  const setAvailability = (availability: AgentAvailability) => setWorkspace((current) => ({ ...current, availability }));
  const simulateInbound = () => {
    const id = `lead-demo-${Date.now()}`;
    const now = timestamp();
    const lead: DemoLead = { id, name: 'Sam Preview', phone: '(555) 010-0450', email: 'sam.preview@example.test', state: 'CA', age: 65, source: 'Facebook Lead Form · Demo', stage: 'New', assignedTo: 'Jordan Rowe', score: 79, consent: 'Documented', callbackAt: 'Today · 4:30 PM', lastActivity: 'Just now', tags: ['inbound', 'simulated'] };
    const call: DemoCall = { id: `call-${Date.now()}`, leadId: id, leadName: lead.name, direction: 'Inbound', disposition: 'Queued', at: now, duration: '—', note: 'Simulated preview inbound call. No telecom event was received.' };
    setWorkspace((current) => ({ ...current, leads: [lead, ...current.leads], calls: [call, ...current.calls], timeline: [...current.timeline, { id: `evt-${Date.now()}`, leadId: id, kind: 'call', title: 'Simulated inbound call queued', detail: 'Preview-only local event; no provider traffic.', at: now }] }));
  };
  const accept = (call: DemoCall) => setWorkspace((current) => ({ ...current, calls: current.calls.map((item) => item.id === call.id ? { ...item, disposition: 'Accepted' } : item), leads: current.leads.map((lead) => lead.id === call.leadId ? { ...lead, stage: 'Contacted', lastActivity: 'Just now' } : lead), timeline: [...current.timeline, { id: `evt-${Date.now()}`, leadId: call.leadId, kind: 'disposition', title: 'Demo inbound accepted', detail: 'Accepted locally in preview. No telephone connection was made.', at: timestamp() }] }));
  return <div className="space-y-5"><PageIntro label="Inbound Calls" title="Live-screen workflow, safely simulated." detail="Availability changes and queue accepts are local preview state; the real inbound provider is not connected." /><section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]"><Card className="p-5"><Kicker>Agent presence</Kicker><h2 className="mt-2 text-xl font-semibold">{workspace.availability === 'OFF' ? 'Off' : workspace.availability[0] + workspace.availability.slice(1).toLowerCase()}</h2><div className="mt-5 grid grid-cols-3 gap-2">{(['AVAILABLE', 'BREAK', 'OFF'] as AgentAvailability[]).map((status) => <ActionButton key={status} tone={status === 'AVAILABLE' ? 'green' : 'slate'} onClick={() => setAvailability(status)} className={workspace.availability === status ? 'ring-1 ring-red-300/60' : ''}>{status === 'OFF' ? 'Off' : status[0] + status.slice(1).toLowerCase()}</ActionButton>)}</div><div className="mt-5 rounded-md border border-white/[0.08] bg-black/20 p-3"><p className="text-xs font-semibold text-white">Provider state: disconnected</p><p className="mt-1 text-[11px] leading-5 text-slate-500">When real inbound is authorized, it must use signed callbacks, durable queue state, consent/disclosure controls, and actual agent device readiness.</p></div><ActionButton onClick={simulateInbound} className="mt-5 w-full">Simulate demo inbound</ActionButton></Card><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] p-5"><div><Kicker>Live inbound queue</Kicker><h2 className="mt-2 text-xl font-semibold">Incoming lead screen</h2></div><Badge tone="red">Demo signal</Badge></div><div className="divide-y divide-white/[0.06]">{inbound.map((call) => { const lead = workspace.leads.find((item) => item.id === call.leadId); return <div key={call.id} className="flex flex-wrap items-center gap-4 p-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-red-500/15 text-sm text-red-200">↙</div><div className="min-w-[180px] flex-1"><p className="text-sm font-semibold text-white">{call.leadName}</p><p className="mt-1 text-xs text-slate-500">{lead?.phone || 'No number'} · {lead?.state || '—'} · {call.at}</p></div><Badge tone={call.disposition === 'Accepted' ? 'green' : 'amber'}>{call.disposition}</Badge><ActionButton disabled={call.disposition === 'Accepted'} onClick={() => accept(call)}>Accept locally</ActionButton></div>; })}{!inbound.length ? <Empty label="No demo inbound calls in queue." /> : null}</div></Card></section></div>;
}

function PageIntro({ label, title, detail }: { label: string; title: string; detail: string }) {
  return <section className="flex flex-col gap-3 border-b border-white/[0.08] pb-5"><Kicker>{label}</Kicker><div className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{detail}</p></div><Badge tone="red">Preview-only</Badge></div></section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-white/[0.08] bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">{label}</p><p className="mt-2 truncate text-xs font-semibold text-slate-200">{value}</p></div>;
}

function Empty({ label }: { label: string }) {
  return <div className="p-6 text-center text-xs text-slate-500">{label}</div>;
}

function PreviewUnavailable() {
  return <div className="mx-auto max-w-xl py-16 text-center"><Kicker>Preview demo is disabled</Kicker><h1 className="mt-3 text-2xl font-semibold text-white">No CRM records are loaded here.</h1><p className="mt-3 text-sm leading-6 text-slate-400">The fictional demo workspace only exists in the explicitly flagged Vercel preview. This route will not fall back to Sheets, SQLite, GitHub, Twilio, or production data.</p></div>;
}

export default function CommandWorkspace({ view, displayName, role, demoEnabled, isOwner }: WorkspaceProps) {
  const { workspace, setWorkspace, reset } = usePreviewWorkspace(demoEnabled);
  const props: CommandViewProps = { workspace, setWorkspace, demoEnabled, isOwner, displayName };
  const content = useMemo(() => {
    if (!demoEnabled) return <PreviewUnavailable />;
    switch (view) {
      case 'home': return <HomeView {...props} />;
      case 'leads': return <LeadsView {...props} />;
      case 'quoter': return <SmartQuoterView {...props} />;
      case 'log-a-sale': return <LogSaleView {...props} />;
      case 'messaging': return <MessagingView {...props} />;
      case 'dialer': return <DialerView {...props} />;
      case 'power-dialer': return <PowerDialerView {...props} />;
      case 'inbound-calls': return <InboundCallsView {...props} />;
      case 'recruiting': return <RecruitingView {...props} />;
      case 'leaderboard': return <LeaderboardView {...props} />;
      case 'announcements': return <AnnouncementsView {...props} />;
      case 'resources': return <ResourcesView {...props} />;
      case 'ai-upline': return <AIUplineView {...props} />;
      case 'book-of-business': return <BookOfBusinessView {...props} />;
      case 'agency-control': return <AgencyControlView {...props} />;
      case 'agent-approvals': return <AgentApprovalsView {...props} />;
      case 'agents': return <AgentsView {...props} />;
      case 'lead-catalog': return <LeadCatalogView {...props} />;
      case 'call-queue': return <CallQueueView {...props} />;
      case 'system-health': return <SystemHealthView {...props} />;
      case 'settings': return <SettingsView {...props} />;
      case 'messaging-setup': return <MessagingSetupView {...props} />;
      default: return <PreviewUnavailable />;
    }
  // `props` intentionally expands a stable render surface for a local preview store.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoEnabled, view, workspace, displayName, isOwner]);
  return <CommandShell view={view} displayName={displayName} role={role} demoEnabled={demoEnabled} onResetDemo={reset}>{content}</CommandShell>;
}

function MessagingSetupView({ workspace, setWorkspace }: CommandViewProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const addTemplate = () => {
    if (!title.trim() || !body.trim()) return;
    setWorkspace((current) => ({ ...current, templates: [...current.templates, { id: `tmpl-${Date.now()}`, title: title.trim(), channel: 'SMS', body: body.trim(), status: 'Draft' }] }));
    setTitle(''); setBody('');
  };
  return <div className="space-y-5"><PageIntro label="Messaging Setup" title="Templates, consent, and a hard provider gate." detail="Preview templates can be organized here. They cannot be delivered to any phone or inbox." /><div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><Card className="overflow-hidden"><div className="border-b border-white/[0.08] p-5"><Kicker>Template library</Kicker><h2 className="mt-2 text-lg font-semibold">Local preview templates</h2></div><div className="divide-y divide-white/[0.06]">{workspace.templates.map((template) => <div key={template.id} className="p-5"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-white">{template.title}</p><Badge tone={template.status === 'Approved for preview' ? 'green' : 'slate'}>{template.status}</Badge><Badge tone="slate">{template.channel}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-400">{template.body}</p><p className="mt-2 text-[10px] text-slate-600">Delivery: disabled · consent check: not connected</p></div>)}</div></Card><div className="space-y-5"><Card className="p-5"><Kicker>New template</Kicker><p className="mt-2 text-sm font-semibold">Build for review, not broadcast.</p><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Template name" className="mt-4 w-full rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-xs text-white placeholder:text-slate-600" /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Preview message body" className="mt-2 min-h-[100px] w-full rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-xs text-white placeholder:text-slate-600" /><ActionButton onClick={addTemplate} className="mt-3">Save local draft</ActionButton></Card><Card className="p-5"><Kicker tone="amber">Compliance gate</Kicker><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-400"><li>• Destination-specific consent and suppression record required.</li><li>• Approved sender identity and opt-out processing required.</li><li>• Provider delivery status must write to the durable timeline.</li></ul><div className="mt-4 rounded-md border border-amber-400/20 bg-amber-500/[0.06] p-3 text-[11px] text-amber-100">Send controls remain disabled until all of those are proven.</div></Card></div></div></div>;
}

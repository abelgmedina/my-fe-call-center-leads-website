'use client';

import { useMemo, useState } from 'react';
import type { DemoPolicy, DemoRecruit } from '@/lib/demo-crm-data';
import type { CommandViewProps } from './types';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const monthlyMoney = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={'rounded-lg border border-white/[0.09] bg-[#10131a] ' + className}>{children}</section>;
}

function Head({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">{kicker}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1></div>{children}</div>;
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' | 'green' | 'amber' }) {
  const colors = { slate: 'border-white/[0.12] bg-white/[0.035] text-slate-300', red: 'border-red-400/25 bg-red-500/10 text-red-200', green: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200', amber: 'border-amber-400/25 bg-amber-500/10 text-amber-100' };
  return <span className={'inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.11em] ' + colors[tone]}>{children}</span>;
}

function Empty({ title }: { title: string }) {
  return <Panel className="p-8 text-center"><p className="text-sm font-semibold text-white">{title}</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">This workspace is intentionally seeded only in the isolated preview. It never reads from Sheets, Twilio, provider APIs, or a production store.</p></Panel>;
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'red' | 'green' | 'amber' }) {
  const accents = { slate: 'border-l-white/[0.12]', red: 'border-l-red-400', green: 'border-l-emerald-400', amber: 'border-l-amber-400' };
  return <Panel className={'border-l-2 p-4 ' + accents[tone]}><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></Panel>;
}

const policyStatuses: DemoPolicy['status'][] = ['Active', 'Pending', 'Lapse risk', 'Draft'];
const recruitStages: DemoRecruit['stage'][] = ['New', 'Interview', 'Contracting', 'Activated'];

export function BookOfBusinessView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | DemoPolicy['status']>('All');
  const policies = useMemo(() => workspace.policies.filter((policy) => {
    const contains = (policy.client + ' ' + policy.carrier + ' ' + policy.product).toLowerCase().includes(query.toLowerCase());
    return contains && (status === 'All' || policy.status === status);
  }), [workspace.policies, query, status]);
  const activeAP = workspace.policies.filter((policy) => policy.status === 'Active').reduce((sum, policy) => sum + policy.annualPremium, 0);
  const pendingAP = workspace.policies.filter((policy) => policy.status === 'Pending').reduce((sum, policy) => sum + policy.annualPremium, 0);
  const lapseRisk = workspace.policies.filter((policy) => policy.lapseRisk).length;
  function addDraft() {
    if (!demoEnabled || !workspace.leads[0]) return;
    const lead = workspace.leads[0];
    setWorkspace((current) => ({ ...current, policies: [{ id: 'pol-demo-' + Date.now(), leadId: lead.id, client: lead.name, carrier: 'Illustrative carrier · demo', product: 'Final Expense', faceAmount: 10000, premium: 0, annualPremium: 0, effectiveDate: '2026-12-01', status: 'Draft', draftDate: '2026-11-24', writingNumber: 'DEMO-DRAFT', lapseRisk: false }, ...current.policies] }));
  }
  if (!demoEnabled) return <Empty title="Book of Business is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · policy operations" title="Book of Business"><button type="button" onClick={addDraft} className="rounded-md bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400">+ Add draft policy</button></Head>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Active AP" value={money(activeAP)} tone="green" /><Metric label="Pending AP" value={money(pendingAP)} tone="amber" /><Metric label="Active policies" value={String(workspace.policies.filter((policy) => policy.status === 'Active').length)} /><Metric label="Lapse risk" value={String(lapseRisk)} tone={lapseRisk ? 'red' : 'green'} /></div>
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.08] p-4"><input aria-label="Search policies" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, product, or carrier" className="min-w-[220px] flex-1 rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-600" /><select value={status} onChange={(event) => setStatus(event.target.value as 'All' | DemoPolicy['status'])} className="rounded-md border border-white/[0.1] bg-[#151820] px-3 py-2 text-sm text-slate-200"><option>All</option>{policyStatuses.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Carrier / Product</th><th className="px-4 py-3">Face</th><th className="px-4 py-3">Premium</th><th className="px-4 py-3">AP</th><th className="px-4 py-3">Effective</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Writing #</th></tr></thead><tbody>{policies.map((policy) => <tr key={policy.id} className="border-t border-white/[0.07] text-slate-300"><td className="px-4 py-3 font-semibold text-white">{policy.client}</td><td className="px-4 py-3"><p>{policy.carrier}</p><p className="mt-0.5 text-xs text-slate-500">{policy.product}</p></td><td className="px-4 py-3">{money(policy.faceAmount)}</td><td className="px-4 py-3">{monthlyMoney(policy.premium)}/mo</td><td className="px-4 py-3 font-semibold">{money(policy.annualPremium)}</td><td className="px-4 py-3 text-slate-400">{policy.effectiveDate}</td><td className="px-4 py-3"><Badge tone={policy.lapseRisk ? 'red' : policy.status === 'Active' ? 'green' : policy.status === 'Pending' ? 'amber' : 'slate'}>{policy.status}</Badge></td><td className="px-4 py-3 font-mono text-xs text-slate-500">{policy.writingNumber}</td></tr>)}</tbody></table></div>
    </Panel>
    <p className="text-xs text-slate-500">All policy fields are fictional preview records. A draft stays in this browser only and never creates an application or policy.</p>
  </div>;
}

export function RecruitingView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  function advance(id: string) {
    if (!demoEnabled) return;
    setWorkspace((current) => ({ ...current, recruits: current.recruits.map((recruit) => {
      if (recruit.id !== id) return recruit;
      const next = recruitStages[Math.min(recruitStages.indexOf(recruit.stage) + 1, recruitStages.length - 1)];
      return { ...recruit, stage: next, updatedAt: 'Just now · demo' };
    }) }));
  }
  if (!demoEnabled) return <Empty title="Recruiting is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Front office · recruiting" title="Recruiting pipeline"><Badge tone="red">{workspace.recruits.length} demo recruits</Badge></Head>
    <div className="grid gap-4 xl:grid-cols-4">{recruitStages.map((stage) => {
      const recruits = workspace.recruits.filter((recruit) => recruit.stage === stage);
      return <Panel key={stage} className="min-h-[320px] p-3"><div className="flex items-center justify-between border-b border-white/[0.08] px-1 pb-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">{stage}</p><Badge>{recruits.length}</Badge></div><div className="mt-3 space-y-3">{recruits.map((recruit) => <article key={recruit.id} className="rounded-md border border-white/[0.08] bg-black/20 p-3"><p className="font-semibold text-white">{recruit.name}</p><p className="mt-1 truncate text-xs text-slate-500">{recruit.email}</p><div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="text-slate-500">{recruit.owner}</span><span className="text-slate-600">{recruit.updatedAt}</span></div>{stage === 'Activated' ? <div className="mt-3"><Badge tone="green">Activated</Badge></div> : <button type="button" onClick={() => advance(recruit.id)} className="mt-3 w-full rounded-md border border-red-400/25 bg-red-500/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-100 hover:bg-red-500/20">Advance demo stage</button>}</article>)}{recruits.length === 0 ? <p className="p-4 text-center text-xs text-slate-600">No demo recruits in this stage.</p> : null}</div></Panel>;
    })}</div>
    <Panel className="p-4"><p className="text-sm font-semibold text-white">Activation remains a preview workflow.</p><p className="mt-1 text-sm leading-6 text-slate-500">Advancing a card changes only this browser-local fixture. It does not create users, alter account roles, or grant access.</p></Panel>
  </div>;
}

export function LeaderboardView({ workspace, demoEnabled }: CommandViewProps) {
  const [period, setPeriod] = useState<'weekAP' | 'monthAP' | 'policies' | 'calls'>('monthAP');
  const agents = [...workspace.agents].sort((left, right) => right[period] - left[period]);
  if (!demoEnabled) return <Empty title="Leaderboard is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Front office · verified demo metrics" title="Leaderboard"><div className="flex gap-1 rounded-md border border-white/[0.09] bg-black/20 p-1">{(['weekAP', 'monthAP', 'policies', 'calls'] as const).map((item) => <button type="button" key={item} onClick={() => setPeriod(item)} className={'rounded px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] ' + (period === item ? 'bg-red-500 text-white' : 'text-slate-500 hover:text-white')}>{item === 'weekAP' ? 'Week' : item === 'monthAP' ? 'Month' : item}</button>)}</div></Head>
    <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Contract level</th><th className="px-4 py-3">Availability</th><th className="px-4 py-3">Selected metric</th><th className="px-4 py-3">Policies</th><th className="px-4 py-3">Calls</th></tr></thead><tbody>{agents.map((agent, index) => <tr key={agent.id} className="border-t border-white/[0.07]"><td className="px-4 py-3 font-black text-red-300">#{index + 1}</td><td className="px-4 py-3 font-semibold text-white">{agent.name}</td><td className="px-4 py-3 text-slate-500">{agent.contractLevel}</td><td className="px-4 py-3"><Badge tone={agent.availability === 'AVAILABLE' ? 'green' : agent.availability === 'BREAK' ? 'amber' : 'slate'}>{agent.availability}</Badge></td><td className="px-4 py-3 font-semibold text-white">{period === 'weekAP' || period === 'monthAP' ? money(agent[period]) : agent[period]}</td><td className="px-4 py-3 text-slate-300">{agent.policies}</td><td className="px-4 py-3 text-slate-300">{agent.calls}</td></tr>)}</tbody></table></div></Panel>
    <p className="text-xs text-slate-500">Preview metrics are fictional and exclude compensation, provider records, and production activity.</p>
  </div>;
}

export function AnnouncementsView({ workspace, setWorkspace, demoEnabled, isOwner, displayName }: CommandViewProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const ordered = [...workspace.announcements].sort((left, right) => Number(right.pinned) - Number(left.pinned));
  function publish() {
    if (!demoEnabled || !isOwner || !title.trim() || !body.trim()) return;
    setWorkspace((current) => ({ ...current, announcements: [{ id: 'ann-demo-' + Date.now(), title: title.trim(), body: body.trim(), author: displayName, createdAt: 'Just now · preview', pinned: false }, ...current.announcements] }));
    setTitle(''); setBody('');
  }
  function togglePin(id: string) {
    if (!demoEnabled || !isOwner) return;
    setWorkspace((current) => ({ ...current, announcements: current.announcements.map((item) => item.id === id ? { ...item, pinned: !item.pinned } : item) }));
  }
  if (!demoEnabled) return <Empty title="Announcements are available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Front office · team direction" title="Announcements"><Badge tone={isOwner ? 'red' : 'slate'}>{isOwner ? 'Owner controls enabled' : 'Read-only access'}</Badge></Head>
    {isOwner ? <Panel className="p-4"><div className="grid gap-3 md:grid-cols-[0.35fr_0.65fr_auto]"><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Announcement title" className="rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-600" /><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Brief operating note" className="rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-600" /><button type="button" onClick={publish} className="rounded-md bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-400">Publish demo</button></div><p className="mt-2 text-xs text-slate-500">Creates a browser-local preview post; it does not notify a team.</p></Panel> : null}
    <div className="grid gap-3 xl:grid-cols-2">{ordered.map((announcement) => <Panel key={announcement.id} className={'p-4 ' + (announcement.pinned ? 'border-red-400/25' : '')}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2">{announcement.pinned ? <Badge tone="red">Pinned</Badge> : null}<span className="text-xs text-slate-500">{announcement.createdAt}</span></div><h2 className="mt-3 font-semibold text-white">{announcement.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{announcement.body}</p><p className="mt-4 text-xs text-slate-600">Posted by {announcement.author}</p></div>{isOwner ? <button type="button" onClick={() => togglePin(announcement.id)} className="rounded border border-white/[0.1] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 hover:border-red-400/40 hover:text-white">{announcement.pinned ? 'Unpin' : 'Pin'}</button> : null}</div></Panel>)}</div>
  </div>;
}

export function ResourcesView({ workspace, demoEnabled }: CommandViewProps) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', ...Array.from(new Set(workspace.resources.map((resource) => resource.category)))];
  const resources = workspace.resources.filter((resource) => filter === 'All' || resource.category === filter);
  if (!demoEnabled) return <Empty title="Resources are available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Front office · knowledge library" title="Resources"><Badge tone="amber">Illustrative only</Badge></Head>
    <Panel className="border-amber-400/20 bg-amber-500/[0.045] p-4"><p className="text-sm font-semibold text-amber-100">The real Everything Informational Trello export is not loaded on this preview.</p><p className="mt-1 text-sm leading-6 text-amber-100/70">These cards are fictional interface fixtures, not carrier guidance, phone numbers, e-app links, underwriting rules, or a substitute for approved material.</p></Panel>
    <div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => setFilter(category)} className={'rounded-full border px-3 py-1.5 text-xs font-semibold ' + (filter === category ? 'border-red-400/35 bg-red-500/15 text-red-100' : 'border-white/[0.09] text-slate-500 hover:text-white')}>{category}</button>)}</div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <Panel key={resource.id} className="p-4"><div className="flex items-start justify-between gap-3"><Badge>{resource.category}</Badge><span className="text-[10px] text-slate-600">{resource.access}</span></div><h2 className="mt-4 font-semibold text-white">{resource.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{resource.summary}</p><p className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-slate-600">Source: demo knowledge card · {resource.asOf}</p></Panel>)}</div>
  </div>;
}

type ChatLine = { id: number; role: 'agent' | 'upline'; body: string; citation?: string };

export function AIUplineView({ workspace, demoEnabled }: CommandViewProps) {
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<ChatLine[]>([{ id: 1, role: 'upline', body: 'I am the preview-only AI Upline demo. I can point to the tiny illustrative library, but I do not have the real Trello knowledge base, carrier rules, e-app links, or phone numbers.' }]);
  function ask() {
    const clean = question.trim();
    if (!clean) return;
    const normalized = clean.toLowerCase();
    const discovery = workspace.resources.find((resource) => resource.category === 'Script');
    const compliance = workspace.resources.find((resource) => resource.category === 'Compliance');
    const carrier = workspace.resources.find((resource) => resource.category === 'Carrier info');
    let reply: ChatLine;
    if ((normalized.includes('consent') || normalized.includes('dnc') || normalized.includes('call')) && compliance) reply = { id: Date.now() + 1, role: 'upline', body: 'For this preview, use the illustrative consent and DNC checklist before any outreach. It is not legal advice and cannot authorize a call or message.', citation: compliance.title + ' · ' + compliance.asOf };
    else if ((normalized.includes('discovery') || normalized.includes('final expense') || normalized.includes('budget')) && discovery) reply = { id: Date.now() + 1, role: 'upline', body: 'The preview discovery framework starts with consent, customer goal, budget, beneficiary, and a documented next action. It does not provide underwriting or a premium.', citation: discovery.title + ' · ' + discovery.asOf };
    else if ((normalized.includes('carrier') || normalized.includes('phone') || normalized.includes('e-app') || normalized.includes('underwriting')) && carrier) reply = { id: Date.now() + 1, role: 'upline', body: 'Not in the preview knowledge library. No real carrier phones, portals, e-app links, or underwriting guides are loaded. Use approved carrier material or ask your upline; do not guess.', citation: carrier.title + ' · ' + carrier.asOf };
    else reply = { id: Date.now() + 1, role: 'upline', body: 'Not in the preview knowledge library. The real Trello export and extracted texts are not attached here, so I cannot provide or invent an answer. Ask your upline or import approved source material first.' };
    setChat((current) => [...current, { id: Date.now(), role: 'agent', body: clean }, reply]);
    setQuestion('');
  }
  if (!demoEnabled) return <Empty title="AI Upline is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Front office · grounded preview assistant" title="AI Upline"><Badge tone="amber">No real knowledge base loaded</Badge></Head>
    <Panel className="overflow-hidden"><div className="min-h-[420px] space-y-4 p-4 sm:p-6">{chat.map((line) => <div key={line.id} className={'max-w-3xl rounded-lg border p-3 text-sm leading-6 ' + (line.role === 'agent' ? 'ml-auto border-red-400/20 bg-red-500/10 text-red-50' : 'border-white/[0.09] bg-black/20 text-slate-300')}><p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{line.role === 'agent' ? 'You' : 'AI Upline · Preview'}</p>{line.body}{line.citation ? <p className="mt-3 border-t border-white/[0.08] pt-2 text-xs text-red-200">Citation: {line.citation}</p> : null}</div>)}</div><form onSubmit={(event) => { event.preventDefault(); ask(); }} className="flex gap-2 border-t border-white/[0.08] p-3"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the illustrative preview library…" className="min-w-0 flex-1 rounded-md border border-white/[0.1] bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-600" /><button type="submit" className="rounded-md bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-400">Ask</button></form></Panel>
    <p className="text-xs text-slate-500">No prompt leaves this browser. This deterministic preview response layer is not an AI provider integration.</p>
  </div>;
}

export function AgencyControlView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [notice, setNotice] = useState('');
  function addIntake() {
    if (!demoEnabled) return;
    const index = workspace.leads.length + 1;
    const lead = { id: 'lead-intake-' + Date.now(), name: 'Preview Intake ' + index, phone: '(555) 010-' + String(400 + index).padStart(4, '0'), email: 'intake.' + index + '@example.test', state: 'CA', age: 65, source: 'Facebook Lead Form · Simulated', stage: 'New' as const, assignedTo: workspace.agents[0]?.name || 'Unassigned', score: 70, consent: 'Needs review' as const, callbackAt: 'Needs scheduling', lastActivity: 'Just now · simulated', tags: ['inbound', 'simulated'] };
    setWorkspace((current) => ({ ...current, leads: [lead, ...current.leads], timeline: [{ id: 'evt-intake-' + Date.now(), leadId: lead.id, kind: 'note', title: 'Simulated inbound form received', detail: 'Preview-only intake event. No Sheets or webhook adapter was called.', at: 'Just now' }, ...current.timeline] }));
    setNotice(lead.name + ' added to the local preview queue.');
  }
  if (!demoEnabled) return <Empty title="Agency Control is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · agency control" title="Agency Control"><Badge tone="red">Preview operations</Badge></Head>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Leads in workspace" value={String(workspace.leads.length)} /><Metric label="Available agents" value={String(workspace.agents.filter((agent) => agent.availability === 'AVAILABLE').length)} tone="green" /><Metric label="Open recruits" value={String(workspace.recruits.filter((recruit) => recruit.stage !== 'Activated').length)} /><Metric label="Inbound queue" value={String(workspace.calls.filter((call) => call.direction === 'Inbound' && call.disposition === 'Queued').length)} tone="amber" /></div>
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><Panel className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Inbound intake adapter</p><h2 className="mt-2 text-lg font-semibold text-white">Facebook / Sheets adapter status</h2><p className="mt-2 text-sm leading-6 text-slate-400">Unconfigured by design in Preview. This screen never contacts Sheets, Zapier, a webhook, or a production lead source.</p><button type="button" onClick={addIntake} className="mt-5 rounded-md bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-400">Simulate demo intake</button>{notice ? <p className="mt-3 text-xs text-emerald-200">{notice}</p> : null}</Panel><Panel className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Provider guardrails</p><ul className="mt-4 space-y-3 text-sm text-slate-400"><li>• Voice provider: not configured</li><li>• Messaging sender: not configured</li><li>• Billing / marketplace: disabled</li><li>• Durable CRM database: not connected</li></ul></Panel></div>
  </div>;
}

export function AgentApprovalsView({ workspace, setWorkspace, demoEnabled, isOwner }: CommandViewProps) {
  const candidates = workspace.recruits.filter((recruit) => recruit.stage === 'Contracting' || recruit.stage === 'Interview');
  function approve(id: string) {
    if (!demoEnabled || !isOwner) return;
    setWorkspace((current) => ({ ...current, recruits: current.recruits.map((recruit) => recruit.id === id ? { ...recruit, stage: 'Activated', updatedAt: 'Just now · preview approval' } : recruit) }));
  }
  if (!demoEnabled) return <Empty title="Agent Approvals are available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · access control" title="Agent Approvals"><Badge tone={isOwner ? 'red' : 'slate'}>{isOwner ? 'Owner action enabled' : 'Owner-only'}</Badge></Head>
    <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{candidates.map((candidate) => <tr key={candidate.id} className="border-t border-white/[0.07]"><td className="px-4 py-3"><p className="font-semibold text-white">{candidate.name}</p><p className="text-xs text-slate-500">{candidate.email}</p></td><td className="px-4 py-3"><Badge tone={candidate.stage === 'Contracting' ? 'amber' : 'slate'}>{candidate.stage}</Badge></td><td className="px-4 py-3 text-slate-400">{candidate.owner}</td><td className="px-4 py-3 text-slate-500">{candidate.updatedAt}</td><td className="px-4 py-3"><button type="button" disabled={!isOwner} onClick={() => approve(candidate.id)} className="rounded-md border border-red-400/25 bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-100 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40">Approve demo</button></td></tr>)}{candidates.length === 0 ? <tr><td colSpan={5} className="px-4 py-9 text-center text-slate-500">No demo candidates awaiting approval.</td></tr> : null}</tbody></table></div></Panel>
    <p className="text-xs text-slate-500">This action changes only a demo recruiting card. It cannot create an account or grant production privileges.</p>
  </div>;
}

export function AgentsView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  function changeAvailability(id: string, availability: 'AVAILABLE' | 'BREAK' | 'OFF') {
    if (!demoEnabled) return;
    setWorkspace((current) => ({ ...current, agents: current.agents.map((agent) => agent.id === id ? { ...agent, availability } : agent) }));
  }
  if (!demoEnabled) return <Empty title="Agents are available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · people" title="Agents"><Badge>{workspace.agents.length} demo agents</Badge></Head>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{workspace.agents.map((agent) => <Panel key={agent.id} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-white">{agent.name}</p><p className="mt-1 text-xs text-slate-500">{agent.contractLevel}</p></div><Badge tone={agent.availability === 'AVAILABLE' ? 'green' : agent.availability === 'BREAK' ? 'amber' : 'slate'}>{agent.availability}</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/[0.07] py-3 text-center"><div><p className="text-sm font-semibold text-white">{money(agent.monthAP)}</p><p className="text-[9px] uppercase tracking-wide text-slate-600">AP</p></div><div><p className="text-sm font-semibold text-white">{agent.policies}</p><p className="text-[9px] uppercase tracking-wide text-slate-600">Policies</p></div><div><p className="text-sm font-semibold text-white">{agent.calls}</p><p className="text-[9px] uppercase tracking-wide text-slate-600">Calls</p></div></div><select value={agent.availability} onChange={(event) => changeAvailability(agent.id, event.target.value as 'AVAILABLE' | 'BREAK' | 'OFF')} className="mt-3 w-full rounded-md border border-white/[0.1] bg-black/20 px-2 py-2 text-xs text-slate-300"><option value="AVAILABLE">Available</option><option value="BREAK">Break</option><option value="OFF">Off</option></select></Panel>)}</div>
  </div>;
}

export function LeadCatalogView({ demoEnabled }: CommandViewProps) {
  const offerings = [['Final Expense Inbound · Demo', 'Facebook / web intake'], ['Term Review Queue · Demo', 'Appointment-ready'], ['Recruiting Prospect List · Demo', 'Opt-in simulation']];
  if (!demoEnabled) return <Empty title="Lead Catalog is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · catalog" title="Lead Catalog"><Badge tone="amber">Billing disabled</Badge></Head>
    <Panel className="border-amber-400/20 bg-amber-500/[0.045] p-4 text-sm leading-6 text-amber-100/80">Pricing, purchase flows, payment methods, fulfillment, and any marketplace action remain disabled. These cards are visual demo inventory only.</Panel>
    <div className="grid gap-3 md:grid-cols-3">{offerings.map(([title, source]) => <Panel key={title} className="p-5"><Badge>Illustrative only</Badge><h2 className="mt-4 text-lg font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-500">Source lane: {source}</p><button type="button" disabled className="mt-6 w-full rounded-md border border-white/[0.1] bg-white/[0.025] px-3 py-2 text-xs font-bold text-slate-600">Checkout disabled</button></Panel>)}</div>
  </div>;
}

export function CallQueueView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [claimed, setClaimed] = useState<string | null>(null);
  const queued = workspace.calls.filter((call) => call.disposition === 'Queued' || call.disposition === 'Callback');
  function claim(id: string) {
    if (!demoEnabled) return;
    const selected = workspace.calls.find((call) => call.id === id);
    if (!selected) return;
    setWorkspace((current) => ({ ...current, calls: current.calls.map((call) => call.id === id ? { ...call, disposition: 'In preview review' } : call), timeline: [{ id: 'evt-claim-' + Date.now(), leadId: selected.leadId, kind: 'disposition', title: 'Queue item claimed', detail: 'Claimed in preview only. No phone call was placed.', at: 'Just now' }, ...current.timeline] }));
    setClaimed(id);
  }
  if (!demoEnabled) return <Empty title="Call Queue is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · calling operations" title="Call Queue"><Badge tone="amber">Provider not connected</Badge></Head>
    <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[0.025] text-[10px] font-black uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Disposition</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Note</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{queued.map((call) => <tr key={call.id} className="border-t border-white/[0.07]"><td className="px-4 py-3 font-semibold text-white">{call.leadName}</td><td className="px-4 py-3 text-slate-400">{call.direction}</td><td className="px-4 py-3"><Badge tone={call.disposition === 'Queued' ? 'red' : 'amber'}>{call.disposition}</Badge></td><td className="px-4 py-3 text-slate-500">{call.at}</td><td className="max-w-xs px-4 py-3 text-xs text-slate-500">{call.note}</td><td className="px-4 py-3"><button type="button" onClick={() => claim(call.id)} className="rounded-md border border-red-400/25 bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-100 hover:bg-red-500/20">{claimed === call.id ? 'Claimed' : 'Claim demo'}</button></td></tr>)}{queued.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No demo queue items remaining.</td></tr> : null}</tbody></table></div></Panel>
    <p className="text-xs text-slate-500">Claiming a queue item is a simulated disposition only. No phone number, dialer, or queue reservation is touched.</p>
  </div>;
}

export function SystemHealthView({ demoEnabled }: CommandViewProps) {
  const checks = [['Preview isolation', 'Healthy', 'Demo auth and browser-local fixtures only.'], ['Sheets / intake adapter', 'Unconfigured', 'No preview Sheets credentials are available.'], ['Twilio voice', 'Disabled', 'No token, phone number, or callback is configured.'], ['Messaging provider', 'Disabled', 'No sender or delivery service is configured.'], ['Durable CRM store', 'Not connected', 'Preview mutations stay browser-local.']];
  if (!demoEnabled) return <Empty title="System Health is available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · diagnostics" title="System Health"><Badge tone="green">Preview app healthy</Badge></Head>
    <div className="grid gap-3 lg:grid-cols-2">{checks.map(([name, status, detail]) => <Panel key={name} className="flex items-start justify-between gap-4 p-4"><div><p className="font-semibold text-white">{name}</p><p className="mt-1 text-sm leading-6 text-slate-500">{detail}</p></div><Badge tone={status === 'Healthy' ? 'green' : status === 'Unconfigured' ? 'amber' : 'slate'}>{status}</Badge></Panel>)}</div>
    <Panel className="p-4"><p className="text-sm font-semibold text-white">No destructive recovery controls</p><p className="mt-1 text-sm leading-6 text-slate-500">This preview reports what is deliberately absent. It does not create provider credentials, modify DNS, buy numbers, or connect a production system.</p></Panel>
  </div>;
}

export function SettingsView({ workspace, setWorkspace, demoEnabled, displayName }: CommandViewProps) {
  const [saved, setSaved] = useState(false);
  function setStatus(status: 'AVAILABLE' | 'BREAK' | 'OFF') {
    if (!demoEnabled) return;
    setWorkspace((current) => ({ ...current, availability: status }));
    setSaved(true);
  }
  if (!demoEnabled) return <Empty title="Settings are available in the Preview demo." />;
  return <div className="space-y-5">
    <Head kicker="Back office · preferences" title="Settings"><Badge>Preview-local</Badge></Head>
    <div className="grid gap-4 xl:grid-cols-2"><Panel className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Workspace profile</p><p className="mt-3 text-lg font-semibold text-white">{displayName}</p><p className="mt-1 text-sm text-slate-500">Role and account data remain isolated from this demo layer.</p><div className="mt-5 rounded-md border border-white/[0.08] bg-black/20 p-3 text-xs leading-5 text-slate-500">Account editing, credentials, writing numbers, and provider configuration are not available in Preview demo mode.</div></Panel><Panel className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Agent availability · demo</p><div className="mt-4 flex flex-wrap gap-2">{(['AVAILABLE', 'BREAK', 'OFF'] as const).map((status) => <button type="button" key={status} onClick={() => setStatus(status)} className={'rounded-md border px-3 py-2 text-xs font-bold ' + (workspace.availability === status ? 'border-red-400/35 bg-red-500/15 text-red-100' : 'border-white/[0.1] text-slate-500 hover:text-white')}>{status === 'OFF' ? 'Off' : status === 'BREAK' ? 'Break' : 'Available'}</button>)}</div>{saved ? <p className="mt-4 text-xs text-emerald-200">Availability saved to this browser-local demo.</p> : <p className="mt-4 text-xs text-slate-500">This setting does not update any real agent presence.</p>}</Panel></div>
  </div>;
}

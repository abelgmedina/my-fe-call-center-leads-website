'use client';

import { useMemo, useState } from 'react';
import { DEMO_RATE_TABLE, type DemoLead, type LeadStage } from '@/lib/demo-crm-data';
import type { CommandViewProps } from './types';

const STAGES: LeadStage[] = ['New', 'Contacted', 'Quoted', 'Appointment', 'Application', 'Closed'];

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-white/[0.09] bg-[#10131a] ${className}`}>{children}</section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">{children}</p>;
}

function StagePill({ stage }: { stage: LeadStage }) {
  const styles: Record<LeadStage, string> = {
    New: 'border-blue-400/25 bg-blue-400/10 text-blue-200',
    Contacted: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    Quoted: 'border-violet-400/25 bg-violet-400/10 text-violet-100',
    Appointment: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
    Application: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
    Closed: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${styles[stage]}`}>{stage}</span>;
}

function DisabledHint({ demoEnabled }: { demoEnabled: boolean }) {
  if (demoEnabled) return null;
  return <p className="mt-2 text-xs text-amber-200">Demo data is unavailable outside the explicitly enabled Preview workspace.</p>;
}

function LeadName({ lead }: { lead: DemoLead }) {
  return <div><p className="font-semibold text-white">{lead.name}</p><p className="mt-0.5 text-xs text-slate-500">{lead.phone} · {lead.state} · score {lead.score}</p></div>;
}

export function LeadsView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<LeadStage | 'All'>('All');
  const [mode, setMode] = useState<'list' | 'kanban'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(workspace.leads[0]?.id || null);
  const [note, setNote] = useState('');
  const [disposition, setDisposition] = useState('Follow-up scheduled');
  const [status, setStatus] = useState('');

  const leads = useMemo(() => workspace.leads.filter((lead) => {
    const needle = query.trim().toLowerCase();
    const matchesText = !needle || [lead.name, lead.phone, lead.email, lead.source, lead.assignedTo].join(' ').toLowerCase().includes(needle);
    return matchesText && (stage === 'All' || lead.stage === stage);
  }), [workspace.leads, query, stage]);
  const selected = workspace.leads.find((lead) => lead.id === selectedId) || leads[0] || null;
  const selectedTimeline = selected ? workspace.timeline.filter((item) => item.leadId === selected.id) : [];
  const selectedQuotes = selected ? workspace.quotes.filter((quote) => quote.leadId === selected.id) : [];

  function updateLead(id: string, patch: Partial<DemoLead>) {
    if (!demoEnabled) return;
    setWorkspace((current) => ({ ...current, leads: current.leads.map((lead) => lead.id === id ? { ...lead, ...patch, lastActivity: 'Just now · preview' } : lead) }));
  }

  function addTimeline(kind: 'note' | 'disposition', title: string, detail: string) {
    if (!demoEnabled || !selected || !detail.trim()) return;
    const item = { id: `evt-demo-${selected.id}-${workspace.timeline.length + 1}`, leadId: selected.id, kind, title, detail: detail.trim(), at: 'Just now · preview' } as const;
    setWorkspace((current) => ({ ...current, timeline: [item, ...current.timeline], leads: current.leads.map((lead) => lead.id === selected.id ? { ...lead, lastActivity: 'Just now · preview' } : lead) }));
    setStatus(kind === 'note' ? 'Preview note added to the lead timeline.' : 'Preview disposition recorded.');
    setNote('');
  }

  function simulateInbound() {
    if (!demoEnabled) return;
    const id = `lead-demo-${workspace.leads.filter((lead) => lead.id.startsWith('lead-demo-')).length + 1}`;
    const intakeLead: DemoLead = {
      id,
      name: 'Sam Harper · Demo',
      phone: '(555) 010-0444',
      email: 'sam.harper@example.test',
      state: 'CA',
      age: 65,
      source: 'Facebook Lead Form · Simulated webhook',
      stage: 'New',
      assignedTo: workspace.agents[0]?.name || 'Unassigned',
      score: 86,
      consent: 'Documented',
      callbackAt: 'Today · next available block',
      lastActivity: 'Just now · simulated intake',
      tags: ['inbound', 'simulated'],
    };
    setWorkspace((current) => ({
      ...current,
      leads: [intakeLead, ...current.leads],
      timeline: [{ id: `evt-intake-${workspace.timeline.length + 1}`, leadId: id, kind: 'note', title: 'Simulated inbound intake', detail: 'Fictional Facebook lead event was added locally. No webhook or Sheets adapter was called.', at: 'Just now · preview' }, ...current.timeline],
    }));
    setSelectedId(id);
    setStatus('Simulated inbound lead added locally. The real Sheets/webhook adapter remains unconfigured.');
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><Eyebrow>Pipeline command</Eyebrow><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Leads</h1><p className="mt-1 text-sm text-slate-400">One fictional lead record for calls, texts, notes, quotes, ownership, and next action.</p></div>
      <button type="button" onClick={simulateInbound} disabled={!demoEnabled} className="rounded-md bg-red-500 px-3 py-2 text-xs font-bold text-white shadow-[0_8px_22px_rgba(239,68,68,0.18)] hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">+ Simulate FB lead intake</button>
    </div>
    <Panel className="p-3"><div className="flex flex-wrap items-center gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search lead, phone, source, or agent" className="min-w-[220px] flex-1 rounded-md border border-white/[0.12] bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-600" /><select value={stage} onChange={(event) => setStage(event.target.value as LeadStage | 'All')} className="rounded-md border border-white/[0.12] bg-black/25 px-3 py-2 text-xs text-slate-200"><option>All</option>{STAGES.map((value) => <option key={value}>{value}</option>)}</select><div className="ml-auto flex rounded-md border border-white/[0.1] p-0.5"><button type="button" onClick={() => setMode('list')} className={`rounded px-2 py-1.5 text-[10px] font-bold uppercase ${mode === 'list' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>List</button><button type="button" onClick={() => setMode('kanban')} className={`rounded px-2 py-1.5 text-[10px] font-bold uppercase ${mode === 'kanban' ? 'bg-red-500 text-white' : 'text-slate-500'}`}>Kanban</button></div></div><DisabledHint demoEnabled={demoEnabled} /></Panel>
    {status ? <div role="status" className="rounded-md border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-xs text-red-100">{status}</div> : null}

    {mode === 'kanban' ? <div className="grid gap-3 overflow-x-auto xl:grid-cols-6">{STAGES.map((column) => <Panel key={column} className="min-w-[210px] p-3"><div className="flex items-center justify-between"><StagePill stage={column} /><span className="text-xs text-slate-600">{leads.filter((lead) => lead.stage === column).length}</span></div><div className="mt-3 space-y-2">{leads.filter((lead) => lead.stage === column).map((lead) => <button type="button" key={lead.id} onClick={() => setSelectedId(lead.id)} className={`w-full rounded-md border p-3 text-left transition ${lead.id === selected?.id ? 'border-red-400/50 bg-red-500/[0.09]' : 'border-white/[0.08] bg-black/20 hover:border-white/20'}`}><LeadName lead={lead} /><p className="mt-3 text-[10px] font-semibold text-slate-500">{lead.callbackAt}</p></button>)}{!leads.some((lead) => lead.stage === column) ? <p className="py-4 text-center text-xs text-slate-600">No records</p> : null}</div></Panel>)}</div> : <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><Panel className="overflow-hidden"><div className="grid grid-cols-[minmax(160px,1.3fr)_100px_118px_120px_40px] gap-3 border-b border-white/[0.08] px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600"><span>Lead</span><span>Stage</span><span>Owner</span><span>Next action</span><span /></div>{leads.map((lead) => <button type="button" key={lead.id} onClick={() => setSelectedId(lead.id)} className={`grid w-full grid-cols-[minmax(160px,1.3fr)_100px_118px_120px_40px] gap-3 border-b border-white/[0.055] px-4 py-3 text-left transition last:border-0 ${lead.id === selected?.id ? 'bg-red-500/[0.08]' : 'hover:bg-white/[0.025]'}`}><LeadName lead={lead} /><span className="self-center"><StagePill stage={lead.stage} /></span><span className="self-center truncate text-xs text-slate-400">{lead.assignedTo}</span><span className="self-center text-xs text-slate-500">{lead.callbackAt}</span><span className="self-center text-right text-red-300">›</span></button>)}{!leads.length ? <p className="p-6 text-sm text-slate-500">No fictional leads match this filter.</p> : null}</Panel>
      <LeadDetail lead={selected} timeline={selectedTimeline} quotes={selectedQuotes} agents={workspace.agents.map((agent) => agent.name)} note={note} setNote={setNote} disposition={disposition} setDisposition={setDisposition} onAssign={(assignedTo) => selected && updateLead(selected.id, { assignedTo })} onStage={(nextStage) => selected && updateLead(selected.id, { stage: nextStage })} onNote={() => addTimeline('note', 'Preview note', note)} onDisposition={() => addTimeline('disposition', disposition, `Disposition: ${disposition}`)} disabled={!demoEnabled} /></div>}
    {mode === 'kanban' && selected ? <LeadDetail lead={selected} timeline={selectedTimeline} quotes={selectedQuotes} agents={workspace.agents.map((agent) => agent.name)} note={note} setNote={setNote} disposition={disposition} setDisposition={setDisposition} onAssign={(assignedTo) => updateLead(selected.id, { assignedTo })} onStage={(nextStage) => updateLead(selected.id, { stage: nextStage })} onNote={() => addTimeline('note', 'Preview note', note)} onDisposition={() => addTimeline('disposition', disposition, `Disposition: ${disposition}`)} disabled={!demoEnabled} /> : null}
  </div>;
}

function LeadDetail({ lead, timeline, quotes, agents, note, setNote, disposition, setDisposition, onAssign, onStage, onNote, onDisposition, disabled }: { lead: DemoLead | null; timeline: Array<{ id: string; kind: string; title: string; detail: string; at: string }>; quotes: Array<{ id: string; carrier: string; faceAmount: number; monthlyPremium: number; tier: string }>; agents: string[]; note: string; setNote: (value: string) => void; disposition: string; setDisposition: (value: string) => void; onAssign: (value: string) => void; onStage: (value: LeadStage) => void; onNote: () => void; onDisposition: () => void; disabled: boolean }) {
  if (!lead) return <Panel className="p-5 text-sm text-slate-500">Select a lead to open its preview record.</Panel>;
  return <Panel className="p-4"><div className="flex items-start justify-between gap-3"><div><Eyebrow>Lead record</Eyebrow><h2 className="mt-2 text-lg font-semibold text-white">{lead.name}</h2><p className="mt-1 text-xs text-slate-500">{lead.phone} · {lead.email}</p></div><StagePill stage={lead.stage} /></div><div className="mt-4 grid grid-cols-2 gap-2"><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Assigned agent<select value={lead.assignedTo} onChange={(event) => onAssign(event.target.value)} disabled={disabled} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-slate-200">{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Pipeline stage<select value={lead.stage} onChange={(event) => onStage(event.target.value as LeadStage)} disabled={disabled} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-slate-200">{STAGES.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="mt-4 rounded-md border border-white/[0.08] bg-black/20 p-3"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-600">Permission & next action</p><p className="mt-2 text-xs text-slate-300">Consent: <span className={lead.consent === 'Documented' ? 'text-emerald-300' : 'text-amber-200'}>{lead.consent}</span> · {lead.callbackAt}</p></div><div className="mt-4"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-red-300">Timeline</p><div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">{timeline.map((event) => <div key={event.id} className="rounded-md border border-white/[0.07] bg-black/20 p-2.5"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-red-200">{event.kind}</span><span className="text-[10px] text-slate-600">{event.at}</span></div><p className="mt-1 text-xs font-semibold text-slate-200">{event.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p></div>)}{!timeline.length ? <p className="py-4 text-center text-xs text-slate-600">No timeline activity yet.</p> : null}</div></div><div className="mt-4"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-red-300">Saved quotes</p><div className="mt-2 space-y-2">{quotes.map((quote) => <div key={quote.id} className="flex justify-between rounded-md border border-white/[0.07] bg-black/20 px-3 py-2 text-xs"><span className="text-slate-300">{quote.carrier} · {quote.tier}</span><span className="text-red-100">{money(quote.faceAmount)} / {money(quote.monthlyPremium)} mo</span></div>)}{!quotes.length ? <p className="text-xs text-slate-600">No preview quotes saved.</p> : null}</div></div><div className="mt-4 border-t border-white/[0.08] pt-4"><textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={disabled} placeholder="Add a private preview note…" className="min-h-20 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-xs text-white placeholder:text-slate-600" /><div className="mt-2 flex gap-2"><button type="button" disabled={disabled || !note.trim()} onClick={onNote} className="rounded-md border border-red-400/35 px-2.5 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/10 disabled:opacity-40">Add note</button><select value={disposition} onChange={(event) => setDisposition(event.target.value)} disabled={disabled} className="min-w-0 flex-1 rounded-md border border-white/[0.1] bg-black/25 px-2 text-xs text-slate-300"><option>Follow-up scheduled</option><option>No answer</option><option>Appointment set</option><option>Not interested</option></select><button type="button" onClick={onDisposition} disabled={disabled} className="rounded-md bg-white/[0.08] px-2.5 py-2 text-xs font-semibold text-white hover:bg-white/[0.13] disabled:opacity-40">Log</button></div></div></Panel>;
}

type QuoteProduct = 'Final Expense' | 'Term';

export function SmartQuoterView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [leadId, setLeadId] = useState(workspace.leads[0]?.id || '');
  const [product, setProduct] = useState<QuoteProduct>('Final Expense');
  const [age, setAge] = useState('68');
  const [sex, setSex] = useState('Female');
  const [state, setState] = useState('CA');
  const [tobacco, setTobacco] = useState('No');
  const [faceAmount, setFaceAmount] = useState('10000');
  const [premiumGoal, setPremiumGoal] = useState('60');
  const [health, setHealth] = useState('No major concerns reported');
  const [term, setTerm] = useState('10');
  const [ranQuote, setRanQuote] = useState(false);
  const [saved, setSaved] = useState('');
  const inputAge = Math.max(18, Number(age) || 0);
  const face = Math.max(1000, Number(faceAmount) || 0);
  const healthMultiplier = health === 'Major condition / needs carrier review' ? 1.34 : health === 'Moderate condition' ? 1.16 : 1;
  const tobaccoMultiplier = tobacco === 'Yes' ? 1.23 : 1;
  const ageMultiplier = 0.72 + inputAge / 175;
  const sexMultiplier = sex === 'Male' ? 1.09 : 1;
  const stateMultiplier = state === 'CA' ? 1.04 : state === 'FL' ? 1.02 : 1;
  const termMultiplier = product === 'Term' ? ({ 10: 1, 20: 1.35, 30: 1.75 }[Number(term)] || 1) : 1;
  const rows = DEMO_RATE_TABLE.filter((row) => row.product === product).map((row) => {
    const monthlyPremium = Math.round(row.baseRate * face * healthMultiplier * tobaccoMultiplier * ageMultiplier * sexMultiplier * stateMultiplier * termMultiplier * 100) / 100;
    return { ...row, monthlyPremium, withinPremiumGoal: monthlyPremium <= Math.max(0, Number(premiumGoal) || 0), eligibility: health === 'Major condition / needs carrier review' ? 'Carrier review required' : 'Illustrative eligibility' };
  });
  const selectedLead = workspace.leads.find((lead) => lead.id === leadId);

  function saveQuote(carrier: string, tier: string, monthlyPremium: number) {
    if (!demoEnabled || !selectedLead) return;
    const quoteId = `quote-demo-${workspace.quotes.length + 1}`;
    setWorkspace((current) => ({
      ...current,
      quotes: [{ id: quoteId, leadId: selectedLead.id, leadName: selectedLead.name, carrier, product, tier, faceAmount: face, monthlyPremium, createdAt: 'Just now · preview' }, ...current.quotes],
      timeline: [{ id: `evt-quote-${workspace.timeline.length + 1}`, leadId: selectedLead.id, kind: 'quote', title: 'Illustrative quote saved', detail: `${carrier} · ${tier} · estimate only, confirm in an approved carrier illustration.`, at: 'Just now · preview' }, ...current.timeline],
      leads: current.leads.map((lead) => lead.id === selectedLead.id ? { ...lead, stage: 'Quoted', lastActivity: 'Just now · preview' } : lead),
    }));
    setSaved(`Saved an illustrative ${product.toLowerCase()} estimate to ${selectedLead.name}'s preview timeline.`);
  }

  return <div className="space-y-5"><div><Eyebrow>Licensed workflow · preview simulation</Eyebrow><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Smart Quoter</h1><p className="mt-1 text-sm text-slate-400">FEX and Term preparation using fictional rate rows. Every price is an estimate—not a carrier quote or illustration.</p></div><div className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]"><Panel className="p-4"><p className="text-sm font-semibold text-white">Quote intake</p><div className="mt-4 grid grid-cols-2 gap-3"><label className="col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">Save to lead<select value={leadId} onChange={(event) => setLeadId(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white">{workspace.leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name} · {lead.state}</option>)}</select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Product<select value={product} onChange={(event) => { setProduct(event.target.value as QuoteProduct); setRanQuote(false); }} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>Final Expense</option><option>Term</option></select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Age<input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white" /></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Sex<select value={sex} onChange={(event) => setSex(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>Female</option><option>Male</option></select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">State<select value={state} onChange={(event) => setState(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>CA</option><option>TX</option><option>FL</option></select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Tobacco<select value={tobacco} onChange={(event) => setTobacco(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>No</option><option>Yes</option></select></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Face amount<input inputMode="numeric" value={faceAmount} onChange={(event) => setFaceAmount(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white" /></label><label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Premium goal<input inputMode="numeric" value={premiumGoal} onChange={(event) => setPremiumGoal(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white" /></label>{product === 'Term' ? <label className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Term<select value={term} onChange={(event) => setTerm(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>10</option><option>20</option><option>30</option></select></label> : <span />}</div><label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-600">Health screening<select value={health} onChange={(event) => setHealth(event.target.value)} className="mt-1 w-full rounded-md border border-white/[0.1] bg-black/25 p-2 text-xs text-white"><option>No major concerns reported</option><option>Moderate condition</option><option>Major condition / needs carrier review</option></select></label><button type="button" onClick={() => setRanQuote(true)} className="mt-4 w-full rounded-md bg-red-500 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-400">Run illustrative quote</button><p className="mt-3 text-[11px] leading-5 text-slate-500">Inputs: age {age || '—'}, {sex.toLowerCase()}, {state}, tobacco {tobacco.toLowerCase()}, {money(face)}, premium goal {money(Number(premiumGoal) || 0)}{product === 'Term' ? `, ${term}-year term` : ''}.</p></Panel><div className="space-y-4"><Panel className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Eyebrow>Carrier comparison</Eyebrow><h2 className="mt-2 text-lg font-semibold text-white">{ranQuote ? `${rows.length} illustrative options` : 'Complete the intake to compare'}</h2></div><span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-100">Not carrier-approved</span></div>{ranQuote ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-white/[0.08] text-[9px] font-black uppercase tracking-[0.13em] text-slate-600"><tr><th className="px-2 py-2">Illustrative carrier</th><th className="px-2 py-2">Tier</th><th className="px-2 py-2">Eligibility</th><th className="px-2 py-2">Estimate / mo</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.carrier} className="border-b border-white/[0.055] last:border-0"><td className="px-2 py-3 font-semibold text-white">{row.carrier}</td><td className="px-2 py-3 text-slate-300">{row.tier}</td><td className="px-2 py-3 text-slate-500">{row.eligibility}</td><td className="px-2 py-3 font-semibold text-red-100">{money(row.monthlyPremium)}</td><td className="px-2 py-3 text-right"><button type="button" onClick={() => saveQuote(row.carrier, row.tier, row.monthlyPremium)} disabled={!demoEnabled || !selectedLead} className="rounded-md border border-red-400/35 px-2 py-1.5 text-[10px] font-bold text-red-100 hover:bg-red-500/10 disabled:opacity-40">Save to lead</button></td></tr>)}</tbody></table></div> : <p className="mt-8 rounded-md border border-dashed border-white/[0.1] p-5 text-sm text-slate-500">The preview rate table has fictional rows only. Enter the lead facts, then run the calculation to test the flow.</p>}<p className="mt-4 text-[11px] leading-5 text-amber-100/75">Estimate only — confirm with an approved carrier quote/illustration and the licensed-agent workflow before presenting any option.</p></Panel>{saved ? <div role="status" className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2 text-xs text-emerald-100">{saved}</div> : null}</div></div></div>;
}

export function LogSaleView({ workspace, setWorkspace, demoEnabled }: CommandViewProps) {
  const [leadId, setLeadId] = useState(workspace.leads[0]?.id || '');
  const [carrier, setCarrier] = useState('Harbor Mutual · illustrative');
  const [product, setProduct] = useState('Final Expense');
  const [faceAmount, setFaceAmount] = useState('10000');
  const [premium, setPremium] = useState('58');
  const [effectiveDate, setEffectiveDate] = useState('2026-12-01');
  const [status, setStatus] = useState<'Active' | 'Pending' | 'Lapse risk' | 'Draft'>('Pending');
  const [draftDate, setDraftDate] = useState('2026-11-24');
  const [writingNumber, setWritingNumber] = useState('DEMO-ACCT-104');
  const [saved, setSaved] = useState('');
  const lead = workspace.leads.find((item) => item.id === leadId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!demoEnabled || !lead) return;
    const monthlyPremium = Math.max(0, Number(premium) || 0);
    const face = Math.max(0, Number(faceAmount) || 0);
    const id = `pol-demo-${workspace.policies.length + 1}`;
    setWorkspace((current) => ({
      ...current,
      policies: [{ id, leadId: lead.id, client: lead.name, carrier, product, faceAmount: face, premium: monthlyPremium, annualPremium: Math.round(monthlyPremium * 12 * 100) / 100, effectiveDate, status, draftDate, writingNumber, lapseRisk: status === 'Lapse risk' }, ...current.policies],
      timeline: [{ id: `evt-sale-${workspace.timeline.length + 1}`, leadId: lead.id, kind: 'note', title: 'Preview sale logged', detail: `${product} · ${money(face)} face · ${money(monthlyPremium)} monthly. Fictional policy record only.`, at: 'Just now · preview' }, ...current.timeline],
      leads: current.leads.map((item) => item.id === lead.id ? { ...item, stage: status === 'Draft' ? item.stage : 'Closed', lastActivity: 'Just now · preview' } : item),
    }));
    setSaved(`Saved fictional policy ${id.slice(-6)}. Home and Book of Business totals now include it in this browser.`);
  }

  return <div className="space-y-5"><div><Eyebrow>Policy record · preview simulation</Eyebrow><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Log a Sale</h1><p className="mt-1 text-sm text-slate-400">Create a fictional policy record that feeds the preview KPIs and Book of Business.</p></div><div className="grid gap-5 xl:grid-cols-[minmax(0,720px)_1fr]"><Panel className="p-5"><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Client / lead<select value={leadId} onChange={(event) => setLeadId(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white">{workspace.leads.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.state}</option>)}</select></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Illustrative carrier<input value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Product<input value={product} onChange={(event) => setProduct(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Face amount<input inputMode="numeric" value={faceAmount} onChange={(event) => setFaceAmount(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Monthly premium<input inputMode="decimal" value={premium} onChange={(event) => setPremium(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Effective date<input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Policy status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white"><option>Active</option><option>Pending</option><option>Lapse risk</option><option>Draft</option></select></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Draft date<input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><label className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Writing number<input value={writingNumber} onChange={(event) => setWritingNumber(event.target.value)} className="mt-1.5 w-full rounded-md border border-white/[0.1] bg-black/25 p-2.5 text-sm text-white" /></label><div className="flex items-end"><button type="submit" disabled={!demoEnabled || !lead} className="w-full rounded-md bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">Save preview policy</button></div></form></Panel><Panel className="p-5"><Eyebrow>Record check</Eyebrow><h2 className="mt-2 text-lg font-semibold text-white">What this changes</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-400"><li>• Adds a fictional record to Book of Business.</li><li>• Recalculates the Home AP, policy, client, and lapse-risk KPIs in this browser.</li><li>• Adds a local timeline event to the selected lead.</li><li className="text-red-100">• Does not create a carrier policy, write number, application, bill, or external record.</li></ul><DisabledHint demoEnabled={demoEnabled} /></Panel></div>{saved ? <div role="status" className="rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">{saved}</div> : null}</div>;
}

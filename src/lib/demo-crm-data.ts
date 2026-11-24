export type LeadStage = 'New' | 'Contacted' | 'Quoted' | 'Appointment' | 'Application' | 'Closed';
export type AgentAvailability = 'AVAILABLE' | 'BREAK' | 'OFF';

export type DemoLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  age: number;
  source: string;
  stage: LeadStage;
  assignedTo: string;
  score: number;
  consent: 'Documented' | 'Needs review';
  callbackAt: string;
  lastActivity: string;
  tags: string[];
};

export type DemoTimelineItem = {
  id: string;
  leadId: string;
  kind: 'call' | 'text' | 'note' | 'quote' | 'disposition';
  title: string;
  detail: string;
  at: string;
};

export type DemoPolicy = {
  id: string;
  leadId: string;
  client: string;
  carrier: string;
  product: string;
  faceAmount: number;
  premium: number;
  annualPremium: number;
  effectiveDate: string;
  status: 'Active' | 'Pending' | 'Lapse risk' | 'Draft';
  draftDate: string;
  writingNumber: string;
  lapseRisk: boolean;
};

export type DemoQuote = {
  id: string;
  leadId: string;
  leadName: string;
  carrier: string;
  product: 'Final Expense' | 'Term';
  tier: string;
  faceAmount: number;
  monthlyPremium: number;
  createdAt: string;
};

export type DemoMessage = {
  id: string;
  leadId: string;
  body: string;
  at: string;
  direction: 'inbound' | 'outbound' | 'system';
};

export type DemoCall = {
  id: string;
  leadId: string;
  leadName: string;
  direction: 'Inbound' | 'Outbound';
  disposition: string;
  at: string;
  duration: string;
  note: string;
};

export type DemoAgent = {
  id: string;
  name: string;
  contractLevel: string;
  availability: AgentAvailability;
  weekAP: number;
  monthAP: number;
  policies: number;
  calls: number;
};

export type DemoRecruit = {
  id: string;
  name: string;
  email: string;
  stage: 'New' | 'Interview' | 'Contracting' | 'Activated';
  owner: string;
  updatedAt: string;
};

export type DemoAnnouncement = {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  pinned: boolean;
};

export type DemoResource = {
  id: string;
  title: string;
  category: string;
  summary: string;
  asOf: string;
  access: 'Agency' | 'Manager';
};

export type DemoTemplate = {
  id: string;
  title: string;
  channel: 'SMS' | 'Email';
  body: string;
  status: 'Draft' | 'Approved for preview';
};

export type DemoDialerLine = {
  line: 1 | 2 | 3;
  leadId?: string;
  state: 'Ready' | 'Previewing' | 'Wrap-up';
};

export type DemoWorkspace = {
  leads: DemoLead[];
  timeline: DemoTimelineItem[];
  policies: DemoPolicy[];
  quotes: DemoQuote[];
  messages: DemoMessage[];
  calls: DemoCall[];
  agents: DemoAgent[];
  recruits: DemoRecruit[];
  announcements: DemoAnnouncement[];
  resources: DemoResource[];
  templates: DemoTemplate[];
  availability: AgentAvailability;
  dialerLines: DemoDialerLine[];
};

export const DEMO_RATE_TABLE = [
  { carrier: 'Harbor Mutual · illustrative', product: 'Final Expense' as const, tier: 'Level', baseRate: 0.0049 },
  { carrier: 'Evergreen Life · illustrative', product: 'Final Expense' as const, tier: 'Graded', baseRate: 0.0058 },
  { carrier: 'Pioneer Benefit · illustrative', product: 'Term' as const, tier: 'Standard', baseRate: 0.0013 },
  { carrier: 'Pioneer Benefit · illustrative', product: 'Term' as const, tier: 'Preferred', baseRate: 0.001 },
];

const seed: DemoWorkspace = {
  leads: [
    { id: 'lead-001', name: 'Dana Cole', phone: '(555) 010-0142', email: 'dana.cole@example.test', state: 'CA', age: 68, source: 'Facebook Lead Form · Demo', stage: 'New', assignedTo: 'Jordan Rowe', score: 92, consent: 'Documented', callbackAt: 'Today · 10:30 AM', lastActivity: '8 min ago', tags: ['FEX', 'inbound'] },
    { id: 'lead-002', name: 'Morgan Reyes', phone: '(555) 010-0188', email: 'morgan.reyes@example.test', state: 'TX', age: 61, source: 'Website Intake · Demo', stage: 'Contacted', assignedTo: 'Avery Stone', score: 84, consent: 'Documented', callbackAt: 'Today · 1:15 PM', lastActivity: '22 min ago', tags: ['term', 'callback'] },
    { id: 'lead-003', name: 'Riley Foster', phone: '(555) 010-0214', email: 'riley.foster@example.test', state: 'FL', age: 72, source: 'Facebook Lead Form · Demo', stage: 'Quoted', assignedTo: 'Jordan Rowe', score: 88, consent: 'Documented', callbackAt: 'Tomorrow · 9:00 AM', lastActivity: 'Yesterday', tags: ['FEX', 'quoted'] },
    { id: 'lead-004', name: 'Alex Morgan', phone: '(555) 010-0246', email: 'alex.morgan@example.test', state: 'CA', age: 59, source: 'Referral · Demo', stage: 'Appointment', assignedTo: 'Maya Ellis', score: 76, consent: 'Needs review', callbackAt: 'Today · 3:30 PM', lastActivity: 'Yesterday', tags: ['term', 'appointment'] },
    { id: 'lead-005', name: 'Casey Brooks', phone: '(555) 010-0271', email: 'casey.brooks@example.test', state: 'TX', age: 70, source: 'Facebook Lead Form · Demo', stage: 'Application', assignedTo: 'Avery Stone', score: 81, consent: 'Documented', callbackAt: 'Friday · 11:00 AM', lastActivity: '2 days ago', tags: ['FEX', 'application'] },
    { id: 'lead-006', name: 'Taylor Quinn', phone: '(555) 010-0305', email: 'taylor.quinn@example.test', state: 'FL', age: 64, source: 'Website Intake · Demo', stage: 'Closed', assignedTo: 'Maya Ellis', score: 94, consent: 'Documented', callbackAt: 'Follow-up in 30 days', lastActivity: 'Nov 20', tags: ['FEX', 'client'] },
    { id: 'lead-007', name: 'Jamie Park', phone: '(555) 010-0336', email: 'jamie.park@example.test', state: 'CA', age: 66, source: 'Facebook Lead Form · Demo', stage: 'New', assignedTo: 'Jordan Rowe', score: 73, consent: 'Documented', callbackAt: 'Today · 4:00 PM', lastActivity: '35 min ago', tags: ['FEX'] },
    { id: 'lead-008', name: 'Parker Sloan', phone: '(555) 010-0399', email: 'parker.sloan@example.test', state: 'TX', age: 57, source: 'Referral · Demo', stage: 'Contacted', assignedTo: 'Avery Stone', score: 69, consent: 'Needs review', callbackAt: 'Tomorrow · 2:00 PM', lastActivity: '3 hours ago', tags: ['term'] },
  ],
  timeline: [
    { id: 'evt-001', leadId: 'lead-001', kind: 'text', title: 'Inbound web reply', detail: 'Asked for a morning call after reviewing the final expense guide.', at: 'Today · 9:42 AM' },
    { id: 'evt-002', leadId: 'lead-001', kind: 'call', title: 'Inbound call queued', detail: 'Demo call routing event. No provider call was placed.', at: 'Today · 9:38 AM' },
    { id: 'evt-003', leadId: 'lead-003', kind: 'quote', title: 'Illustrative quote saved', detail: 'Final Expense · $10,000 face amount · confirm with carrier illustration.', at: 'Yesterday · 4:15 PM' },
    { id: 'evt-004', leadId: 'lead-004', kind: 'note', title: 'Appointment note', detail: 'Requested spouse to join a short needs review.', at: 'Yesterday · 2:10 PM' },
    { id: 'evt-005', leadId: 'lead-005', kind: 'disposition', title: 'Application follow-up', detail: 'Requested missing beneficiary details. Demo-only timeline event.', at: 'Nov 21 · 11:00 AM' },
    { id: 'evt-006', leadId: 'lead-002', kind: 'call', title: 'Outbound attempt', detail: 'Left a compliant callback request in the preview simulation.', at: 'Today · 8:55 AM' },
  ],
  policies: [
    { id: 'pol-001', leadId: 'lead-006', client: 'Taylor Quinn', carrier: 'Harbor Mutual · illustrative', product: 'Final Expense', faceAmount: 10000, premium: 58.4, annualPremium: 700.8, effectiveDate: '2026-11-01', status: 'Active', draftDate: '2026-10-27', writingNumber: 'DEMO-ACCT-104', lapseRisk: false },
    { id: 'pol-002', leadId: 'lead-005', client: 'Casey Brooks', carrier: 'Evergreen Life · illustrative', product: 'Final Expense', faceAmount: 8000, premium: 54.2, annualPremium: 650.4, effectiveDate: '2026-12-01', status: 'Pending', draftDate: '2026-11-19', writingNumber: 'DEMO-ACCT-104', lapseRisk: false },
    { id: 'pol-003', leadId: 'lead-003', client: 'Riley Foster', carrier: 'Harbor Mutual · illustrative', product: 'Final Expense', faceAmount: 12000, premium: 71.3, annualPremium: 855.6, effectiveDate: '2026-10-01', status: 'Lapse risk', draftDate: '2026-09-26', writingNumber: 'DEMO-ACCT-104', lapseRisk: true },
    { id: 'pol-004', leadId: 'lead-002', client: 'Morgan Reyes', carrier: 'Pioneer Benefit · illustrative', product: '10-year Term', faceAmount: 100000, premium: 39.8, annualPremium: 477.6, effectiveDate: '2026-11-15', status: 'Active', draftDate: '2026-11-10', writingNumber: 'DEMO-ACCT-208', lapseRisk: false },
    { id: 'pol-005', leadId: 'lead-004', client: 'Alex Morgan', carrier: 'Pioneer Benefit · illustrative', product: '20-year Term', faceAmount: 150000, premium: 62.5, annualPremium: 750, effectiveDate: '2026-12-15', status: 'Draft', draftDate: '2026-11-23', writingNumber: 'DEMO-ACCT-208', lapseRisk: false },
  ],
  quotes: [
    { id: 'quote-001', leadId: 'lead-003', leadName: 'Riley Foster', carrier: 'Harbor Mutual · illustrative', product: 'Final Expense', tier: 'Level', faceAmount: 10000, monthlyPremium: 61.5, createdAt: 'Yesterday · 4:15 PM' },
    { id: 'quote-002', leadId: 'lead-002', leadName: 'Morgan Reyes', carrier: 'Pioneer Benefit · illustrative', product: 'Term', tier: 'Standard', faceAmount: 100000, monthlyPremium: 37.2, createdAt: 'Today · 8:41 AM' },
  ],
  messages: [
    { id: 'msg-001', leadId: 'lead-001', body: 'Hi, I submitted the request. Mornings are best for me.', at: '9:42 AM', direction: 'inbound' },
    { id: 'msg-002', leadId: 'lead-001', body: 'Thanks, Dana. I have you down for a quick review this morning.', at: '9:44 AM', direction: 'outbound' },
    { id: 'msg-003', leadId: 'lead-002', body: 'Reminder set: return Morgan’s call at 1:15 PM.', at: '8:56 AM', direction: 'system' },
    { id: 'msg-004', leadId: 'lead-003', body: 'Please email the estimate when you have a minute.', at: 'Yesterday', direction: 'inbound' },
    { id: 'msg-005', leadId: 'lead-004', body: 'Appointment prep note saved — no message was sent.', at: 'Yesterday', direction: 'system' },
  ],
  calls: [
    { id: 'call-001', leadId: 'lead-001', leadName: 'Dana Cole', direction: 'Inbound', disposition: 'Queued', at: 'Today · 9:38 AM', duration: '—', note: 'Demo inbound lead is ready for agent review.' },
    { id: 'call-002', leadId: 'lead-002', leadName: 'Morgan Reyes', direction: 'Outbound', disposition: 'Callback', at: 'Today · 8:55 AM', duration: '00:42', note: 'Preview dialer event; no carrier connection occurred.' },
    { id: 'call-003', leadId: 'lead-004', leadName: 'Alex Morgan', direction: 'Outbound', disposition: 'Appointment set', at: 'Yesterday · 2:04 PM', duration: '03:18', note: 'Appointment entered from demo workflow.' },
  ],
  agents: [
    { id: 'agent-001', name: 'Jordan Rowe', contractLevel: 'Senior Agent · Demo', availability: 'AVAILABLE', weekAP: 1860, monthAP: 5230, policies: 7, calls: 61 },
    { id: 'agent-002', name: 'Avery Stone', contractLevel: 'Agent · Demo', availability: 'BREAK', weekAP: 1320, monthAP: 4105, policies: 5, calls: 49 },
    { id: 'agent-003', name: 'Maya Ellis', contractLevel: 'Agent · Demo', availability: 'AVAILABLE', weekAP: 1180, monthAP: 3670, policies: 4, calls: 42 },
    { id: 'agent-004', name: 'Devon Lane', contractLevel: 'Trainee · Demo', availability: 'OFF', weekAP: 540, monthAP: 1640, policies: 2, calls: 31 },
  ],
  recruits: [
    { id: 'rec-001', name: 'Blair Hart', email: 'blair.hart@example.test', stage: 'New', owner: 'Jordan Rowe', updatedAt: 'Today' },
    { id: 'rec-002', name: 'Cameron Wells', email: 'cameron.wells@example.test', stage: 'Interview', owner: 'Avery Stone', updatedAt: 'Today' },
    { id: 'rec-003', name: 'Robin Chen', email: 'robin.chen@example.test', stage: 'Contracting', owner: 'Maya Ellis', updatedAt: 'Yesterday' },
    { id: 'rec-004', name: 'Sidney Lee', email: 'sidney.lee@example.test', stage: 'Activated', owner: 'Jordan Rowe', updatedAt: 'Nov 20' },
  ],
  announcements: [
    { id: 'ann-001', title: 'Preview operating rules', body: 'Every record on this preview is fictional. Messaging and calling are intentionally disabled.', author: 'Command Center', createdAt: 'Today · 8:00 AM', pinned: true },
    { id: 'ann-002', title: 'Wednesday coaching block', body: 'Demo calendar placeholder: review discovery notes and clean follow-up tasks before your next call block.', author: 'Jordan Rowe', createdAt: 'Yesterday', pinned: true },
    { id: 'ann-003', title: 'Resource library is illustrative', body: 'The Trello export is not attached to this preview. Do not treat preview cards as carrier guidance.', author: 'Command Center', createdAt: 'Nov 21', pinned: false },
  ],
  resources: [
    { id: 'res-001', title: 'Final Expense Discovery Framework · Demo', category: 'Script', summary: 'Illustrative intake checkpoints: consent, goal, budget, beneficiary, and next action.', asOf: 'Nov 2026 · demo card', access: 'Agency' },
    { id: 'res-002', title: 'Call Consent & DNC Checklist · Demo', category: 'Compliance', summary: 'Preview-only checklist for consent, local calling window, and recordkeeping prompts.', asOf: 'Nov 2026 · demo card', access: 'Agency' },
    { id: 'res-003', title: 'Carrier Directory Placeholder · Demo', category: 'Carrier info', summary: 'No real carrier phones, e-apps, or underwriting rules have been imported into this preview.', asOf: 'Nov 2026 · demo card', access: 'Agency' },
    { id: 'res-004', title: 'Agent Onboarding Scorecard · Demo', category: 'Training', summary: 'Illustrative manager checklist for recruiting milestones and first-call readiness.', asOf: 'Nov 2026 · demo card', access: 'Manager' },
  ],
  templates: [
    { id: 'tmpl-001', title: 'New lead acknowledgement · Demo', channel: 'SMS', body: 'Hi {{first_name}}, thanks for requesting information. What time works for a quick review?', status: 'Approved for preview' },
    { id: 'tmpl-002', title: 'Callback reminder · Demo', channel: 'SMS', body: 'Hi {{first_name}}, this is a preview template. Please reply STOP to opt out.', status: 'Draft' },
    { id: 'tmpl-003', title: 'Appointment confirmation · Demo', channel: 'Email', body: 'Your requested review is scheduled. This is illustrative preview copy only.', status: 'Draft' },
  ],
  availability: 'AVAILABLE',
  dialerLines: [
    { line: 1, leadId: 'lead-001', state: 'Previewing' },
    { line: 2, leadId: 'lead-002', state: 'Ready' },
    { line: 3, state: 'Ready' },
  ],
};

export function createDemoWorkspace(): DemoWorkspace {
  return structuredClone(seed);
}

export function createEmptyWorkspace(): DemoWorkspace {
  return {
    leads: [], timeline: [], policies: [], quotes: [], messages: [], calls: [], agents: [], recruits: [], announcements: [], resources: [], templates: [], availability: 'OFF', dialerLines: [{ line: 1, state: 'Ready' }, { line: 2, state: 'Ready' }, { line: 3, state: 'Ready' }],
  };
}

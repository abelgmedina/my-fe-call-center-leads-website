# Upline Command Product Roadmap

## Product contract

Upline Command is an original, navy/blue/white insurance operations platform.
It takes inspiration from the useful **categories** of a leading agency CRM, but
does not copy another company's branding, UI, scripts, carrier rules, pricing,
compensation grids, or private workflow details.

The product is designed around one durable lead record: source, contact
permission, conversation timeline, quote preparation, pipeline, tasks, agent
assignment, call attempts, coaching, and outcome all belong together.

## Current foundation

- The authenticated `uplineagent.com/dashboard` now provides the Upline Command
  front/back-office shell in Upline's dark navy visual system.
- The front office exposes Home, Smart Quoter, Recruiting, Leads, Messaging,
  Dialer, Power Dialer, Messaging Setup, Leaderboard, Announcements, and
  Resources.
- The back office exposes Agency Control, Agent Approvals, Lead Catalog, Call
  Queue, and System Health.
- Existing lead pipeline, approvals, operations, and call-center pages remain
  behind their existing server-side owner gates.
- The three-lane dialer is still a preflight interface. It is not live calling.

## Capability map

| Command area | Upline outcome | Delivery rule |
| --- | --- | --- |
| Command home | Daily scorecard, next action, queue, availability, health | Read from durable CRM projections, not browser-only state. |
| Leads and pipeline | Contacts, households, source attribution, assignments, stages, tasks, notes, documents | Preserve workspace isolation and lead-source lanes. |
| Smart Quoter | Intake, eligibility notes, approved carrier-material lookup, application/follow-up workflow | Never create or present a premium without a licensed-agent workflow and approved carrier/rater data. |
| Messaging | Shared SMS/email/inbox timeline, templates, campaigns, automations, opt-out/suppression handling | Keep sending fail-closed until sender identity, consent, provider, and delivery tests pass. |
| Calendar and booking | Personal/team scheduling, booking links, appointment reminders, callbacks | Use verified calendar integrations and write confirmations to the lead timeline. |
| Recruiting | Candidate funnel, invite/onboarding, contracting milestones, agent activation | Never auto-elevate a self-service account or expose other agents' data. |
| Inbound voice | Caller match, queue, presence, transfer, disposition, transcript/recording references | Enable only after provider callbacks, signature checks, disclosures, and durable state pass live tests. |
| 1–3 lane power dialer | Atomic queue reservation, lane state, compliant dial attempts, wrap-up and retry logic | Block every dial without exact-number consent/DNC/window/readiness/abandonment checks. |
| Leaderboard and reporting | Verified activity, conversion, pipeline, and team metrics | Derive from source events; never invent production or compensation numbers. |
| Resources and coaching | Carrier-approved guides, scripts, training, assignments, coaching records | Owner-published materials only; no sensitive application data in ordinary notes. |
| Agency growth tools | Original landing pages/forms, email builder, automations, analytics, social/reputation, invoices, courses | Each provider integration ships only after its own auth, storage, and end-to-end test gate. |

## Data authority

`upline-crm` and its Supabase project are the target durable system of record.
The legacy call-center prototype's Vercel `/tmp` SQLite and GitHub JSON stores
must not become the authority for leads, compliance, queues, or calls.

See `upline-crm/docs/UPLINE_COMMAND_DATA_MODEL.md` for the additive migration
sequence and RLS boundary.

## Release sequence

1. Ship the safe Upline Command shell and route existing owner-only workspaces
   through it.
2. Add Supabase-backed resources, announcements, recruiting candidates, and
   quote-preparation workspaces with row-level security.
3. Migrate CRM projections and lead intake to the shared model; prove owner,
   agent, anonymous, and service-role access boundaries.
4. Add calendar, inbox, templates, campaigns, and automation capability behind
   verified provider gates.
5. Move inbound queues and dial attempts to durable Supabase records; test
   one lane with a controlled number before two and three lanes.
6. Add growth tooling, social/reputation, invoicing, courses, and reporting
   once each provider/data dependency is explicitly verified.

## Non-negotiable controls

- UI visibility is never authorization.
- New accounts get the lowest privilege by default.
- No live send/call action is enabled because a button or feature flag exists.
- DNC, consent, local calling window, recording consent, provider health, and
  lane/abandonment checks run again immediately before a call is placed.
- Provider tokens, application data, recording audio, and raw webhook payloads
  stay out of browser code and normal CRM text fields.

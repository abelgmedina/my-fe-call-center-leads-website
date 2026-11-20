# UplineAgent CRM Rebuild — Step 0 Audit

**Audit date:** 2026-11-19  
**In-scope product:** <https://uplineagent.com> only. The separate <code>crm.uplineagent.com</code> project is not part of this rebuild.  
**Method:** read-only source, Git, Vercel, DNS, and public-route checks; a local hosted-runtime simulation with the Mac-only Sheets CLI unavailable. No production configuration, DNS, Twilio, Zapier, or payment settings were changed.

## Executive finding

The current product is a Next.js portal and single-agent call-center prototype, not yet a durable multi-agent CRM. Its most immediate production failure is architectural: operational routes depend on a locally authenticated <code>gog</code> executable and SQLite files, while production runs on Vercel serverless functions. Vercel does not have that executable and its local filesystem is ephemeral.

The reported Ops crashes are reproducible:

1. an Ops API invokes <code>gog</code>;
2. hosted runtime cannot spawn it (<code>ENOENT</code>);
3. <code>src/lib/gog.ts</code> blindly parses empty stdout;
4. the API returns a blank 500 response;
5. SSR pages and Ops Admin blindly call <code>response.json()</code> and throw the generic Next error screen.

This is the first P0 work item. The public anonymous routes currently redirect safely to login, so an unauthenticated fetch does not prove an authenticated Ops page works.

## Repository and release safety

| Item | Verified state |
|---|---|
| Canonical production source | <code>/Users/agm/.openclaw/workspace-fe-call-center/twilio-call-center-production-main</code> |
| Production commit | <code>ada6704</code>, matching <code>origin/main</code> |
| Dedicated rebuild worktree | <code>/Users/agm/.openclaw/workspace-fe-call-center/twilio-call-center-crm-rebuild</code> on branch <code>crm-rebuild</code>, created from <code>origin/main</code> |
| Do not build from | <code>/Users/agm/.openclaw/workspace-fe-call-center/twilio-call-center</code>: stale local <code>main</code> at <code>e210600</code> and already dirty with unrelated files |
| Current rebuild worktree | Clean before this audit document |
| Git hygiene | No force-pushes, production deploys, or external provider changes made |

## Stack

| Area | Current implementation |
|---|---|
| Framework/router | Next.js 16.1.6 using the App Router under <code>src/app</code> |
| Language/UI | TypeScript 5, React 19.2.3, Tailwind CSS 4 |
| Package manager | npm, confirmed by <code>package-lock.json</code> |
| Node | Host has Node 22.22.0; README says Node 20+; no <code>.nvmrc</code>, <code>.node-version</code>, or <code>engines</code> pin exists |
| Server libraries | Twilio Voice/SMS SDK, Twilio Voice JS SDK, Resend, Stripe REST calls, better-sqlite3 |
| Tests/CI | No unit/e2e test suite, no test script, no Playwright/Vitest/Jest configuration, and no GitHub Actions workflow |
| Current checks | <code>npm run build</code> passes; baseline <code>npm run lint</code> fails with 165 errors and 57 warnings |

## Route map

### Browser routes

| Route | Current behavior |
|---|---|
| <code>/</code> | Redirects to <code>/agent/login</code> |
| <code>/agent/login</code> | Upline Agent AI login/marketing entry, contact form, links to marketplace and signup |
| <code>/agent/signup</code> | Restricted portal-account signup |
| <code>/agent</code>, <code>/agent/home</code> | Redirect to <code>/dashboard</code> |
| <code>/agent/profile</code> | Authenticated restricted-agent profile |
| <code>/agent/reset</code> | Temporary owner reset form; only usable with an active server-side recovery token |
| <code>/dashboard</code> | Role-aware Upline Command surface; internal owner/buyer/restricted portal variants |
| <code>/buyer/marketplace</code> | Buyer-only marketplace |
| <code>/buyer/admin/agents</code> | Buyer-admin agent management |
| <code>/buyer/onboarding</code> | Redirects to dashboard |
| <code>/buyer/reports</code> | Redirects to marketplace |
| <code>/lead-marketplace-preview</code> | Public marketplace preview component |
| <code>/ops</code> | Owner Ops dashboard backed by Google Sheets |
| <code>/ops/pipeline</code> | Owner pipeline/Kanban backed by Google Sheets |
| <code>/ops/call-queue</code> | Owner call queue backed by Google Sheets |
| <code>/ops/dialer</code> | Owner dialer panel backed by the call queue |
| <code>/ops/calls</code> | Owner calls table |
| <code>/ops/leads/:lead_id</code> | Owner lead detail/editor |
| <code>/ops/agents</code> | Owner agent presence/management dashboard |
| <code>/ops/agent-approvals</code> | Owner agent-application approvals |
| <code>/ops/lead-purchase</code> | Owner lead-marketplace purchase workspace |
| <code>/ops/admin</code> | Owner Ops Admin and department-health panel |
| <code>/owner/setup</code> | One-time owner password setup form |
| <code>/take</code> | Legacy SMS magic-link call-take screen; has a Next 16 synchronous <code>searchParams</code> defect |
| <code>/privacy-policy</code>, <code>/terms-and-conditions</code> | Static legal pages |

### API route groups

| Prefix | Current responsibility |
|---|---|
| <code>/api/auth/*</code> | Login, logout, session lookup, owner setup and reset |
| <code>/api/agent/*</code> | Restricted signup/profile and call worksheet persistence |
| <code>/api/buyer/*</code> | Marketplace checkout, buyer onboarding, buyer-admin agent CRUD |
| <code>/api/contact</code> | Contact-form delivery through Resend |
| <code>/api/ops/*</code> | Approvals, agents/presence, leads, Sheets summary/Kanban/queue, calls, dialer, SMS, callbacks, coaching, department status |
| <code>/api/status</code> | Legacy single-agent availability state |
| <code>/api/take/*</code> | Legacy magic-link validation and call acceptance |
| <code>/api/twilio/*</code> | Voice token, inbound/outbound/hold/recording/status endpoints and inbound SMS |

Every API endpoint is implemented as an App Router route handler. There is no public <code>/api/health</code> or <code>/api/health/deps</code> yet.

## Data layer

| Data | Current implementation | Risk / migration requirement |
|---|---|---|
| Operational leads, pipeline, callbacks | Google Sheets accessed by the locally authenticated <code>gog</code> CLI | Cannot run in Vercel; must become a provider API/service-account adapter or a one-way export target |
| Local operational state | better-sqlite3 in <code>UPLINE_DATA_DIR</code>, otherwise <code>/tmp/uplineagent-data</code> on Vercel | Ephemeral serverless filesystem; not a system of record |
| Owner, buyer, and restricted-portal account records | GitHub Contents API JSON store when configured; SQLite fallback locally | Git commits can trigger deployments and this is not adequate CRM persistence |
| ORM/migrations | None; schema bootstraps and alters in <code>src/lib/db.ts</code> at runtime | Replace with versioned database migrations |

**P0 target database recommendation:** a dedicated Supabase Postgres project for UplineAgent, with an isolated preview database and a production database. It provides PostgreSQL, RLS for agent/downline boundaries, encrypted-column support for producer codes, and a clean migration path. It must not reuse or modify the separate legacy CRM project without a deliberate migration decision.

Google Sheets should remain only as an explicit one-way export/sync for existing Abel workflows; it cannot remain the CRM source of truth.

## Authentication and authorization

- Sessions are signed HMAC cookies using <code>AUTH_SECRET</code>.
- Current identity types are internal agent, buyer, and restricted self-service portal account.
- Owner-only access is enforced for the <code>/ops</code> area and sensitive Ops APIs; restricted portal accounts are blocked from those paths.
- Owner, buyer, and portal account state is resolved from the GitHub JSON store when configured, otherwise SQLite.
- The required P1 hierarchy (owner/admin, manager, agent, upline/downline scope, contract level) does not exist yet.
- The current temporary owner recovery variables remain in Production. Their values were not read. They are expired according to the prior recovery record and must be removed only after Abel confirms normal owner login, followed by a deploy and a failed-closed verification.

## Deployment, domain, and DNS

| Item | Verified state |
|---|---|
| Host | Vercel project <code>my-fe-call-center-leads-website</code> |
| Current production deployment | <code>dpl_CCmZhoenwR3nCJnHCQfW16nVnyGD</code>, ready and aliased to <code>https://uplineagent.com</code> |
| Public HTTPS | Vercel responds over HTTPS with HSTS |
| Production source revision | <code>ada6704</code> |
| Preview | A Vercel preview exists but is Vercel-SSO protected; unauthenticated preview rendering cannot be claimed verified |
| DNS observed | Apex resolves to a Vercel IP; <code>www</code> points at Vercel DNS |
| DNS authority observed | Namecheap registrar DNS nameservers, not Cloudflare nameservers |

The brief’s Cloudflare assumption is currently unverified and conflicts with observed nameservers. Do **not** move the domain or DNS. A future Workers deployment needs a Cloudflare account/token and an explicit DNS plan; it is not a safe inference from this repository.

## Environment variables

Names only; values were never read or copied.

| Area | Names read by code |
|---|---|
| Platform/runtime | <code>NODE_ENV</code>, <code>VERCEL</code>, <code>UPLINE_DATA_DIR</code>, <code>INTERNAL_BASE_URL</code> |
| Auth/accounts | <code>AUTH_SECRET</code>, <code>AGENTS_CONFIG_JSON</code>, <code>OWNER_LOGIN_EMAIL</code>, <code>OWNER_LOGIN_ENFORCED</code>, <code>OWNER_RESET_TOKEN</code>, <code>OWNER_RESET_EXPIRES_AT</code>, <code>OWNER_SETUP_TOKEN</code>, <code>OWNER_SETUP_EXPIRES_AT</code>, <code>GITHUB_DATA_TOKEN</code>, <code>GITHUB_DATA_REPO</code>, <code>GITHUB_DATA_PATH</code> |
| Ops/config | <code>OPS_API_KEY</code>, <code>MANAGER_AGENT_IDS</code>, <code>AGENT_IDENTITY</code>, <code>ABEL_FALLBACK_CELL</code>, <code>PUBLIC_BASE_URL</code> |
| Twilio | <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_API_KEY_SID</code>, <code>TWILIO_API_KEY_SECRET</code>, <code>TWILIO_TWIML_APP_SID</code>, <code>TWILIO_SMS_FROM</code>, <code>TWILIO_MESSAGING_SERVICE_SID</code>, <code>ALERT_TO</code> |
| Google Sheets/access requests | <code>GOG_ACCOUNT</code>, <code>AGENT_ACCESS_REQUESTS_SHEET_ID</code>, <code>AGENT_ACCESS_REQUESTS_SHEET_RANGE</code>, <code>AGENT_ACCESS_REQUESTS_WEBHOOK_URL</code> |
| Other services | <code>RESEND_API_KEY</code>, <code>STRIPE_SECRET_KEY</code> |

| Environment | Observed state |
|---|---|
| Dedicated <code>crm-rebuild</code> worktree | No <code>.env.local</code> exists |
| Production Vercel | Auth/GitHub-store/Ops/Resend variables are present by name. Current Twilio, public-base URL, Sheets/GOG, Stripe, and durable Postgres variables are absent by name. Temporary owner recovery/setup variables are still present by name. |
| Preview Vercel | No variables configured |
| Development Vercel | No variables configured |
| Stale local checkout | An ignored <code>.env.local</code> exists but was deliberately not read; that checkout is not the rebuild source |

There is no committed <code>.env.example</code>, even though the README refers to one. P0 will add a names-only file.

## External services

| Service | Use today | Audit finding |
|---|---|---|
| Twilio | Voice, SMS, Voice JS tokens | No webhook-signature validation found; live credentials/callback URL absent from Production |
| Google Sheets | Leads/pipeline/queue via <code>gog</code> CLI | Hosted runtime-incompatible; restore only through a supported hosted adapter and keep as sync/export |
| ngrok | README and Ops auto-repair assume it | Production must be detached from it; serverless cannot safely run <code>pkill</code>/<code>nohup ngrok</code> |
| GitHub Contents API | Durable JSON account store | Writes can alter the deploy repo and trigger Vercel production deploys |
| Resend | Contact form / optional messages | Production variable exists by name; no end-to-end delivery test was performed |
| Stripe | Lead-marketplace checkout | No Production variable by name; checkout remains blocked |
| Zapier/Apps Script | Optional access-request webhook only | No live Zap was inspected or changed |
| Sentry/error tracker | None | Add DSN-based structured error tracking in P0 |

## Reproduction of known failures

### Four crashing Ops pages

Reproduced locally from the clean production source with the <code>gog</code> executable deliberately unavailable, matching Vercel:

| Request | Result | Root code path |
|---|---|---|
| <code>/api/ops/summary</code>, <code>/api/ops/kanban</code>, <code>/api/ops/call/queue</code> | blank HTTP 500 | <code>src/lib/gog.ts</code> spawns absent <code>gog</code>, then unguarded <code>JSON.parse(stdout)</code> |
| <code>/ops</code>, <code>/ops/pipeline</code>, <code>/ops/call-queue</code>, <code>/ops/dialer</code> | generic Next 500 screen | Each server page throws after an internal API response is non-OK; no route boundary exists |
| Ops Admin Power Dialer Lane | <code>Unexpected end of JSON input</code> | <code>src/lib/ops-departments.ts</code> runs <code>await response.json()</code> against the blank 500 queue response |

With a locally authenticated <code>gog</code> binary available, the four pages render. This confirms the defect is a hosted-runtime dependency and unsafe error handling, not an inherent page-rendering error.

### Other confirmed gaps

- No <code>error.tsx</code>, <code>global-error.tsx</code>, loading, or not-found boundaries exist below <code>src/app</code>.
- <code>/take</code> has a Next 16 dynamic-API warning because it reads synchronous <code>searchParams.token</code>.
- The public production <code>/api/health</code> and <code>/api/health/deps</code> routes return 404.
- Existing <code>/api/ops/health</code> returns 403 without internal access and is not a public deployment health endpoint.
- Public anonymous checks show the existing authenticated pages redirect to login. That is safe behavior but does not verify the authenticated pages.
- The reported three dashboard-console errors could not be captured without an authenticated owner browser session. P0 will add a test fixture and reproduce them in a protected staging environment rather than use real credentials.
- The current lead-purchase presentation contains fictional queue/order examples that are not visibly marked DEMO. Those must be relabeled or removed in preview data.

## Privacy and secret review

- No tracked <code>.env</code>, PEM, key, or credential file was found.
- A scoped pattern scan found no obvious committed provider-token pattern. This is not a replacement for CI secret scanning; <code>gitleaks</code> is not installed.
- Existing source contains hardcoded external sheet identifiers and a personal fallback telephone value. Do not echo or preserve those as defaults in the CRM; move them to configuration/migrated data.
- Current code logs provider stderr in the <code>gog</code> wrapper. P0 must redact PII and secrets from all logs.

## Recommended target architecture

### P0/P1 safe path

1. Keep the current Next.js application on Vercel for an isolated staging preview while removing Vercel-incompatible code. It is already the live host and supports short request/response Twilio webhook endpoints.
2. Provision dedicated Supabase Postgres Preview and Production projects for UplineAgent. Add versioned migrations, server-side RLS enforcement, and a one-way Sheets export adapter.
3. Replace the local <code>gog</code> process with a hosted Google Sheets API/service-account adapter or Apps Script bridge; never call a Mac CLI from Vercel.
4. Add typed dependency adapters, safe JSON parsing, route boundaries, request IDs, structured logs, and Sentry via environment configuration.
5. Host staging webhooks on a Vercel preview/custom staging URL first. Validate Twilio signatures before any test callback. Do not repoint live phone numbers.
6. Keep the browser softphone, power-dialer coordination, DNC, calling-hours, consent, recording, and abandon-rate workflows disabled until their durable data and provider tests exist.

### Cloudflare decision

Cloudflare Workers/Pages is **not a drop-in move** for the current source because it uses native SQLite, Node child processes, and local CLI state. If Cloudflare is chosen later, refactor telephony state into Postgres plus Workers/Durable Objects or a dedicated service first. Do not perform that migration or change DNS without Abel’s explicit phase-gate approval.

## P0 implementation plan

1. Add regression coverage for marketing/login, agent approvals, agents list, lead-purchase, marketplace, and the four failed Ops routes.
2. Add typed dependency adapters and safe failure responses; remove every blank-body/unguarded JSON parse path.
3. Add route/global error boundaries and usable empty/degraded states.
4. Add <code>/api/health</code> and restricted <code>/api/health/deps</code>, then wire Ops Admin to them.
5. Add request IDs, structured redacted logs, and Sentry integration point.
6. Add a names-only <code>.env.example</code>; do not add secrets.
7. Remove ngrok process-control code from hosted paths and document the transition.
8. Stage, test, and report the production gates: Supabase setup, hosted Twilio test webhooks, and no live Twilio/DNS changes.

## Decisions and inputs still needed

- Dedicated Supabase Preview/Production connection details (or approval to create isolated projects).
- A hosting-secret-store entry for Sentry DSN.
- Cloudflare account/token only if Abel elects a later Workers/Pages path; current DNS must remain untouched.
- Twilio test credentials, test numbers, and staging callback plan. Live number re-pointing remains a separate explicit approval.
- Google service-account or hosted adapter access if the Sheets sync must persist after P0.
- Current lead marketplace checkout details should remain read-only until Abel explicitly authorizes a payment change.


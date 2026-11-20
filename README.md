# UplineAgent — hosted CRM rebuild

This repository is the `uplineagent.com` CRM rebuild. It is currently in P0
stabilization: the existing portal and Ops tools remain intact while local-only
runtime dependencies are removed.

## P0 operating rules

- The app runs on a hosted Next.js/Vercel deployment. It never starts, kills,
  or relies on a local tunnel process.
- Google Sheets access uses a hosted Google service account when configured.
  When it is not configured, Ops views render an explicit unavailable state and
  calls/messages remain blocked; they never show invented data.
- Incoming Twilio callbacks require a valid signature and a hosted HTTPS
  `PUBLIC_BASE_URL` before making state changes.
- Preview/staging deployments are safe. Do not repoint live Twilio numbers,
  alter DNS, buy numbers, submit A2P registration, or change billing without
  Abel's specific approval.

## Prereqs

- Node 24.x (the Vercel runtime target)
- A Vercel project linked to this repository for preview/staging
- For live Sheets sync: a Google service account with access to the intended
  spreadsheet, configured only in the hosting secret store
- For callback testing: Twilio test credentials/test numbers and a hosted
  staging URL; do not use a local tunnel

## Setup

1) Install deps

```bash
npm i
```

2) Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in:

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` (Twilio Console → API Keys)
- `TWILIO_SMS_FROM` (a Twilio number that can send SMS)
- `ALERT_TO` (your personal phone in E.164)
- `PUBLIC_BASE_URL` (the hosted HTTPS preview or staging URL)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and
  `UPLINE_SHEETS_SPREADSHEET_ID` only when hosted Sheets sync is approved

3) Run locally

```bash
npm run dev
```

4) For integration testing, deploy a Vercel **preview** and set
`PUBLIC_BASE_URL` to that preview/staging hostname in the hosting secret store.
Local development is for UI and unit tests only; live callbacks must target a
hosted HTTPS endpoint.

## Twilio Console configuration

### Staging callback configuration only

Use a Twilio test number only after its credentials and a hosted staging URL
have been placed in the secret store. In the number settings under **Voice &
Fax**, configure the staging callback URL:

- A CALL COMES IN → Webhook
- URL:

```
https://YOUR_HOSTED_STAGING_URL/api/twilio/voice/inbound
```

- Method: **POST**

Do **not** change any live number's callback URL without explicit approval.

### SMS capability
To receive alerts, ensure:

- `TWILIO_SMS_FROM` is a Twilio number with SMS enabled
- your `ALERT_TO` number may need to be verified on Twilio trial accounts

## Usage

- Open the hosted deployment at `/agent`
- Tap **Init / Register** and grant mic permission.
- Set status to **Available**.

When you’re not available:
- caller is enqueued (hold music)
- you get an SMS link
- open it → **Prepare device** → **Take oldest waiting call**

## Notes / safety

- Twilio callback signatures are validated before a webhook can change state.
- The legacy local SQLite runtime is still not a durable CRM datastore; moving
  the system of record to Postgres is a separate P0/P1 gate.
- Browser phone, inbound routing, and dialer workflows stay gated until hosted
  credentials, durable data, compliance controls, and staging tests are in place.

## Next improvements

- Provision a dedicated preview/production Postgres project and migrations
- Configure hosted Sheets sync or a one-way export path
- Run signed Twilio staging callbacks with test numbers
- Continue P1 role hierarchy and core CRM modules

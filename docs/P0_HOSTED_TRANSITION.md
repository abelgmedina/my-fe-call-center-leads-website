# P0 hosted-runtime transition

## What changed

The app no longer invokes a local Google CLI or controls a local tunnel process
at runtime. These were incompatible with Vercel/serverless deployment and were
the direct cause of blank Ops API responses and generic error pages.

| Former dependency | P0 replacement | Behavior when unconfigured |
| --- | --- | --- |
| Local `gog` executable and machine-authenticated account | `src/lib/hosted-sheets.ts`, using a Google service-account JWT and the Google Sheets REST API | Returns a structured `503` JSON response; Ops pages show a clear unavailable state and no lead data |
| Local ngrok process and Ops “repair” commands | Hosted `PUBLIC_BASE_URL` and Vercel preview/staging deployment | No process is started or killed; Ops Admin reports hosted-health configuration only |
| Unsigned Twilio POSTs | Shared Twilio signature verification with a configured HTTPS base URL | Returns a safe error before any state change |
| Local recording-coaching shell job | Explicit hosted-worker-not-configured state | Recording metadata is retained without attempting a local process |

## Hosting configuration

Configure these names in the preview/staging secret store only when a hosted
Sheets sync test is authorized:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `UPLINE_SHEETS_SPREADSHEET_ID`
- `UPLINE_FB_LEADS_SHEET_ID` (only if the legacy Facebook-lead lookup remains enabled)

`PUBLIC_BASE_URL` must be the external HTTPS URL that Twilio will actually
call. It must not point to a local machine or a tunnel process. All values stay
out of Git; `.env.example` contains names only.

## Staging verification sequence

1. Deploy the `crm-rebuild` branch as a Vercel preview (never `--prod`).
2. Verify `GET /api/health` returns `200` with an `x-request-id`.
3. Authenticate as an Ops owner and verify `/ops`, `/ops/pipeline`,
   `/ops/call-queue`, and `/ops/dialer` render either data or an explicit
   unavailable state—never a generic server error.
4. With a service account configured, verify a read-only Sheets request using
   a non-production staging spreadsheet.
5. With Twilio test credentials and a test number configured, make a signed
   staging callback. Do not repoint a live number.

## Production gates

The following remain explicit Abel decisions and are intentionally untouched by
this P0 branch:

- adding production provider secrets;
- changing DNS or moving hosting;
- repointing live Twilio webhooks, buying/porting numbers, or submitting A2P;
- creating/migrating the durable Postgres system of record;
- changing Zapier, Sheets, payment, or billing production workflows.

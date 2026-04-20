# Twilio Call Center (MVP)

Single-agent call center prototype:

- Inbound calls to a Twilio number
- If you are `AVAILABLE`: Twilio rings your **browser** (WebRTC)
- If you are `AWAY/BREAK/OFF_WORK`: caller is placed on **hold queue**, and you get an **SMS** with a **magic link**
- Tap the link (mobile OK) → **Prepare device** (mic permission) → **Take oldest waiting call**

## Prereqs

- Node 20+
- A Twilio account
- A publicly reachable **HTTPS** URL for Twilio webhooks (ngrok is easiest)

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
- `PUBLIC_BASE_URL` (your https ngrok URL)

3) Run locally

```bash
npm run dev
```

4) Start ngrok

```bash
ngrok http 3000
```

Copy the **https** forwarding URL into `PUBLIC_BASE_URL`.

## Twilio Console configuration

### 1) Buy/choose a Twilio phone number
Twilio Console → Phone Numbers → Manage → Active numbers.

### 2) Set the inbound voice webhook
In your number settings, under **Voice & Fax**:

- A CALL COMES IN → Webhook
- URL:

```
https://YOUR_PUBLIC_BASE_URL/api/twilio/voice/inbound
```

- Method: **POST**

### 3) SMS capability
To receive alerts, ensure:

- `TWILIO_SMS_FROM` is a Twilio number with SMS enabled
- your `ALERT_TO` number may need to be verified on Twilio trial accounts

## Usage

- Open: `https://YOUR_PUBLIC_BASE_URL/agent`
- Tap **Init / Register** and grant mic permission.
- Set status to **Available**.

When you’re not available:
- caller is enqueued (hold music)
- you get an SMS link
- open it → **Prepare device** → **Take oldest waiting call**

## Notes / safety

- This MVP does **not** validate Twilio webhook signatures.
- Magic link is single-use + 10 minute expiry, but there is no user login yet.
- Mobile WebRTC can be finicky (keep page in foreground).

## Next improvements

- Validate Twilio signatures
- Real auth + per-agent identities
- Better queue UX (wait time, periodic announcements)
- Call recording / voicemail

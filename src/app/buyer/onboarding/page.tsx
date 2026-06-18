'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LogoutButton } from '@/components/logout-button';

type PolicyKey = 'terms' | 'privacy' | 'lead_replacement';

const policies: Array<{
  key: PolicyKey;
  title: string;
  updated: string;
  summary: string;
  cta: string;
}> = [
  {
    key: 'terms',
    title: 'Terms & Conditions',
    updated: '10/25/2023',
    summary: 'Our terms of service govern your use of the platform.',
    cta: 'Read full terms',
  },
  {
    key: 'privacy',
    title: 'Privacy Policy',
    updated: '10/25/2023',
    summary: 'How we collect, use, and protect your personal data.',
    cta: 'Read full policy',
  },
  {
    key: 'lead_replacement',
    title: 'Lead Replacement Policy',
    updated: '6/10/2026',
    summary: 'Our policy on lead replacements, refunds, and quality guarantees.',
    cta: 'Read full policy',
  },
];

const termsText = `
These Terms & Conditions govern access to UplineAgent lead purchasing, delivery, account access, and related services. Buyer accounts are approval-gated. Access can be suspended or revoked for misuse, charge disputes, fraudulent activity, abuse of replacement requests, unauthorized sharing, or activity that harms UplineAgent, its clients, carriers, or consumers.

Leads are sold for insurance prospecting use by licensed agents and approved buyers. Buyers are responsible for complying with all applicable state and federal insurance, telemarketing, privacy, TCPA, consent, carrier, and licensing rules. UplineAgent does not guarantee a sale, appointment, answer rate, contact rate, or placement outcome.

Lead packages, pricing, delivery method, replacement eligibility, and fulfillment timing may vary by lead type, market, filters, and campaign conditions. Buyer agrees not to resell, distribute, scrape, publish, or transfer leads unless UplineAgent gives written permission. Buyer must keep login credentials secure.

By continuing, you acknowledge that policy agreement, IP address, and timestamp may be recorded for compliance purposes.
`;

const privacyText = `
UplineAgent collects information submitted during account access, lead purchase, verification, and lead delivery. This can include name, email, phone, license information, agency affiliation, purchase history, IP address, timestamps, and verification status.

We use this information to review account eligibility, manage buyer access, process lead orders, deliver leads, verify account ownership, maintain compliance records, communicate with buyers, and protect the platform from misuse.

We may use trusted vendors for hosting, payment processing, communication, analytics, and operations. We do not sell buyer account information as a data product. Buyer data may be retained as needed for business records, compliance, fraud prevention, order history, and legal obligations.

By continuing, you acknowledge that your agreement and verification events may be stored with timestamp and IP address.
`;

const replacementText = `
How it works

1. Review the lead
After delivery, check the lead against our replacement criteria. If the lead is a valid replacement, we replace it.

2. Submit a request
Flag the lead in your dashboard with a reason code within the replacement eligibility window.

3. Get a replacement
We verify the claim and ship a fresh lead — same type, same filters — at no extra cost.

UplineAgent is committed to providing every agent with quality leads. By purchasing leads from UplineAgent, you understand that all sales are final. You waive your right to a refund. You waive your right to dispute lead charges for any reason. By purchasing leads, you are acknowledging that you understand this policy and are in agreement with this policy. Our goal is to provide agents with the best possible leads at the best possible price.

ALL LEAD REPLACEMENTS must be submitted within 72 hours of us filling your order.

Eligible For Replacement:
- Disconnected Phone Numbers ONLY. Real-time leads only: Our support team may call every request that is sent in to verify the number is actually disconnected.
- Duplicate lead received in 60 days. Both Aged and Real-Time.
- Lead is older than 85. Both Aged and Real-Time.
- Lead is out of geographic territory ordered. Both Aged and Real-Time.
- Aged lead that has been sold by an agent that purchased the lead from UplineAgent.

Not Eligible For Replacement:
- Unresponsive numbers / Spanish voicemail, including no answers, voicemails, wrong numbers, or wrong info.
- Duplicate leads that are received more than 60 days apart.
- Any free leads.
- Any OTP/SMS verified lead unless aged.

We will only replace up to 20% of a lead order for eligible replacement reasons.

We apologize for any inconvenience. However, to make sure we are providing the highest quality leads, keeping the prices as competitive as we can, and still continue to generate the best possible quality leads, we must follow this policy with every lead order. Thank you for your continued support.
`;

const content: Record<PolicyKey, string> = {
  terms: termsText,
  privacy: privacyText,
  lead_replacement: replacementText,
};

function labelFor(key: PolicyKey) {
  if (key === 'terms') return 'terms and conditions';
  if (key === 'privacy') return 'privacy policy';
  return 'lead replacement policy';
}

export default function BuyerOnboardingPage() {
  const [open, setOpen] = useState<PolicyKey | null>(null);
  const [reviewed, setReviewed] = useState<Record<PolicyKey, boolean>>({ terms: false, privacy: false, lead_replacement: false });
  const [checked, setChecked] = useState<Record<PolicyKey, boolean>>({ terms: false, privacy: false, lead_replacement: false });
  const [msg, setMsg] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const allPolicies = useMemo(() => checked.terms && checked.privacy && checked.lead_replacement, [checked]);

  useEffect(() => {
    fetch('/api/buyer/onboarding', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const status = data?.status || {};
        setPhone(status.phone || '');
        setEmailVerified(!!status.email_verified_at);
        setPhoneVerified(!!status.phone_verified_at);
        if (status.complete) window.location.href = '/buyer/marketplace';
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) return;

      node.scrollTop = 0;
      if (node.scrollHeight <= node.clientHeight + 12) {
        setReviewed((prev) => ({ ...prev, [open]: true }));
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function onScroll() {
    const node = scrollRef.current;
    if (!node || !open) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 12) {
      setReviewed((prev) => ({ ...prev, [open]: true }));
    }
  }

  async function post(action: string, payload: Record<string, unknown> = {}) {
    setMsg('');
    const res = await fetch('/api/buyer/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  async function agreePolicies() {
    try {
      await post('agree_policies', { reviews: checked });
      setMsg('Policy agreement recorded. Continue with email and phone verification.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  }

  async function sendEmail() {
    try {
      await post('send_email_code');
      setMsg('Email verification code sent.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  }

  async function verifyEmail() {
    try {
      await post('verify_email_code', { code: emailCode });
      setEmailVerified(true);
      setMsg('Email verified.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  }

  async function sendPhone() {
    try {
      await post('send_phone_code', { phone });
      setMsg('Phone verification code sent.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  }

  async function verifyPhone() {
    try {
      await post('verify_phone_code', { code: phoneCode });
      setPhoneVerified(true);
      setMsg('Phone verified.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  }

  useEffect(() => {
    if (allPolicies && emailVerified && phoneVerified) {
      window.location.href = '/buyer/marketplace';
    }
  }, [allPolicies, emailVerified, phoneVerified]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Compliance</div>
          <h1 className="mt-1 text-2xl font-semibold">Review Our Policies</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Quick step — these protect both you and your clients. Should take about 2 minutes.
          </p>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            Please open each policy below before continuing. We&apos;ll mark each one as reviewed.
          </p>
        </div>
        <LogoutButton />
      </div>

      {msg ? <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-3 text-sm text-blue-100">{msg}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        {policies.map((policy) => (
          <article key={policy.key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-lg font-semibold">{policy.title}</h2>
            <p className="mt-2 min-h-12 text-sm text-neutral-400">{policy.summary}</p>
            <div className="mt-3 text-xs text-[var(--muted-2)]">Updated {policy.updated}</div>
            <button onClick={() => setOpen(policy.key)} className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold hover:border-[var(--border-strong)]">
              {policy.cta}
            </button>
            <label className={`mt-4 flex gap-2 text-sm ${reviewed[policy.key] ? '' : 'opacity-50'}`}>
              <input
                type="checkbox"
                disabled={!reviewed[policy.key]}
                checked={checked[policy.key]}
                onChange={(event) => setChecked((prev) => ({ ...prev, [policy.key]: event.target.checked }))}
              />
              <span>I understand and agree to the {labelFor(policy.key)}.</span>
            </label>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="text-sm text-neutral-300">
          Your agreement will be recorded with your IP address and a timestamp for compliance purposes.
        </div>
        <button onClick={agreePolicies} disabled={!allPolicies} className="mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          Record Policy Agreement
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-lg font-semibold">Email verification</h2>
          <p className="mt-2 text-sm text-neutral-400">Send a 6-digit code to your login email and enter it here.</p>
          <button onClick={sendEmail} className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">Send email code</button>
          <div className="mt-3 flex gap-2">
            <input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" placeholder="6-digit code" />
            <button onClick={verifyEmail} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Verify</button>
          </div>
          <div className="mt-2 text-xs text-[var(--muted-2)]">{emailVerified ? 'Email verified.' : 'Email not verified yet.'}</div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-lg font-semibold">One-time phone verification</h2>
          <p className="mt-2 text-sm text-neutral-400">Send a 6-digit SMS code to your phone and enter it here.</p>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" placeholder="+15555550199" />
          <button onClick={sendPhone} className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">Send phone code</button>
          <div className="mt-3 flex gap-2">
            <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm" placeholder="6-digit code" />
            <button onClick={verifyPhone} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">Verify</button>
          </div>
          <div className="mt-2 text-xs text-[var(--muted-2)]">{phoneVerified ? 'Phone verified.' : 'Phone not verified yet.'}</div>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4">
          <div className="mx-auto flex h-full max-w-3xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
              <div>
                <div className="text-lg font-semibold">{policies.find((policy) => policy.key === open)?.title}</div>
                <div className="text-xs text-[var(--muted-2)]">Scroll to the bottom to unlock the checkbox.</div>
              </div>
              <button onClick={() => setOpen(null)} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm">Close</button>
            </div>
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-7 text-neutral-200">
              {content[open]}
              <div className="mt-10 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-3 text-emerald-100">
                End of policy. You may close this window and check the agreement box.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

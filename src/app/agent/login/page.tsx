'use client';

import { useState } from 'react';

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  inquiry: string;
};

type SamplePreviewProps = {
  eyebrow: string;
  title: string;
  description: string;
  accentClass: string;
  thumb: React.ReactNode;
  expanded: React.ReactNode;
};

function SamplePreview({ eyebrow, title, description, accentClass, thumb, expanded }: SamplePreviewProps) {
  return (
    <details className="group rounded-[30px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.22)] open:bg-black/30">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClass}`}>{eyebrow}</div>
        <h4 className="mt-3 text-xl font-semibold text-white">{title}</h4>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition duration-200 group-open:opacity-95">
          {thumb}
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/80">
          <span className="group-open:hidden">Click to expand full sample</span>
          <span className="hidden group-open:inline">Click to collapse</span>
        </div>
      </summary>
      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
        {expanded}
      </div>
    </details>
  );
}

export default function AgentLoginPage({ searchParams }: { searchParams?: { returnTo?: string } }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({ name: '', email: '', phone: '', inquiry: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const rt = searchParams?.returnTo;
      window.location.href = rt ? rt : '/ops/lead-purchase';
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    setContactLoading(true);
    setContactMsg(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setContactMsg('Thanks, your inquiry was sent. We will follow up soon.');
      setContactForm({ name: '', email: '', phone: '', inquiry: '' });
    } catch (e: any) {
      setContactMsg(e?.message || String(e));
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <main className="relative overflow-hidden bg-[var(--surface-0)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(4,8,18,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <img src="/brand/uai-logo.png" alt="UPLINE AGENT AI" className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.24em] text-blue-300/90">UPLINE AGENT AI</div>
              <div className="text-[10px] text-[var(--muted-2)]">Agent portal + lead marketplace</div>
            </div>
          </a>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end md:gap-3">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:border-blue-400/40 hover:bg-blue-500/10"
            >
              Contact Us
            </button>
            <a
              href="#leads-section"
              className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:border-blue-400/40 hover:bg-blue-500/10"
            >
              Leads
            </a>
            <a
              href="#login-section"
              className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400"
            >
              Login
            </a>
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_20%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(900px_circle_at_80%_70%,rgba(59,130,246,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute -top-40 left-1/2 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-blue-600/12 blur-3xl" />
      </div>

      <section id="top" className="relative z-10 mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-4 pb-12 pt-8 sm:px-6 md:grid-cols-2 md:gap-10 md:pt-10">
        <section className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),transparent_70%)] blur-xl" />
              <div className="rounded-[28px] border border-blue-500/25 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent p-[10px] shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_0_55px_rgba(59,130,246,0.18)]">
                <div className="rounded-[22px] p-4">
                  <img
                    src="/brand/uai-logo.png"
                    alt="UPLINE AGENT AI"
                    className="h-20 w-20 sm:h-24 sm:w-24 [filter:drop-shadow(0_10px_30px_rgba(59,130,246,0.25))]"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-[0.24em] text-blue-300/90">UPLINE AGENT AI</div>
              <div className="mt-1 text-xs text-[var(--muted-2)]">AI × Human Collaboration</div>
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:mt-8 sm:text-4xl">
            AI powered transparency
            <span className="text-[var(--muted)]"> for the next generation of insurance agents</span>.
          </h1>

          <p className="mt-4 max-w-md text-sm text-[var(--muted)]">
            Simple access to Upline AI Agent leads, logins, and delivery details in one place.
          </p>

          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div className="text-xs font-semibold tracking-wide text-[var(--muted-2)]">Quick access</div>
            <div className="mt-2 text-sm text-[var(--foreground)]">Sign in to view lead options, account access, and delivery details.</div>
            <div className="mt-2 text-xs text-[var(--muted-2)]">New buyers can request access and get approved before ordering leads.</div>
          </div>
        </section>

        <section id="login-section" className="flex flex-col justify-center scroll-mt-28">
          <div className="rounded-3xl border border-[var(--border-strong)] bg-[color:rgba(8,15,30,0.78)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--foreground)]">Login</div>
                <div className="mt-1 text-xs text-[var(--muted-2)]">Secure access for lead buyers.</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.22)]" />
            </div>

            <form onSubmit={submit} className="mt-6">
              <label className="block text-sm">
                <div className="text-xs font-semibold text-[var(--muted-2)]">Username</div>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </label>

              <label className="mt-4 block text-sm">
                <div className="text-xs font-semibold text-[var(--muted-2)]">Password</div>
                <input
                  type="password"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>

              <button
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              {msg ? <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{msg}</div> : null}
            </form>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/4 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">Need access?</div>
              <div className="mt-2 text-sm text-[var(--foreground)]">Create your account and submit your details for approval.</div>
              <form action="/agent/signup" className="mt-4">
                <button
                  type="submit"
                  className="relative z-20 block w-full rounded-xl border border-white/15 bg-white/6 px-3 py-3 text-center text-sm font-semibold text-white hover:border-blue-400/40 hover:bg-blue-500/10"
                >
                  Create My Agent Account
                </button>
              </form>
              <div className="mt-3 text-xs text-[var(--muted-2)]">Access stays pending until approved.</div>
            </div>
          </div>

          <div className="mt-4 text-center text-[11px] text-[var(--muted-2)]/90">
            © {new Date().getFullYear()} UplineAgent
          </div>
        </section>
      </section>

      <section id="leads-section" className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(4,8,18,0.94),rgba(5,10,22,0.98))] py-24 scroll-mt-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-[28px] border border-blue-500/25 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent p-[10px] shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_0_55px_rgba(59,130,246,0.18)]">
                <div className="rounded-[22px] p-4">
                  <img
                    src="/brand/uai-logo.png"
                    alt="Upline Agent AI Leads"
                    className="h-20 w-20 [filter:drop-shadow(0_10px_30px_rgba(59,130,246,0.25))]"
                  />
                </div>
              </div>
              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/75">Upline Agent AI Leads</div>
              <h3 className="mt-3 max-w-4xl text-4xl font-bold text-white">FINAL EXPENSE LEADS</h3>
              <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--muted)]">
                Inbound customer-initiated calls, exclusive never-shared outbound dialing leads, and CRM + AI automations with delivery built for speed.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs uppercase tracking-[0.14em] text-blue-200/70">Inbound calls</div>
                <div className="mt-2 text-2xl font-semibold text-white">Live Transfer Flow</div>
                <p className="mt-2 text-sm text-[var(--muted)]">AI-assisted inbound call handling built to move final expense prospects to agents fast, with no dead buffer between lead and conversation.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs uppercase tracking-[0.14em] text-blue-200/70">Outbound leads</div>
                <div className="mt-2 text-2xl font-semibold text-white">EN / ES Local + Telesales</div>
                <p className="mt-2 text-sm text-[var(--muted)]">Real-time generated Facebook and social media leads for English and Spanish local agents or broader telesales teams.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs uppercase tracking-[0.14em] text-blue-200/70">Ad management</div>
                <div className="mt-2 text-2xl font-semibold text-white">$500 / Month</div>
                <p className="mt-2 text-sm text-[var(--muted)]">We reserve the ad account, manage copy, creatives, targeting, and strategy, while the client funds spend with their card on file or account top-offs.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-xs uppercase tracking-[0.14em] text-blue-200/70">Automation layer</div>
                <div className="mt-2 text-2xl font-semibold text-white">CRM + Delivery</div>
                <p className="mt-2 text-sm text-[var(--muted)]">We connect the third solution layer through automations, lead routing, Google Sheets, CRM handoff, and workflow support so volume stays usable.</p>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-[34px] border border-blue-500/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(255,255,255,0.03))] p-8 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Core solutions</div>
                <h3 className="mt-3 max-w-3xl text-3xl font-semibold text-white">Three simple ways to buy and receive leads.</h3>
              </div>
              <p className="max-w-2xl text-sm text-[var(--muted)]">
                Choose inbound calls, outbound leads, or managed campaigns based on how you want to grow.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <article className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">Solution 01</div>
                <h4 className="mt-3 text-2xl font-semibold text-white">Live inbound calls</h4>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Live final expense calls handled for speed, then routed fast so agents connect while intent is still high.</p>
                <ul className="mt-5 space-y-3 text-sm text-[var(--muted)]">
                  <li>Real-time transfer flow</li>
                  <li>Built to reduce lag and dead time</li>
                  <li>Fast routing for higher intent conversations</li>
                </ul>
                <a href="#login-section" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400">Book Inbound Setup</a>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Solution 02</div>
                <h4 className="mt-3 text-2xl font-semibold text-white">Local + telesales leads</h4>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">English and Spanish real-time leads from Facebook and social media, built for local field agents and outbound telesales teams.</p>
                <ul className="mt-5 space-y-3 text-sm text-[var(--muted)]">
                  <li>English and Spanish options</li>
                  <li>Local and telesales campaigns</li>
                  <li>Exclusive delivery for outbound speed</li>
                </ul>
                <a href="#leads-section" className="mt-6 inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 hover:border-emerald-300/50 hover:bg-emerald-500/15">Buy Leads</a>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">Solution 03</div>
                <h4 className="mt-3 text-2xl font-semibold text-white">Managed ads + automations</h4>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">$500 per month for campaign management, ad copy, creatives, targeting, and automation support while clients fund ad spend directly.</p>
                <ul className="mt-5 space-y-3 text-sm text-[var(--muted)]">
                  <li>$500 monthly management fee</li>
                  <li>Client-funded ad spend at cost</li>
                  <li>CRM, Google Sheet, and automation support</li>
                </ul>
                <a href="#login-section" className="mt-6 inline-flex rounded-full border border-white/15 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:border-blue-400/40 hover:bg-blue-500/10">Start Managed Campaign</a>
              </article>
            </div>
          </div>

          <div className="mt-16">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Lead products</div>
            <h3 className="mt-3 text-3xl font-semibold text-white">Choose your lead type.</h3>
            <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">English or Spanish. Local or telesales.</p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-[30px] border border-blue-500/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.12),rgba(255,255,255,0.03))] p-7 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English Leads</div>
                  <h4 className="mt-3 text-2xl font-semibold text-white">English lead options for local or telesales buyers.</h4>
                </div>
                <div className="rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100">English</div>
              </div>

              <div className="mt-6 grid gap-5">
                <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English Local</div>
                  <h5 className="mt-3 text-xl font-semibold text-white">Local field leads</h5>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">For local lead buyers who want exclusive final expense opportunities in a specific city, county, or target area.</p>
                  <div className="mt-5 text-3xl font-semibold text-white">$20-$30<span className="text-base text-[var(--muted)]"> / lead</span></div>
                  <div className="mt-2 text-sm text-[var(--muted)]">Depending on area, population size, and market difficulty.</div>
                </article>

                <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English Telesales</div>
                  <h5 className="mt-3 text-xl font-semibold text-white">Telesales lead buying</h5>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">For telesales lead buyers who want final expense leads by state or across a broader calling territory.</p>
                  <div className="mt-5 text-3xl font-semibold text-white">$15-$25<span className="text-base text-[var(--muted)]"> / lead</span></div>
                  <div className="mt-2 text-sm text-[var(--muted)]">Depending on state mix, targeting depth, and custom setup.</div>
                </article>
              </div>
            </section>

            <section className="rounded-[30px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(255,255,255,0.03))] p-7 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Leads en Español</div>
                  <h4 className="mt-3 text-2xl font-semibold text-white">Spanish lead options for local or telesales buyers.</h4>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100">Español</div>
              </div>

              <div className="mt-6 grid gap-5">
                <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Spanish Telesales</div>
                  <h5 className="mt-3 text-xl font-semibold text-white">Telesales leads en español</h5>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">For Spanish telesales lead buyers who want leads across wider calling territories.</p>
                  <div className="mt-5 text-3xl font-semibold text-white">$20-$25<span className="text-base text-[var(--muted)]"> / lead</span></div>
                  <div className="mt-2 text-sm text-[var(--muted)]">Simple pricing range based on state mix and customization.</div>
                </article>

                <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Spanish Local</div>
                  <h5 className="mt-3 text-xl font-semibold text-white">Local leads en español</h5>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">For Spanish local lead buyers who want final expense leads in targeted areas.</p>
                  <div className="mt-5 text-3xl font-semibold text-white">$25-$35<span className="text-base text-[var(--muted)]"> / lead</span></div>
                  <div className="mt-2 text-sm text-[var(--muted)]">Depending on area, availability, and local market setup.</div>
                </article>
              </div>
            </section>
          </div>

          <div className="mt-16 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-8 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Lead delivery examples</div>
                <h3 className="mt-3 text-3xl font-semibold text-white">See exactly how leads are delivered for each lead type.</h3>
              </div>
              <p className="max-w-2xl text-sm text-[var(--muted)]">
                Local and telesales leads are delivered differently. Below is a simple breakdown for English and Spanish lead types so buyers know what to expect before ordering.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[30px] border border-blue-500/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.12),rgba(255,255,255,0.03))] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English delivery</div>
                <h4 className="mt-3 text-2xl font-semibold text-white">Delivery for English local and telesales leads</h4>
                <div className="mt-6 grid gap-5">
                  <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English Local</div>
                    <h5 className="mt-3 text-xl font-semibold text-white">English local leads</h5>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">English local leads include a PDF lead card by email, a Google Sheet where leads can trickle in live, and an SMS or text alert with the lead details for fast follow-up.</p>
                  </article>
                  <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/80">English Telesales</div>
                    <h5 className="mt-3 text-xl font-semibold text-white">English telesales leads</h5>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">English telesales leads receive the same live Google Sheet flow, email delivery of lead details, and SMS or text updates, but without the PDF lead card format used for local field agents.</p>
                  </article>
                </div>
              </div>

              <div className="rounded-[30px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(255,255,255,0.03))] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Entrega en español</div>
                <h4 className="mt-3 text-2xl font-semibold text-white">Entrega para leads locales y de telesales en español</h4>
                <div className="mt-6 grid gap-5">
                  <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Español Local</div>
                    <h5 className="mt-3 text-xl font-semibold text-white">Leads locales en español</h5>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Los leads locales en español incluyen una tarjeta PDF por correo electrónico, una hoja de Google donde los leads van entrando en tiempo real, y una alerta por SMS o texto con los detalles del lead para seguimiento rápido.</p>
                  </article>
                  <article className="rounded-3xl border border-white/10 bg-black/20 p-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Español Telesales</div>
                    <h5 className="mt-3 text-xl font-semibold text-white">Leads de telesales en español</h5>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Los leads de telesales en español reciben la misma hoja de Google en vivo, el correo electrónico con los detalles del lead, y alertas por SMS o texto, pero sin la tarjeta PDF que se usa para los leads locales.</p>
                  </article>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
              <SamplePreview
                eyebrow="English Local PDF Example"
                title="English local PDF sample"
                description="Example of the PDF lead card local English agents can receive by email."
                accentClass="text-blue-200/80"
                thumb={
                  <div className="bg-neutral-100 p-3">
                    <iframe
                      src="/sample-assets/english-local-lead-sample.pdf#view=FitH"
                      title="English local lead PDF thumbnail"
                      className="pointer-events-none h-[260px] w-full rounded-xl border border-neutral-200"
                    />
                  </div>
                }
                expanded={
                  <iframe
                    src="/sample-assets/english-local-lead-sample.pdf#view=FitH"
                    title="English local lead PDF full preview"
                    className="h-[720px] w-full bg-white"
                  />
                }
              />

              <SamplePreview
                eyebrow="Spanish Local PDF Example"
                title="Spanish local PDF sample"
                description="Example of the PDF lead card local Spanish-speaking agents can receive by email."
                accentClass="text-emerald-200/80"
                thumb={
                  <div className="bg-neutral-100 p-3">
                    <iframe
                      src="/sample-assets/spanish-local-lead-sample.pdf#view=FitH"
                      title="Spanish local lead PDF thumbnail"
                      className="pointer-events-none h-[260px] w-full rounded-xl border border-neutral-200"
                    />
                  </div>
                }
                expanded={
                  <iframe
                    src="/sample-assets/spanish-local-lead-sample.pdf#view=FitH"
                    title="Spanish local lead PDF full preview"
                    className="h-[720px] w-full bg-white"
                  />
                }
              />

              <SamplePreview
                eyebrow="Google Sheet Example"
                title="Google Sheet lead flow sample"
                description="Example of the shared sheet where local and telesales leads can be delivered in real time."
                accentClass="text-blue-200/80"
                thumb={<img src="/sample-assets/google-sheet-row-sample.png" alt="Google Sheet row sample thumbnail" className="h-[260px] w-full object-cover object-left-top" />}
                expanded={<img src="/sample-assets/google-sheet-row-sample.png" alt="Google Sheet row sample full preview" className="w-full bg-white" />}
              />
            </div>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-7 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">What happens after lead purchase</div>
              <h3 className="mt-3 text-3xl font-semibold text-white">Once we receive the order, we get to work right away.</h3>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-2xl font-semibold text-white">1</div>
                  <h4 className="mt-3 text-lg font-semibold text-white">Order review starts immediately</h4>
                  <p className="mt-2 text-sm text-[var(--muted)]">As soon as the order comes in, campaign setup begins based on lead type, language, demographic, and territory.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-2xl font-semibold text-white">2</div>
                  <h4 className="mt-3 text-lg font-semibold text-white">Shared Google Sheet is created</h4>
                  <p className="mt-2 text-sm text-[var(--muted)]">We share a Google Sheet so leads can be viewed in real time as they come in.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-2xl font-semibold text-white">3</div>
                  <h4 className="mt-3 text-lg font-semibold text-white">Automations are connected</h4>
                  <p className="mt-2 text-sm text-[var(--muted)]">Lead delivery can be connected to text or SMS, email, Google Sheets, and optionally your CRM.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="text-2xl font-semibold text-white">4</div>
                  <h4 className="mt-3 text-lg font-semibold text-white">Delivery starts in 1 to 3 days</h4>
                  <p className="mt-2 text-sm text-[var(--muted)]">Most campaigns begin delivering within 1 to 3 days depending on demographic depth, platform approval, and market targeting.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-blue-500/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(37,99,235,0.08))] p-7 shadow-[0_22px_55px_rgba(0,0,0,0.28)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100/85">Getting started</div>
                <h3 className="mt-3 text-2xl font-semibold text-white">Create your account, choose your lead type, and launch fast.</h3>
                <p className="mt-3 text-sm text-blue-100/80">
                  This page is built to help buyers understand the system quickly, create an account, and order the lead flow that fits how they sell.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {contactOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[rgba(8,15,30,0.96)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Contact us</div>
                <h3 className="mt-2 text-2xl font-semibold text-white">Tell us what you need</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">Send your inquiry and we will reach back out to help with leads, inbound calls, or campaign setup.</p>
              </div>
              <button type="button" onClick={() => setContactOpen(false)} className="rounded-full border border-white/10 px-3 py-1 text-sm text-white hover:border-blue-400/40">Close</button>
            </div>

            <form onSubmit={submitContact} className="mt-6 space-y-4">
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
              <textarea className="min-h-[140px] w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Comment or inquiry" value={contactForm.inquiry} onChange={(e) => setContactForm({ ...contactForm, inquiry: e.target.value })} />
              <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50" disabled={contactLoading} type="submit">
                {contactLoading ? 'Sending…' : 'Send Inquiry'}
              </button>
              {contactMsg ? <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">{contactMsg}</div> : null}
            </form>
          </div>
        </div>
      ) : null}

      <footer className="border-t border-white/8 bg-[rgba(4,8,18,0.98)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
          <div>© 2026 uplineagent.com. All rights reserved.</div>
          <div className="flex flex-wrap gap-4">
            <a href="/privacy-policy" className="hover:text-white">Privacy Policy</a>
            <a href="/terms-and-conditions" className="hover:text-white">Terms & Conditions</a>
            <button type="button" onClick={() => setContactOpen(true)} className="hover:text-white">Contact</button>
          </div>
        </div>
      </footer>
    </main>
  );
}

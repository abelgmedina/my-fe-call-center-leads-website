'use client';

import { useState } from 'react';

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  inquiry: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : null;
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const requested = searchParams?.returnTo || '';
      const safeReturnTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '';
      window.location.href = safeReturnTo || '/dashboard';
    } catch (error: unknown) {
      setMsg(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function submitContact(event: React.FormEvent) {
    event.preventDefault();
    setContactLoading(true);
    setContactMsg(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setContactMsg('Thanks, your inquiry was sent. We will reach back out to help.');
      setContactForm({ name: '', email: '', phone: '', inquiry: '' });
    } catch (error: unknown) {
      setContactMsg(errorMessage(error));
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--surface-0)] text-[var(--foreground)]">
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
              Contact us
            </button>
            <a
              href="/buyer/marketplace"
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

      <section id="top" className="relative z-10 mx-auto grid w-full flex-1 grid-cols-1 gap-8 px-4 py-8 sm:max-w-6xl sm:px-6 md:grid-cols-2 md:items-center md:gap-10 md:py-10">
        <section className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),transparent_70%)] blur-xl" />
              <div className="rounded-[28px] border border-blue-500/25 bg-gradient-to-br from-blue-500/8 via-transparent to-transparent p-[10px] shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_0_55px_rgba(59,130,246,0.18)]">
                <div className="rounded-[22px] p-4">
                  <img src="/brand/uai-logo.png" alt="UPLINE AGENT AI" className="h-20 w-20 sm:h-24 sm:w-24 [filter:drop-shadow(0_10px_30px_rgba(59,130,246,0.25))]" />
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
          <p className="mt-4 max-w-md text-sm text-[var(--muted)]">Simple access to Upline AI Agent leads, logins, and delivery details in one place.</p>

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
                <div className="mt-1 text-xs text-[var(--muted-2)]">Sign in with your email and password.</div>
              </div>
              <div className="h-9 w-9 rounded-full bg-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.22)]" />
            </div>

            <form onSubmit={submit} className="mt-6">
              <label className="block text-sm">
                <div className="text-xs font-semibold text-[var(--muted-2)]">Email or username</div>
                <input
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                />
              </label>
              <label className="mt-4 block text-sm">
                <div className="text-xs font-semibold text-[var(--muted-2)]">Password</div>
                <input
                  type="password"
                  className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
              <div className="mt-2 text-sm text-[var(--foreground)]">Create an agent account with your email and password. License and carrier details can wait.</div>
              <form action="/agent/signup" className="mt-4">
                <button type="submit" className="relative z-20 block w-full rounded-xl border border-white/15 bg-white/6 px-3 py-3 text-center text-sm font-semibold text-white hover:border-blue-400/40 hover:bg-blue-500/10">
                  Create agent account
                </button>
              </form>
              <div className="mt-3 text-xs text-[var(--muted-2)]">New accounts enter a restricted CRM workspace immediately.</div>
            </div>
          </div>
        </section>
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
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Name" value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} />
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Email" value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} />
              <input className="w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Phone" value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} />
              <textarea className="min-h-[140px] w-full rounded-xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.04)] p-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-600/20" placeholder="Comment or inquiry" value={contactForm.inquiry} onChange={(event) => setContactForm({ ...contactForm, inquiry: event.target.value })} />
              <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(59,130,246,0.25)] hover:from-blue-500 hover:to-blue-400 disabled:opacity-50" disabled={contactLoading} type="submit">
                {contactLoading ? 'Sending…' : 'Send Inquiry'}
              </button>
              {contactMsg ? <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">{contactMsg}</div> : null}
            </form>
          </div>
        </div>
      ) : null}

      <footer className="mt-auto border-t border-white/8 bg-[rgba(4,8,18,0.98)] px-6 py-8">
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

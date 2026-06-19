'use client';

import { useState } from 'react';
import { LogoutButton } from '@/components/logout-button';
import { formatLeadPrice, leadProductCategories, leadProducts } from '@/lib/lead-products';

type BuyerMarketplaceProps = {
  preview?: boolean;
};

export default function BuyerMarketplacePage({ preview = false }: BuyerMarketplaceProps) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  async function checkout(productId: string) {
    if (preview) {
      setMsg('Preview only. Approved buyers can check out after login and onboarding.');
      return;
    }

    setBusy(productId);
    setMsg('');
    try {
      const res = await fetch('/api/buyer/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setMsg(data.message || 'Order request saved. We will follow up with next steps.');
    } catch (error: any) {
      setMsg(error?.message || String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Buyer Portal</div>
          <h1 className="mt-1 text-2xl font-semibold">{preview ? 'Lead Marketplace Preview' : 'Lead Marketplace'}</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            {preview
              ? 'This is a public review preview of the approved buyer marketplace. Checkout stays locked behind approval, policy review, and verification.'
              : 'Approved agents can buy English and Spanish final expense lead packages here. Every package starts checkout through Stripe.'}
          </p>
        </div>
        {preview ? (
          <a href="/agent/login" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--surface-1)]">
            Buyer login
          </a>
        ) : (
          <LogoutButton />
        )}
      </div>

      {msg ? <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-3 text-sm text-blue-100">{msg}</div> : null}
      {preview ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Preview mode: pricing and layout are visible, but purchases are disabled on this page.
        </div>
      ) : null}

      <section className="space-y-5">
        {leadProductCategories.map((category) => {
          const categoryProducts = leadProducts.filter((product) => product.category === category);
          const first = categoryProducts[0];
          return (
            <div key={category} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/80">Final expense leads</div>
                  <h2 className="mt-2 text-xl font-semibold">{category}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-neutral-400">{first.description}</p>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]/80">
                  {formatLeadPrice(first.pricePerLeadCents)} per lead
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {categoryProducts.map((product) => (
                  <article key={product.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{product.quantity} leads</div>
                        <div className="mt-1 text-xs text-[var(--muted-2)]">{product.language} • {product.channel}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-white">{formatLeadPrice(product.amountCents)}</div>
                        <div className="mt-1 text-[11px] text-[var(--muted-2)]">{formatLeadPrice(product.pricePerLeadCents)}/lead</div>
                      </div>
                    </div>
                    <button onClick={() => checkout(product.id)} disabled={!!busy} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                      {preview ? 'Preview only' : busy === product.id ? 'Starting checkout...' : `Checkout ${product.quantity} leads`}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Access model</div>
        <h2 className="mt-2 text-lg font-semibold">Exclusive access stays approval-gated</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Agents only reach this marketplace after you approve their application and create their login. For now, approved buyers are kept inside this ordering page only.
        </p>
      </section>
    </main>
  );
}

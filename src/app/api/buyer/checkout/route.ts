import { NextResponse } from 'next/server';
import { requireAgent } from '@/lib/auth';
import { db } from '@/lib/db';
import { leadProductMap } from '@/lib/lead-products';
import { appendLeadOrderToStore, getBuyerOnboardingFromStore, isGitHubStoreConfigured } from '@/lib/github-store';

export const runtime = 'nodejs';

async function createStripeCheckout(params: {
  product_id: string;
  product_name: string;
  description: string;
  amount_cents: number;
  username: string;
  buyer_code: string;
  origin: string;
}) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${params.origin}/buyer/marketplace?checkout=success`);
  form.set('cancel_url', `${params.origin}/buyer/marketplace?checkout=cancelled`);
  form.set('customer_email', params.username);
  form.set('client_reference_id', params.buyer_code);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(params.amount_cents));
  form.set('line_items[0][price_data][product_data][name]', params.product_name);
  form.set('line_items[0][price_data][product_data][description]', params.description);
  form.set('metadata[buyer_code]', params.buyer_code);
  form.set('metadata[username]', params.username);
  form.set('metadata[product_id]', params.product_id);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Stripe checkout failed: ${res.status}`);
  return { id: data.id as string, url: data.url as string };
}

export async function POST(req: Request) {
  const me: any = await requireAgent();
  if ((me.role || 'internal') !== 'buyer' || !me.buyer_code) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  if (isGitHubStoreConfigured()) {
    const onboarding = await getBuyerOnboardingFromStore(me.username);
    if (!onboarding?.complete) {
      return NextResponse.json({ ok: false, error: 'onboarding required' }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => null)) as any;
  const id = String(body?.product_id || '').trim();
  const product = leadProductMap[id];
  if (!product) return NextResponse.json({ ok: false, error: 'invalid product' }, { status: 400 });

  const now = Date.now();
  const productName = `${product.category} - ${product.quantity} leads`;

  const origin = req.headers.get('origin') || new URL(req.url).origin;
  const checkout = await createStripeCheckout({
    product_id: id,
    product_name: productName,
    description: product.description,
    amount_cents: product.amountCents,
    username: me.username,
    buyer_code: me.buyer_code,
    origin,
  });

  const status = checkout ? 'checkout_created' : 'stripe_not_configured';
  let orderId: number | bigint;
  if (isGitHubStoreConfigured()) {
    const order = await appendLeadOrderToStore({
      buyer_code: me.buyer_code,
      username: me.username,
      product_id: id,
      product_name: productName,
      quantity: product.quantity,
      amount_cents: product.amountCents,
      status,
      stripe_session_id: checkout?.id || null,
      stripe_checkout_url: checkout?.url || null,
    });
    orderId = order.id;
  } else {
    const result = db
      .prepare(
        `insert into lead_orders (buyer_code, username, product_id, product_name, quantity, amount_cents, status, stripe_session_id, stripe_checkout_url, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        me.buyer_code,
        me.username,
        id,
        productName,
        product.quantity,
        product.amountCents,
        status,
        checkout?.id || null,
        checkout?.url || null,
        now,
        now
      );
    orderId = result.lastInsertRowid;
  }

  return NextResponse.json({
    ok: true,
    mode: checkout ? 'stripe_checkout' : 'stripe_not_configured',
    order_id: Number(orderId),
    checkout_url: checkout?.url || null,
    message: checkout ? null : 'STRIPE_SECRET_KEY is not configured. Order was saved for manual follow-up.',
  });
}

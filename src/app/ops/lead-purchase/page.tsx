import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const productCards = [
  {
    name: 'English Local',
    detail: 'Exclusive field leads for city or county-based buying.',
    price: '$20 to $30 / lead',
    tags: ['Field agents', 'Exclusive', 'Area-based'],
    cta: 'Build local order',
  },
  {
    name: 'English Telesales',
    detail: 'Visible statewide telesales bundles for fast repeat purchases.',
    price: '20 for $520',
    tags: ['Telesales', 'Statewide', 'Repeat buyers'],
    cta: 'Buy telesales bundle',
  },
  {
    name: 'Spanish Local',
    detail: 'Local Spanish final expense leads for in-person appointment setting.',
    price: '20 for $560',
    tags: ['Spanish', 'Field', 'Exclusive'],
    cta: 'Buy Spanish local',
  },
  {
    name: 'Spanish Telesales',
    detail: 'Broader Spanish telesales packages for bilingual teams and remote agents.',
    price: '30 for $690',
    tags: ['Spanish', 'Telesales', 'Scalable'],
    cta: 'Buy Spanish telesales',
  },
];

const queue = [
  { buyer: 'Maria Alvarez', product: 'Spanish Local 20', status: 'Awaiting payment', delivery: 'Email + Google Sheet' },
  { buyer: 'Chris Taylor', product: 'English Telesales 35', status: 'Ready to launch', delivery: 'CRM + SMS' },
  { buyer: 'Luis Mendoza', product: 'Custom Fresno local quote', status: 'Needs market review', delivery: 'Pending' },
];

const checklist = [
  'Keep this workspace separate from the live dialer so staff are not making purchase changes inside the in-call screen.',
  'Use existing auth and role checks so only approved ops users or admins can access purchasing controls.',
  'Support package orders, custom local quote intake, and repeat ordering from a buyer history panel.',
  'Capture delivery preferences: email, SMS, Google Sheet, CRM post, or printable export.',
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)]/75">
      {children}
    </span>
  );
}

export default function LeadPurchasePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-neutral-400">UplineAgent • Ops Admin Workspace</div>
          <h1 className="mt-1 text-2xl font-semibold">Lead Purchase</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
            This section is for ops and admin lead sales management, not live calling. Use it to manage product packaging,
            order intake, buyer workflows, and lead delivery operations inside the existing console shell.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-neutral-700" href="/ops/admin">Ops Admin</Link>
          <Link className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:border-blue-400/40" href="/agent">Keep dialer separate</Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
        <div className="panel-elevated p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/80">Purchase workspace</div>
              <h2 className="mt-2 text-lg font-semibold">Agent-facing products, managed from ops</h2>
            </div>
            <Badge>Admin only</Badge>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {productCards.map((card) => (
              <article key={card.name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300/80">Lead product</div>
                <h3 className="mt-2 text-base font-semibold">{card.name}</h3>
                <p className="mt-2 text-sm text-neutral-400">{card.detail}</p>
                <div className="mt-3 text-xl font-semibold text-white">{card.price}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
                <button className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--border-strong)]">
                  {card.cta}
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="panel-elevated p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Ops actions</div>
            <h2 className="mt-2 text-lg font-semibold">What this section should control</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              {checklist.map((item) => (
                <li key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-elevated p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/80">Queue snapshot</div>
            <h2 className="mt-2 text-lg font-semibold">Recent purchase workflow items</h2>
            <div className="mt-4 space-y-3">
              {queue.map((item) => (
                <div key={`${item.buyer}-${item.product}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{item.buyer}</div>
                      <div className="mt-1 text-xs text-neutral-500">{item.product}</div>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                  <div className="mt-3 text-xs text-neutral-400">Delivery: {item.delivery}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel-elevated p-5 lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300/80">Planned layout</div>
          <h2 className="mt-2 text-lg font-semibold">Suggested v1 Lead Purchase workspace structure</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="text-sm font-semibold">Buyer accounts</h3>
              <p className="mt-2 text-sm text-neutral-400">View approved buyers, buyer codes, account status, spending history, and saved delivery preferences.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="text-sm font-semibold">Product catalog</h3>
              <p className="mt-2 text-sm text-neutral-400">Manage live packages, local quote rules, market restrictions, and pricing blocks without touching the dialer.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="text-sm font-semibold">Order intake + review</h3>
              <p className="mt-2 text-sm text-neutral-400">Review new purchases, flag custom local quote requests, and move approved orders into fulfillment.</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <h3 className="text-sm font-semibold">Delivery operations</h3>
              <p className="mt-2 text-sm text-neutral-400">Control destination settings for email, SMS, Google Sheets, CRM posting, and export workflows.</p>
            </div>
          </div>
        </div>

        <div className="panel-elevated p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Build note</div>
          <h2 className="mt-2 text-lg font-semibold">Separate from calling</h2>
          <p className="mt-3 text-sm text-neutral-400">
            The live call screen should stay focused on calls, notes, worksheets, and transfer outcomes. Lead Purchase belongs in the ops/admin area because it deals with products, accounts, orders, billing, and fulfillment.
          </p>
          <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            This page is intentionally shaped like an internal workspace, not an agent in-call tool.
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';
import { headers } from 'next/headers';
import { LeadEditor } from './LeadEditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function baseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getLead(lead_id: string) {
  const url = `${await baseUrl()}/api/ops/lead?lead_id=${encodeURIComponent(lead_id)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load lead: ${res.status}`);
  return res.json();
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-neutral-900 bg-neutral-950 p-3">
      <div className="text-[11px] text-neutral-500">{k}</div>
      <div className="mt-1 text-sm text-neutral-100 break-words">{v || '—'}</div>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { lead_id: string } }) {
  const data = await getLead(params.lead_id);
  const record = data.record as Record<string, string>;

  const topKeys = [
    'full_name',
    'phone_primary',
    'phone_secondary',
    'email',
    'address_city',
    'address_state',
    'dob',
    'age',
    'hobby_interest',
    'beneficiary',
    'coverage_type',
    'status',
    'next_action_at',
    'last_contact_at',
  ];

  const remainingKeys = Object.keys(record).filter((k) => !topKeys.includes(k));

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lead Detail</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Lead ID: <code>{data.lead_id}</code> • Sheet row: {data.rowIndex}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/ops/pipeline">Pipeline</Link>
          <Link className="underline" href="/ops">Ops Home</Link>
          <Link className="underline" href="/agent">Agent Console</Link>
        </div>
      </div>

      <section className="mt-6">
        <LeadEditor leadId={data.lead_id} initial={record} />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Key fields</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {topKeys.map((k) => (
            <Field key={k} k={k} v={record[k] || ''} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">All fields</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {remainingKeys.sort().map((k) => (
            <Field key={k} k={k} v={record[k] || ''} />
          ))}
        </div>
      </section>
    </main>
  );
}

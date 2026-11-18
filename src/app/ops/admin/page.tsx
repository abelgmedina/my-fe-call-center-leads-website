import { headers } from 'next/headers';
import { OpsAdminPanel } from './panel';
import { currentRequestAuthHeaders } from '@/lib/request-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function baseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
  return `${proto}://${host}`;
}

async function getInitial() {
  const b = await baseUrl();
  const authHeaders = await currentRequestAuthHeaders();
  const [deptRes, alertRes] = await Promise.all([
    fetch(`${b}/api/ops/departments`, { cache: 'no-store', headers: authHeaders }),
    fetch(`${b}/api/ops/departments/alerts?limit=20`, { cache: 'no-store', headers: authHeaders }),
  ]);
  if (!deptRes.ok) throw new Error(`Failed departments: ${deptRes.status}`);
  const data = await deptRes.json();
  const alerts = alertRes.ok ? await alertRes.json() : { alerts: [] };
  return { ...data, alerts: alerts.alerts || [] };
}

export default async function OpsAdminPage() {
  const data = await getInitial();
  return <OpsAdminPanel initial={data} />;
}

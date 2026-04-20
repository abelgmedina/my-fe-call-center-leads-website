import { headers } from 'next/headers';
import { OpsAdminPanel } from './panel';

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
  const [deptRes, alertRes] = await Promise.all([
    fetch(`${b}/api/ops/departments`, { cache: 'no-store' }),
    fetch(`${b}/api/ops/departments/alerts?limit=20`, { cache: 'no-store' }),
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

import { headers } from 'next/headers';
import { OpsAdminPanel } from './panel';
import { currentRequestAuthHeaders } from '@/lib/request-auth';
import { safeFetchJson } from '@/lib/safe-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DepartmentPayload = { departments: any[]; graph?: any[]; updatedAt: string };
type AlertPayload = { alerts?: any[] };
type AppHealth = { ok?: boolean; status?: string; now?: string; requestId?: string };
type Dependencies = { ok?: boolean; status?: string; checks?: any[]; now?: string; requestId?: string };

async function baseUrl(): Promise<string | null> {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

async function getInitial() {
  const b = await baseUrl();
  if (!b) {
    return {
      departments: [],
      graph: [],
      alerts: [],
      updatedAt: new Date().toISOString(),
      loadError: 'The request host could not be determined.',
      appHealth: null,
      dependencyHealth: null,
    };
  }
  const authHeaders = await currentRequestAuthHeaders();
  const [deptResult, alertResult, appHealthResult, dependencyHealthResult] = await Promise.all([
    safeFetchJson<DepartmentPayload>(`${b}/api/ops/departments`, { cache: 'no-store', headers: authHeaders }),
    safeFetchJson<AlertPayload>(`${b}/api/ops/departments/alerts?limit=20`, { cache: 'no-store', headers: authHeaders }),
    safeFetchJson<AppHealth>(`${b}/api/health`, { cache: 'no-store' }),
    safeFetchJson<Dependencies>(`${b}/api/health/deps`, { cache: 'no-store', headers: authHeaders }),
  ]);
  const data = deptResult.ok ? deptResult.data : { departments: [], graph: [], updatedAt: new Date().toISOString() };
  const alerts = alertResult.ok ? alertResult.data : { alerts: [] };
  return {
    ...data,
    alerts: alerts.alerts || [],
    loadError: deptResult.ok ? undefined : deptResult.message,
    appHealth: appHealthResult.ok ? appHealthResult.data : null,
    dependencyHealth: dependencyHealthResult.ok
      ? dependencyHealthResult.data
      : { ok: false, status: 'degraded', checks: [], now: new Date().toISOString() },
  };
}

export default async function OpsAdminPage() {
  const data = await getInitial();
  return <OpsAdminPanel initial={data} />;
}

import { NextResponse } from 'next/server';
import { getDepartmentStatuses } from '@/lib/ops-departments';
import { getRecentAlerts, runAlertSweep } from '@/lib/ops-alerts';
import { requireOpsAccess } from '@/lib/ops-access';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const denied = await requireOpsAccess(req, 'owner');
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 20);
  const alerts = getRecentAlerts(limit);
  return NextResponse.json({ ok: true, alerts, updatedAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const denied = await requireOpsAccess(req, 'owner');
  if (denied) return denied;
  const departments = await getDepartmentStatuses();
  const result = await runAlertSweep(departments);
  return NextResponse.json({ ...result, updatedAt: new Date().toISOString() });
}

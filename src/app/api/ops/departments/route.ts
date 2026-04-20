import { NextResponse } from 'next/server';
import { getDepartmentStatuses, getDependencyGraph, runDepartmentAction } from '@/lib/ops-departments';

export const runtime = 'nodejs';

export async function GET() {
  const departments = await getDepartmentStatuses();
  const graph = getDependencyGraph();
  return NextResponse.json({ ok: true, departments, graph, updatedAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string; action?: 'refresh' | 'repair' | 'isolate' | 'restore' } | null;
  const id = String(body?.id || '');
  const action = body?.action;

  if (!id || !action || !['refresh', 'repair', 'isolate', 'restore'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'id + action(required: refresh|repair|isolate|restore)' }, { status: 400 });
  }

  const result = await runDepartmentAction(id, action);
  const departments = await getDepartmentStatuses();
  const graph = getDependencyGraph();
  return NextResponse.json({ ok: true, result, departments, graph, updatedAt: new Date().toISOString() });
}

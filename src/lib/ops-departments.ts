import { headers } from 'next/headers';
import { getDeptMode, setAgentStatus, setDeptMode } from '@/lib/db';
import { internalOpsHeaders } from '@/lib/ops-access';
import { safeFetchJson } from '@/lib/safe-fetch';

export type DeptHealth = 'healthy' | 'degraded' | 'down';
export type DeptMode = 'normal' | 'isolated';

export type DepartmentStatus = {
  id: string;
  name: string;
  lane: string;
  health: DeptHealth;
  mode: DeptMode;
  summary: string;
  checkedAt: string;
  dependencies: string[];
  impacts: string[];
  autoRepairable: boolean;
  runbook: string[];
};

const META: Record<string, { name: string; lane: string; dependencies: string[] }> = {
  inbound_voice: { name: 'Inbound Voice Router', lane: 'voice', dependencies: ['public_edge', 'agent_runtime'] },
  agent_runtime: { name: 'Agent Runtime', lane: 'agent', dependencies: ['public_edge'] },
  ai_intake: { name: 'AI Intake + Handoff', lane: 'voice', dependencies: ['inbound_voice', 'sheets_router'] },
  queue_handoff: { name: 'No-Answer Fallback', lane: 'handoff', dependencies: ['agent_runtime', 'sms_outbound'] },
  sms_outbound: { name: 'SMS / Alerts', lane: 'sms', dependencies: ['public_edge'] },
  power_dialer: { name: 'Power Dialer Lane', lane: 'dialer', dependencies: ['sheets_router', 'public_edge'] },
  sheets_router: { name: 'Sheets Router', lane: 'data', dependencies: [] },
  public_edge: { name: 'Public Edge / Hosted URL', lane: 'edge', dependencies: [] },
};

const AUTO_REPAIRABLE = new Set(['agent_runtime', 'inbound_voice', 'ai_intake', 'queue_handoff', 'power_dialer', 'sms_outbound', 'sheets_router']);

const RUNBOOKS: Record<string, string[]> = {
  inbound_voice: ['Refresh routing check', 'Confirm press-1 maps to agent_abel', 'Run live inbound test call'],
  agent_runtime: ['Set Abel to AVAILABLE', 'Re-register /take tab', 'Retest inbound accept'],
  ai_intake: ['Verify hosted callback configuration', 'Verify handoff TwiML in signed staging call', 'Retest full IVR path with a test number'],
  queue_handoff: ['Validate no-answer short fallback with a signed staging call', 'Confirm callback alert token generation', 'Review the resulting call log'],
  sms_outbound: ['Check Twilio SMS env health', 'Verify alert send path', 'Fallback to voice-only if SMS degraded'],
  power_dialer: ['Refresh queue API', 'Isolate dialer if causing incident', 'Restore after queue health returns'],
  sheets_router: ['Check sheet header health', 'Verify read/write latency', 'Degrade to voice-only if sheets down'],
  public_edge: ['Check /api/health on the hosted deployment', 'Confirm PUBLIC_BASE_URL uses the hosted staging URL', 'Run a signed Twilio staging callback after credentials are configured'],
};

async function selfBaseUrl(): Promise<string | null> {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) return null;
  return `${proto}://${host}`;
}

function withMeta(id: string, health: DeptHealth, summary: string, checkedAt: string): DepartmentStatus {
  const m = META[id] || { name: id, lane: 'misc', dependencies: [] };
  return {
    id,
    name: m.name,
    lane: m.lane,
    mode: getDeptMode(id),
    health,
    summary,
    checkedAt,
    dependencies: m.dependencies,
    impacts: Object.keys(META).filter((k) => META[k].dependencies.includes(id)),
    autoRepairable: AUTO_REPAIRABLE.has(id),
    runbook: RUNBOOKS[id] || ['Refresh status', 'Review logs', 'Escalate to manual repair'],
  };
}

function twilioConfigured() {
  return ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'].every((key) => Boolean(process.env[key]?.trim()));
}

function sheetsConfigured() {
  return ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'UPLINE_SHEETS_SPREADSHEET_ID'].every((key) => Boolean(process.env[key]?.trim()));
}

async function check(base: string | null, id: string): Promise<DepartmentStatus> {
  const now = new Date().toISOString();
  const opsHeaders = internalOpsHeaders();

  if (getDeptMode(id) === 'isolated') {
    return withMeta(id, 'degraded', 'Department intentionally isolated (admin mode).', now);
  }

  try {
    if (!base) return withMeta(id, 'down', 'Hosted URL could not be determined for this request.', now);

    if (id === 'inbound_voice') {
      const configured = twilioConfigured() && Boolean(process.env.PUBLIC_BASE_URL?.trim());
      return withMeta(
        id,
        configured ? 'degraded' : 'down',
        configured ? 'Hosted callback configuration present; awaiting signed staging call.' : 'Twilio credentials or hosted callback URL are not configured.',
        now
      );
    }

    if (id === 'agent_runtime') {
      const result = await safeFetchJson<{ agents?: Array<{ id?: string; status?: string }> }>(`${base}/api/ops/agents`, {
        cache: 'no-store',
        headers: opsHeaders,
      });
      if (!result.ok) return withMeta(id, 'degraded', 'Agent runtime status is unavailable.', now);
      const abel = (result.data.agents || []).find((agent) => agent.id === 'abel');
      const ok = !!abel && abel.status === 'AVAILABLE';
      return withMeta(id, ok ? 'healthy' : 'degraded', ok ? 'Abel is registered/available' : `Abel status is ${abel?.status || 'unknown'}`, now);
    }

    if (id === 'ai_intake') {
      const configured = twilioConfigured() && sheetsConfigured() && Boolean(process.env.PUBLIC_BASE_URL?.trim());
      return withMeta(
        id,
        configured ? 'degraded' : 'down',
        configured ? 'Hosted AI intake dependencies configured; awaiting signed staging call.' : 'AI intake dependencies are not configured.',
        now
      );
    }

    if (id === 'queue_handoff') {
      const configured = twilioConfigured() && Boolean(process.env.PUBLIC_BASE_URL?.trim());
      return withMeta(
        id,
        configured ? 'degraded' : 'down',
        configured ? 'Fallback dependencies configured; awaiting signed staging call.' : 'Fallback dependencies are not configured.',
        now
      );
    }

    if (id === 'sheets_router' || id === 'sms_outbound') {
      if (id === 'sheets_router') {
        const configured = sheetsConfigured();
        return withMeta(
          id,
          configured ? 'degraded' : 'down',
          configured ? 'Hosted Sheets credentials configured; provider read is not yet verified.' : 'Hosted Sheets credentials are not configured.',
          now
        );
      }
      const configured = twilioConfigured() && Boolean(process.env.TWILIO_SMS_FROM?.trim());
      return withMeta(
        id,
        configured ? 'degraded' : 'down',
        configured ? 'Twilio SMS configuration present; provider delivery is not yet verified.' : 'Twilio SMS configuration is not complete.',
        now
      );
    }

    if (id === 'power_dialer') {
      const result = await safeFetchJson<{ grouped?: Record<string, unknown[]> }>(`${base}/api/ops/call/queue`, {
        cache: 'no-store',
        headers: opsHeaders,
      });
      if (!result.ok) return withMeta(id, 'down', 'Queue API is unavailable; dialer is safely blocked.', now);
      const grouped = result.data.grouped || {};
      const queueCount = Object.values(grouped).reduce((n: number, arr: any) => n + (arr?.length || 0), 0);
      return withMeta(id, 'healthy', `Queue API reachable (${queueCount} visible queued leads)`, now);
    }

    if (id === 'public_edge') {
      const result = await safeFetchJson<{ ok?: boolean }>(`${base}/api/health`, { cache: 'no-store' });
      return withMeta(
        id,
        result.ok && result.data.ok ? 'healthy' : 'down',
        result.ok && result.data.ok ? 'Hosted application health endpoint responding' : 'Hosted application health endpoint is unavailable',
        now
      );
    }

    return withMeta(id, 'degraded', 'Unknown department', now);
  } catch {
    return withMeta(id, 'down', 'Check failed. Review the structured server logs using the request ID.', now);
  }
}

export const DEPT_IDS = Object.keys(META) as Array<keyof typeof META>;

export async function getDepartmentStatuses() {
  const base = await selfBaseUrl();
  return Promise.all(DEPT_IDS.map((id) => check(base, id)));
}

export function getDependencyGraph() {
  return DEPT_IDS.map((id) => ({
    id,
    dependsOn: META[id].dependencies,
    impacts: DEPT_IDS.filter((k) => META[k].dependencies.includes(id)),
    mode: getDeptMode(id),
  }));
}

export async function runDepartmentAction(id: string, action: 'refresh' | 'repair' | 'isolate' | 'restore') {
  if (!META[id]) return { ok: false, note: `Unknown department: ${id}` };

  if (action === 'isolate') {
    setDeptMode(id, 'isolated');
    return { ok: true, note: `${META[id].name} set to ISOLATED mode.` };
  }

  if (action === 'restore') {
    setDeptMode(id, 'normal');
    return { ok: true, note: `${META[id].name} restored to NORMAL mode.` };
  }

  if (action === 'refresh') {
    return { ok: true, note: `${META[id].name} refresh completed.` };
  }

  // repair
  if (id === 'agent_runtime') {
    setDeptMode(id, 'normal');
    setAgentStatus('abel', 'AVAILABLE');
    return { ok: true, note: 'Agent runtime repaired: Abel set AVAILABLE and mode restored.' };
  }

  if (id === 'inbound_voice' || id === 'ai_intake' || id === 'queue_handoff' || id === 'power_dialer' || id === 'sms_outbound' || id === 'sheets_router') {
    setDeptMode(id, 'normal');
    return { ok: true, note: `${META[id].name} repair applied: mode restored to NORMAL.` };
  }

  if (id === 'public_edge') return { ok: false, note: 'Hosted deployment repairs are manual; no local tunnel process is managed by this app.' };

  return { ok: false, note: `${META[id].name} has no repair automation yet.` };
}

import { headers } from 'next/headers';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getDeptMode, setAgentStatus, setDeptMode } from '@/lib/db';

const execAsync = promisify(exec);

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
  public_edge: { name: 'Public Edge / Tunnel', lane: 'edge', dependencies: [] },
};

const AUTO_REPAIRABLE = new Set(['agent_runtime', 'inbound_voice', 'ai_intake', 'queue_handoff', 'power_dialer', 'sms_outbound', 'sheets_router', 'public_edge']);

const RUNBOOKS: Record<string, string[]> = {
  inbound_voice: ['Refresh routing check', 'Confirm press-1 maps to agent_abel', 'Run live inbound test call'],
  agent_runtime: ['Set Abel to AVAILABLE', 'Re-register /take tab', 'Retest inbound accept'],
  ai_intake: ['Run synthetic AI intake finish check', 'Verify handoff TwiML contains agent_abel', 'Retest full IVR path'],
  queue_handoff: ['Validate no-answer short fallback', 'Confirm callback alert token generation', 'Run no-answer test call'],
  sms_outbound: ['Check Twilio SMS env health', 'Verify alert send path', 'Fallback to voice-only if SMS degraded'],
  power_dialer: ['Refresh queue API', 'Isolate dialer if causing incident', 'Restore after queue health returns'],
  sheets_router: ['Check sheet header health', 'Verify read/write latency', 'Degrade to voice-only if sheets down'],
  public_edge: ['Check /take public endpoint', 'Restart ngrok reserved tunnel', 'Re-run /take and webhook smoke tests'],
};

async function selfBaseUrl() {
  const h: any = await (headers() as any);
  const host = h?.get?.('host') ?? h?.host;
  const proto = (h?.get?.('x-forwarded-proto') ?? h?.['x-forwarded-proto']) || 'http';
  if (!host) throw new Error('Missing host header');
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

async function check(base: string, id: string): Promise<DepartmentStatus> {
  const now = new Date().toISOString();

  if (getDeptMode(id) === 'isolated') {
    return withMeta(id, 'degraded', 'Department intentionally isolated (admin mode).', now);
  }

  try {
    if (id === 'inbound_voice') {
      const r = await fetch(`${base}/api/twilio/voice/inbound?step=lang&callSid=HEALTHCHECK_INBOUND&from=%2B15555550123`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'Digits=1',
        cache: 'no-store',
      });
      const text = await r.text();
      return withMeta(id, r.ok && text.includes('<Client>agent_abel</Client>') ? 'healthy' : 'down', r.ok ? 'Press-1 routes to Abel' : 'Inbound route not targeting Abel', now);
    }

    if (id === 'agent_runtime') {
      const r = await fetch(`${base}/api/ops/agents`, { cache: 'no-store' });
      const data = await r.json();
      const abel = (data.agents || []).find((a: any) => a.id === 'abel');
      const ok = !!abel && abel.status === 'AVAILABLE';
      return withMeta(id, ok ? 'healthy' : 'degraded', ok ? 'Abel is registered/available' : `Abel status is ${abel?.status || 'unknown'}`, now);
    }

    if (id === 'ai_intake') {
      const r = await fetch(`${base}/api/twilio/voice/ai-intake?step=finish&lang=en&callSid=HEALTHCHECK_AI&from=%2B15555550123`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'Digits=1', cache: 'no-store',
      });
      const text = await r.text();
      return withMeta(id, r.ok && text.includes('<Client>agent_abel</Client>') ? 'healthy' : 'degraded', r.ok ? 'AI intake hands off to Abel when available' : 'AI intake handoff path degraded', now);
    }

    if (id === 'queue_handoff') {
      const r = await fetch(`${base}/api/twilio/voice/dial-status?attempt=2&agent=abel&callSid=HEALTHCHECK_DIAL&from=%2B15555550123`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'DialCallStatus=no-answer&From=%2B15555550123&CallSid=HEALTHCHECK_DIAL', cache: 'no-store',
      });
      const text = await r.text();
      // We accept either the busy-menu redirect (preferred) or a callback message.
      const ok = r.ok && (text.includes('/api/twilio/voice/busy-menu') || text.toLowerCase().includes('call back') || text.toLowerCase().includes('call you back'));
      return withMeta(id, ok ? 'healthy' : 'degraded', 'Short no-answer fallback flow check', now);
    }

    if (id === 'sheets_router' || id === 'sms_outbound') {
      const r = await fetch(`${base}/api/ops/health`, { cache: 'no-store' });
      const data = await r.json();
      const checks = data.checks || [];
      const twilioOk = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_SMS_FROM'].every((k) => checks.find((c: any) => c.name === `env:${k}`)?.ok);
      const sheetsOk = !!checks.find((c: any) => c.name === 'sheets:abel_active_headers')?.ok;
      if (id === 'sheets_router') return withMeta(id, sheetsOk ? 'healthy' : 'down', sheetsOk ? 'Google Sheets path healthy' : 'Sheets check failing', now);
      return withMeta(id, twilioOk ? 'healthy' : 'down', twilioOk ? 'Twilio SMS env/checks healthy' : 'Twilio SMS env/checks failing', now);
    }

    if (id === 'power_dialer') {
      const r = await fetch(`${base}/api/ops/call/queue`, { cache: 'no-store' });
      const data = await r.json();
      const grouped = data.grouped || {};
      const queueCount = Object.values(grouped).reduce((n: number, arr: any) => n + (arr?.length || 0), 0);
      return withMeta(id, r.ok ? 'healthy' : 'down', `Queue API reachable (${queueCount} visible queued leads)`, now);
    }

    if (id === 'public_edge') {
      const r = await fetch(`${base}/take`, { cache: 'no-store' });
      return withMeta(id, r.ok ? 'healthy' : 'down', r.ok ? 'Public /take endpoint responding' : 'Public /take endpoint not reachable', now);
    }

    return withMeta(id, 'degraded', 'Unknown department', now);
  } catch (e: any) {
    return withMeta(id, 'down', `Check failed: ${e?.message || 'unknown error'}`, now);
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

  if (id === 'public_edge') {
    try {
      const url = process.env.PUBLIC_BASE_URL || '';
      const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!host) return { ok: false, note: 'PUBLIC_BASE_URL not set; cannot auto-restart tunnel.' };
      await execAsync(`pkill -f "ngrok http --url=${host} 3001" || true`);
      await execAsync(`nohup ngrok http --url=${host} 3001 >/tmp/fe-ngrok.log 2>&1 &`);
      setDeptMode(id, 'normal');
      return { ok: true, note: `Public edge repair attempted: restarted ngrok for ${host}.` };
    } catch (e: any) {
      return { ok: false, note: `Public edge repair failed: ${e?.message || 'unknown error'}` };
    }
  }

  return { ok: false, note: `${META[id].name} has no repair automation yet.` };
}

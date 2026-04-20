import { db } from '@/lib/db';
import { getTwilioClient, requireEnv } from '@/lib/twilio';
import type { DepartmentStatus } from '@/lib/ops-departments';

function nowMs() {
  return Date.now();
}

export async function runAlertSweep(departments: DepartmentStatus[]) {
  const now = nowMs();
  const transitions: Array<{ id: string; prev: string | null; next: string }> = [];

  for (const d of departments) {
    const prev = db.prepare('select health from dept_health_state where dept_id = ?').get(d.id) as { health: string } | undefined;

    if (!prev) {
      db.prepare(
        `insert into dept_health_state (dept_id, health, last_changed_at, last_checked_at, last_alerted_health, last_alerted_at)
         values (?, ?, ?, ?, null, null)`
      ).run(d.id, d.health, now, now);
      continue;
    }

    if (prev.health !== d.health) {
      transitions.push({ id: d.id, prev: prev.health, next: d.health });
      db.prepare(
        `update dept_health_state
         set health = ?, last_changed_at = ?, last_checked_at = ?
         where dept_id = ?`
      ).run(d.health, now, now, d.id);
    } else {
      db.prepare('update dept_health_state set last_checked_at = ? where dept_id = ?').run(now, d.id);
    }
  }

  if (!transitions.length) {
    const recent = db.prepare('select id, dept_id, prev_health, next_health, message, created_at, notified from dept_alert_events order by id desc limit 20').all();
    return { ok: true, changed: 0, notified: false, events: recent };
  }

  const messageLines = transitions.map((t) => `• ${t.id}: ${t.prev || 'unknown'} -> ${t.next}`);
  const msg = `FE Ops health changes:\n${messageLines.join('\n')}`;

  for (const t of transitions) {
    db.prepare(
      'insert into dept_alert_events (dept_id, prev_health, next_health, message, created_at, notified) values (?, ?, ?, ?, ?, 0)'
    ).run(t.id, t.prev, t.next, `${t.id}: ${t.prev || 'unknown'} -> ${t.next}`, now);
  }

  let notified = false;
  try {
    const from = requireEnv('TWILIO_SMS_FROM');
    const to = requireEnv('ALERT_TO');
    const client = getTwilioClient();
    await client.messages.create({ from, to, body: msg.slice(0, 1500) });
    notified = true;
  } catch {
    notified = false;
  }

  if (notified) {
    db.prepare('update dept_alert_events set notified = 1 where created_at = ?').run(now);
  }

  const recent = db.prepare('select id, dept_id, prev_health, next_health, message, created_at, notified from dept_alert_events order by id desc limit 20').all();
  return { ok: true, changed: transitions.length, notified, events: recent };
}

export function getRecentAlerts(limit = 20) {
  const n = Math.max(1, Math.min(100, limit));
  return db
    .prepare('select id, dept_id, prev_health, next_health, message, created_at, notified from dept_alert_events order by id desc limit ?')
    .all(n);
}

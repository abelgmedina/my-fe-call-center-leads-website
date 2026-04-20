import { db } from '@/lib/db';

export type CallDirection = 'inbound' | 'outbound';

export function upsertCall(params: {
  call_sid: string;
  direction: CallDirection;
  from_number?: string | null;
  to_number?: string | null;
  buyer_code?: string | null;
  campaign_code?: string | null;
  language?: string | null;
  status?: string | null;
  duration_seconds?: number | null;
}) {
  const now = Date.now();
  const existing = db.prepare('select call_sid from calls where call_sid = ?').get(params.call_sid) as any;

  const buyer = params.buyer_code ?? 'upline_internal';
  const campaign = params.campaign_code ?? 'unattributed';

  if (!existing) {
    db.prepare(
      `insert into calls (call_sid, created_at, direction, from_number, to_number, buyer_code, campaign_code, language, status, duration_seconds,
        qualified_90s, billable_call, billable_qualified, billable_transfer)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`
    ).run(
      params.call_sid,
      now,
      params.direction,
      params.from_number ?? null,
      params.to_number ?? null,
      buyer,
      campaign,
      params.language ?? null,
      params.status ?? null,
      params.duration_seconds ?? null
    );
  } else {
    const patch: Record<string, any> = {
      direction: params.direction,
      from_number: params.from_number ?? null,
      to_number: params.to_number ?? null,
      buyer_code: buyer,
      campaign_code: campaign,
    };
    if (params.language != null) patch.language = params.language;
    if (params.status != null) patch.status = params.status;
    if (params.duration_seconds != null) patch.duration_seconds = params.duration_seconds;

    for (const [k, v] of Object.entries(patch)) {
      db.prepare(`update calls set ${k} = ? where call_sid = ?`).run(v, params.call_sid);
    }
  }
}

export function updateQualification(callSid: string, durationSeconds: number, status?: string | null) {
  const qualified90 = durationSeconds >= 90 ? 1 : 0;
  const billableCall = status && String(status).toLowerCase() === 'answered' ? 1 : 0;
  const billableQualified = qualified90;
  db.prepare(
    `update calls set duration_seconds = ?, qualified_90s = ?, billable_call = ?, billable_qualified = ?, status = coalesce(?, status)
     where call_sid = ?`
  ).run(durationSeconds, qualified90, billableCall, billableQualified, status ?? null, callSid);
}

export function ensureTransfer(callSid: string, buyer_code: string, target_agent_id: string | null) {
  const row = db.prepare('select id from transfers where call_sid = ? order by id desc limit 1').get(callSid) as any;
  if (row?.id) return row.id as number;
  const now = Date.now();
  const info = db
    .prepare('insert into transfers (call_sid, buyer_code, target_agent_id, accepted_by_agent_id, accepted_at, created_at) values (?, ?, ?, null, null, ?)')
    .run(callSid, buyer_code, target_agent_id, now);
  return Number(info.lastInsertRowid);
}

export function acceptTransfer(callSid: string, accepted_by_agent_id: string) {
  const now = Date.now();
  // Update latest transfer row for callSid
  const row = db.prepare('select id, buyer_code from transfers where call_sid = ? order by id desc limit 1').get(callSid) as any;
  if (row?.id) {
    db.prepare('update transfers set accepted_by_agent_id = ?, accepted_at = ? where id = ?').run(accepted_by_agent_id, now, row.id);
  } else {
    // if none exists, create one using current call buyer
    const call = db.prepare('select buyer_code from calls where call_sid = ?').get(callSid) as any;
    const buyer = call?.buyer_code || 'upline_internal';
    db.prepare(
      'insert into transfers (call_sid, buyer_code, target_agent_id, accepted_by_agent_id, accepted_at, created_at) values (?, ?, null, ?, ?, ?)'
    ).run(callSid, buyer, accepted_by_agent_id, now, now);
  }

  db.prepare('update calls set billable_transfer = 1 where call_sid = ?').run(callSid);
}

export function assignBuyer(callSid: string, buyer_code: string, campaign_code: string | null) {
  db.prepare('update calls set buyer_code = ?, campaign_code = coalesce(?, campaign_code) where call_sid = ?').run(
    buyer_code,
    campaign_code,
    callSid
  );
}

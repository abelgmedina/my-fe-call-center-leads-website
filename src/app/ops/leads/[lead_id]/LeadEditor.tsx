'use client';

import { useMemo, useState } from 'react';

const STATUSES = [
  'READY_FOR_SMS',
  'SMS_IN_PROGRESS',
  'SMS_HOT',
  'SMS_APPT_SET',
  'QUALIFIED_TRANSFER_NOW',
  'TRANSFERRED_TO_ABEL',
  'NO_ANSWER',
  'BAD_NUMBER',
  'OPT_OUT',
  'CALL_APPT_SET',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

export function LeadEditor({ leadId, initial }: { leadId: string; initial: Record<string, string> }) {
  const [status, setStatus] = useState(initial.status || '');
  const [nextAction, setNextAction] = useState(initial.next_action_at || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [outcome, setOutcome] = useState(initial.last_outcome || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const dirty = useMemo(() => {
    return (
      status !== (initial.status || '') ||
      nextAction !== (initial.next_action_at || '') ||
      notes !== (initial.notes || '') ||
      outcome !== (initial.last_outcome || '')
    );
  }, [status, nextAction, notes, outcome, initial]);

  async function applyPatch(patch: Record<string, string>) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ops/lead/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg('Saved. (Refresh to see updated fields reloaded from Sheets)');
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    try {
      await applyPatch({
        status,
        next_action_at: nextAction,
        notes,
        last_outcome: outcome,
      });
    } catch (e: any) {
      setMsg(`Save failed: ${e?.message || e}`);
    }
  }

  async function startCall() {
    setMsg(null);
    try {
      const st = (status || initial.status || '').trim();
      if (st === 'OPT_OUT' || st === 'BAD_NUMBER') {
        throw new Error(`Call blocked for status=${st}.`);
      }

      const raw = (initial.phone_primary || '').trim();
      if (!raw) throw new Error('No phone_primary on this lead');
      // naive: if it already has +, use it; else assume US 10-digit
      const to = raw.startsWith('+') ? raw : raw.length === 10 ? `+1${raw}` : raw;
      const res = await fetch('/api/ops/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, lead_id: leadId, state: (initial.address_state || '').trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMsg(
        `Calling ${to} (CallSid ${data.callSid}). Window=${data.bucket} leadTz=${data.timeZone}. If they answer, they will be queued for /agent.`
      );
    } catch (e: any) {
      setMsg(`Call failed: ${e?.message || e}`);
    }
  }

  async function dispoNoAnswer() {
    try {
      const next = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const appended = (notes || initial.notes || '').trim();
      const newNotes = (appended ? appended + '\n' : '') + `NO ANSWER @ ${new Date().toLocaleString()}`;
      setStatus('NO_ANSWER');
      setNextAction(next);
      setOutcome('NO_ANSWER');
      setNotes(newNotes);
      await applyPatch({ status: 'NO_ANSWER', next_action_at: next, last_outcome: 'NO_ANSWER', notes: newNotes });
    } catch (e: any) {
      setMsg(`Disposition failed: ${e?.message || e}`);
    }
  }

  async function dispoCallback() {
    try {
      const mins = window.prompt('Callback in how many minutes?', '60');
      if (!mins) return;
      const m = Number(mins);
      if (!Number.isFinite(m) || m <= 0) throw new Error('Invalid minutes');
      const next = new Date(Date.now() + m * 60 * 1000).toISOString();
      const appended = (notes || initial.notes || '').trim();
      const newNotes = (appended ? appended + '\n' : '') + `CALLBACK set for ${next}`;
      setStatus('CALL_APPT_SET');
      setNextAction(next);
      setOutcome('CALLBACK');
      setNotes(newNotes);
      await applyPatch({ status: 'CALL_APPT_SET', next_action_at: next, last_outcome: 'CALLBACK', notes: newNotes });
    } catch (e: any) {
      setMsg(`Disposition failed: ${e?.message || e}`);
    }
  }

  async function dispoBadNumber() {
    try {
      const appended = (notes || initial.notes || '').trim();
      const newNotes = (appended ? appended + '\n' : '') + `BAD NUMBER @ ${new Date().toLocaleString()}`;
      setStatus('BAD_NUMBER');
      setNextAction('');
      setOutcome('BAD_NUMBER');
      setNotes(newNotes);
      await applyPatch({ status: 'BAD_NUMBER', next_action_at: '', last_outcome: 'BAD_NUMBER', notes: newNotes });
    } catch (e: any) {
      setMsg(`Disposition failed: ${e?.message || e}`);
    }
  }

  async function dispoDnc() {
    try {
      const ok = window.confirm('Mark as OPT_OUT / DNC? This should stop all outreach.');
      if (!ok) return;
      const appended = (notes || initial.notes || '').trim();
      const newNotes = (appended ? appended + '\n' : '') + `OPT_OUT/DNC @ ${new Date().toLocaleString()}`;
      setStatus('OPT_OUT');
      setNextAction('');
      setOutcome('OPT_OUT');
      setNotes(newNotes);
      await applyPatch({ status: 'OPT_OUT', next_action_at: '', last_outcome: 'OPT_OUT', notes: newNotes });
    } catch (e: any) {
      setMsg(`Disposition failed: ${e?.message || e}`);
    }
  }

  async function dispoTransferNow() {
    try {
      const appended = (notes || initial.notes || '').trim();
      const newNotes = (appended ? appended + '\n' : '') + `QUALIFIED TRANSFER NOW @ ${new Date().toLocaleString()}`;
      setStatus('QUALIFIED_TRANSFER_NOW');
      setOutcome('QUALIFIED_TRANSFER_NOW');
      setNotes(newNotes);
      await applyPatch({ status: 'QUALIFIED_TRANSFER_NOW', last_outcome: 'QUALIFIED_TRANSFER_NOW', notes: newNotes, next_action_at: '' });
    } catch (e: any) {
      setMsg(`Disposition failed: ${e?.message || e}`);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied to clipboard.');
    } catch {
      // Fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setMsg('Copied to clipboard.');
      } catch (e: any) {
        setMsg(`Copy failed: ${e?.message || e}`);
      }
    }
  }

  function firstName() {
    const n = (initial.full_name || '').trim();
    if (!n) return '';
    return n.split(/\s+/)[0] || '';
  }

  function memoryJogScript() {
    const state = (initial.address_state || '').trim();
    const hobby = (initial.hobby_interest || '').trim();
    const city = (initial.address_city || '').trim();
    const pieces = [state, hobby || city].filter(Boolean);
    const hint = pieces.length ? pieces.join(' and ') : 'a request for burial/cremation info';
    return `Totally fair. The request we received listed ${hint}. Does that ring a bell — or is this the wrong person?`;
  }

  function wrongPersonPivotScript() {
    return `Got it — sorry about that. Before I let you go, quick yes/no: would you or anyone in your family benefit from having burial or cremation expense coverage so costs don’t fall on loved ones? If not, I’ll remove this number.`;
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Edit lead</div>
        <div className="text-xs text-neutral-500">{dirty ? 'Unsaved changes' : 'Up to date'}</div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          <div className="text-xs text-neutral-400">Status</div>
          <select
            className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">(blank)</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="text-xs text-neutral-400">Next action at (ISO or free text)</div>
          <input
            className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 p-2"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="2026-02-28T19:30:00Z"
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-xs text-neutral-400">Notes</div>
          <textarea
            className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 p-2"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-xs text-neutral-400">Last outcome</div>
          <input
            className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 p-2"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g., requested callback, not interested, wrong number"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <button
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-medium text-neutral-100 disabled:opacity-50"
          onClick={startCall}
          disabled={saving}
        >
          Call lead (queue)
        </button>

        <button
          className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 disabled:opacity-50"
          onClick={() => copy(memoryJogScript())}
          disabled={saving}
        >
          Copy memory jog
        </button>

        <button
          className="rounded-md border border-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 disabled:opacity-50"
          onClick={() => copy(wrongPersonPivotScript())}
          disabled={saving}
        >
          Copy wrong-person pivot
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="text-xs text-neutral-500">Dispositions:</div>
        <button className="rounded-md border border-neutral-800 px-2 py-1 text-xs disabled:opacity-50" onClick={dispoNoAnswer} disabled={saving}>
          No answer (+4h)
        </button>
        <button className="rounded-md border border-neutral-800 px-2 py-1 text-xs disabled:opacity-50" onClick={dispoCallback} disabled={saving}>
          Callback…
        </button>
        <button className="rounded-md border border-neutral-800 px-2 py-1 text-xs disabled:opacity-50" onClick={dispoTransferNow} disabled={saving}>
          Qualified transfer now
        </button>
        <button className="rounded-md border border-neutral-800 px-2 py-1 text-xs disabled:opacity-50" onClick={dispoBadNumber} disabled={saving}>
          Bad number
        </button>
        <button className="rounded-md border border-red-900 px-2 py-1 text-xs text-red-200 disabled:opacity-50" onClick={dispoDnc} disabled={saving}>
          OPT OUT / DNC
        </button>
      </div>

      {msg ? <div className="mt-3 text-xs text-neutral-400">{msg}</div> : null}
    </div>
  );
}

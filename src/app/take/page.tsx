'use client';

import { useEffect, useMemo, useState } from 'react';

type ValidateResult =
  | { valid: true; callerFrom: string | null; createdAt: number; expiresAt: number }
  | { valid: false; error: string };

type DeviceState =
  | { kind: 'idle' }
  | { kind: 'initializing' }
  | { kind: 'ready' }
  | { kind: 'error'; error: string };

export default function TakePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;

  const [val, setVal] = useState<ValidateResult | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState>({ kind: 'idle' });
  const [confirmState, setConfirmState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const twilio = useMemo(() => ({ device: null as any, activeCall: null as any }), []);

  useEffect(() => {
    (async () => {
      // Require agent login before allowing take.
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        const rt = token ? `/take?token=${encodeURIComponent(token)}` : '/take';
        window.location.href = `/agent/login?returnTo=${encodeURIComponent(rt)}`;
        return;
      }

      if (!token) {
        setVal({ valid: false, error: 'Missing token' });
        return;
      }
      const res = await fetch(`/api/take/validate?token=${encodeURIComponent(token)}`);
      const data = (await res.json()) as any;
      if (res.ok) setVal(data as ValidateResult);
      else setVal({ valid: false, error: data?.error ?? 'Invalid token' });
    })();
  }, [token]);

  async function initDevice() {
    try {
      setDeviceState({ kind: 'initializing' });
      const sdk = await import('@twilio/voice-sdk');

      const tokRes = await fetch('/api/twilio/token');
      const tok = (await tokRes.json()) as { token: string };

      const device = new sdk.Device(tok.token, {
        closeProtection: true,
      });

      device.on('error', (e: any) => {
        setDeviceState({ kind: 'error', error: e?.message ?? String(e) });
      });

      device.on('incoming', (call: any) => {
        twilio.activeCall = call;
        // For safety, do NOT auto-accept. Show the browser's native UI + let user tap Accept in the /agent page.
        // In this minimal take flow, we auto-accept to reduce taps.
        call.accept();
      });

      await device.register();
      twilio.device = device;
      setDeviceState({ kind: 'ready' });
    } catch (e: any) {
      setDeviceState({ kind: 'error', error: e?.message ?? String(e) });
    }
  }

  async function confirmTake() {
    if (!token) return;
    setConfirmError(null);

    // Ensure the WebRTC device is registered BEFORE we dequeue the caller.
    if (deviceState.kind !== 'ready') {
      await initDevice();
    }

    setConfirmState('working');
    const res = await fetch('/api/take/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      setConfirmState('error');
      setConfirmError(data?.error ?? 'Failed');
      return;
    }

    setConfirmState('done');
  }

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-xl font-semibold">Take waiting call</h1>

      {!val && <div className="mt-4 text-sm text-gray-600">Loading…</div>}

      {val && !val.valid && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{val.error}</div>
      )}

      {val && val.valid && (
        <section className="mt-4 rounded border p-4">
          <div className="text-sm text-gray-700">
            <div>
              Caller: <span className="font-medium">{val.callerFrom ?? 'Unknown'}</span>
            </div>
            <div>
              Expires: <span className="font-medium">{new Date(val.expiresAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600">
              Device: {deviceState.kind === 'idle' && 'Not ready'}
              {deviceState.kind === 'initializing' && 'Initializing (allow mic permission)…'}
              {deviceState.kind === 'ready' && 'Ready'}
              {deviceState.kind === 'error' && `Error: ${deviceState.error}`}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={initDevice}>
                Prepare device
              </button>
              <button className="rounded bg-green-600 px-3 py-2 text-sm text-white" onClick={confirmTake}>
                Take oldest waiting call
              </button>
            </div>

            {confirmState === 'working' && <div className="mt-3 text-sm text-gray-600">Connecting…</div>}
            {confirmState === 'done' && (
              <div className="mt-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Dequeued. You should be connected shortly.
              </div>
            )}
            {confirmState === 'error' && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {confirmError ?? 'Failed'}
              </div>
            )}
          </div>
        </section>
      )}

      <p className="mt-6 text-xs text-gray-500">
        Note: Mobile WebRTC can be finicky. Keep this page in the foreground and ensure mic permissions are granted.
      </p>
    </main>
  );
}

'use client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const incidentId = error.digest || 'unavailable';

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617', color: '#f8fafc', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <section style={{ width: '100%', maxWidth: '560px', border: '1px solid #334155', borderRadius: '16px', padding: '32px', background: '#0f172a' }}>
            <p style={{ margin: 0, color: '#60a5fa', fontSize: '12px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>UplineAgent</p>
            <h1 style={{ margin: '16px 0 0', fontSize: '28px' }}>We hit a temporary problem.</h1>
            <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>Your information has not been changed. Please retry in a moment.</p>
            <p style={{ color: '#94a3b8', fontSize: '12px' }}>Reference: {incidentId}</p>
            <button
              type="button"
              onClick={reset}
              style={{ border: 0, borderRadius: '8px', padding: '10px 16px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}

'use client';

type OpsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OpsError({ error, reset }: OpsErrorProps) {
  const incidentId = error.digest || 'ops-unavailable';

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-8 text-slate-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/30 dark:text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Ops status</p>
        <h1 className="mt-3 text-2xl font-bold">Operations data is temporarily unavailable.</h1>
        <p className="mt-3 max-w-xl text-slate-700 dark:text-slate-200">
          No operational changes were made. Retry the page after the dependency recovers, or return to the dashboard.
        </p>
        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">Reference: {incidentId}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-500"
          >
            Retry Ops
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-amber-500/60 px-4 py-2 font-semibold text-slate-800 transition hover:bg-amber-100 dark:text-white dark:hover:bg-amber-950/50"
          >
            Return to dashboard
          </a>
        </div>
      </section>
    </main>
  );
}

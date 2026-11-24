'use client';

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  const incidentId = error.digest || 'unavailable';

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">UplineAgent</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">This page is temporarily unavailable.</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Your session and data have not been changed. Try again, or return to your dashboard if the problem continues.
        </p>
        <p className="mt-4 text-xs text-slate-500">Reference: {incidentId}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-500"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
          >
            Return to dashboard
          </a>
        </div>
      </section>
    </main>
  );
}

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-[rgba(4,8,18,0.98)] px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Terms & Conditions</div>
        <h1 className="mt-3 text-4xl font-semibold">Terms & Conditions</h1>
        <p className="mt-6 text-sm leading-7 text-[var(--muted)]">
          By using UplineAgent.com, you agree to use this site for lawful business purposes related to lead purchases, campaign inquiries, and account requests.
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Lead delivery timing, campaign setup, and service availability may vary based on market conditions, platform approval, territory, ad spend, and operational capacity. Nothing on this site guarantees sales results, policy placements, or production outcomes.
        </p>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          For service questions, billing matters, or support requests, contact agm@uplineagent.com.
        </p>
      </div>
    </main>
  );
}

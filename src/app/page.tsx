import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Twilio Call Center (MVP)</h1>
      <p className="mt-2 text-sm text-gray-600">
        Single-agent browser UI + Twilio inbound calls + queue + SMS “take call” link.
      </p>

      <div className="mt-6 flex gap-4">
        <Link className="rounded bg-black px-4 py-2 text-white" href="/agent">
          Agent dashboard
        </Link>
      </div>
    </main>
  );
}

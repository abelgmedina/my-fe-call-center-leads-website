import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerAdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const me: any = await requireAgent();
    if ((me.role || 'internal') !== 'buyer' || !me.buyer_code || me.buyer_role !== 'buyer_admin') {
      redirect('/agent');
    }
  } catch {
    redirect('/agent/login?returnTo=/buyer/admin/agents');
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--topbar)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-wide text-neutral-400">Buyer Admin</div>
            <div className="mt-1 text-lg font-semibold">Nobel Agency LLC</div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80" href="/buyer/reports">
              Reports
            </Link>
            <Link className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80" href="/agent">
              Agent Console
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}

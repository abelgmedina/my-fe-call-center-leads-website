import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  try {
    const agent = await requireAgent();
    if ((agent.role || 'internal') !== 'buyer' || !agent.buyer_code) {
      redirect('/agent');
    }
  } catch {
    redirect('/agent/login?returnTo=/buyer/reports');
  }

  return <div className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">{children}</div>;
}

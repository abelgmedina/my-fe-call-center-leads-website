import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  let agent: any;
  try {
    agent = await requireAgent();
  } catch {
    redirect('/agent/login?returnTo=/buyer/marketplace');
  }

  if ((agent.role || 'internal') !== 'buyer' || !agent.buyer_code) {
    redirect('/agent');
  }

  return <div className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">{children}</div>;
}

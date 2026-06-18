import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerAdminLayout({ children }: { children: React.ReactNode }) {
  let me: any;
  try {
    me = await requireAgent();
  } catch {
    redirect('/agent/login?returnTo=/buyer/marketplace');
  }

  void children;
  void me;
  redirect('/buyer/marketplace');
}

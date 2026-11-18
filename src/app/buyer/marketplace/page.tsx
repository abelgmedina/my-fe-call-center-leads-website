import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import BuyerMarketplace from './BuyerMarketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerMarketplacePage() {
  const me = await requireAgent();
  if ((me.role || 'internal') !== 'buyer') redirect('/agent/login?returnTo=/buyer/marketplace');

  return <BuyerMarketplace />;
}

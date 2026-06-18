import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import { getBuyerOnboardingFromStore, isGitHubStoreConfigured } from '@/lib/github-store';
import BuyerMarketplace from './BuyerMarketplace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BuyerMarketplacePage() {
  const me: any = await requireAgent();
  if ((me.role || 'internal') !== 'buyer') redirect('/agent/login?returnTo=/buyer/marketplace');

  if (isGitHubStoreConfigured()) {
    const status = await getBuyerOnboardingFromStore(me.username);
    if (!status?.complete) redirect('/buyer/onboarding');
  }

  return <BuyerMarketplace />;
}

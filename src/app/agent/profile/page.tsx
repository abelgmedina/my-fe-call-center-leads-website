import { redirect } from 'next/navigation';
import { requirePortalAccount } from '@/lib/auth';
import AgentPortal from '../home/AgentPortal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPortalAccountOrNull() {
  try {
    return await requirePortalAccount();
  } catch {
    return null;
  }
}

export default async function AgentProfilePage() {
  const account = await getPortalAccountOrNull();
  if (!account) redirect('/agent/login?returnTo=/agent/profile');
  return <AgentPortal initialAccount={account} />;
}

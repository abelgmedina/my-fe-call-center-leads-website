import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth';
import AgentConsole from './AgentConsole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  let agent: any;
  try {
    agent = await requireAgent();
  } catch {
    redirect('/agent/login?returnTo=/agent');
  }

  if ((agent.role || 'internal') === 'buyer') {
    redirect('/buyer/marketplace');
  }

  return <AgentConsole />;
}

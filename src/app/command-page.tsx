import { redirect } from 'next/navigation';
import CommandWorkspace from '@/components/command/CommandWorkspace';
import { getSession, requireAgent, requirePortalAccount } from '@/lib/auth';
import type { CommandView } from '@/lib/command-routes';
import { isPreviewDemoMode } from '@/lib/preview-demo';

async function getPortalAccountOrNull() {
  try { return await requirePortalAccount(); } catch { return null; }
}
async function getAgentOrNull() {
  try { return await requireAgent(); } catch { return null; }
}

/** Shared entry point for all direct Command Center URLs. */
export default async function CommandRoutePage({ view }: { view: CommandView }) {
  const session = await getSession();
  if (!session) redirect(`/agent/login?returnTo=${encodeURIComponent(view === 'home' ? '/dashboard' : `/${view === 'ai-upline' ? 'ai' : view}`)}`);

  const demoEnabled = isPreviewDemoMode();
  if (session.kind === 'portal') {
    const account = await getPortalAccountOrNull();
    if (!account) redirect('/agent/login?returnTo=/dashboard');
    return <CommandWorkspace view={view} displayName={account.full_name || account.email} role={demoEnabled ? 'Preview Owner · Demo' : 'Restricted agent'} demoEnabled={demoEnabled} isOwner={demoEnabled} />;
  }

  const agent = await getAgentOrNull();
  if (!agent) redirect('/agent/login?returnTo=/dashboard');
  const isOwner = agent.id === 'abel' || demoEnabled;
  const role = demoEnabled ? 'Preview Owner · Demo' : agent.id === 'abel' ? 'Owner' : agent.role === 'buyer' ? 'Buyer' : 'Independent Agent';
  return <CommandWorkspace view={view} displayName={agent.name || agent.username || agent.id} role={role} demoEnabled={demoEnabled} isOwner={isOwner} />;
}

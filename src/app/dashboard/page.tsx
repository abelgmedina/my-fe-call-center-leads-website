import { redirect } from 'next/navigation';
import { getSession, requireAgent, requirePortalAccount } from '@/lib/auth';
import CommandCenter, { type CommandCenterMode } from './CommandCenter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getPortalAccountOrNull() {
  try {
    return await requirePortalAccount();
  } catch {
    return null;
  }
}

async function getAgentOrNull() {
  try {
    return await requireAgent();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/agent/login?returnTo=/dashboard');

  if (session.kind === 'portal') {
    const account = await getPortalAccountOrNull();
    if (!account) redirect('/agent/login?returnTo=/dashboard');
    return (
      <CommandCenter
        mode="restricted"
        displayName={account.full_name || account.email}
        email={account.email}
        profileHref="/agent/profile"
      />
    );
  }

  const agent = await getAgentOrNull();
  if (!agent) redirect('/agent/login?returnTo=/dashboard');
  const role = agent.role || 'internal';
  const mode: CommandCenterMode = role === 'buyer' ? 'buyer' : agent.id === 'abel' ? 'owner' : 'operator';
  return (
    <CommandCenter
      mode={mode}
      displayName={agent.name || agent.username || agent.id}
      email={agent.username || ''}
      profileHref={mode === 'buyer' ? '/buyer/marketplace' : undefined}
    />
  );
}

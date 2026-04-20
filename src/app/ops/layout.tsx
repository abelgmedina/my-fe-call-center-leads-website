import { redirect } from 'next/navigation';
import { OpsShell } from '@/components/ops-shell';
import { requireAgent } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // Manager gate: Ops UI is for Abel only.
  try {
    const agent = await requireAgent();
    if (agent.id !== 'abel') {
      redirect('/agent');
    }
  } catch {
    redirect('/agent/login?returnTo=/ops');
  }

  return <OpsShell>{children}</OpsShell>;
}

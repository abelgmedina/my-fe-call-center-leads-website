import CommandRoutePage from '@/app/command-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  return <CommandRoutePage view="home" />;
}

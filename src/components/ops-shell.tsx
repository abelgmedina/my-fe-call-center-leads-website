import Link from 'next/link';
import { ThemeToggle } from '@/components/theme';
import { StatusChips } from '@/components/status-chips';
import { LogoutButton } from '@/components/logout-button';

export function OpsShell({
  title,
  children,
  breadcrumbs,
}: {
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] p-4 md:flex">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-wide">UplineAgent</div>
            <div className="text-xs text-neutral-500">Ops</div>
          </div>

          <nav className="mt-6 flex flex-col gap-1 text-sm">
            <Nav href="/agent" label="Inbound Calls Screen" />
            <Nav href="/ops/call-queue" label="Call Queue" />
            <Nav href="/ops/dialer" label="Power Dialer" />
            <Nav href="/ops" label="Dashboard" />
            <Nav href="/ops/pipeline" label="Pipeline" />
            <Nav href="/ops/agents" label="Agents" />
            <Nav href="/ops/lead-purchase" label="Lead Purchase" />
            <Nav href="/ops/admin" label="Ops Admin" />
            <div className="mt-2 border-t border-[var(--border)] pt-2">
              <Nav href="/agent" label="Agent Console Home" />
            </div>
          </nav>

          <div className="mt-auto pt-6">
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--topbar)] px-4 py-3">
            <div className="min-w-0">
              {breadcrumbs?.length ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                  {breadcrumbs.map((b, i) => (
                    <span key={i} className="truncate">
                      {b.href ? <Link className="underline" href={b.href}>{b.label}</Link> : b.label}
                      {i < breadcrumbs.length - 1 ? ' / ' : ''}
                    </span>
                  ))}
                </div>
              ) : null}
              {title ? <h1 className="mt-1 text-lg font-semibold">{title}</h1> : null}
            </div>

            <div className="flex items-center gap-3">
              <StatusChips />
              <LogoutButton />
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Nav({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-[var(--foreground)]/80 hover:bg-[var(--surface-2)]"
    >
      {label}
    </Link>
  );
}

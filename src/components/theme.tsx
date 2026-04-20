'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const DEFAULT_THEME: Theme = 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return DEFAULT_THEME;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('theme', next);
    document.documentElement.dataset.theme = next;
  }

  return { theme, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        (className || '') +
        ' inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]/80 hover:border-[var(--border-strong)]'
      }
      aria-label="Toggle theme"
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: theme === 'dark' ? '#22c55e' : '#60a5fa' }} />
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}

// Script to set theme before React mounts (prevents flash)
export function ThemeInitScript() {
  const code = `(() => {
    try {
      const stored = localStorage.getItem('theme');
      const t = (stored === 'light' || stored === 'dark') ? stored : '${DEFAULT_THEME}';
      document.documentElement.dataset.theme = t;
      if (!stored) localStorage.setItem('theme', t);
    } catch (e) {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

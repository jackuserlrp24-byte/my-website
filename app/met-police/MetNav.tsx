'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Each tab also "owns" the older pages that now live under it, so the right tab stays highlighted on them.
// `panel` is the maintenance switch for that tab (see lib/maintenance-config.ts).
const TABS = [
  { href: '/met-police/incidents', panel: 'met-incidents', label: 'My Incidents', owns: [] as string[] },
  { href: '/met-police/reports', panel: 'met-reports', label: 'Reports', owns: ['/met-police/forms'] },
  { href: '/met-police/checks', panel: 'met-checks', label: 'Checks', owns: [] },
  { href: '/met-police/evidence', panel: 'met-evidence', label: 'Evidence', owns: ['/met-police/body-worn-video'] },
  { href: '/met-police/statements', panel: 'met-statements', label: 'Statements', owns: [] },
  { href: '/met-police/roster', panel: 'met-roster', label: 'Roster', owns: [] },
  { href: '/met-police/policies', panel: 'met-policies', label: 'Policies', owns: ['/met-police/law-book'] },
  { href: '/met-police/communications', panel: 'met-communications', label: 'Communications', owns: ['/met-police/announcements'] },
  { href: '/met-police/command', panel: 'met-command', label: 'Command', owns: [] },
  // My Details sits at the bottom of the list.
  { href: '/met-police/my-details', panel: 'met-my-details', label: 'My Details', owns: [] },
];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

type Status = { panels?: Record<string, boolean>; modes?: Record<string, 'maintenance' | 'coming_soon'> };

export default function MetNav({ showCommand = false }: { showCommand?: boolean }) {
  const path = usePathname();
  const [status, setStatus] = useState<Status | null>(null);

  // Tabs that a developer has switched off get a small label. Re-checked every 30 seconds.
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        if (res.ok && !stop) setStatus((await res.json()) as Status);
      } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [path]);

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-4 pb-3 md:pb-0">
      {TABS.filter((t) => t.href !== '/met-police/command' || showCommand).map((t) => {
        const active = [t.href, ...t.owns].some((b) => under(path, b));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold rounded-md border-l-4 transition-colors ${
              active ? 'bg-blue-50 text-[#00247D] border-[#00247D]' : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {t.label}
            {status?.panels?.[t.panel] && (
              <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border text-amber-700 border-amber-200 bg-amber-50">
                {status.modes?.[t.panel] === 'coming_soon' ? 'Soon' : 'Maint.'}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

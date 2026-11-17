'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Each tab also "owns" the older pages that now live under it, so the right tab stays highlighted on them.
const TABS = [
  { href: '/met-police/incidents', label: 'My Incidents', owns: [] as string[] },
  { href: '/met-police/reports', label: 'Reports', owns: ['/met-police/forms'] },
  { href: '/met-police/checks', label: 'Checks', owns: [] },
  { href: '/met-police/evidence', label: 'Evidence', owns: ['/met-police/body-worn-video'] },
  { href: '/met-police/statements', label: 'Statements', owns: [] },
  { href: '/met-police/roster', label: 'Roster', owns: [] },
  { href: '/met-police/policies', label: 'Policies', owns: ['/met-police/law-book'] },
  { href: '/met-police/communications', label: 'Communications', owns: ['/met-police/announcements'] },
  // My Details sits at the bottom of the list.
  { href: '/met-police/my-details', label: 'My Details', owns: [] },
];

const under = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

export default function MetNav() {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-4 pb-3 md:pb-0">
      {TABS.map((t) => {
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
          </Link>
        );
      })}
    </nav>
  );
}

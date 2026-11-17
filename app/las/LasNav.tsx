'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/las', label: 'Overview', exact: true },
  { href: '/las/divisions', label: 'Divisions' },
  { href: '/las/roster', label: 'Chain of Command' },
  { href: '/las/policies', label: 'Policies' },
  { href: '/las/my-details', label: 'My Details' },
];

export default function LasNav({ showCommand = false }: { showCommand?: boolean }) {
  const path = usePathname();
  const tabs = [...TABS, ...(showCommand ? [{ href: '/dashboard/command/las', label: 'Command \u2197', exact: false }] : [])];

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-4 pb-3 md:pb-0">
      {tabs.map((t) => {
        const active = t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold rounded-md border-l-4 transition-colors ${
              active ? 'bg-emerald-100/70 text-emerald-900 border-emerald-700' : 'text-slate-600 border-transparent hover:bg-emerald-100/40 hover:text-slate-900'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

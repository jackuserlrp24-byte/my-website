'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/met-police/incidents', label: 'Incidents' },
  { href: '/met-police/forms', label: 'Forms & Paperwork' },
  { href: '/met-police/announcements', label: 'Announcements' },
  { href: '/met-police/body-worn-video', label: 'Body-Worn Video' },
  { href: '/met-police/law-book', label: 'Law Book' },
];

export default function MetNav() {
  const path = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-4 pb-3 md:pb-0">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(`${t.href}/`);
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

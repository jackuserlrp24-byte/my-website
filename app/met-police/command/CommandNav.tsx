'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface CommandTab { href: string; label: string }

// Tabs along the top of the Command area. The tab for the page you are on stays highlighted.
export default function CommandNav({ tabs }: { tabs: CommandTab[] }) {
  const path = usePathname();
  const on = (href: string) => (href === '/met-police/command' ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            on(t.href) ? 'text-[#00247D] border-[#00247D]' : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface CommandTab { href: string; label: string }

// Tabs down the left of the Command page. The tab for the page you are on stays highlighted.
export default function CommandNav({ tabs }: { tabs: CommandTab[] }) {
  const path = usePathname();
  const on = (href: string) => (href === '/command' ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible px-3 md:px-4 pb-3 md:pb-0">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold rounded-md border-l-4 transition-colors ${
            on(t.href) ? 'bg-blue-50 text-[#00247D] border-[#00247D]' : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

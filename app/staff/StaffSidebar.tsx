'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';

const ICONS: Record<string, string> = {
  panel: 'M12 3l8 4v5c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V7l8-4z',
  requests: 'M3 5h18v11H8l-5 4V5z',
  logs: 'M7 3h8l4 4v14H7V3zm8 0v4h4M10 12h6M10 16h6',
  patrols: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z',
  activity: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  loa: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm4 9h6',
  appeals: 'M12 3v18M5 7h14M5 7l-2 6a3 3 0 006 0L7 7M19 7l-2 6a3 3 0 006 0l-2-6',
};

interface Item {
  href: string;
  label: string;
  hint: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
}

const STAFF_ITEMS: Item[] = [
  { href: '/staff', label: 'Staff Panel', hint: 'Notes, warns & bans', icon: 'panel', exact: true },
  { href: '/staff/requests', label: 'Staff Requests', hint: 'Players asking for staff', icon: 'requests' },
  { href: '/staff/logs', label: 'Logs', hint: 'Moderation history', icon: 'logs' },
  { href: '/staff/patrols', label: 'Patrols', hint: 'Shifts & attendance', icon: 'patrols' },
  { href: '/staff/activity', label: 'Activity', hint: 'Who is moderating', icon: 'activity' },
  { href: '/staff/appeals', label: 'Ban Appeals', hint: 'Review appeals', icon: 'appeals' },
  { href: '/staff/loa', label: 'LOA', hint: 'Request leave of absence', icon: 'loa' },
];

type Pill = { top: number; left: number; width: number; height: number };

export default function StaffSidebar({
  pendingAppeals,
  showPatrols,
}: {
  pendingAppeals: number;
  showPatrols: boolean;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<Pill | null>(null);

  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  // One highlight that glides to whichever item is current.
  useLayoutEffect(() => {
    const measure = () => {
      const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setPill(el ? { top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight } : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);

  let n = 0;
  const renderItem = (item: Item) => {
    const active = isActive(item);
    const index = n++;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        style={{ animationDelay: `${120 + index * 70}ms` }}
        className={`staff-item group relative z-10 flex items-center gap-3 px-4 py-3 whitespace-nowrap transition-all duration-200 ${
          active ? 'text-white' : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50 hover:translate-x-1'
        }`}
      >
        <svg
          className={`w-4 h-4 shrink-0 transition-all duration-200 group-hover:scale-110 ${active ? 'text-[#5865F2]' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d={ICONS[item.icon]} />
        </svg>
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
          <span className="hidden lg:block text-[10px] font-mono text-neutral-500 normal-case tracking-normal">{item.hint}</span>
        </span>
        {item.icon === 'appeals' && pendingAppeals > 0 && (
          <span className="staff-badge ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-mono font-bold rounded-full">{pendingAppeals}</span>
        )}
      </Link>
    );
  };

  const staffItems = STAFF_ITEMS.filter((i) => showPatrols || i.icon !== 'patrols');

  return (
    <aside className="staff-sidebar w-full lg:w-60 shrink-0 lg:sticky lg:top-20">
      <div className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-md shadow-2xl relative overflow-hidden lg:min-h-[calc(100vh-9rem)]">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />

        <nav ref={navRef} className="relative flex lg:flex-col overflow-x-auto lg:overflow-visible pt-1 pb-2">
          {/* gliding highlight */}
          {pill && (
            <span
              aria-hidden
              className="absolute z-0 bg-[#5865F2]/15 border-l-2 border-[#5865F2] pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ top: pill.top, left: pill.left, width: pill.width, height: pill.height }}
            />
          )}

          <p className="hidden lg:block px-4 pt-3 pb-1 text-[10px] font-mono text-[#5865F2] tracking-widest uppercase">Staff</p>
          {staffItems.map(renderItem)}

        </nav>
      </div>
    </aside>
  );
}

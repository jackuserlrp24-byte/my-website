'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ICONS: Record<string, string> = {
  panel: 'M12 3l8 4v5c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V7l8-4z',
  requests: 'M3 5h18v11H8l-5 4V5z',
  logs: 'M7 3h8l4 4v14H7V3zm8 0v4h4M10 12h6M10 16h6',
  patrols: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zm0-8a3 3 0 100-6 3 3 0 000 6z',
  appeals: 'M12 3v18M5 7h14M5 7l-2 6a3 3 0 006 0L7 7M19 7l-2 6a3 3 0 006 0l-2-6',
};

const ITEMS = [
  { href: '/dashboard/staff', label: 'Staff Panel', hint: 'Notes, warns & bans', icon: 'panel', exact: true },
  { href: '/dashboard/staff/requests', label: 'Staff Requests', hint: 'Players asking for staff', icon: 'requests' },
  { href: '/dashboard/staff/logs', label: 'Logs', hint: 'Moderation history', icon: 'logs' },
  { href: '/dashboard/staff/patrols', label: 'Patrols', hint: 'Shifts & attendance', icon: 'patrols' },
  { href: '/dashboard/staff/appeals', label: 'Ban Appeals', hint: 'Review appeals', icon: 'appeals' },
] as const;

export default function StaffSidebar({ pendingAppeals }: { pendingAppeals: number }) {
  const pathname = usePathname();

  return (
    <aside className="staff-sidebar w-full lg:w-60 shrink-0 lg:sticky lg:top-24">
      <div className="bg-neutral-900/90 border border-neutral-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <p className="px-4 pt-4 pb-2 text-[10px] font-mono text-[#5865F2] tracking-widest uppercase">Staff</p>

        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-2">
          {ITEMS.map((item, i) => {
            const active = 'exact' in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                style={{ animationDelay: `${120 + i * 70}ms` }}
                className={`staff-item group relative flex items-center gap-3 px-4 py-3 whitespace-nowrap transition-all duration-200 ${
                  active ? 'bg-[#5865F2]/15 text-white' : 'text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-100 hover:translate-x-1'
                }`}
              >
                <span
                  className={`absolute left-0 top-0 h-full w-0.5 bg-[#5865F2] origin-center transition-transform duration-300 ${active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'}`}
                  aria-hidden
                />
                <svg
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-[#5865F2]' : ''}`}
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
          })}
        </nav>
      </div>
    </aside>
  );
}

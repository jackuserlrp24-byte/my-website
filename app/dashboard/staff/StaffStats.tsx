import Link from 'next/link';
import type { StaffStats } from '@/lib/staff-stats';

export default function StaffStatsStrip({ stats }: { stats: StaffStats }) {
  const tiles: { label: string; value: number; href?: string; hot?: boolean }[] = [
    { label: 'Warns (24h)', value: stats.warns24 },
    { label: 'Bans (24h)', value: stats.bans24 },
    { label: 'Kicks (24h)', value: stats.kicks24 },
    { label: 'Actions (7d)', value: stats.actions7, href: '/dashboard/staff/activity' },
    { label: 'Open staff requests', value: stats.openRequests, href: '/dashboard/staff/requests', hot: stats.openRequests > 0 },
    { label: 'Pending appeals', value: stats.pendingAppeals, href: '/dashboard/staff/appeals', hot: stats.pendingAppeals > 0 },
    { label: 'Queued in-game actions', value: stats.pendingGameActions, hot: stats.pendingGameActions > 0 },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      {tiles.map((t) => {
        const body = (
          <div
            className={`bg-neutral-900 border p-4 h-full relative overflow-hidden ${
              t.hot ? 'border-amber-500/40' : 'border-neutral-800'
            } ${t.href ? 'hover:border-neutral-600 transition-colors' : ''}`}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{t.label}</p>
            <p className={`text-2xl font-bold mt-1 ${t.hot ? 'text-amber-300' : 'text-neutral-100'}`}>{t.value}</p>
          </div>
        );
        return t.href ? (
          <Link key={t.label} href={t.href}>
            {body}
          </Link>
        ) : (
          <div key={t.label}>{body}</div>
        );
      })}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ModerationAction, ModerationLog } from '@/lib/portal-types';

const BADGE: Record<ModerationAction, string> = {
  NOTE: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WARN: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  KICK: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  BAN: 'bg-red-500/20 text-red-300 border-red-500/30',
  UNBAN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const FILTERS: ('ALL' | ModerationAction)[] = ['ALL', 'NOTE', 'WARN', 'KICK', 'BAN', 'UNBAN'];

export default function LogsClient({ logs }: { logs: ModerationLog[] }) {
  const [filter, setFilter] = useState<'ALL' | ModerationAction>('ALL');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter !== 'ALL' && l.action_type !== filter) return false;
      if (!q) return true;
      return [l.username, l.discord_id, l.moderator_name, l.reason].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [logs, filter, query]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                filter === f ? (f === 'ALL' ? 'bg-[#5865F2]/20 border-[#5865F2] text-neutral-100' : BADGE[f]) : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, Discord ID, moderator or reason"
          className="md:ml-auto md:w-80 bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]"
        />
      </div>

      <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
        {shown.length === 0 && <p className="px-5 py-4 text-xs text-neutral-500">No logs match.</p>}
        {shown.map((l) => (
          <div key={String(l.id)} className="px-5 py-3 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${BADGE[l.action_type] ?? BADGE.NOTE}`}>{l.action_type}</span>
              <span className="text-sm font-semibold text-neutral-100">{l.username ?? 'Unknown'}</span>
              <span className="text-[11px] font-mono text-neutral-600">{l.discord_id}</span>
              <span className="text-[11px] font-mono text-neutral-500">by {l.moderator_name ?? 'Unknown'}</span>
              <span className="ml-auto text-[11px] font-mono text-neutral-600">
                <LocalTime iso={l.created_at} />
              </span>
            </div>
            <p className="text-xs text-neutral-300 whitespace-pre-line break-words">{l.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

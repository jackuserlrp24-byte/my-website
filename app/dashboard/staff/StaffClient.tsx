'use client';

import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { GuildMemberLite } from '@/lib/discord';
import type { ActionResult, ModerationAction, ModerationLog } from '@/lib/portal-types';
import { getHistory, searchMembers, takeAction } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

const BADGE: Record<ModerationAction, string> = {
  NOTE: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WARN: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  KICK: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  BAN: 'bg-red-500/20 text-red-300 border-red-500/30',
  UNBAN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const Badge = ({ type }: { type: ModerationAction }) => (
  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border ${BADGE[type] ?? BADGE.NOTE}`}>{type}</span>
);

export default function StaffClient({ canModerate, recent }: { canModerate: boolean; recent: ModerationLog[] }) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GuildMemberLite[]>([]);
  const [target, setTarget] = useState<GuildMemberLite | null>(null);
  const [history, setHistory] = useState<ModerationLog[]>([]);
  const [action, setAction] = useState<ModerationAction>('NOTE');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [feed, setFeed] = useState<ModerationLog[]>(recent);

  const actions: ModerationAction[] = canModerate ? ['NOTE', 'WARN', 'KICK', 'BAN', 'UNBAN'] : ['NOTE', 'WARN'];
  const counts = (t: ModerationAction) => history.filter((h) => h.action_type === t).length;

  function search(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => setResults(await searchMembers(query)));
  }

  function pick(m: GuildMemberLite) {
    setTarget(m);
    setResults([]);
    setResult(null);
    startTransition(async () => setHistory(await getHistory(m.id)));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    if ((action === 'KICK' || action === 'BAN') && !confirm(`${action} ${target.name}? This happens on Discord immediately.`)) return;
    const fd = new FormData();
    fd.set('action', action);
    fd.set('targetId', target.id);
    fd.set('targetName', target.name);
    fd.set('reason', reason);
    startTransition(async () => {
      const r = await takeAction(fd);
      setResult(r);
      if (r.ok) {
        setReason('');
        const h = await getHistory(target.id);
        setHistory(h);
        if (h[0]) setFeed((f) => [h[0], ...f].slice(0, 30));
      }
    });
  }

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Staff Panel</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Add notes and warnings{canModerate ? ', kick, ban and unban' : ''} straight from the portal. Everything is logged here, in
          Management &gt; Moderation Logs, and in the staff log channel.
        </p>
      </div>

      {result && (
        <div
          className={`border p-3 text-xs font-mono ${
            result.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6 space-y-3">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Find a member</h3>
            <form onSubmit={search} className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Discord name, RP name, collar number or Discord ID"
                className={inputClass}
              />
              <button disabled={pending} className="px-4 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer">
                Search
              </button>
            </form>
            {results.length > 0 && (
              <div className="flex flex-col gap-1">
                {results.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => pick(m)}
                    className="flex items-center gap-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-3 py-2 text-left cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                    <span className="text-xs text-neutral-200 font-semibold">{m.name}</span>
                    <span className="text-[11px] font-mono text-neutral-500">@{m.username} / {m.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {target && (
            <div className="bg-neutral-900 border border-neutral-800 p-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={target.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-neutral-700" />
                <div>
                  <p className="text-sm font-bold text-neutral-100">{target.name}</p>
                  <p className="text-[11px] font-mono text-neutral-500">{target.id}</p>
                </div>
                <div className="ml-auto flex gap-2 text-[10px] font-mono text-neutral-400">
                  <span>{counts('NOTE')} notes</span>
                  <span>{counts('WARN')} warns</span>
                  <span>{counts('KICK')} kicks</span>
                  <span>{counts('BAN')} bans</span>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <button
                      type="button"
                      key={a}
                      onClick={() => setAction(a)}
                      className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border cursor-pointer ${
                        action === a ? BADGE[a] : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  maxLength={1500}
                  required
                  placeholder={action === 'NOTE' ? 'Staff note (only staff can see this)...' : 'Reason (sent to the member and logged)...'}
                  className={inputClass}
                />
                <button
                  disabled={pending}
                  className={`px-4 py-2 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer ${
                    action === 'BAN' || action === 'KICK' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#5865F2] hover:bg-[#4752c4]'
                  }`}
                >
                  {pending ? 'Working...' : `Submit ${action.toLowerCase()}`}
                </button>
              </form>

              <div>
                <h4 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-2">History ({history.length})</h4>
                {history.length === 0 ? (
                  <p className="text-xs font-mono text-neutral-600">Clean record.</p>
                ) : (
                  <div className="divide-y divide-neutral-800 border border-neutral-800">
                    {history.map((h) => (
                      <div key={String(h.id)} className="p-3 flex flex-col gap-1 bg-neutral-950">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                          <Badge type={h.action_type} />
                          <span>by {h.moderator_name}</span>
                          <span className="ml-auto"><LocalTime iso={h.created_at} /></span>
                        </div>
                        <p className="text-xs text-neutral-300 whitespace-pre-line">{h.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Recent activity</h3>
          {feed.length === 0 ? (
            <p className="text-xs font-mono text-neutral-600">Nothing logged yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto">
              {feed.map((h) => (
                <div key={String(h.id)} className="bg-neutral-950 border border-neutral-800 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge type={h.action_type} />
                    <span className="text-xs font-semibold text-neutral-200 truncate">{h.username}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2">{h.reason}</p>
                  <p className="text-[10px] font-mono text-neutral-600 mt-1">
                    {h.moderator_name} - <LocalTime iso={h.created_at} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

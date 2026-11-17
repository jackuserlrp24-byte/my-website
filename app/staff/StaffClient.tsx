'use client';

import { useEffect, useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { GuildMemberLite } from '@/lib/discord';
import type { ActionResult, GameAction, ModerationAction, ModerationLog } from '@/lib/portal-types';
import { getGameActions, getHistory, runWorldAction, searchMembers, takeAction } from './actions';

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

type Scope = 'discord' | 'game' | 'both';
const SCOPES: { key: Scope; label: string }[] = [
  { key: 'game', label: 'FiveM server' },
  { key: 'discord', label: 'Discord' },
  { key: 'both', label: 'Both' },
];
const BAN_LENGTHS = [
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
  { hours: 0, label: 'Permanent' },
];
const ACTION_LABEL: Record<string, string> = { massdv: 'Mass DV', delnpcs: 'Del NPCs', delnpcvehicles: 'Del NPC cars' };
const WORLD_TOOLS = [
  { kind: 'massdv', title: 'Mass DV', hint: 'Warns everyone, then after 30 seconds deletes every empty vehicle (and AI peds).', confirm: 'Run a Mass DV? Everyone gets a 30 second warning, then all empty vehicles are deleted.' },
  { kind: 'delnpcs', title: 'Delete all NPCs', hint: 'Removes every NPC, including ones sitting in cars. The cars stay.', confirm: 'Delete ALL NPCs on the server (including NPCs inside cars)?' },
  { kind: 'delnpcvehicles', title: 'Delete NPC cars', hint: 'Removes every car that has an NPC in it, plus the NPCs. Player cars and empty cars stay.', confirm: 'Delete every NPC and the car they are in? Player cars are not touched.' },
];
const STATUS_STYLE: Record<GameAction['status'], string> = {
  pending: 'text-neutral-400',
  sent: 'text-amber-300',
  done: 'text-emerald-400',
  failed: 'text-red-400',
  expired: 'text-neutral-500',
};

export default function StaffClient({
  canModerate,
  recent,
  gameActions,
  topExtra,
}: {
  topExtra?: React.ReactNode;
  canModerate: boolean;
  recent: ModerationLog[];
  gameActions: GameAction[];
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GuildMemberLite[]>([]);
  const [target, setTarget] = useState<GuildMemberLite | null>(null);
  const [history, setHistory] = useState<ModerationLog[]>([]);
  const [action, setAction] = useState<ModerationAction>('NOTE');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [feed, setFeed] = useState<ModerationLog[]>(recent);
  const [scope, setScope] = useState<Scope>('game');
  const [banHours, setBanHours] = useState(24);
  const [game, setGame] = useState<GameAction[]>(gameActions);
  const [live, setLive] = useState<{ online: boolean; count: number; max: number } | null>(null);

  // How many people are in the FiveM server right now (same feed as the dashboard status widget).
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch('/api/server-status', { cache: 'no-store' });
        const d = res.ok ? await res.json() : null;
        if (!stop) setLive(d ? { online: !!d.isOnline, count: (d.players ?? []).length, max: Number(d.maxClients) || 64 } : { online: false, count: 0, max: 64 });
      } catch {
        if (!stop) setLive({ online: false, count: 0, max: 64 });
      }
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  // Keep the in-game status list fresh while something is still waiting for the server.
  const waiting = game.some((g) => g.status === 'pending' || g.status === 'sent');
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => setGame(await getGameActions()), 4000);
    return () => clearInterval(t);
  }, [waiting]);

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

  function world(kind: string, confirmText: string) {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const r = await runWorldAction(kind);
      setResult(r);
      if (r.ok) setGame(await getGameActions());
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    const placeText = scope === 'game' ? 'in the FiveM server' : scope === 'discord' ? 'on Discord' : 'on Discord and in the FiveM server';
    if ((action === 'KICK' || action === 'BAN') && !confirm(`${action} ${target.name} ${placeText}?`)) return;
    const fd = new FormData();
    fd.set('action', action);
    fd.set('targetId', target.id);
    fd.set('targetName', target.name);
    fd.set('reason', reason);
    fd.set('scope', scope);
    fd.set('banHours', String(banHours));
    startTransition(async () => {
      const r = await takeAction(fd);
      setResult(r);
      if (r.ok) {
        setReason('');
        setGame(await getGameActions());
        const h = await getHistory(target.id);
        setHistory(h);
        if (h[0]) setFeed((f) => [h[0], ...f].slice(0, 30));
      }
    });
  }

  return (
    <main className="flex flex-col w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Staff Panel</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Add notes and warnings{canModerate ? ', kick, ban and unban' : ''} on Discord, in the FiveM server, or both - straight from the portal. Everything is logged here, in
          the Administration logs, and in the moderation log channel.
        </p>
      </div>

      {topExtra}

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
            {live && (
              <p className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <span className={`h-2 w-2 rounded-full ${live.online ? 'bg-emerald-500' : 'bg-red-500/70'}`} aria-hidden />
                {live.online ? `${live.count} / ${live.max} players in game` : 'Server offline'}
              </p>
            )}
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
                {action !== 'NOTE' && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Apply to</span>
                      {SCOPES.map((s) => (
                        <button
                          type="button"
                          key={s.key}
                          onClick={() => setScope(s.key)}
                          className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider border cursor-pointer ${
                            scope === s.key
                              ? 'bg-[#5865F2]/20 border-[#5865F2] text-neutral-100'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {action === 'BAN' && scope !== 'discord' && (
                      <label className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                        Game ban length
                        <select
                          value={banHours}
                          onChange={(e) => setBanHours(Number(e.target.value))}
                          className="bg-neutral-950 border border-neutral-700 text-neutral-200 px-2 py-1 text-xs normal-case"
                        >
                          {BAN_LENGTHS.map((b) => (
                            <option key={b.hours} value={b.hours}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
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

        <div className="flex flex-col gap-6">
        {canModerate && (
          <div className="bg-neutral-900 border border-neutral-800 p-6">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-1">Server clean-up</h3>
            <p className="text-[11px] text-neutral-500 mb-4">Affects the whole FiveM server. Players are never deleted.</p>
            <div className="flex flex-col gap-2">
              {WORLD_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  disabled={pending}
                  onClick={() => world(t.kind, t.confirm)}
                  className="text-left bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 hover:border-red-500/50 p-3 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-bold text-neutral-100 uppercase tracking-wider">{t.title}</p>
                  <p className="text-[11px] text-neutral-500 mt-1">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="bg-neutral-900 border border-neutral-800 p-6">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-1">In-game actions</h3>
          <p className="text-[11px] text-neutral-500 mb-4">Sent to the FiveM server and applied within a few seconds.</p>
          {game.length === 0 ? (
            <p className="text-xs font-mono text-neutral-600">Nothing sent yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {game.map((g) => (
                <div key={g.id} className="bg-neutral-950 border border-neutral-800 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase">{ACTION_LABEL[g.action] ?? g.action}</span>
                    <span className="text-xs font-semibold text-neutral-200 truncate">{g.target_name ?? g.target_discord_id}</span>
                    <span className={`ml-auto text-[10px] font-mono uppercase ${STATUS_STYLE[g.status]}`}>{g.status}</span>
                  </div>
                  {g.result && <p className="text-[11px] text-neutral-400 mt-1">{g.result}</p>}
                  <p className="text-[10px] font-mono text-neutral-600 mt-1">
                    {g.requested_by} - <LocalTime iso={g.created_at} />
                  </p>
                </div>
              ))}
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
      </div>
    </main>
  );
}

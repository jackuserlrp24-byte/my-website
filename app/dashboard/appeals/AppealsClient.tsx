'use client';

import { useEffect, useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { BanAppeal } from '@/lib/appeals';
import type { ActionResult, ModerationAction, ModerationLog } from '@/lib/portal-types';
import { decideAppeal, getAppealHistory, listAppeals } from './actions';

type Filter = 'pending' | 'accepted' | 'denied' | 'all';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2] select-text';

const STATUS_BADGE: Record<BanAppeal['status'], string> = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  denied: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const ACTION_BADGE: Record<ModerationAction, string> = {
  NOTE: 'text-blue-300',
  WARN: 'text-amber-300',
  KICK: 'text-orange-300',
  BAN: 'text-red-300',
  UNBAN: 'text-emerald-300',
};

export default function AppealsClient({ initial, canDecide, guildId }: { initial: BanAppeal[]; canDecide: boolean; guildId: string }) {
  const [appeals, setAppeals] = useState<BanAppeal[]>(initial);
  const [filter, setFilter] = useState<Filter>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, ModerationLog[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ActionResult | null>(null);
  const [busy, startTransition] = useTransition();

  // New appeals show up without a refresh.
  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState === 'visible') setAppeals(await listAppeals());
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const count = (f: Filter) => (f === 'all' ? appeals.length : appeals.filter((a) => a.status === f).length);
  const shown = filter === 'all' ? appeals : appeals.filter((a) => a.status === filter);

  function toggle(a: BanAppeal) {
    const opening = openId !== a.id;
    setOpenId(opening ? a.id : null);
    if (opening && !history[a.discord_id]) {
      startTransition(async () => {
        const h = await getAppealHistory(a.discord_id);
        setHistory((prev) => ({ ...prev, [a.discord_id]: h }));
      });
    }
  }

  function decide(a: BanAppeal, accept: boolean) {
    const note = notes[a.id] ?? '';
    if (!accept && note.trim().length < 3) {
      setResult({ ok: false, message: 'Write a reason before denying - the player is shown it.' });
      return;
    }
    if (!confirm(accept ? `Accept ${a.username ?? a.discord_id}'s appeal? This unbans them and sends them a new Discord invite.` : `Deny ${a.username ?? a.discord_id}'s appeal?`)) return;
    startTransition(async () => {
      const r = await decideAppeal(a.id, accept, note);
      setResult(r);
      setAppeals(await listAppeals());
    });
  }

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Ban Appeals</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Every appeal submitted on the website appears here as well as in its private Discord ticket.{' '}
          {canDecide
            ? 'Accepting unbans the player on Discord and in-game, then DMs them a fresh single-use invite to rejoin.'
            : 'Only Gold Command and management can accept or deny.'}
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

      <div className="flex flex-wrap gap-2">
        {(['pending', 'accepted', 'denied', 'all'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 border text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              filter === f ? 'bg-[#5865F2] border-[#5865F2] text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {f} <span className="font-mono opacity-80">({count(f)})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 p-8 text-center text-xs font-mono text-neutral-500 uppercase tracking-wider">
          No {filter === 'all' ? '' : filter} appeals.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((a) => {
            const open = openId === a.id;
            const hist = history[a.discord_id];
            return (
              <div key={a.id} className="bg-neutral-900 border border-neutral-800">
                <button onClick={() => toggle(a)} className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-neutral-800/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border uppercase ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-100 truncate">
                        {a.username ?? 'Unknown'} {a.rp_name && <span className="text-neutral-400 font-normal">· {a.rp_name}</span>}
                      </p>
                      <p className="text-[10px] font-mono text-neutral-500">{a.discord_id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    <LocalTime iso={a.created_at} />
                  </span>
                </button>

                {open && (
                  <div className="border-t border-neutral-800 p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 select-text">
                    <div className="space-y-3">
                      <Block label="What they say they were banned for" text={a.ban_reason} />
                      <Block label="Why they should be unbanned" text={a.appeal_reason} />
                      {a.extra && <Block label="Extra / evidence" text={a.extra} />}
                      {a.channel_id && guildId && (
                        <a
                          href={`https://discord.com/channels/${guildId}/${a.channel_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[11px] font-mono uppercase text-[#5865F2] hover:text-indigo-400 underline underline-offset-4"
                        >
                          Open Discord ticket
                        </a>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1.5">Moderation history</p>
                        <div className="bg-neutral-950 border border-neutral-800 max-h-44 overflow-y-auto divide-y divide-neutral-800">
                          {!hist ? (
                            <p className="p-3 text-[11px] font-mono text-neutral-500">Loading...</p>
                          ) : hist.length === 0 ? (
                            <p className="p-3 text-[11px] font-mono text-neutral-500">No moderation history on record.</p>
                          ) : (
                            hist.map((h) => (
                              <div key={h.id} className="p-2.5 text-[11px]">
                                <span className={`font-mono font-bold ${ACTION_BADGE[h.action_type] ?? ''}`}>{h.action_type}</span>
                                <span className="text-neutral-500 font-mono"> · {h.moderator_name ?? 'Unknown'} · </span>
                                <span className="text-neutral-500 font-mono">
                                  <LocalTime iso={h.created_at} />
                                </span>
                                <p className="text-neutral-300 mt-0.5 whitespace-pre-line">{h.reason}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {a.status === 'pending' ? (
                        canDecide ? (
                          <div className="space-y-2">
                            <textarea
                              value={notes[a.id] ?? ''}
                              onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                              rows={3}
                              maxLength={800}
                              placeholder="Note shown to the player (required to deny, optional to accept)"
                              className={`${inputClass} resize-none`}
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={busy}
                                onClick={() => decide(a, true)}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                              >
                                Accept &amp; Unban
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => decide(a, false)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] font-mono text-neutral-500">You can view this appeal, but only Gold Command / management can decide it.</p>
                        )
                      ) : (
                        <div className="bg-neutral-950 border border-neutral-800 p-3 text-xs">
                          <p className="text-neutral-300">
                            <span className="font-semibold uppercase">{a.status}</span> by {a.reviewed_by ?? 'Unknown'}
                            {a.reviewed_at && (
                              <span className="text-neutral-500 font-mono">
                                {' '}
                                · <LocalTime iso={a.reviewed_at} />
                              </span>
                            )}
                          </p>
                          {a.review_note && <p className="text-neutral-400 mt-1 whitespace-pre-line">Note: {a.review_note}</p>}
                          {a.status === 'accepted' && a.invite_url && (
                            <p className="text-neutral-400 mt-1 font-mono break-all">
                              Rejoin invite: <a href={a.invite_url} target="_blank" rel="noopener noreferrer" className="text-[#5865F2] underline">{a.invite_url}</a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Block({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
      <p className="bg-neutral-950 border border-neutral-800 p-3 text-xs text-neutral-200 whitespace-pre-line break-words">{text || 'Not provided'}</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult, Division, Training } from '@/lib/portal-types';
import { attendTraining, cantMakeTrainingAction, deleteTraining, delayTraining } from './actions';

interface Props {
  user: { name: string; isTrainer: boolean };
  trainings: Training[];
  divisions: Division[];
  loadError: string | null;
}

function trainingState(t: Training): 'UPCOMING' | 'ACTIVE' | 'CONCLUDED' {
  const now = Date.now();
  if (now > new Date(t.ends_at).getTime()) return 'CONCLUDED';
  if (now >= new Date(t.starts_at).getTime()) return 'ACTIVE';
  return 'UPCOMING';
}

export default function TrainingsClient({ user, trainings, divisions, loadError }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [delayingId, setDelayingId] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState('');

  const divisionName = (id: string | null) => divisions.find((d) => d.id === id)?.name ?? 'General';

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      setResult(await action());
    });
  }

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">
            TRAINING SESSIONS
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Scheduled Trainings</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Attend upcoming trainings - you'll get a DM with the details and which VC to wait in. Sessions stay listed for 24 hours after they finish.
          </p>
        </div>
        {user.isTrainer && (
          <Link
            href="/dashboard/trainer"
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-mono font-medium uppercase tracking-wider transition-colors"
          >
            Trainer Panel
          </Link>
        )}
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs font-mono text-red-300">{loadError}</div>
      )}

      {result && (
        <div
          className={`border p-3 text-xs font-mono ${
            result.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {trainings.length === 0 && !loadError ? (
          <div className="bg-neutral-900 border border-neutral-800 p-16 text-center">
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-2">No trainings scheduled</p>
            <p className="text-xs text-neutral-400">Check back later for upcoming training sessions.</p>
          </div>
        ) : (
          trainings.map((t) => {
            const state = trainingState(t);
            const isAttending = t.attending.includes(user.name);
            const cantMake = (t.unattending ?? []).includes(user.name);
            const delayed = (t.delayed_minutes ?? 0) > 0;

            return (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    <span>{t.id}</span>
                    <span className="text-neutral-700">/</span>
                    <span>{state}</span>
                    {delayed && (
                      <span className="px-2 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px]">
                        DELAYED +{t.delayed_minutes}m
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {state !== 'CONCLUDED' && (
                      <>
                        <button
                          disabled={pending || isAttending}
                          onClick={() => run(() => attendTraining(t.id))}
                          className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border cursor-pointer ${
                            isAttending
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 cursor-default'
                              : 'bg-[#5865F2] hover:bg-[#4752c4] border-[#5865F2] text-white'
                          }`}
                        >
                          {isAttending ? '[ Attending ]' : 'Attend'}
                        </button>
                        {(isAttending || cantMake) && (
                          <button
                            disabled={pending || cantMake}
                            onClick={() => {
                              if (confirm(`Can't make ${t.id}? You'll be taken off the attending list.`)) {
                                run(() => cantMakeTrainingAction(t.id));
                              }
                            }}
                            className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border ${
                              cantMake
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 cursor-default'
                                : 'border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer'
                            }`}
                          >
                            {cantMake ? "[ Can't Make It ]" : "Can't Make It"}
                          </button>
                        )}
                      </>
                    )}
                    {user.isTrainer && state !== 'CONCLUDED' && (
                      <button
                        disabled={pending}
                        onClick={() => {
                          setDelayingId(delayingId === t.id ? null : t.id);
                          setDelayReason('');
                        }}
                        className="px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                      >
                        Delay
                      </button>
                    )}
                    {user.isTrainer && (
                      <button
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Delete ${t.id}? This also removes the Discord post.`)) {
                            run(() => deleteTraining(t.id));
                          }
                        }}
                        className="px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {user.isTrainer && delayingId === t.id && (
                  <div className="bg-amber-500/5 border-b border-amber-500/20 px-6 py-3 flex flex-wrap items-center gap-3 text-xs font-mono">
                    <span className="text-amber-300 uppercase tracking-wider">Delay by</span>
                    <select
                      value={delayMinutes}
                      onChange={(e) => setDelayMinutes(Number(e.target.value))}
                      className="bg-neutral-950 border border-neutral-700 text-neutral-200 px-2 py-1.5"
                    >
                      {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((m) => (
                        <option key={m} value={m}>
                          {m} min
                        </option>
                      ))}
                    </select>
                    <input
                      value={delayReason}
                      onChange={(e) => setDelayReason(e.target.value)}
                      maxLength={200}
                      placeholder="Reason (optional)"
                      className="flex-1 min-w-[180px] bg-neutral-950 border border-neutral-700 text-neutral-200 px-2 py-1.5 placeholder:text-neutral-600"
                    />
                    <button
                      disabled={pending}
                      onClick={() => {
                        const id = t.id;
                        setDelayingId(null);
                        run(() => delayTraining(id, delayMinutes, delayReason));
                      }}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-medium uppercase tracking-wider cursor-pointer"
                    >
                      Confirm Delay
                    </button>
                    <button
                      onClick={() => setDelayingId(null)}
                      className="px-3 py-1.5 border border-neutral-700 text-neutral-400 hover:bg-neutral-800 uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-200 tracking-tight mb-1.5">{t.title}</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">
                        {t.description || 'No additional details provided.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/80">
                      {[
                        { label: 'Division', node: divisionName(t.division_id) },
                        { label: 'Starts', node: <LocalTime iso={t.starts_at} /> },
                        { label: 'Host', node: t.host || 'TBD' },
                        ...(delayed && t.delay_reason ? [{ label: 'Delay reason', node: t.delay_reason }] : []),
                        ...(t.requires_ipp ? [{ label: 'Requirement', node: 'IPP + Advanced' }] : []),
                      ].map((m) => (
                        <div key={m.label} className="bg-neutral-950 border border-neutral-800/80 p-3 flex flex-col gap-1 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-[#5865F2]" />
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{m.label}</span>
                          <span className="text-xs font-mono font-bold text-neutral-200 tracking-wide">{m.node}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 bg-neutral-950 border border-neutral-800 p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                        <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider">Attending</span>
                        <span className="text-[10px] font-mono text-neutral-400">{t.attending.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                        {t.attending.length ? (
                          t.attending.map((n, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300">
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-600">No one attending yet.</span>
                        )}
                      </div>
                    </div>
                    {(t.unattending ?? []).length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                          <span className="text-[10px] font-mono font-medium text-amber-400/80 uppercase tracking-wider">Can't Make It</span>
                          <span className="text-[10px] font-mono text-neutral-400">{t.unattending.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                          {t.unattending.map((n, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-neutral-900 border border-amber-500/20 text-[11px] font-mono text-neutral-400">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

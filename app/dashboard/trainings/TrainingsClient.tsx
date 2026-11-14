'use client';

import { useRef, useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult, Division, Training } from '@/lib/portal-types';
import { createTraining, deleteTraining, setTrainingAttendance } from './actions';

interface Props {
  user: { name: string; isManagement: boolean };
  trainings: Training[];
  divisions: Division[];
  loadError: string | null;
}

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

function trainingState(t: Training): 'UPCOMING' | 'ACTIVE' | 'CONCLUDED' {
  const now = Date.now();
  if (now > new Date(t.ends_at).getTime()) return 'CONCLUDED';
  if (now >= new Date(t.starts_at).getTime()) return 'ACTIVE';
  return 'UPCOMING';
}

export default function TrainingsClient({ user, trainings, divisions, loadError }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const divisionName = (id: string | null) => divisions.find((d) => d.id === id)?.name ?? 'General';

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) onOk?.();
    });
  }

  function onPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    run(() => createTraining(fd), () => {
      form.reset();
      setShowForm(false);
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
            Book on to upcoming trainings. Sessions stay listed for 24 hours after they finish.
          </p>
        </div>
        {user.isManagement && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-mono font-medium uppercase tracking-wider transition-colors cursor-pointer"
          >
            {showForm ? 'Close' : 'Post Training'}
          </button>
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

      {user.isManagement && showForm && (
        <form ref={formRef} onSubmit={onPost} className="bg-neutral-900 border border-neutral-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Post a training</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Title</label>
              <input name="title" required maxLength={100} placeholder="e.g. Response Driving Course" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Division (optional)</label>
              <select name="divisionId" defaultValue="" className={inputClass}>
                <option value="">General</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Date (UK time)</label>
              <input type="date" name="date" required className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Start</label>
                <input type="time" name="startTime" required className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">End</label>
                <input type="time" name="endTime" required className={inputClass} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Details</label>
            <textarea name="description" rows={4} maxLength={1500} placeholder="What will be covered, requirements, where to meet..." className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Banner image URL (optional, https)</label>
            <input name="imageUrl" type="url" placeholder="https://..." className={inputClass} />
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input type="checkbox" name="ping" /> Ping @everyone in Discord
          </label>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer"
          >
            {pending ? 'Posting...' : 'Post to website & Discord'}
          </button>
        </form>
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
            const isAbsent = t.unattending.includes(user.name);

            return (
              <div key={t.id} className="bg-neutral-900 border border-neutral-800 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    <span>{t.id}</span>
                    <span className="text-neutral-700">/</span>
                    <span>{state}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {state !== 'CONCLUDED' && (
                      <>
                        <button
                          disabled={pending}
                          onClick={() => run(() => setTrainingAttendance(t.id, 'attending'))}
                          className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border cursor-pointer ${
                            isAttending
                              ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                              : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isAttending ? '[ Booked On ]' : 'Book On'}
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => run(() => setTrainingAttendance(t.id, 'unattending'))}
                          className={`px-4 py-1.5 text-xs font-mono font-medium uppercase tracking-wider border cursor-pointer ${
                            isAbsent
                              ? 'bg-neutral-800 border-neutral-600 text-neutral-100'
                              : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isAbsent ? '[ Not Attending ]' : 'Not Attending'}
                        </button>
                      </>
                    )}
                    {user.isManagement && (
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

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 flex flex-col gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-200 tracking-tight mb-1.5">{t.title}</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">
                        {t.description || 'No additional details provided.'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800/80">
                      {[
                        { label: 'Division', node: divisionName(t.division_id) },
                        { label: 'Starts', node: <LocalTime iso={t.starts_at} /> },
                        { label: 'Host', node: t.host || 'TBD' },
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
                    {[
                      { label: 'Booked On', list: t.attending, empty: 'No personnel booked on.' },
                      { label: 'Not Attending', list: t.unattending, empty: 'No personnel marked absent.' },
                    ].map((r, i) => (
                      <div key={r.label} className={`flex flex-col gap-2 ${i ? 'pt-2 border-t border-neutral-800' : ''}`}>
                        <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                          <span className="text-[10px] font-mono font-medium text-neutral-400 uppercase tracking-wider">{r.label}</span>
                          <span className="text-[10px] font-mono text-neutral-400">{r.list.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                          {r.list.length ? (
                            r.list.map((n, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300">
                                {n}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] font-mono text-neutral-600">{r.empty}</span>
                          )}
                        </div>
                      </div>
                    ))}
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

'use client';

import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult, Division, DivisionApplication } from '@/lib/portal-types';
import { decideApplication, setDivisionStatus, submitApplication } from './actions';

interface Props {
  user: { name: string; isManagement: boolean; canViewApplications: boolean };
  divisions: Division[];
  myApplications: DivisionApplication[];
  pendingApplications: DivisionApplication[];
  reviewedApplications: DivisionApplication[];
  loadError: string | null;
}

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

export default function DivisionsClient({
  user,
  divisions,
  myApplications,
  pendingApplications,
  reviewedApplications,
  loadError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) onOk?.();
    });
  }

  function onApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(() => submitApplication(fd), () => setApplyingTo(null));
  }

  const departments = Array.from(new Set(divisions.map((d) => d.department)));
  const openCount = divisions.filter((d) => d.status === 'open').length;

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">
          DIVISION RECRUITMENT
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Division Applications</h2>
        <p className="text-xs text-neutral-400 mt-1">
          {openCount} of {divisions.length} divisions currently accepting applications. The same status is posted in
          Discord.
        </p>
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

      {departments.map((dept) => (
        <section key={dept} className="flex flex-col gap-3">
          <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">{dept}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {divisions
              .filter((d) => d.department === dept)
              .map((d) => {
                const isOpen = d.status === 'open';
                const mine = myApplications.filter((a) => a.division_id === d.id);
                const hasPending = mine.some((a) => a.status === 'pending');
                const accepted = mine.some((a) => a.status === 'accepted');
                const lastRejected = !hasPending && !accepted && mine[0]?.status === 'rejected';

                return (
                  <div key={d.id} className="bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-0.5 ${isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold text-neutral-100 leading-snug">{d.name}</h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold border ${
                          isOpen
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : 'text-red-400 bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        {isOpen ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    {d.description && <p className="text-xs text-neutral-400 leading-relaxed">{d.description}</p>}

                    <div className="mt-auto pt-3 border-t border-neutral-800 flex flex-wrap items-center gap-2">
                      {accepted ? (
                        <span className="text-[11px] font-mono text-emerald-400 uppercase">Accepted</span>
                      ) : hasPending ? (
                        <span className="text-[11px] font-mono text-amber-400 uppercase">Application pending</span>
                      ) : isOpen ? (
                        <button
                          onClick={() => setApplyingTo(applyingTo === d.id ? null : d.id)}
                          className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer"
                        >
                          {applyingTo === d.id ? 'Cancel' : lastRejected ? 'Apply again' : 'Apply'}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-neutral-500 uppercase">Not accepting applications</span>
                      )}

                      {user.isManagement && (
                        <button
                          disabled={pending}
                          onClick={() => run(() => setDivisionStatus(d.id, isOpen ? 'closed' : 'open'))}
                          className="ml-auto px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-[11px] font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          {isOpen ? 'Close' : 'Open'}
                        </button>
                      )}
                    </div>

                    {lastRejected && !hasPending && (
                      <p className="text-[11px] font-mono text-neutral-500">
                        Your last application was not successful
                        {mine[0]?.review_note ? `: ${mine[0].review_note}` : '.'}
                      </p>
                    )}

                    {applyingTo === d.id && (
                      <form onSubmit={onApply} className="space-y-3 pt-3 border-t border-neutral-800">
                        <input type="hidden" name="divisionId" value={d.id} />
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Why do you want to join? *</label>
                          <textarea name="reason" required minLength={30} maxLength={1500} rows={4} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Relevant experience</label>
                          <textarea name="experience" maxLength={1000} rows={3} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-1">Availability</label>
                          <input name="availability" maxLength={300} placeholder="e.g. Evenings and weekends" className={inputClass} />
                        </div>
                        <button
                          type="submit"
                          disabled={pending}
                          className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer"
                        >
                          {pending ? 'Submitting...' : 'Submit application'}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      {user.canViewApplications && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
            Pending applications ({pendingApplications.length})
          </h3>
          {pendingApplications.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 p-8 text-center text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Nothing waiting for review
            </div>
          ) : (
            pendingApplications.map((a) => (
              <div key={a.id} className="bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-neutral-100">
                    {a.applicant_name} <span className="text-neutral-500 font-normal">for</span> {a.divisions?.name ?? a.division_id}
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    <LocalTime iso={a.created_at} />
                  </span>
                </div>
                <div className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase mb-1">Why they want to join</p>
                  {a.reason}
                </div>
                {a.experience && (
                  <div className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase mb-1">Experience</p>
                    {a.experience}
                  </div>
                )}
                {a.availability && (
                  <div className="text-xs text-neutral-300">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase mb-1">Availability</p>
                    {a.availability}
                  </div>
                )}
                {user.isManagement && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-800">
                  <input
                    value={notes[a.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                    maxLength={500}
                    placeholder="Optional note to the applicant"
                    className={`${inputClass} flex-1 min-w-[200px]`}
                  />
                  <button
                    disabled={pending}
                    onClick={() => run(() => decideApplication(a.id, 'accepted', notes[a.id] ?? ''))}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => run(() => decideApplication(a.id, 'rejected', notes[a.id] ?? ''))}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
                )}
              </div>
            ))
          )}

          {reviewedApplications.length > 0 && (
            <>
              <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest mt-4">Recently reviewed</h3>
              <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
                {reviewedApplications.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-neutral-200">
                      {a.applicant_name} <span className="text-neutral-500">-</span> {a.divisions?.name ?? a.division_id}
                    </span>
                    <span className={`font-mono uppercase ${a.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {a.status} by {a.reviewed_by}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}

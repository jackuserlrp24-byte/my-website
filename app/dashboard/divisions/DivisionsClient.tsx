'use client';

import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult, Division, DivisionApplication } from '@/lib/portal-types';
import { decideApplication, setDivisionLink, setDivisionStatus } from './actions';

interface Props {
  user: { name: string; isManagement: boolean; isCommand: boolean; canViewApplications: boolean };
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) onOk?.();
    });
  }

  const canEditLinks = user.isCommand || user.isManagement;
  const departments = Array.from(new Set(divisions.map((d) => d.department)));
  const openCount = divisions.filter((d) => d.status === 'open').length;
  const hasLegacy = pendingApplications.length > 0 || reviewedApplications.length > 0;

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1100px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">
          DIVISION RECRUITMENT
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Division Applications</h2>
        <p className="text-xs text-neutral-400 mt-1">
          {openCount} of {divisions.length} divisions open. Click the name of an open division to go to its application
          form.
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

      {departments.map((dept) => {
        const inDept = divisions.filter((d) => d.department === dept);
        return (
          <section key={dept} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">{dept}</h3>
              <span className="text-[10px] font-mono text-neutral-600">
                {inDept.filter((d) => d.status === 'open').length} open
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
              {inDept.map((d) => {
                const isOpen = d.status === 'open';
                const mine = myApplications.filter((a) => a.division_id === d.id);
                const accepted = mine.some((a) => a.status === 'accepted');
                const editing = editingId === d.id;

                return (
                  <div key={d.id} className="px-5 py-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-red-500/70'}`}
                        aria-hidden
                      />

                      <div className="min-w-0 flex-1">
                        {isOpen && d.application_url ? (
                          <a
                            href={d.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-neutral-100 hover:text-[#8ea1ff] underline decoration-neutral-700 hover:decoration-[#8ea1ff] underline-offset-4 transition-colors select-text"
                          >
                            {d.name} <span aria-hidden>↗</span>
                          </a>
                        ) : (
                          <span className={`text-sm font-semibold ${isOpen ? 'text-neutral-100' : 'text-neutral-500'}`}>
                            {d.name}
                          </span>
                        )}
                        {d.description && (
                          <p className="text-[11px] text-neutral-500 leading-relaxed mt-0.5">{d.description}</p>
                        )}
                        {isOpen && !d.application_url && (
                          <p className="text-[11px] font-mono text-amber-400/80 mt-0.5">
                            Open - application link not added yet.
                          </p>
                        )}
                        {accepted && (
                          <p className="text-[11px] font-mono text-emerald-400 mt-0.5 uppercase">You were accepted</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        {canEditLinks && (
                          <button
                            disabled={pending}
                            onClick={() => {
                              setEditingId(editing ? null : d.id);
                              setLinkDraft(d.application_url ?? '');
                            }}
                            className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-400 text-[10px] font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            {editing ? 'Cancel' : d.application_url ? 'Edit link' : 'Add link'}
                          </button>
                        )}
                        {user.isManagement && (
                          <button
                            disabled={pending}
                            onClick={() => run(() => setDivisionStatus(d.id, isOpen ? 'closed' : 'open'))}
                            className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] font-mono uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            {isOpen ? 'Close' : 'Open'}
                          </button>
                        )}
                        <span
                          className={`w-[68px] text-center px-2 py-0.5 text-[10px] font-mono font-bold border ${
                            isOpen
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                              : 'text-red-400 bg-red-500/10 border-red-500/30'
                          }`}
                        >
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                    </div>

                    {editing && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(() => setDivisionLink(d.id, linkDraft), () => setEditingId(null));
                        }}
                        className="flex flex-wrap items-center gap-2 pl-6"
                      >
                        <input
                          value={linkDraft}
                          onChange={(e) => setLinkDraft(e.target.value)}
                          maxLength={500}
                          placeholder="https://docs.google.com/forms/..."
                          className={`${inputClass} flex-1 min-w-[260px] select-text`}
                        />
                        <button
                          type="submit"
                          disabled={pending}
                          className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-[11px] font-mono font-medium uppercase tracking-wider cursor-pointer"
                        >
                          Save link
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Old in-portal applications - only shown while there are some left to review. */}
      {user.canViewApplications && hasLegacy && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
            Portal applications to review ({pendingApplications.length})
          </h3>
          {pendingApplications.map((a) => (
            <div key={a.id} className="bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-100">
                  {a.applicant_name} <span className="text-neutral-500 font-normal">for</span>{' '}
                  {a.divisions?.name ?? a.division_id}
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
          ))}

          {reviewedApplications.length > 0 && (
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
          )}
        </section>
      )}
    </main>
  );
}

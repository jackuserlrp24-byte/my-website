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

const SERVICES: Record<string, { label: string; full: string; blurb: string; accent: string }> = {
  'MET POLICE': { label: 'Met Police', full: 'Metropolitan Police Service', blurb: 'Frontline, specialist and investigative policing divisions.', accent: 'bg-[#5865F2]' },
  LAS: { label: 'LAS', full: 'London Ambulance Service', blurb: 'Emergency medical response recruitment.', accent: 'bg-emerald-500' },
  LFB: { label: 'LFB', full: 'London Fire Brigade', blurb: 'Fire and rescue recruitment.', accent: 'bg-amber-500' },
  CONTROL: { label: 'Control', full: 'Control Room', blurb: 'Dispatch and control room recruitment.', accent: 'bg-sky-500' },
};
const ORDER = ['MET POLICE', 'LAS', 'LFB', 'CONTROL'];
const serviceOf = (d: string) => SERVICES[d] ?? { label: d, full: d, blurb: '', accent: 'bg-neutral-500' };

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
  const found = Array.from(new Set(divisions.map((d) => d.department)));
  const departments = [...ORDER.filter((d) => found.includes(d)), ...found.filter((d) => !ORDER.includes(d))];
  const [tab, setTab] = useState<string>(departments[0] ?? 'MET POLICE');
  const active = departments.includes(tab) ? tab : departments[0];
  const openCount = divisions.filter((d) => d.status === 'open').length;
  const servicePending = pendingApplications.filter((a) => a.divisions?.department === active);
  const serviceReviewed = reviewedApplications.filter((a) => a.divisions?.department === active);
  const hasLegacy = servicePending.length > 0 || serviceReviewed.length > 0;

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1100px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div className="p-6 pb-4">
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">RECRUITMENT</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Division Applications</h2>
          <p className="text-xs text-neutral-400 mt-1">
            {openCount} of {divisions.length} divisions open across {departments.length} services. Pick a service, then apply to any open division.
          </p>
        </div>
        <div className="flex flex-wrap gap-px bg-neutral-800 border-t border-neutral-800">
          {departments.map((dept) => {
            const meta = serviceOf(dept);
            const inDept = divisions.filter((d) => d.department === dept);
            const open = inDept.filter((d) => d.status === 'open').length;
            const waiting = user.canViewApplications ? pendingApplications.filter((a) => a.divisions?.department === dept).length : 0;
            const on = dept === active;
            return (
              <button
                key={dept}
                onClick={() => setTab(dept)}
                className={`flex-1 min-w-[150px] px-4 py-3 text-left cursor-pointer transition-colors ${on ? 'bg-neutral-900' : 'bg-neutral-950 hover:bg-neutral-900/70'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${meta.accent} ${on ? '' : 'opacity-50'}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${on ? 'text-neutral-100' : 'text-neutral-400'}`}>{meta.label}</span>
                  {waiting > 0 && <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-mono font-bold rounded-full">{waiting}</span>}
                </div>
                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                  {open} open · {inDept.length} total
                </p>
              </button>
            );
          })}
        </div>
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

      {active && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-100">{serviceOf(active).full}</h3>
              {serviceOf(active).blurb && <p className="text-xs text-neutral-500 mt-0.5">{serviceOf(active).blurb}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {divisions
              .filter((d) => d.department === active)
              .map((d) => {
                const isOpen = d.status === 'open';
                const mine = myApplications.filter((a) => a.division_id === d.id);
                const accepted = mine.some((a) => a.status === 'accepted');
                const editing = editingId === d.id;

                return (
                  <div key={d.id} className={`bg-neutral-900 border ${isOpen ? 'border-emerald-500/30' : 'border-neutral-800'} flex flex-col`}>
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className={`text-sm font-semibold leading-snug ${isOpen ? 'text-neutral-100' : 'text-neutral-500'}`}>{d.name}</h4>
                        <span
                          className={`shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold border ${
                            isOpen ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
                          }`}
                        >
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </div>
                      {d.description && <p className="text-[11px] text-neutral-500 leading-relaxed">{d.description}</p>}
                      {accepted && <p className="text-[11px] font-mono text-emerald-400 uppercase">You were accepted</p>}
                      {isOpen && !d.application_url && <p className="text-[11px] font-mono text-amber-400/80">Open - application link not added yet.</p>}
                    </div>

                    <div className="px-4 py-3 border-t border-neutral-800 flex flex-wrap items-center gap-2">
                      {isOpen && d.application_url ? (
                        <a
                          href={d.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-[11px] font-semibold uppercase tracking-wider transition-colors"
                        >
                          Apply now ↗
                        </a>
                      ) : (
                        <span className="px-4 py-1.5 border border-neutral-800 text-neutral-600 text-[11px] font-semibold uppercase tracking-wider">
                          {isOpen ? 'Coming soon' : 'Not recruiting'}
                        </span>
                      )}
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
                      </div>
                    </div>

                    {editing && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(() => setDivisionLink(d.id, linkDraft), () => setEditingId(null));
                        }}
                        className="flex flex-wrap items-center gap-2 px-4 pb-4"
                      >
                        <input
                          value={linkDraft}
                          onChange={(e) => setLinkDraft(e.target.value)}
                          maxLength={500}
                          placeholder="https://docs.google.com/forms/..."
                          className={`${inputClass} flex-1 min-w-[200px] select-text`}
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
      )}

      {/* Old in-portal applications - only shown while there are some left to review. */}
      {user.canViewApplications && hasLegacy && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
            {serviceOf(active).label} applications to review ({servicePending.length})
          </h3>
          {servicePending.map((a) => (
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

          {serviceReviewed.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
              {serviceReviewed.map((a) => (
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

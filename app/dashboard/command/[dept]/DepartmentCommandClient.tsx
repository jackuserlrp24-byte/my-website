'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult, Division, DivisionApplication } from '@/lib/portal-types';
import { decideApplication, setDivisionDeadline, setDivisionLink, setDivisionStatus } from '@/app/dashboard/divisions/actions';
import { formatCloseDate } from '@/lib/london-time';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

interface Props {
  title: string;
  short: string;
  accent: string;
  userName: string;
  rosterHref?: string;
  divisions: Division[];
  pending: DivisionApplication[];
  reviewed: DivisionApplication[];
  loadError: string | null;
}

export default function DepartmentCommandClient({ title, short, accent, userName, rosterHref, divisions, pending, reviewed, loadError }: Props) {
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const [dateDraft, setDateDraft] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) onOk?.();
    });
  }

  const openCount = divisions.filter((d) => d.status === 'open').length;

  return (
    <main className="flex flex-col px-8 mt-4 max-w-[1100px] mx-auto w-full gap-6 pb-16 select-none antialiased font-mono">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
        <div>
          <span className="text-[10px] text-[#5865F2] tracking-widest uppercase block mb-1">{short} Command Suite</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">{title}</h2>
          <p className="text-xs text-neutral-400 mt-1 font-sans">
            Signed in as {userName}. {openCount} of {divisions.length} recruitment divisions open, {pending.length} application
            {pending.length === 1 ? '' : 's'} waiting.
          </p>
        </div>
        <div className="flex gap-2">
          {rosterHref && (
            <Link
              href={rosterHref}
              className="px-4 py-2 border border-emerald-600/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] uppercase tracking-wider"
            >
              Roster
            </Link>
          )}
          <Link
            href="/dashboard/command"
            className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[11px] uppercase tracking-wider"
          >
            &larr; Command hub
          </Link>
        </div>
      </div>

      {loadError && <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-300">{loadError}</div>}

      {result && (
        <div
          className={`border p-3 text-xs ${
            result.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Recruitment divisions */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] text-neutral-400 uppercase tracking-widest">Recruitment</h3>
        <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
          {divisions.length === 0 && <p className="px-5 py-4 text-xs text-neutral-500">No recruitment divisions found.</p>}
          {divisions.map((d) => {
            const isOpen = d.status === 'open';
            const editing = editingId === d.id;
            return (
              <div key={d.id} className="px-5 py-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-red-500/70'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-neutral-100">{d.name}</span>
                    <span className="ml-2 text-[10px] text-neutral-600 uppercase">{d.department}</span>
                    {d.application_url ? (
                      <a
                        href={d.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] text-[#8ea1ff] hover:underline truncate select-text"
                      >
                        {d.application_url}
                      </a>
                    ) : (
                      <p className="text-[11px] text-amber-400/80 mt-0.5">No application link yet.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      disabled={busy}
                      onClick={() => {
                        setEditingId(editing ? null : d.id);
                        setLinkDraft(d.application_url ?? '');
                      }}
                      className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-400 text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      {editing ? 'Cancel' : d.application_url ? 'Edit link' : 'Add link'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(() => setDivisionStatus(d.id, isOpen ? 'closed' : 'open'))}
                      className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      {isOpen ? 'Close' : 'Open'}
                    </button>
                    <span
                      className={`w-[68px] text-center px-2 py-0.5 text-[10px] font-bold border ${
                        isOpen ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                </div>
                {isOpen && (
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <span className="text-[10px] text-neutral-500 uppercase">
                      {d.closes_on ? `Closes after ${formatCloseDate(d.closes_on)}` : 'Closes on'}
                    </span>
                    <input
                      type="date"
                      value={dateDraft[d.id] ?? d.closes_on ?? ''}
                      onChange={(e) => setDateDraft((x) => ({ ...x, [d.id]: e.target.value }))}
                      className={`${inputClass} !w-auto select-text`}
                    />
                    <button
                      disabled={busy}
                      onClick={() => run(() => setDivisionDeadline(d.id, dateDraft[d.id] ?? d.closes_on ?? ''))}
                      className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
                    >
                      Save
                    </button>
                    {d.closes_on && (
                      <button
                        disabled={busy}
                        onClick={() => run(() => setDivisionDeadline(d.id, ''), () => setDateDraft((x) => ({ ...x, [d.id]: '' })))}
                        className="px-2.5 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-500 text-[10px] uppercase tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
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
                      disabled={busy}
                      className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-[11px] uppercase tracking-wider cursor-pointer"
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

      {/* Applications */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[11px] text-neutral-400 uppercase tracking-widest">Applications to review ({pending.length})</h3>
        {pending.length === 0 && (
          <p className="bg-neutral-900 border border-neutral-800 px-5 py-4 text-xs text-neutral-500">Nothing waiting for review.</p>
        )}
        {pending.map((a) => (
          <div key={a.id} className="bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-neutral-100">
                {a.applicant_name} <span className="text-neutral-500 font-normal">for</span> {a.divisions?.name ?? a.division_id}
              </div>
              <span className="text-[11px] text-neutral-500">
                <LocalTime iso={a.created_at} />
              </span>
            </div>
            <div className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed font-sans">
              <p className="text-[10px] font-mono text-neutral-500 uppercase mb-1">Why they want to join</p>
              {a.reason}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-800">
              <input
                value={notes[a.id] ?? ''}
                onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                maxLength={500}
                placeholder="Optional note to the applicant"
                className={`${inputClass} flex-1 min-w-[200px]`}
              />
              <button
                disabled={busy}
                onClick={() => run(() => decideApplication(a.id, 'accepted', notes[a.id] ?? ''))}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs uppercase tracking-wider cursor-pointer"
              >
                Accept
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => decideApplication(a.id, 'rejected', notes[a.id] ?? ''))}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs uppercase tracking-wider cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {reviewed.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 divide-y divide-neutral-800">
            {reviewed.map((a) => (
              <div key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-neutral-200">
                  {a.applicant_name} <span className="text-neutral-500">-</span> {a.divisions?.name ?? a.division_id}
                </span>
                <span className={`uppercase ${a.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {a.status} by {a.reviewed_by}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ActionResult } from '@/lib/portal-types';
import type { LoaRequest } from '@/lib/loa';
import { requestLoa, returnFromLoa } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';
const btnClass =
  'px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer';

const STATUS_STYLE: Record<string, string> = {
  active: 'text-amber-300 border-amber-500/30',
  approved: 'text-sky-300 border-sky-500/30',
  declined: 'text-red-300 border-red-500/30',
  ended: 'text-neutral-400 border-neutral-600',
  cancelled: 'text-neutral-400 border-neutral-600',
};
const STATUS_LABEL: Record<string, string> = { active: 'on leave', approved: 'scheduled', declined: 'declined', ended: 'ended', cancelled: 'ended early' };

export default function LoaClient({
  userId,
  canEndAny,
  today,
  current,
  mine,
  loadError,
}: {
  userId: string;
  canEndAny: boolean;
  today: string;
  current: LoaRequest[];
  mine: LoaRequest[];
  loadError: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await requestLoa(fd);
      setResult(r);
      if (r.ok) form.reset();
    });
  }

  return (
    <main className="flex flex-col px-8 mt-6 max-w-[1450px] mx-auto w-full gap-6 pb-16 select-none antialiased">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <div>
          <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">COMMAND</span>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Leave of Absence</h2>
          <p className="text-xs text-neutral-400 mt-1">
            The portal checks your LOA and authorises or declines it straight away. While you are away, [LOA] is added after your Discord name and it is logged for command.
          </p>
        </div>
        <Link href="/dashboard/command" className={`${btnClass} !bg-neutral-800 hover:!bg-neutral-700`}>
          Back to Command
        </Link>
      </div>

      {loadError && <div className="border p-3 text-xs font-mono bg-red-500/10 border-red-500/30 text-red-300">{loadError}</div>}

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
        <form onSubmit={submit} className="bg-neutral-900 border border-neutral-800 p-6 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Request an LOA</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">First day</label>
              <input type="date" name="startDate" required min={today} defaultValue={today} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Last day</label>
              <input type="date" name="endDate" required min={today} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Reason</label>
            <textarea name="reason" required rows={5} maxLength={500} placeholder="Explain why you will be away..." className={inputClass} />
          </div>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? 'Checking...' : 'Submit LOA'}
          </button>
          <p className="text-[11px] text-neutral-500">
            Up to 28 days, starting within the next 14 days, with a proper reason. Overlapping LOAs are declined. Your name goes back to normal automatically when it ends.
          </p>
        </form>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">Command on leave ({current.length})</h3>
            {current.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500">Nobody is on LOA right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {current.map((r) => (
                  <div key={r.id} className="bg-neutral-950 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-neutral-300">
                      <span className="font-mono font-bold">{r.display_name || r.username || r.discord_id}</span>
                      {r.username && <span className="text-neutral-500"> @{r.username}</span>}
                      <span className="text-neutral-500"> - </span>
                      {r.start_date} → {r.end_date}
                      <p className="text-neutral-500 mt-1 whitespace-pre-line">{r.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(r.discord_id === userId || canEndAny) && (
                        <button
                          disabled={pending}
                          onClick={() => startTransition(async () => setResult(await returnFromLoa(r.id)))}
                          className="px-3 py-1 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                        >
                          End LOA
                        </button>
                      )}
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6">
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4">My LOAs</h3>
            {mine.length === 0 ? (
              <p className="text-xs font-mono text-neutral-500">You have not submitted an LOA yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {mine.map((r) => (
                  <div key={r.id} className="bg-neutral-950 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-neutral-300">
                      {r.start_date} → {r.end_date}
                      {r.status === 'declined' && r.decision_note && <p className="text-red-300/80 mt-1">{r.decision_note}</p>}
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
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

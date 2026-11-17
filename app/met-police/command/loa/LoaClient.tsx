'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ActionResult } from '@/lib/portal-types';
import type { LoaRequest } from '@/lib/loa';
import type { OfficerOption } from '@/lib/met-officers';
import { addRotaShift, removeRotaShift, requestLoa, returnFromLoa } from '@/app/dashboard/command/loa/actions';

export interface RotaShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  member_name: string;
  role_note: string | null;
}

const inputClass =
  'w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:border-[#00247D]';
const btnClass =
  'px-4 py-2 bg-[#00247D] hover:bg-[#001a5c] disabled:opacity-50 text-white text-sm font-semibold rounded-md cursor-pointer';

const STATUS_STYLE: Record<string, string> = {
  active: 'text-amber-700 border-amber-200',
  approved: 'text-sky-700 border-sky-200',
  declined: 'text-red-700 border-red-200',
  ended: 'text-slate-500 border-slate-300',
  cancelled: 'text-slate-500 border-slate-300',
};
const STATUS_LABEL: Record<string, string> = { active: 'on leave', approved: 'scheduled', declined: 'declined', ended: 'ended', cancelled: 'ended early' };

export default function LoaClient({
  rota,
  officers,
  userId,
  canEndAny,
  today,
  current,
  mine,
  loadError,
}: {
  rota: RotaShift[] | null; // null = this person does not have command rank, so the rota is not shown at all
  officers: OfficerOption[];
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
    <div className="flex flex-col gap-6 pb-10">
      <div className="w-full border border-slate-200 rounded-lg bg-slate-50 p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
          <span className="text-[10px] font-bold text-[#00247D] tracking-widest uppercase block mb-1">COMMAND</span>
          <h2 className="text-2xl font-bold text-slate-900">Leave of Absence</h2>
          <p className="text-xs text-slate-500 mt-1">
            The portal checks your LOA and authorises or declines it straight away. While you are away, [LOA] is added after your Discord name and it is logged for command.
          </p>
        </div>
        <Link href="/met-police/command" className={`${btnClass} !bg-slate-600 hover:!bg-slate-700`}>
          Back to Command
        </Link>
      </div>

      {loadError && <div className="border p-3 text-xs bg-red-50 border-red-200 text-red-700">{loadError}</div>}

      {result && (
        <div
          className={`border p-3 text-xs ${
            result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <form onSubmit={submit} className="border border-slate-200 rounded-lg bg-white p-6 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Request an LOA</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">First day</label>
              <input type="date" name="startDate" required min={today} defaultValue={today} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Last day</label>
              <input type="date" name="endDate" required min={today} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Reason</label>
            <textarea name="reason" required rows={5} maxLength={500} placeholder="Explain why you will be away..." className={inputClass} />
          </div>
          <button type="submit" disabled={pending} className={btnClass}>
            {pending ? 'Checking...' : 'Submit LOA'}
          </button>
          <p className="text-[11px] text-slate-500">
            Up to 28 days, starting within the next 14 days, with a proper reason. Overlapping LOAs are declined. Your name goes back to normal automatically when it ends.
          </p>
        </form>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="border border-slate-200 rounded-lg bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Command on leave ({current.length})</h3>
            {current.length === 0 ? (
              <p className="text-xs text-slate-500">Nobody is on LOA right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {current.map((r) => (
                  <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-700">
                      <span className="font-bold">{r.display_name || r.username || r.discord_id}</span>
                      {r.username && <span className="text-slate-500"> @{r.username}</span>}
                      <span className="text-slate-500"> - </span>
                      {r.start_date} → {r.end_date}
                      <p className="text-slate-500 mt-1 whitespace-pre-line">{r.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(r.discord_id === userId || canEndAny) && (
                        <button
                          disabled={pending}
                          onClick={() => startTransition(async () => setResult(await returnFromLoa(r.id)))}
                          className="px-3 py-1 border border-slate-300 text-slate-700 hover:bg-slate-100 text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          End LOA
                        </button>
                      )}
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">My LOAs</h3>
            {mine.length === 0 ? (
              <p className="text-xs text-slate-500">You have not submitted an LOA yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {mine.map((r) => (
                  <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-700">
                      {r.start_date} → {r.end_date}
                      {r.status === 'declined' && r.decision_note && <p className="text-red-700 mt-1">{r.decision_note}</p>}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {rota !== null && (
        <div className="border border-slate-200 rounded-lg bg-white p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Duty rota</h3>
            <p className="text-[11px] text-slate-500 mt-1">Only command rank (Gold, Silver, Bronze) can see this. Times are UK time.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              startTransition(async () => {
                const r = await addRotaShift(fd);
                setResult(r);
                if (r.ok) form.reset();
              });
            }}
            className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Date</label>
              <input type="date" name="shiftDate" required min={today} defaultValue={today} className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">From</label>
              <input type="time" name="startTime" required defaultValue="18:00" className={inputClass} />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">To</label>
              <input type="time" name="endTime" required defaultValue="22:00" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] text-slate-500 mb-1">Officer</label>
              <select name="memberId" required defaultValue="" className={inputClass}>
                <option value="" disabled>Choose...</option>
                {officers.map((o) => (
                  <option key={o.discord_id} value={o.discord_id}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Role / note</label>
              <input name="roleNote" maxLength={120} placeholder="Optional" className={inputClass} />
            </div>
            <div className="col-span-2 md:col-span-6">
              <button type="submit" disabled={pending} className={btnClass}>Add shift</button>
            </div>
          </form>

          {rota.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming shifts on the rota.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {rota.map((s) => (
                <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-700">
                    <span className="font-bold">{s.shift_date}</span>
                    <span className="text-slate-500"> {s.start_time}-{s.end_time} - </span>
                    {s.member_name}
                    {s.role_note && <span className="text-slate-500"> ({s.role_note})</span>}
                  </div>
                  <button
                    disabled={pending}
                    onClick={() => startTransition(async () => setResult(await removeRotaShift(s.id)))}
                    className="px-3 py-1 border border-slate-300 text-slate-700 hover:bg-slate-100 text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

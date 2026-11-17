'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/portal-types';
import { requestStaffLoa } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

export default function LoaForm({ today }: { today: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [start, setStart] = useState('');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const r = await requestStaffLoa(fd);
      setResult(r);
      if (r.ok) {
        form.reset();
        setStart('');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="w-full bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
        <span className="text-[10px] font-mono text-[#5865F2] tracking-widest uppercase block mb-1">STAFF</span>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">Leave of Absence</h2>
        <p className="text-xs text-neutral-400 mt-1">Tell the team when you will be away. Your request is posted to the staff LOA channel.</p>
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

      <form onSubmit={submit} className="bg-neutral-900 border border-neutral-800 p-6 flex flex-col gap-4 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">First day away</span>
            <input type="date" name="start_date" required min={today} value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Last day away</span>
            <input type="date" name="end_date" required min={start || today} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Reason</span>
          <textarea name="reason" required rows={4} maxLength={1000} placeholder="Why will you be away?" className={`${inputClass} resize-y`} />
        </label>
        <div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono font-medium uppercase tracking-wider cursor-pointer"
          >
            {pending ? 'Sending...' : 'Send LOA request'}
          </button>
        </div>
      </form>
    </div>
  );
}

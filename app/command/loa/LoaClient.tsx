'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/portal-types';
import { requestLoa } from '@/app/dashboard/command/loa/actions';
import { ui } from '@/lib/met-util';

// Just the request form: first day, last day and a reason. The portal checks it and authorises or declines it straight away.
export default function LoaForm({ today }: { today: string }) {
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className={ui.h1}>Request an LOA</h1>
        <p className={ui.sub}>The portal checks your leave and authorises or declines it straight away. While you are away, [LOA] is added after your Discord name and it is logged for command.</p>
      </div>

      {result && (
        <p className={`text-sm rounded-md border px-4 py-3 ${result.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{result.message}</p>
      )}

      <form onSubmit={submit} className={ui.panel}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={ui.label}>First day</label>
            <input type="date" name="startDate" required min={today} defaultValue={today} className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Last day</label>
            <input type="date" name="endDate" required min={today} className={ui.input} />
          </div>
        </div>
        <div>
          <label className={ui.label}>Reason</label>
          <textarea name="reason" required rows={5} maxLength={500} placeholder="Explain why you will be away..." className={`${ui.input} resize-y`} />
        </div>
        <button type="submit" disabled={pending} className={`${ui.btn} disabled:opacity-50`}>{pending ? 'Checking...' : 'Submit LOA'}</button>
        <p className="text-xs text-slate-500">Up to 28 days, starting within the next 14 days, with a proper reason. Overlapping LOAs are declined. Your name goes back to normal automatically when it ends.</p>
      </form>
    </div>
  );
}

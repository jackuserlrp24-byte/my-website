'use client';

import { useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import type { ActionResult } from '@/lib/portal-types';
import { submitAppeal } from './actions';

const inputClass =
  'w-full bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 transition-colors select-text';
const labelClass = 'block text-[11px] font-semibold uppercase text-neutral-400 mb-1.5 font-mono';

interface Props {
  userName: string;
  status: { status: string; note: string | null; by: string | null; reviewedAt: string | null; createdAt: string } | null;
}

export default function AppealForm({ userName, status }: Props) {
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [done, setDone] = useState(false);

  const pending = status?.status === 'pending' || done;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await submitAppeal(fd);
      setResult(r);
      if (r.ok) setDone(true);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 px-4 py-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Appealing as</p>
          <p className="text-xs font-semibold text-neutral-200 tracking-wider">{userName}</p>
        </div>
        <a href="/api/auth/discord?next=/appeal" className="text-[11px] font-mono uppercase text-[#5865F2] hover:text-indigo-400 underline underline-offset-4">
          Switch
        </a>
      </div>

      {status && !done && status.status !== 'pending' && (
        <div
          className={`border p-4 text-xs font-mono leading-relaxed ${
            status.status === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <p className="font-bold uppercase tracking-wider mb-1">Your last appeal was {status.status}</p>
          {status.note && <p className="font-sans whitespace-pre-line">Staff note: {status.note}</p>}
          {status.reviewedAt && (
            <p className="text-[10px] opacity-70 mt-1">
              <LocalTime iso={status.reviewedAt} />
            </p>
          )}
          {status.status === 'accepted' && <p className="mt-2 font-sans">Your ban has been lifted. Rejoin the Discord server if you were removed, then log in to the portal.</p>}
        </div>
      )}

      {pending ? (
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 text-xs font-mono text-amber-300 leading-relaxed">
          <p className="font-bold uppercase tracking-wider mb-1">Appeal under review</p>
          <p className="font-sans">Staff have your appeal. Check back on this page, or watch your Discord DMs, for the result.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Roleplay name (optional)</label>
            <input name="rpName" maxLength={80} placeholder="e.g. J.Costin" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>What were you banned for?</label>
            <textarea name="banReason" required rows={2} maxLength={1000} placeholder="In your own words" className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Why should you be unbanned?</label>
            <textarea
              name="appealReason"
              required
              rows={5}
              maxLength={1500}
              placeholder="Be honest and specific. What happened, what you'd do differently, and why we should trust you."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Anything else / evidence links (optional)</label>
            <textarea name="extra" rows={2} maxLength={1000} placeholder="Clip or screenshot links, other context" className={`${inputClass} resize-none`} />
          </div>

          {result && !result.ok && (
            <div className="bg-red-500/10 border border-red-500/40 p-3 text-red-400 text-xs font-mono">{result.message}</div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            {busy ? 'Sending...' : 'Submit appeal'}
          </button>
          <p className="text-[10px] text-neutral-500 font-mono leading-relaxed">
            Your appeal opens a private ticket seen only by Gold Command and management, together with your moderation history. One appeal at a time.
          </p>
        </form>
      )}
    </div>
  );
}

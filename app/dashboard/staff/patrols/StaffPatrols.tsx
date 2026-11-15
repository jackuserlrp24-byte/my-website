'use client';

import { useRef, useState, useTransition } from 'react';
import PatrolsPage from '../../patrols/page';
import type { ActionResult } from '@/lib/portal-types';
import { postStaffPatrol } from '../patrol-actions';

const input =
  'w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-[#5865F2]';

export default function StaffPatrols() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [version, setVersion] = useState(0); // bumping this reloads the patrol list below
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await postStaffPatrol(fd);
      setResult(r);
      if (r.ok) {
        formRef.current?.reset();
        setOpen(false);
        setVersion((v) => v + 1);
      }
    });
  }

  return (
    <>
      <div className="px-8 mt-6 max-w-[1450px] mx-auto w-full">
        <div className="bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#5865F2]" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Post a patrol</h3>
              <p className="text-xs text-neutral-400 mt-1">Posts to the patrol channel on Discord with Book On / Not Attending buttons, and adds it to the list below.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
            >
              {open ? 'Cancel' : 'New patrol'}
            </button>
          </div>

          {result && (
            <p className={`mt-3 text-xs font-mono ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>{result.message}</p>
          )}

          {open && (
            <form ref={formRef} onSubmit={submit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="md:col-span-2 block">
                <span className="block text-[10px] text-neutral-400 mb-1">Patrol title</span>
                <input name="title" required placeholder="e.g. Joint Agency Patrol" className={input} />
              </label>
              <label className="block">
                <span className="block text-[10px] text-neutral-400 mb-1">Date</span>
                <input name="date" required placeholder="e.g. Friday, 2 Oct" className={input} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[10px] text-neutral-400 mb-1">Start time</span>
                  <input name="startTime" required placeholder="20:00" className={input} />
                </label>
                <label className="block">
                  <span className="block text-[10px] text-neutral-400 mb-1">End time</span>
                  <input name="endTime" required placeholder="22:00" className={input} />
                </label>
              </div>
              <label className="md:col-span-2 block">
                <span className="block text-[10px] text-neutral-400 mb-1">Description</span>
                <textarea name="description" rows={3} placeholder="What the patrol is for, where to meet, anything they need to know" className={input} />
              </label>
              <label className="md:col-span-2 block">
                <span className="block text-[10px] text-neutral-400 mb-1">Banner image link (optional)</span>
                <input name="imageUrl" type="url" placeholder="https://..." className={input} />
              </label>
              <div className="md:col-span-2">
                <button
                  disabled={pending}
                  className="px-5 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  {pending ? 'Posting...' : 'Post patrol'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <PatrolsPage key={version} />
    </>
  );
}

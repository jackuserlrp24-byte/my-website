'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import LocalTime from '@/app/components/LocalTime';
import { AOP_AREAS, parseAop } from '@/lib/aop-config';
import type { ActionResult } from '@/lib/portal-types';
import { getCurrentAop, setAop } from './actions';

type Current = { aop: string; by: string | null; stamp: string } | null;

export default function AopCard({ initial }: { initial: Current }) {
  const [current, setCurrent] = useState<Current>(initial);
  const [picked, setPicked] = useState<string[]>(parseAop(initial?.aop ?? null));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = useRef(false); // the picker has been touched, so don't overwrite it when the AOP changes elsewhere

  // Pick up changes made in game (or by another staff member) without a refresh.
  useEffect(() => {
    const t = setInterval(async () => {
      const latest = await getCurrentAop();
      if (!latest) return;
      setCurrent((c) => {
        if (c?.stamp === latest.stamp) return c;
        if (!dirty.current) setPicked(parseAop(latest.aop));
        return latest;
      });
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const toggle = (area: string) => {
    dirty.current = true;
    setResult(null);
    setPicked((p) => (p.includes(area) ? p.filter((a) => a !== area) : [...p, area]));
  };

  const save = () =>
    startTransition(async () => {
      const r = await setAop(picked);
      setResult(r);
      if (r.ok) {
        dirty.current = false;
        const latest = await getCurrentAop();
        if (latest) setCurrent(latest);
      }
    });

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">Area of Operations</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Changes show on every player&apos;s HUD within a few seconds. The in-game <span className="font-mono text-neutral-300">/aop</span> command changes the same setting.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Current</p>
          <p className="text-sm font-bold text-neutral-100">{current?.aop ?? 'Not set yet'}</p>
          {current && (
            <p className="text-[10px] font-mono text-neutral-500">
              {current.by ? `${current.by} - ` : ''}
              <LocalTime iso={current.stamp} />
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {AOP_AREAS.map((area) => {
          const on = picked.includes(area);
          return (
            <button
              key={area}
              type="button"
              onClick={() => toggle(area)}
              aria-pressed={on}
              className={`px-3 py-1.5 text-xs border cursor-pointer transition-colors ${
                on
                  ? 'bg-[#5865F2]/20 border-[#5865F2] text-white'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:border-neutral-600'
              }`}
            >
              {area}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending || picked.length === 0}
          className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
        >
          {pending ? 'Saving...' : 'Set AOP'}
        </button>
        {result && <span className={`text-xs font-mono ${result.ok ? 'text-emerald-300' : 'text-red-300'}`}>{result.message}</span>}
      </div>
    </div>
  );
}

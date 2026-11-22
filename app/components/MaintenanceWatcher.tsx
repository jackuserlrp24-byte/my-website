'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { panelsForPath } from '@/lib/maintenance-config';

const POLL_MS = 45000; // was 4s - this ran on every page for every visitor and was the biggest source of requests
const CREW_LEAVE_MS = 1700; // how long the workers take to walk off
const DOORS_MS = 550;       // doors closing / opening
const MIN_HOLD_MS = 300;    // keep the doors shut at least this long so the swap is never seen

type Status = { site: boolean; panels: Record<string, boolean> };
type Phase = 'idle' | 'closing' | 'closed' | 'opening';

/**
 * Keeps every open page in sync with maintenance mode:
 *  - when a page goes from "under maintenance" to open, the crew walks off, the doors close,
 *    the real page loads in behind them and the doors swing open. No browser reload.
 *  - when a page goes under maintenance, the same doors cover the swap.
 *  - if the server stops answering, it keeps trying and reloads the page as soon as the server is back.
 */
export default function MaintenanceWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isPending, startTransition] = useTransition();

  const blockedRef = useRef<boolean | null>(null); // is THIS page currently blocked?
  const offlineRef = useRef(false);
  const pathRef = useRef(pathname);
  const busyRef = useRef(false);
  const sawPendingRef = useRef(false);
  const closedAtRef = useRef(0);
  const checkRef = useRef<null | (() => void)>(null);

  const isBlocked = (s: Status, path: string) => s.site || panelsForPath(path).some((k) => !!s.panels[k]);

  useEffect(() => {
    pathRef.current = pathname;
    blockedRef.current = null; // re-learn the state when moving to another page
    checkRef.current?.(); // ...straight away, since we now poll slowly
  }, [pathname]);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function swapPage(crewLeaves: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      startTransition(() => router.refresh());
      busyRef.current = false;
      return;
    }

    if (crewLeaves) {
      root.classList.add('mt-leaving');
      await wait(CREW_LEAVE_MS);
    }
    setPhase('closing');
    await wait(DOORS_MS);
    setPhase('closed');
    closedAtRef.current = Date.now();
    sawPendingRef.current = false;
    startTransition(() => router.refresh());
    // safety net: never leave the doors shut if the refresh stalls
    setTimeout(() => {
      if (busyRef.current) openDoors();
    }, 6000);
  }

  function openDoors() {
    setPhase((p) => (p === 'closed' ? 'opening' : p));
    setTimeout(() => {
      document.documentElement.classList.remove('mt-leaving');
      setPhase('idle');
      busyRef.current = false;
    }, DOORS_MS + 50);
  }

  // the new page has arrived: open the doors
  useEffect(() => {
    if (phase !== 'closed') return;
    if (isPending) {
      sawPendingRef.current = true;
      return;
    }
    if (!sawPendingRef.current) return;
    const left = Math.max(0, MIN_HOLD_MS - (Date.now() - closedAtRef.current));
    const t = setTimeout(openDoors, left);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, phase]);

  useEffect(() => {
    // The Developer panel is where it gets switched - never refresh that page under the developer's hands.
    const skip = () => pathRef.current.startsWith('/developer');
    let stopped = false;

    async function check() {
      if (stopped || skip() || document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const status = (await res.json()) as Status;

        if (offlineRef.current) {
          // Server is back after being down: reload to get a clean page.
          offlineRef.current = false;
          setOffline(false);
          window.location.reload();
          return;
        }

        const blocked = isBlocked(status, pathRef.current);
        const was = blockedRef.current;
        blockedRef.current = blocked;
        if (was !== null && was !== blocked) swapPage(was && !blocked);
      } catch {
        offlineRef.current = true;
        setOffline(true);
      }
    }

    checkRef.current = check;
    check();
    const t = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      stopped = true;
      checkRef.current = null;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <>
      {phase !== 'idle' && (
        <div className="mt-doors" data-phase={phase} aria-hidden>
          <div className="mt-door mt-door-l" />
          <div className="mt-door mt-door-r" />
        </div>
      )}
      {offline && (
        <div className="mt-rise fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 border border-amber-500/40 text-amber-300 text-[11px] font-mono uppercase tracking-wider px-4 py-2 shadow-2xl">
          Server unavailable - reconnecting... this page refreshes automatically when it&apos;s back.
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MAINTENANCE_PANELS } from '@/lib/maintenance-config';

const POLL_MS = 4000;

type Status = { site: boolean; panels: Record<string, boolean> };

/**
 * Keeps every open page in sync with maintenance mode:
 *  - when the website / this panel is switched under maintenance (or back on) the page refreshes itself
 *  - if the server stops answering, it keeps trying and reloads the page as soon as the server is back.
 */
export default function MaintenanceWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  const blockedRef = useRef<boolean | null>(null); // is THIS page currently blocked?
  const offlineRef = useRef(false);
  const pathRef = useRef(pathname);

  const panelKey = (path: string) => MAINTENANCE_PANELS.find((p) => path === p.path || path.startsWith(`${p.path}/`))?.key;
  const isBlocked = (s: Status, path: string) => s.site || (!!panelKey(path) && !!s.panels[panelKey(path)!]);

  useEffect(() => {
    pathRef.current = pathname;
    blockedRef.current = null; // re-learn the state when moving to another page
  }, [pathname]);

  useEffect(() => {
    // The Developer panel is where it gets switched - never refresh that page under the developer's hands.
    const skip = () => pathRef.current.startsWith('/dashboard/developer');
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
        if (blockedRef.current !== null && blockedRef.current !== blocked) router.refresh();
        blockedRef.current = blocked;
      } catch {
        offlineRef.current = true;
        setOffline(true);
      }
    }

    check();
    const t = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      stopped = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [router]);

  if (!offline) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-neutral-900 border border-amber-500/40 text-amber-300 text-[11px] font-mono uppercase tracking-wider px-4 py-2 shadow-2xl">
      Server unavailable - reconnecting... this page refreshes automatically when it&apos;s back.
    </div>
  );
}

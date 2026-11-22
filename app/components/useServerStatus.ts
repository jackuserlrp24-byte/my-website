'use client';

import { useEffect, useState } from 'react';

export type ServerPlayer = { id: number; name: string; ping: number };
export type ServerStatus = {
  loaded: boolean;
  isOnline: boolean;
  players: ServerPlayer[];
  maxClients: number;
};

// One shared poll for the whole page, no matter how many components use the hook.
// Runs only while the tab is visible and at least one component is listening.
const POLL_MS = 20000;

let state: ServerStatus = { loaded: false, isOnline: false, players: [], maxClients: 64 };
const listeners = new Set<(s: ServerStatus) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;

function publish(next: ServerStatus) {
  state = next;
  listeners.forEach((l) => l(state));
}

async function load() {
  if (inflight) return;
  inflight = true;
  try {
    const res = await fetch('/api/server-status', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    publish({
      loaded: true,
      isOnline: !!d.isOnline,
      players: [...(d.players ?? [])].sort((a: ServerPlayer, b: ServerPlayer) => a.id - b.id),
      maxClients: Number(d.maxClients) || 64,
    });
  } catch {
    publish({ loaded: true, isOnline: false, players: [], maxClients: state.maxClients });
  } finally {
    inflight = false;
  }
}

const onVisible = () => {
  if (document.visibilityState === 'visible') load();
};

function start() {
  if (timer) return;
  load();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') load();
  }, POLL_MS);
  document.addEventListener('visibilitychange', onVisible);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  document.removeEventListener('visibilitychange', onVisible);
}

export function useServerStatus(): ServerStatus {
  const [s, setS] = useState<ServerStatus>(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    start();
    return () => {
      listeners.delete(setS);
      if (listeners.size === 0) stop();
    };
  }, []);
  return s;
}

'use client';

import { useEffect, useState } from 'react';

export default function FullscreenButton({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(!!document.documentElement.requestFullscreen);
    const sync = () => setOn(!!document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <button type="button" onClick={toggle} className={className}>
      {on ? 'Exit full screen' : 'Full screen'}
    </button>
  );
}

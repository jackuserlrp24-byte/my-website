'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * A normal link that also puts the browser into full screen when it is clicked (if `fullscreen` is true).
 * The click is the user gesture browsers require, and because Next.js changes page without reloading,
 * the page stays full screen all the way into the Met Police portal.
 */
export default function FullscreenLink({ fullscreen = true, onClick, ...rest }: ComponentProps<typeof Link> & { fullscreen?: boolean }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (!fullscreen) return;
        try {
          if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
        } catch {}
      }}
    />
  );
}

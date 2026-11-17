'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * A normal link: it opens the page in the same tab and does NOT switch the browser to full screen any more.
 * (The `fullscreen` prop is kept so existing links do not need changing. Full screen is still one click away
 * on the "Full screen" button inside the portals.)
 */
export default function FullscreenLink({ fullscreen: _fullscreen, ...rest }: ComponentProps<typeof Link> & { fullscreen?: boolean }) {
  return <Link {...rest} />;
}

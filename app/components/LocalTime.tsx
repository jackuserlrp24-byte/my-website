'use client';

import { useEffect, useState } from 'react';

// Formats in the viewer's own timezone (done after mount to avoid server/client mismatch).
export default function LocalTime({ iso, timeOnly = false }: { iso: string; timeOnly?: boolean }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const d = new Date(iso);
    setText(
      timeOnly
        ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
    );
  }, [iso, timeOnly]);

  return <span suppressHydrationWarning>{text || '...'}</span>;
}

'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.16em',
};

/**
 * "Loading shows" as a live status. The region mounts empty and takes its
 * text after mount: screen readers announce a change inside a live region,
 * not the content it was born with, so text present at first paint is often
 * never read.
 */
export function LoadingShowsStatus() {
  const [text, setText] = useState('');
  useEffect(() => {
    setText(CONSUMER_COPY.loadingShows);
  }, []);
  return (
    <span role="status" className="uppercase text-fg-muted" style={STYLE}>
      {text}
    </span>
  );
}

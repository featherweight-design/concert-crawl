import React from 'react';

import { formatLocalClock } from '@/lib/retry-after';

import { ARTIST_COPY } from './definitions/copy';
import type { FollowError } from './lib/use-artist-follow';

/** The words for a refusal, in the row's short form or the page's longer one. */
export const followErrorText = (
  error: FollowError,
  variant: 'row' | 'page',
): string => {
  const copy = ARTIST_COPY.followError[variant];
  switch (error.kind) {
    case 'not_found':
      return copy.notFound;
    case 'name_held':
      return copy.nameHeld;
    case 'rate_limited':
      return copy.rateLimited(formatLocalClock(error.retryAt));
    case 'unavailable':
      return copy.unavailable;
  }
};

/**
 * A refused follow, said where the person was looking: a search row's second
 * line, or the pitch under the page's Follow. Colour carries the severity
 * (`--danger` when a retry cannot work, `--warning` when it can) but is never
 * the only signal: every message has the glyph and the words. `role="status"`
 * so a screen reader hears it without the focus moving off the Follow.
 */
export const FollowErrorMessage = ({
  error,
  variant,
  style,
}: {
  error: FollowError;
  variant: 'row' | 'page';
  style?: React.CSSProperties;
}) => {
  const final = error.kind === 'not_found' || error.kind === 'name_held';
  return (
    <span
      role="status"
      data-follow-error={error.kind}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 6,
        color: final ? 'var(--danger)' : 'var(--warning)',
        ...style,
      }}
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ flexShrink: 0, marginTop: variant === 'row' ? 1 : 2 }}
      >
        <path d="M7 1.6 12.8 12H1.2L7 1.6Z" />
        <path d="M7 5.6v3M7 10.4v.1" />
      </svg>
      <span>{followErrorText(error, variant)}</span>
    </span>
  );
};

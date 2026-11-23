'use client';

import React from 'react';

import { ARTIST_COPY } from './definitions/copy';
import { FollowErrorMessage } from './FollowErrorMessage';
import { followErrorIsFinal, type FollowError } from './lib/use-artist-follow';
import {
  FollowButton,
  type FollowButtonBaseProps,
  type FollowButtonLockProps,
} from './FollowButton';

// Omit the base, then re-attach the lock union: `Omit` over a union is not
// distributive and would flatten it back into two optionals.
type FollowBlockProps = Omit<
  FollowButtonBaseProps,
  'size' | 'tone' | 'full' | 'disabled'
> &
  FollowButtonLockProps & {
    /** The last refusal: replaces the pitch, and greys the Follow if final. */
    error?: FollowError | null;
  };

/**
 * The full-width follow bar plus the one line that says what a follow actually
 * does. The pitch is the honesty rail: it promises neither a notification nor
 * an automatic entry in Watching, because a manual follow delivers neither.
 */
export const FollowBlock = (props: FollowBlockProps) => {
  const { error = null, ...buttonProps } = props;
  const { following, signedOut, locked = false } = buttonProps;
  // A locked plan cannot be following, whatever the prop says, so it never gets
  // the "you're following" line.
  const pitch = signedOut
    ? ARTIST_COPY.followSignedOutPitch
    : following && !locked
      ? ARTIST_COPY.followPitchActive
      : ARTIST_COPY.followPitch;

  return (
    <div>
      <FollowButton
        {...buttonProps}
        size="primary"
        tone="hero"
        full
        disabled={followErrorIsFinal(error)}
      />
      <p
        data-follow-pitch=""
        style={{
          margin: '8px 0 0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12.5,
          // B+ `09-artist`: the pitch centres under the button, in the hero on
          // desktop and under the stage on mobile.
          textAlign: 'center',
          lineHeight: 1.45,
          fontWeight: 500,
          color: 'var(--fg-muted)',
          textWrap: 'pretty',
        }}
      >
        {error ? (
          <FollowErrorMessage
            error={error}
            variant="page"
            style={{ textAlign: 'left' }}
          />
        ) : (
          pitch
        )}
      </p>
    </div>
  );
};

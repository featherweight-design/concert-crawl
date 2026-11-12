'use client';

import React from 'react';

import { ARTIST_COPY } from './definitions/copy';
import { FollowButton, type FollowButtonProps } from './FollowButton';

type FollowBlockProps = Omit<FollowButtonProps, 'size' | 'tone' | 'full'>;

/**
 * The full-width follow bar plus the one line that says what a follow actually
 * does. The pitch is the honesty rail: it promises neither a notification nor
 * an automatic entry in Watching, because a manual follow delivers neither.
 */
export const FollowBlock = (props: FollowBlockProps) => {
  const { following, signedOut, locked = false } = props;
  // A locked plan cannot be following, whatever the prop says, so it never gets
  // the "you're following" line.
  const pitch = signedOut
    ? ARTIST_COPY.followSignedOutPitch
    : following && !locked
      ? ARTIST_COPY.followPitchActive
      : ARTIST_COPY.followPitch;

  return (
    <div>
      <FollowButton {...props} size="primary" tone="hero" full />
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
        {pitch}
      </p>
    </div>
  );
};

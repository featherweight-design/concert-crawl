'use client'

import React from 'react'

import { ARTIST_COPY } from './definitions/copy'
import { FollowButton, type FollowButtonProps } from './FollowButton'

type FollowBlockProps = Omit<FollowButtonProps, 'size'>

/**
 * The full-width follow bar plus the one line that says what a follow actually
 * does. The pitch is the honesty rail: it never promises a notification, only
 * that the artist's shows land in Watching.
 */
export const FollowBlock = ({
  name,
  following,
  signedOut,
  onToggle,
}: FollowBlockProps) => {
  const pitch = signedOut
    ? ARTIST_COPY.followSignedOutPitch
    : following
      ? ARTIST_COPY.followPitchActive
      : ARTIST_COPY.followPitch

  return (
    <div>
      <FollowButton
        name={name}
        following={following}
        signedOut={signedOut}
        onToggle={onToggle}
      />
      <p
        data-follow-pitch=""
        style={{
          margin: '8px 0 0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11.5,
          lineHeight: 1.45,
          fontWeight: 500,
          color: 'var(--fg-subtle)',
          textWrap: 'pretty',
        }}
      >
        {pitch}
      </p>
    </div>
  )
}

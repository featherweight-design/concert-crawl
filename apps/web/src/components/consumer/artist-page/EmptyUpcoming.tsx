'use client'

import React from 'react'

import { ARTIST_COPY } from './definitions/copy'
import { FollowButton, type FollowButtonProps } from './FollowButton'
import { SectionHead } from './SectionHead'

interface EmptyUpcomingProps extends Omit<
  FollowButtonProps,
  'size' | 'tone' | 'full'
> {
  /**
   * Whether THIS block owns the page's one live follow affordance. On desktop
   * the sticky rail already holds it, so the card is copy only — two live
   * follows on one page is the bug this prop exists to prevent.
   */
  inlineFollow: boolean
}

/**
 * Not a placeholder. With no dates booked this is the strongest conversion
 * moment on the page, so it is a first-class block: it says plainly that we see
 * nothing, and offers the one thing that makes the next date find the visitor.
 */
export const EmptyUpcoming = ({
  inlineFollow,
  ...followProps
}: EmptyUpcomingProps) => (
  <section>
    {/* No count — zero is already said in words below, and the mono count is
        the string that clips at 320px. */}
    <SectionHead id="upcoming" title={ARTIST_COPY.upcomingTitle} />
    <div
      data-empty-upcoming=""
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: 18,
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 17,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        {ARTIST_COPY.emptyTitle}
      </p>
      <p
        style={{
          margin: inlineFollow ? '8px 0 16px' : '8px 0 0',
          fontFamily: 'Inter, system-ui',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
          textWrap: 'pretty',
        }}
      >
        {followProps.following && !followProps.locked
          ? ARTIST_COPY.emptyBodyFollowing
          : ARTIST_COPY.emptyBody}
      </p>
      {inlineFollow ? (
        <FollowButton {...followProps} size="primary" tone="loud" full />
      ) : null}
    </div>
  </section>
)

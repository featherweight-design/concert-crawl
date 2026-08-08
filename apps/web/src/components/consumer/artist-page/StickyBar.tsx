'use client'

import React from 'react'

import { BackChip } from '../back-chip/BackChip'

import { FollowButton, type FollowButtonProps } from './FollowButton'

interface StickyBarProps extends Omit<FollowButtonProps, 'size'> {
  /** True once the identity plate has scrolled past. */
  visible: boolean
  /**
   * Whether the bar carries the page's one live follow. Decided by the page —
   * with no upcoming shows the follow lives in the empty-upcoming block, and
   * the bar must not grow a second one.
   */
  showFollow: boolean
}

/**
 * Mobile only. On desktop the left rail is `position: sticky`, so wayfinding
 * and the follow stay on screen for the whole scroll — there is no desktop
 * sub-header, deliberately.
 */
export const StickyBar = ({
  visible,
  showFollow,
  ...followProps
}: StickyBarProps) => {
  const { name } = followProps
  if (!visible) return null

  return (
    <div
      data-sticky-bar=""
      className="md:hidden"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <BackChip inline fallbackHref="/events" />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'Inter, system-ui',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.01em',
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
      {showFollow ? <FollowButton {...followProps} size="compact" /> : null}
    </div>
  )
}

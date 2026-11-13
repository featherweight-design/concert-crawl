'use client';

import React from 'react';

import { BackChip } from '../back-chip/BackChip';

interface StickyBarProps {
  /** The artist's name. */
  name: string;
  /** True once the identity plate has scrolled past. */
  visible: boolean;
}

/**
 * Mobile only: back and the name once the stage has scrolled past. It never
 * carries Follow, which stays under the hero and is not sticky (addendum 2,
 * item 27). There is no desktop sub-header, deliberately.
 */
export const StickyBar = ({ name, visible }: StickyBarProps) => {
  if (!visible) return null;

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
        // 56px of bar below the status-bar inset, and clear of a landscape
        // notch: viewport-fit=cover makes all three insets live.
        height: 'calc(56px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'calc(12px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))',
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
    </div>
  );
};

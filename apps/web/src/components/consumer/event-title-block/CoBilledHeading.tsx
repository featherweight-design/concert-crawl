'use client';

// The event heading of a co-billed show (addendum-8 §5): one `h1`, each
// co-headliner its own link to `/artists/{slug}`, joined "A & B" or "A, B & C".
//
// From three acts the phone shows the first two and a "+N more" chip, desktop
// the first three; the chip expands the heading in place and reads "Show
// fewer". The two breakpoints are drawn with CSS rather than measured, so the
// server and client markup match and nothing jumps on hydration.
//
// An act with no artist page, and every act when `linkArtists` is off (the
// signed-out mirror), is plain text at the same weight and colour.

import React, { useState } from 'react';
import Link from 'next/link';
import type { EventHeadliner } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const COPY = CONSUMER_COPY.eventTitle;

/** Names shown before the chip, under 1024px and from it. */
const PHONE_NAMES = 2;
const DESKTOP_NAMES = 3;

// Rest is a 2px dotted underline in --fg at 40%, so two links read as two;
// hover goes solid --fg; pressed turns name and underline --signal; focus draws
// a 2px --signal ring behind a 2px --bg gap around that one name.
const LINK_CLASS =
  'rounded-lg underline decoration-dotted decoration-2 underline-offset-4 ' +
  'decoration-[color-mix(in_oklch,var(--fg)_40%,transparent)] ' +
  'hover:decoration-solid hover:decoration-[var(--fg)] ' +
  'active:text-signal active:decoration-solid active:decoration-[var(--signal)] ' +
  'focus-visible:outline-none ' +
  'focus-visible:[box-shadow:0_0_0_2px_var(--bg),0_0_0_4px_var(--signal)]';

const CHIP_CLASS =
  'h-7 shrink-0 items-center rounded-full border border-border-strong px-2.5 ' +
  'font-bold text-fg';

interface CoBilledHeadingProps {
  headliners: EventHeadliner[];
  /** Links the names that have a page. Off on the signed-out mirror. */
  linkArtists: boolean;
  as: 'h1' | 'div';
  className: string;
  style: React.CSSProperties;
}

/** The joiner written before name `index` of `total`. */
const joinerBefore = (
  index: number,
  total: number,
  expanded: boolean,
): React.ReactNode => {
  if (index === 0) return null;
  if (index === 1) return total === 2 ? ' & ' : ', ';
  // From the third name a collapsed heading ends "A, B & C"; expanded, only
  // the last name takes the "&".
  return expanded && index < total - 1 ? ', ' : ' & ';
};

export const CoBilledHeading = ({
  headliners,
  linkArtists,
  as: Heading,
  className,
  style,
}: CoBilledHeadingProps): React.JSX.Element => {
  const [expanded, setExpanded] = useState(false);
  const total = headliners.length;

  const hiddenClass = (index: number): string => {
    if (expanded) return '';
    if (index >= DESKTOP_NAMES) return 'hidden';
    if (index >= PHONE_NAMES) return 'hidden lg:inline';
    return '';
  };

  const chip = (hiddenCount: number, visibility: string, testId: string) =>
    hiddenCount > 0 ? (
      <button
        type="button"
        data-testid={testId}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className={`${CHIP_CLASS} ${visibility}`}
        style={{ fontSize: 13, letterSpacing: '-0.01em' }}
      >
        {expanded ? COPY.showFewer : COPY.moreChip(hiddenCount)}
      </button>
    ) : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 lg:justify-start">
      <Heading className={className} style={style}>
        {headliners.map((act, index) => {
          const joiner = joinerBefore(index, total, expanded);
          return (
            <span
              key={`${act.slug ?? 'plain'}-${act.name}`}
              className={hiddenClass(index)}
            >
              {joiner === ' & ' ? (
                <>
                  {' '}
                  <span className="text-fg-muted">&amp;</span>{' '}
                </>
              ) : (
                joiner
              )}
              {linkArtists && act.slug !== null ? (
                <Link href={`/artists/${act.slug}`} className={LINK_CLASS}>
                  {act.name}
                </Link>
              ) : (
                act.name
              )}
            </span>
          );
        })}
      </Heading>
      {chip(total - PHONE_NAMES, 'inline-flex lg:hidden', 'cobill-chip-phone')}
      {chip(
        total - DESKTOP_NAMES,
        'hidden lg:inline-flex',
        'cobill-chip-desktop',
      )}
    </div>
  );
};

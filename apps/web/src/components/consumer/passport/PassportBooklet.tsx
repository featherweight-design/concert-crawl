'use client';

import { Fragment, useRef, useState, type CSSProperties } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  BookletStamp,
  EmptySlot,
  NextSlot,
  slotTilt,
} from '@/components/consumer/passport/BookletStamp';
import {
  PassportIdPage,
  type PassportIdentity,
} from '@/components/consumer/passport/PassportIdPage';
import {
  STAMPS_PER_PAGE,
  bookletSpreads,
  spreadHasStamps,
  spreadLabel,
  spreadName,
  type BookletLayout,
  type BookletLeaf,
  type BookletPage,
} from '@/lib/passport/booklet';
import type { PassportStats } from '@/lib/passport/stats';

const COPY = CONSUMER_COPY.passport;

/** How far a finger has to travel before the page turns. */
const SWIPE_THRESHOLD = 40;

/**
 * The board's booklet stamp (`addendum-2/04/passport-{m,d}`). On a 320px phone
 * the page is 286px inside the main gutter and the booklet's 1px border, so the
 * page's 12px side padding leaves 262px for two stamps and a 12px gap (260).
 */
export const STAMP_SIZE = 124;

/** The booklet's drop shadow, as the boards draw it on every theme they draw. */
export const BOOKLET_SHADOW = '0 40px 100px rgba(0, 0, 0, 0.5)';

/** The frame: a 1px gradient hairline that fades into the border. */
export const BOOKLET_FRAME =
  'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box';

/** The page split: a 5-on, 5-off dashed hairline in `--border-strong`. */
export const BOOKLET_SPLIT_DASH =
  'var(--border-strong) 0 5px, transparent 5px 10px';
const SPLIT_DOWN: CSSProperties = {
  width: 1,
  background: `repeating-linear-gradient(180deg, ${BOOKLET_SPLIT_DASH})`,
};
const SPLIT_ACROSS: CSSProperties = {
  height: 1,
  background: `repeating-linear-gradient(90deg, ${BOOKLET_SPLIT_DASH})`,
};

const MONO_LABEL =
  'font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle';

/** The booklet's fill: the surface with the dot grid of a passport page. */
const PAGE_GROUND: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklch, var(--fg) 9%, transparent) 1px, transparent 1.4px)',
  backgroundSize: '14px 14px',
};

function StampPage({ page, size }: { page: BookletPage; size: number }) {
  return (
    <div
      data-booklet-leaf={`page-${page.number}`}
      className="relative grid h-full grid-cols-2 place-items-center gap-3 px-3 pb-8 pt-5"
      style={PAGE_GROUND}
    >
      {page.slots.map((slot, index) => {
        const key = `${page.number}-${index}`;
        const tilt = slotTilt(index);
        if (slot.kind === 'stamp')
          return (
            <BookletStamp key={key} show={slot.show} size={size} tilt={tilt} />
          );
        if (slot.kind === 'next')
          return (
            <NextSlot key={key} show={slot.show} size={size} tilt={tilt} />
          );
        return <EmptySlot key={key} size={size} tilt={tilt} />;
      })}
      <span className={`absolute bottom-3 right-4 ${MONO_LABEL}`}>
        {COPY.pageLabel(page.number)}
      </span>
    </div>
  );
}

function Leaf({
  leaf,
  identity,
  stats,
  size,
}: {
  leaf: BookletLeaf;
  identity: PassportIdentity;
  stats: PassportStats;
  size: number;
}) {
  return leaf.kind === 'id' ? (
    <PassportIdPage identity={identity} stats={stats} />
  ) : (
    <StampPage page={leaf.page} size={size} />
  );
}

function PagerButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'previous' ? COPY.previousPage : COPY.nextPage}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-1 text-fg disabled:opacity-40"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={direction === 'previous' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** The number a leaf goes by: 0 for the identity page, else its page number. */
const leafNumber = (leaf: BookletLeaf): number =>
  leaf.kind === 'id' ? 0 : leaf.page.number;

/**
 * The spread a page sits in. The page is what the booklet remembers, not the
 * spread index, because the two layouts group pages differently: page 3 is
 * spread 2 on desktop and spread 3 on a phone.
 */
export const spreadIndexFor = (
  spreads: readonly BookletLeaf[][],
  page: number,
): number => {
  const found = spreads.findIndex((spread) =>
    spread.some((leaf) => leafNumber(leaf) === page),
  );
  return found < 0 ? spreads.length - 1 : found;
};

interface BookletViewProps {
  layout: BookletLayout;
  pages: BookletPage[];
  identity: PassportIdentity;
  stats: PassportStats;
  /** The first visible page, 0 for the identity page. */
  firstPage: number;
  onTurn: (firstPage: number) => void;
  className: string;
  /** The pager row under the book. The empty book has none. */
  pager: boolean;
}

function BookletView({
  layout,
  pages,
  identity,
  stats,
  firstPage,
  onTurn,
  className,
  pager,
}: BookletViewProps) {
  const stack = layout === 'stack';
  const spreads = bookletSpreads(pages, layout);
  const current = spreadIndexFor(spreads, firstPage);
  const spread = spreads[current] ?? [];
  const last = spreads.length - 1;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = (index: number) => {
    const target = spreads[Math.max(0, Math.min(last, index))];
    const lead = target?.[0];
    if (lead !== undefined) onTurn(leafNumber(lead));
  };

  const following = spreads[current + 1];
  const lastLeaf = spread[spread.length - 1];
  const status = stack
    ? following?.[0] !== undefined
      ? COPY.swipeForPage(leafNumber(following[0]))
      : COPY.pageNightsSoFar(
          lastLeaf === undefined ? 1 : Math.max(1, leafNumber(lastLeaf)),
          stats.nights,
        )
    : [
        COPY.spreadOf(current + 1, spreads.length),
        following !== undefined && !spreadHasStamps(following)
          ? COPY.nextPageWaiting
          : null,
      ]
        .filter((part): part is string => part !== null)
        .join(' · ');
  const showJump = pager && !stack && stats.nights > STAMPS_PER_PAGE;

  return (
    <div data-booklet-layout={layout} className={className}>
      <div
        className="overflow-hidden rounded-[22px]"
        style={{
          // The board's frame (`passport-{m,d}`): a 1px gradient hairline that
          // fades into the border, and a deep drop shadow.
          border: '1px solid transparent',
          background: BOOKLET_FRAME,
          boxShadow: BOOKLET_SHADOW,
          // The page turns sideways; vertical drags stay the browser's scroll.
          touchAction: stack ? 'pan-y' : undefined,
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current =
            !stack || touch === undefined
              ? null
              : { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const touch = event.changedTouches[0];
          touchStart.current = null;
          if (start === null || touch === undefined) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          // A scroll that drifts sideways is still a scroll.
          if (Math.abs(dx) <= Math.abs(dy)) return;
          if (dx < -SWIPE_THRESHOLD) go(current + 1);
          else if (dx > SWIPE_THRESHOLD) go(current - 1);
        }}
      >
        <div
          className={
            stack
              ? 'flex flex-col'
              : 'grid min-h-[340px] grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]'
          }
        >
          {spread.map((leaf, index) => (
            <Fragment key={leafNumber(leaf)}>
              {index > 0 && (
                <span
                  aria-hidden="true"
                  data-booklet-split=""
                  style={stack ? SPLIT_ACROSS : SPLIT_DOWN}
                />
              )}
              <Leaf
                leaf={leaf}
                identity={identity}
                stats={stats}
                size={STAMP_SIZE}
              />
            </Fragment>
          ))}
        </div>
      </div>

      {pager && (
        <div className="flex items-center gap-3">
          <PagerButton
            direction="previous"
            disabled={current === 0}
            onClick={() => go(current - 1)}
          />
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {spreads.map((_, index) => (
              <span
                key={index}
                className="h-1.5 rounded-full"
                style={{
                  width: index === current ? 28 : 6,
                  background:
                    index === current
                      ? 'linear-gradient(90deg, var(--signal), var(--cta-end))'
                      : 'var(--border-strong)',
                  transition: 'width var(--motion-base) var(--motion-ease)',
                }}
              />
            ))}
          </span>
          <span
            aria-live="polite"
            data-booklet-status=""
            className={`min-w-0 flex-1 truncate ${MONO_LABEL}`}
          >
            {status}
          </span>
          <PagerButton
            direction="next"
            disabled={current === last}
            onClick={() => go(current + 1)}
          />
        </div>
      )}

      {showJump && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={MONO_LABEL}>{COPY.jumpTo}</span>
          {spreads.map((item, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={index === current}
              aria-label={spreadLabel(item)}
              onClick={() => go(index)}
              className={`min-h-9 rounded-lg border px-3 font-mono text-[10px] uppercase tracking-[0.14em] ${
                index === current
                  ? 'border-signal text-fg'
                  : 'border-border text-fg-subtle'
              }`}
            >
              {spreadName(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PassportBookletProps {
  pages: BookletPage[];
  identity: PassportIdentity;
  stats: PassportStats;
  /**
   * The pager row under the book. Off for the empty book (addendum 2 item 16,
   * `passport-empty-d`), which draws one spread and no pager.
   */
  pager?: boolean;
}

/**
 * The open stamp booklet (B+ Passport board): four stamps a page, two pages a
 * spread on desktop, and on a phone the identity page over page 1, then one
 * page at a time under a swipe.
 *
 * Both layouts render and CSS shows one, so a phone never paints a frame of
 * the desktop spread before a media query answers. They share the first
 * visible page, so a resize keeps the reader on the page they were reading.
 */
export function PassportBooklet({
  pages,
  identity,
  stats,
  pager = true,
}: PassportBookletProps) {
  const [firstPage, setFirstPage] = useState(0);
  const shared = {
    pages,
    identity,
    stats,
    firstPage,
    onTurn: setFirstPage,
    pager,
  };
  return (
    <section aria-label={COPY.bookletLabel}>
      <BookletView
        layout="stack"
        className="flex flex-col gap-4 sm:hidden"
        {...shared}
      />
      <BookletView
        layout="spread"
        className="hidden flex-col gap-4 sm:flex"
        {...shared}
      />
    </section>
  );
}

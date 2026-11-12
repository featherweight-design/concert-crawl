import React from 'react';
import Link from 'next/link';
import type { EventStatus } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { StatusPill } from '@/components/consumer/StatusPill';
import { isDelisted } from '@/components/consumer/event-row/lib/row-status';
import { SupportingLine } from './SupportingLine';

/**
 * The two title surfaces that still share this component: the event-detail
 * page and the `HeroEventCard`. The row used to be a third (`card`), and the
 * needs diverged — the row carries no status pill above its title and no
 * legacy fallback paragraph below it. It renders `RowTitleLine` instead.
 */
type Surface = 'hero' | 'detail';

const RAMP: Record<Surface, { head: number; tour: number; gap: number }> = {
  hero: { head: 22, tour: 10, gap: 3 },
  detail: { head: 34, tour: 12, gap: 5 },
};

interface EventTitleBlockProps {
  headliner: string;
  supportingArtists: string[] | null;
  tourName: string | null;
  fallbackTitle?: string | null;
  surface: Surface;
  status?: EventStatus;
  /**
   * The stale sweep's marker (B+ A5). With `status: 'cancelled'` the pill reads
   * No longer listed rather than Cancelled.
   */
  delistedAt?: string | null | undefined;
  /**
   * The page draws the No longer listed card under the hero, so the hero carries
   * no chip of its own (event-nll-m). Left off where no such card renders, so a
   * delisted show still says so.
   */
  delistedCardBelow?: boolean | undefined;
  maxInline?: number | null;
  headlinerAs?: 'h1' | 'div';
  /**
   * #1115 PR-G — the headliner's artist-page slug, or null when the projection
   * has no row for that name. Ignored unless `linkArtists` is set.
   */
  artistSlug?: string | null;
  /** Positionally aligned with `supportingArtists`. See SupportingLine. */
  supportingArtistSlugs?: Array<string | null> | null;
  /**
   * Opt-in artist-page links. Off everywhere but the event-detail surface, so
   * cards and heroes keep their whole-card tap target intact — a nested link
   * inside a card link is both invalid markup and a bad tap target.
   */
  linkArtists?: boolean;
  /**
   * The headline's size as a CSS value, overriding the surface's ramp. The
   * event stage passes a custom property that steps at its breakpoint (B8).
   */
  headSize?: string;
  /**
   * Centers the block on mobile and returns it to the start edge from `sm`
   * up, for the event stage, whose title sits under the card on a phone and
   * beside it on desktop.
   */
  centered?: boolean;
  /**
   * Classes for a wrapper around the supporting line, for a surface that shows
   * it only at some widths. The B+ mobile spotlight drops the "with ..." line
   * below `sm` and keeps it on desktop. Omitted, the line renders unwrapped.
   */
  supportClassName?: string;
  /**
   * Rendered between the supporting line and the detail status pill. The board
   * stacks title, genre chip, status pill, date, so the chips come from the
   * page and sit above the pill.
   */
  beforePill?: React.ReactNode;
}

export const EventTitleBlock = ({
  headliner,
  supportingArtists,
  tourName,
  fallbackTitle,
  surface,
  status = 'upcoming',
  delistedAt = null,
  delistedCardBelow = false,
  maxInline = null,
  headlinerAs = 'div',
  artistSlug = null,
  supportingArtistSlugs = null,
  linkArtists = false,
  headSize,
  centered = false,
  supportClassName,
  beforePill,
}: EventTitleBlockProps): React.JSX.Element => {
  const ramp = RAMP[surface];
  // `detail` is the surface that renders on the event stage's wash (B8), the
  // blurred photo tinted in the theme's two colors. `--fg-subtle` measures
  // 3.49:1 on flat ground and less over the wash, so the dimmed variants step
  // up there. See SupportingLine, which makes the
  // same call for the line below these.
  const dimQuiet = surface === 'detail' ? 'text-fg-muted' : 'text-fg-subtle';
  // Only a cancelled show is dimmed. Postponed and No longer listed keep the
  // name at full strength: nothing says they are off (more-st-ev_post_m,
  // event-nll-m).
  const dim = status === 'cancelled' && !isDelisted(status, delistedAt);
  const openers = supportingArtists ?? [];
  const hasOpeners = openers.length > 0;
  // `null` marks a legacy/pre-recrawl row (the crawler never wrote this field);
  // `[]` means the crawler ran and found no openers. Only legacy rows get the
  // run-on `fallbackTitle` — a freshly extracted solo show (`[]`) shows the
  // headliner alone, never the legacy title. Strict `=== null`: `null` is the
  // sole legacy marker, and the prop is required so `undefined` cannot reach here.
  const isLegacyRow = supportingArtists === null;
  // The pill itself decides whether to render; this only drives whether the
  // row that would contain it exists at all.
  //
  // The detail hero of a No longer listed show draws no chip: the dashed card
  // below carries it (event-nll-m).
  const hasPill =
    status !== 'upcoming' &&
    !(
      surface === 'detail' &&
      delistedCardBelow &&
      isDelisted(status, delistedAt)
    );
  // B+ (`08-prices-and-status/more-st-ev_canc_m`): on the detail page the
  // status chip sits under the title, not in the tour row above it.
  const pillBelow = surface === 'detail';
  const Headliner = headlinerAs;
  const showLegacyFallback =
    isLegacyRow && !!fallbackTitle && fallbackTitle !== headliner;

  const supportingLine = (
    <SupportingLine
      artists={openers}
      surface={surface}
      maxInline={maxInline}
      dim={dim}
      slugs={supportingArtistSlugs}
      linkArtists={linkArtists}
    />
  );

  return (
    <div
      className={`flex min-w-0 flex-col ${centered ? 'items-center text-center sm:items-start sm:text-left' : ''}`}
      style={{ gap: ramp.gap }}
    >
      {((hasPill && !pillBelow) || tourName) && (
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ marginBottom: 1 }}
        >
          {pillBelow ? null : (
            <StatusPill
              status={status}
              fontSize={ramp.tour}
              delisted={isDelisted(status, delistedAt)}
            />
          )}
          {tourName && (
            <div
              aria-label={CONSUMER_COPY.eventTitle.tourAriaLabel(tourName)}
              className={`truncate font-mono uppercase tracking-[0.14em] ${dim ? dimQuiet : 'text-fg-muted'}`}
              style={{ fontSize: ramp.tour }}
            >
              {tourName}
            </div>
          )}
        </div>
      )}

      <Headliner
        // `detail` wraps to as many lines as needed (no `truncate`); `hero`
        // stays one line via `truncate` (which sets overflow-hidden + ellipsis +
        // whitespace-nowrap). Applying `truncate` on `detail` too would clip a
        // multi-line title, so it is scoped to the hero only.
        className={`m-0 min-w-0 ${dim ? 'text-fg-muted' : 'text-fg transition-colors group-hover/eventtitle:text-signal'} ${surface === 'detail' ? 'whitespace-normal' : 'truncate'}`}
        // B+ draws a cancelled show's title struck and dimmed
        // (`more-st-ev_canc_m`, `more-st-rows_board`). Postponed is not struck,
        // and nor is a No longer listed show: nothing says it is off. The
        // strike is the detail page's only: the hero card keeps its words.
        style={{
          textDecoration:
            surface === 'detail' &&
            status === 'cancelled' &&
            !isDelisted(status, delistedAt)
              ? 'line-through'
              : undefined,
          // A heavier strike on the 64px headline, as drawn.
          textDecorationThickness:
            surface === 'detail' &&
            status === 'cancelled' &&
            !isDelisted(status, delistedAt)
              ? '3px'
              : undefined,
          fontSize: headSize ?? ramp.head,
          fontWeight: surface === 'detail' ? 900 : 800,
          letterSpacing: surface === 'detail' ? '-0.03em' : '-0.02em',
          lineHeight: 1.12,
        }}
      >
        {/* The link lives INSIDE the heading so the h1 keeps its text and its
            place in the document outline; wrapping the heading would move the
            landmark. Sizing is inherited, so the RAMP is untouched. */}
        {linkArtists && artistSlug !== null ? (
          <Link
            href={`/artists/${artistSlug}`}
            className="underline-offset-4 hover:underline focus-visible:underline"
          >
            {headliner}
          </Link>
        ) : (
          headliner
        )}
      </Headliner>

      {hasOpeners &&
        (supportClassName === undefined ? (
          supportingLine
        ) : (
          <div data-testid="title-support" className={supportClassName}>
            {supportingLine}
          </div>
        ))}

      {beforePill}

      {pillBelow && hasPill && (
        <div className="flex" style={{ marginTop: 2 }}>
          <StatusPill
            status={status}
            fontSize={ramp.tour}
            delisted={isDelisted(status, delistedAt)}
          />
        </div>
      )}

      {showLegacyFallback && (
        <p
          className={`truncate font-medium ${dim ? dimQuiet : 'text-fg-muted'}`}
          style={{ fontSize: RAMP[surface].tour + 3 }}
        >
          {fallbackTitle}
        </p>
      )}
    </div>
  );
};

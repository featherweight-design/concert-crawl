'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import {
  parseListParam,
  type CrewSummary,
  type VenuePublic,
} from '@concert-crawl/types';
import {
  CREWS_COPY,
  CrewLensPill,
  CrewLensRail,
  CrewPickerBody,
} from '@/components/consumer/crews';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { GenreDot } from '@/components/consumer/GenreDot';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { cn } from '@/lib/utils';
import { useFeatureFlag } from '@/lib/queries/use-feature-flags';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { FilterPopover } from './FilterPopover';
import { FilterSheet } from './FilterSheet';
import {
  FILTER_DEFS,
  FILTER_ORDER,
  MULTI_FILTER_KEYS,
  VIBE_ORDER,
  type FilterKey,
  type FilterValues,
  getActiveFilterCount,
  getChipLabel,
  getFilterOptions,
  getFirstResolvedLabel,
  isMultiFilter,
  toggleValue,
} from './filter-defs';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { TasteFilterChip } from './TasteFilterChip';
import {
  CHIP_ROW_CLASS,
  CHIP_ROW_STYLE,
  COUNT_LINE_STYLE,
  COUNT_ROW_CLASS,
  FILTER_CHIP_CLASS,
  HEADING_EYEBROW_CLASS,
  HEADING_EYEBROW_STYLE,
  HEADING_TITLE_CLASS,
  HEADING_TITLE_STYLE,
  IconChevDown,
  SEGMENT_BAR_CLASS,
  SEGMENT_BLOCK_CLASS,
  VIEW_SEGMENTS,
  VIEW_SEGMENT_CLASS,
  VIEW_TOGGLE_CLASS,
  VIEW_TOGGLE_STYLE,
  filterChipStyle,
  segmentBarStyle,
  viewSegmentStyle,
} from './chrome';
import { FollowFilterChip } from './FollowFilterChip';
import { FilterSegment } from './FilterSegment';
import { SegmentDivider } from './ChipDivider';
import { VenueOptionGrid } from './VenueOptionGrid';
import { VibeOptionGrid, VibeShowButton } from './VibeOptionGrid';

const copy = CONSUMER_COPY.filterBar;

/** The desktop bar's segments: the four filter dimensions plus the crew lens. */
type SegmentKey = FilterKey | 'who';

/**
 * Desktop popover widths. Where and Vibe hold two columns (`bp-f-filt_where_d`
 * 620px, `vibe_pop_d` 560px), each right-aligned to the bar.
 */
const POPOVER_WIDTH: Record<SegmentKey, number> = {
  // `bp-f-filt_who_d` draws the crew lens 380 wide.
  who: 380,
  when: 260,
  where: 620,
  price: 260,
  vibe: 560,
};

/** The desktop eyebrow and popover title for each filter dimension. */
const SEGMENT_LABEL: Record<FilterKey, string> = {
  when: FILTER_DEFS.when.label,
  where: FILTER_DEFS.where.label,
  price: copy.segment.priceEyebrow,
  vibe: FILTER_DEFS.vibe.label,
};

/** A venue tile in the Where segment (`bp-f-filt_active_d`). */
const SEGMENT_TILE_SIZE = 18;

/** Tailwind's `sm`: from here up the segmented bar replaces the chip row. */
const DESKTOP_QUERY = '(min-width: 640px)';

/** Where and Vibe lists written but not yet back from the server. */
type PendingLists = Partial<Record<FilterKey, readonly string[]>>;

const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

interface BarSegment {
  key: SegmentKey;
  eyebrow: string;
  value: string;
  /** "+1": stays whole while the name before it ellipsises. */
  suffix?: string;
  leading: ReactNode;
  active: boolean;
  clear: () => void;
}

const SEGMENT_PLACEHOLDER: Record<FilterKey, string> = {
  when: copy.segment.whenPlaceholder,
  where: FILTER_DEFS.where.placeholder,
  price: FILTER_DEFS.price.placeholder,
  vibe: FILTER_DEFS.vibe.placeholder,
};

interface FilterBarProps {
  venues: VenuePublic[];
  genres?: string[];
  className?: string;
  // Server-resolved SCA-region boolean for the taste chip's tier-picker
  // handoff (#763 PR 7). Defaults true (fail-safe): isScaRegion treats an
  // unknown country as SCA, so unresolved mounts must show the notice too.
  scaRegion?: boolean;
  /**
   * The viewer's crews, for the Browse lens (#1226). Empty or absent hides the
   * lens pill entirely: a control that can only ever open an empty picker is
   * worse than no control.
   */
  crews?: CrewSummary[];
  /** Shows in the active lens, for the rail's count. Null when it failed. */
  lensCount?: number | null;
  /**
   * Follows the server counted, for the "My artists" chip (native following,
   * PR 4). `null` means UNKNOWN — the seed failed, or there was no session to
   * read it with — and the chip keeps rendering rather than vanishing on a
   * viewer who follows fifty artists. `0` is a claim; `null` is an admission.
   */
  followCount?: number | null;
  /**
   * The events response's `total`, for the count line under the desktop bar.
   * Null hides the number (Cal view, the crew lens, which carries its own).
   */
  showCount?: number | null;
}

/**
 * Marks drawn overlapping, each later one tucked under the edge of the one
 * before (`bp-f-filt_active_d`: "Bluebird +1" over two venue tiles,
 * "Electronic +1" over two genre dots). A single mark renders as it is.
 */
const StackedMarks = ({
  children,
  testId,
  tight = false,
}: {
  children: ReactNode[];
  testId: string;
  /** The 7px dots overlap by a sliver; the 18px tiles by a third. */
  tight?: boolean;
}) => {
  return (
    <span
      aria-hidden
      data-testid={testId}
      className={cn(
        'inline-flex shrink-0 items-center',
        tight ? '[&>*+*]:-ml-0.5' : '[&>*+*]:-ml-1.5',
      )}
    >
      {children}
    </span>
  );
};

export function FilterBar({
  venues,
  genres = [],
  className,
  scaRegion = true,
  crews: crewsProp = [],
  lensCount = null,
  followCount = null,
  showCount = null,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Gated at the source rather than at each render site: `lensCrew` is
  // resolved out of this list, so emptying it drops the pill, the rail and the
  // crew name in the heading together. Gating the two render sites alone would
  // still print the crew's name in the <h1> for anyone holding a `?crew=` URL.
  const { enabled: crewsEnabled } = useFeatureFlag('crews');
  const crews = crewsEnabled ? crewsProp : [];

  // `useSearchParams()` only moves once the server answers, so a second quick
  // tick built on it would drop the first. Each Where/Vibe list written is
  // held here until the URL catches up to it, and every write and the ticks
  // shown build on it. The ref is what writes read; the state re-renders.
  const pendingRef = useRef<PendingLists>({});
  const [pending, setPending] = useState<PendingLists>({});

  // Read by the effect below without re-running it on every flip.
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;

  // When the URL moves, a held list is let go once the URL reads it back, and
  // every one is let go once no write is in flight (the URL is then final,
  // including after Back).
  useEffect(() => {
    const held = pendingRef.current;
    const settled = !isPendingRef.current;
    const next: PendingLists = { ...held };
    let changed = false;
    for (const key of MULTI_FILTER_KEYS) {
      const list = held[key];
      if (list === undefined) continue;
      const fromUrl = parseListParam(
        searchParams.getAll(FILTER_DEFS[key].queryKey),
      );
      if (settled || sameList(fromUrl, list)) {
        delete next[key];
        changed = true;
      }
    }
    if (!changed) return;
    pendingRef.current = next;
    setPending(next);
  }, [searchParams]);

  // A list writes one repeated key per value (`filterWhere=a&filterWhere=b`),
  // the shape `buildEventsApiParams` reads; an empty list or string removes
  // the key. Every other param is kept as it was, a held list included.
  const updateParams = useCallback(
    (updates: Record<string, string | readonly string[]>) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextPending: PendingLists = { ...pendingRef.current };
      for (const key of MULTI_FILTER_KEYS) {
        const queryKey = FILTER_DEFS[key].queryKey;
        const update = updates[queryKey];
        if (update !== undefined) {
          nextPending[key] =
            typeof update === 'string' ? (update ? [update] : []) : update;
        }
        const list = nextPending[key];
        if (list === undefined) continue;
        params.delete(queryKey);
        for (const item of list) params.append(queryKey, item);
      }
      pendingRef.current = nextPending;
      setPending(nextPending);
      for (const [key, value] of Object.entries(updates)) {
        params.delete(key);
        if (typeof value === 'string') {
          if (value) params.set(key, value);
        } else {
          for (const item of value) params.append(key, item);
        }
      }
      params.delete('offset');
      startTransition(() => {
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const [openFilterKey, setOpenFilterKey] = useState<SegmentKey | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Never decides what the first paint draws: the chip row and the segmented
  // bar both render and CSS (`sm:`) shows one. It picks only what a tap opens
  // (the phone sheet or the desktop popover), which `venue-chip` is live for
  // e2e, and the taste chip's one home. The server guesses the phone.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  // Desktop segments anchor their popovers on the whole segment, ✕ included.
  const segmentRefs = useRef<
    Partial<Record<SegmentKey, HTMLDivElement | null>>
  >({});
  // Each segment's opener button: where focus goes back after a popover or a
  // segment's ✕ closes, and the press FilterPopover ignores as "outside".
  const openerRefs = useRef<
    Partial<Record<SegmentKey, HTMLButtonElement | null>>
  >({});
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  // The bar's right edge when a popover opened: Where and Vibe right-align to
  // it rather than running past it (`bp-f-filt_where_d`, `vibe_pop_d`).
  const barRef = useRef<HTMLDivElement>(null);
  const [barRight, setBarRight] = useState<number | undefined>(undefined);
  const measureBar = () =>
    setBarRight(barRef.current?.getBoundingClientRect().right);

  // Where and Vibe read every value of their repeated key through the API's
  // own list rule (trim, drop blanks, dedupe, cap), so the bar shows exactly
  // the list `buildEventsApiParams` sends. When and Price stay single-valued.
  const readSingle = (key: string): string[] => {
    const value = searchParams.get(key);
    return value ? [value] : [];
  };
  // A held list (written, not yet back) wins over the URL.
  const filterValues: FilterValues = {
    when: readSingle('filterWhen'),
    where: pending.where ?? parseListParam(searchParams.getAll('filterWhere')),
    price: readSingle('filterPrice'),
    vibe: pending.vibe ?? parseListParam(searchParams.getAll('filterVibe')),
  };

  const isCalendarView = (searchParams.get('view') ?? 'list') === 'cal';
  const activeFilterCount = getActiveFilterCount(filterValues);
  // Taste scope (#763 PR 7) — a mode, not a dimension: excluded from the
  // active-filter count / Clear all (it has its own ✕ on the chip).
  const tasteActive = searchParams.get('filterTaste') === '1';
  // Same treatment for the follow scope: a mode, not a dimension.
  const followActive = searchParams.get('filterFollowing') === '1';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFilterKey(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // The crew lens has no sheet or option list of its own here: on mobile it is
  // the heading's pill, and on desktop its popover body is the crew picker.
  const openDimension: FilterKey | null =
    openFilterKey === 'who' ? null : openFilterKey;
  const activeDef = openDimension ? FILTER_DEFS[openDimension] : null;
  // The phone Vibe sheet lists all 16 buckets in the board's order, as the
  // desktop popover does (`bp-vibe-vibe_sheet_m`), shows or not.
  const activeOptions =
    openDimension === 'vibe'
      ? getFilterOptions('vibe', venues, [...VIBE_ORDER])
      : openDimension
        ? getFilterOptions(openDimension, venues, genres)
        : [];
  const activeValue = openDimension
    ? (filterValues[openDimension][0] ?? '')
    : '';

  const setFilterValue = useCallback(
    (key: FilterKey, value: string) => {
      updateParams({ [FILTER_DEFS[key].queryKey]: value });
    },
    [updateParams],
  );

  // A multi-select pick adds the value, or removes it if it was already set.
  // It builds on the last list written, not the URL, so quick ticks add up.
  const toggleFilterValue = (key: FilterKey, value: string) => {
    const base = pendingRef.current[key] ?? filterValues[key];
    updateParams({
      [FILTER_DEFS[key].queryKey]: toggleValue(base, value),
    });
  };

  const multiFor = (key: FilterKey) =>
    isMultiFilter(key)
      ? {
          selected: filterValues[key],
          onToggle: (value: string) => toggleFilterValue(key, value),
        }
      : undefined;

  // The lens rides a search param like every other Browse state, so it
  // survives a refresh and a shared URL. An id with no matching crew (a stale
  // link, a crew since left) resolves to null and the page reads as resting.
  const lensCrewId = searchParams.get('crew');
  const lensCrew = crews.find((crew) => crew.id === lensCrewId) ?? null;

  // Narrowed by a dimension or a scope: My artists and taste cut the list as
  // surely as a venue does, so the count line says "match" for them too.
  const listFiltered = activeFilterCount > 0 || followActive || tasteActive;

  // Any filter or scope on draws the whole bar's edge in the signal
  // (`bp-f-filt_active_d`).
  const barActive = listFiltered || lensCrew !== null;

  const setLensCrew = useCallback(
    (crewId: string | null) => {
      updateParams({ crew: crewId ?? '' });
    },
    [updateParams],
  );

  const clearAllFilters = useCallback(() => {
    updateParams({
      [FILTER_DEFS.when.queryKey]: '',
      [FILTER_DEFS.where.queryKey]: '',
      [FILTER_DEFS.price.queryKey]: '',
      [FILTER_DEFS.vibe.queryKey]: '',
      from: '',
      to: '',
    });
    setOpenFilterKey(null);
  }, [updateParams]);

  const closePopover = useCallback(() => setOpenFilterKey(null), []);

  const toggleFollow = useCallback(
    (next: boolean) => updateParams({ filterFollowing: next ? '1' : '' }),
    [updateParams],
  );

  // Mounted in one place at a time (the phone chip row, or the desktop count
  // line, picked by `isDesktop`), so only one copy of its lapsed-entitlement
  // effect is live. It can still move once after hydration, because the
  // server snapshot reads as phone; it draws nothing until its entitlement
  // resolves on the client, so that move shifts nothing the first paint drew.
  // The My artists chip is different: both of its instances stay mounted and
  // CSS shows one, so it takes an `ownsEffects` flag instead.
  const tasteChip = (
    <TasteFilterChip
      active={tasteActive}
      onToggle={(next) => updateParams({ filterTaste: next ? '1' : '' })}
      scaRegion={scaRegion}
    />
  );

  const dimensionSegment = (key: FilterKey): BarSegment => {
    const values = filterValues[key];
    // The first resolving pick's name and the "+N" count render apart, so a
    // narrow segment ellipsises the name and never the count ("Red Ro… +1").
    // A stale first slug is skipped for the name, never left blank.
    const resolved = getFirstResolvedLabel(key, values, venues, genres);
    const activeLabel = resolved?.label ?? null;
    const suffix =
      resolved !== null && resolved.rest > 0
        ? copy.segment.moreSuffix(resolved.rest)
        : undefined;
    // `bp-f-filt_active_d` stacks a mark per pick: the venue tiles for Where,
    // the genre dots for Vibe. It draws two; the stack shows the first two.
    let leading: ReactNode = null;
    if (key === 'where') {
      const picked = values
        .map((slug) => venues.find((candidate) => candidate.slug === slug))
        .filter((venue): venue is VenuePublic => venue !== undefined)
        .slice(0, 2);
      if (picked.length > 0) {
        leading = (
          <StackedMarks testId="segment-venue-stack">
            {picked.map((venue) => (
              <VenueTile
                key={venue.slug}
                slug={venue.slug}
                name={venue.name}
                // The board's pair spans 30px: two 18px tiles, 6px tucked.
                size={SEGMENT_TILE_SIZE}
              />
            ))}
          </StackedMarks>
        );
      }
    } else if (key === 'vibe' && values.length > 0) {
      leading = (
        <StackedMarks testId="segment-vibe-stack" tight>
          {values.slice(0, 2).map((genre) => (
            <GenreDot key={genre} genre={genre} />
          ))}
        </StackedMarks>
      );
    }
    return {
      key,
      eyebrow: SEGMENT_LABEL[key],
      value: activeLabel ?? SEGMENT_PLACEHOLDER[key],
      ...(suffix !== undefined && { suffix }),
      leading,
      active: values.length > 0,
      // The ✕ clears the whole dimension, every venue or vibe in it.
      clear: () => setFilterValue(key, ''),
    };
  };

  // Bar order (B+ board): My artists, Who, When, Where, Price, Vibe. Who shows
  // only when the viewer has crews and the flag is on, as the pill did; When
  // hides in Cal view, as its chip does.
  const segments: BarSegment[] = [];
  if (crews.length > 0) {
    segments.push({
      key: 'who',
      eyebrow: copy.segment.whoEyebrow,
      value: lensCrew?.name ?? CREWS_COPY.lens.pickerNone,
      leading: lensCrew ? (
        <CrewPatch
          crewId={lensCrew.id}
          patchSalt={lensCrew.patchSalt}
          size={20}
          scale="micro"
        />
      ) : null,
      active: lensCrew !== null,
      clear: () => setLensCrew(null),
    });
  }
  for (const key of FILTER_ORDER) {
    if (key === 'when' && isCalendarView) continue;
    segments.push(dimensionSegment(key));
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3',
        isPending && 'opacity-70 pointer-events-none',
        className,
      )}
    >
      {/* Heading row: title left, lens pill + List/Cal toggle right */}
      <div className="flex items-end justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* The lens takes the eyebrow's slot rather than sitting beside it:
              "DENVER, CO" and "CREW LENS · 4 SHOWS" are both answers to what
              you're looking at, and two of them read as neither. */}
          {lensCrew === null && (
            <span
              className={HEADING_EYEBROW_CLASS}
              style={HEADING_EYEBROW_STYLE}
            >
              {copy.locationLine}
            </span>
          )}
          <h1 className={HEADING_TITLE_CLASS} style={HEADING_TITLE_STYLE}>
            {lensCrew === null ? copy.headingTitle : lensCrew.name}
          </h1>
        </div>

        {/* Mobile only: from sm up the lens is the bar's Who segment. */}
        {crews.length > 0 && (
          <div
            data-testid="crew-lens-pill-slot"
            className="flex shrink-0 items-center sm:hidden"
          >
            <CrewLensPill
              crews={crews}
              activeCrew={lensCrew}
              onSelect={setLensCrew}
              // Only ever shown under sm, so always the phone width.
              wide={false}
            />
          </div>
        )}

        {/* List / Cal toggle (B+ `bp-browse`): an icon segmented control. */}
        <div className={VIEW_TOGGLE_CLASS} style={VIEW_TOGGLE_STYLE}>
          {VIEW_SEGMENTS.map(({ key, label, Icon }) => {
            const active = isCalendarView ? key === 'cal' : key === 'list';
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  // When switching views, strip view-specific params so the
                  // server component re-fetches with a clean slate.
                  if (key === 'list') {
                    updateParams({
                      view: 'list',
                      selectedDate: '',
                      weekOffset: '',
                    });
                  } else {
                    // Switching to cal view: clear filterWhen so the hidden chip
                    // doesn't silently apply server-side date filtering.
                    updateParams({
                      view: key,
                      [FILTER_DEFS.when.queryKey]: '',
                    });
                  }
                }}
                className={cn(VIEW_SEGMENT_CLASS, 'cursor-pointer')}
                style={viewSegmentStyle(active)}
                aria-pressed={active}
              >
                {/* B+: icons only on the phone, icon and label from sm up. The
                    label stays in the accessible name at every width. */}
                <span className="inline-flex">
                  <Icon size={15} />
                </span>
                <span className="sr-only sm:not-sr-only">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {lensCrew !== null && (
        <CrewLensRail
          count={lensCount}
          onClear={() => {
            setLensCrew(null);
          }}
        />
      )}

      {/* Filter chips (mobile) — Inter font, surface-1 inactive bg, placeholder
          as default label. From sm up the segmented bar below replaces them. */}
      <div className={cn(CHIP_ROW_CLASS, 'sm:hidden')} style={CHIP_ROW_STYLE}>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-border-strong sm:hidden"
            style={{ color: 'var(--fg-muted)' }}
            aria-label={copy.clearAllFiltersAriaLabel}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        )}

        {/* Scope chips lead the row (taste-filter.jsx: they're modes, so they
            sit before the dimension chips, each split off by its own trailing
            divider). "My artists" comes first: it scopes to a list the viewer
            built by hand, where the taste chip scopes to one Spotify inferred.
            Either chip can render nothing, and because each owns the divider
            that FOLLOWS it, no combination can strand a leading rule. The
            row is `sm:hidden`, so this chip and the bar's switch below both
            render and CSS shows one per width; this one owns the
            lapsed-entitlement release. */}
        <FollowFilterChip
          active={followActive}
          onToggle={toggleFollow}
          followCount={followCount}
          scaRegion={scaRegion}
        />
        {!isDesktop && tasteChip}

        {FILTER_ORDER.map((key) => {
          if (key === 'when' && isCalendarView) return null;

          const values = filterValues[key];
          // One pick reads as its name, several as "2 venues" or "2 vibes"
          // (`filt_m_active`). The B+ chip restyle itself is B6b.
          const activeLabel = getChipLabel(key, values, venues, genres);
          const displayLabel = activeLabel ?? FILTER_DEFS[key].placeholder;
          const isActive = values.length > 0;
          const isOpen = openFilterKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={(event) => {
                const nextOpen = isOpen ? null : key;
                setOpenFilterKey(nextOpen);
                if (nextOpen) {
                  setAnchorRect(event.currentTarget.getBoundingClientRect());
                  setOpener(event.currentTarget);
                }
              }}
              // One `venue-chip` in the DOM at a time: the desktop segment
              // carries it from sm up, and e2e locates it strictly.
              data-testid={
                key === 'where' && !isDesktop ? 'venue-chip' : undefined
              }
              className={cn(FILTER_CHIP_CLASS, 'cursor-pointer')}
              style={filterChipStyle(isActive)}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
            >
              {/* The chip shows only its value ("Any vibe", or "Red Rocks"
                  once set), so a screen reader heard no dimension. The hidden
                  label names it the way the desktop segment's eyebrow does:
                  "Vibe Any vibe" at every width. */}
              <span className="sr-only">{FILTER_DEFS[key].label} </span>
              <span style={{ whiteSpace: 'nowrap' }}>{displayLabel}</span>
              <IconChevDown size={11} />
            </button>
          );
        })}
      </div>

      {/* Segmented filter bar (desktop, B+ B6a) */}
      <div className={SEGMENT_BLOCK_CLASS}>
        <div
          ref={barRef}
          data-testid="filter-segment-bar"
          data-active={barActive ? 'true' : undefined}
          className={SEGMENT_BAR_CLASS}
          style={segmentBarStyle(barActive)}
        >
          {/* The phone row's chip above stays mounted at every width, so it
              owns the lapsed-entitlement release; this one only draws. */}
          <FollowFilterChip
            variant="segment"
            ownsEffects={false}
            active={followActive}
            onToggle={toggleFollow}
            followCount={followCount}
            scaRegion={scaRegion}
          />
          {segments.map((segment, index) => (
            <Fragment key={segment.key}>
              {index > 0 && <SegmentDivider />}
              <FilterSegment
                eyebrow={segment.eyebrow}
                value={segment.value}
                {...(segment.suffix !== undefined && {
                  suffix: segment.suffix,
                })}
                leading={segment.leading}
                active={segment.active}
                open={openFilterKey === segment.key}
                clearLabel={copy.segment.clearAria(segment.eyebrow)}
                testId={
                  segment.key === 'where' && isDesktop
                    ? 'venue-chip'
                    : `filter-segment-${segment.key}`
                }
                anchorRef={(element) => {
                  segmentRefs.current[segment.key] = element;
                }}
                openerRef={(element) => {
                  openerRefs.current[segment.key] = element;
                }}
                onToggle={() => {
                  const nextOpen =
                    openFilterKey === segment.key ? null : segment.key;
                  setOpenFilterKey(nextOpen);
                  if (nextOpen) {
                    setAnchorRect(
                      segmentRefs.current[
                        segment.key
                      ]?.getBoundingClientRect() ?? null,
                    );
                    setOpener(openerRefs.current[segment.key] ?? null);
                    measureBar();
                  }
                }}
                onClear={() => {
                  segment.clear();
                  setOpenFilterKey(null);
                  // The ✕ unmounts with the filter it cleared.
                  openerRefs.current[segment.key]?.focus();
                }}
              />
            </Fragment>
          ))}
        </div>

        <div className={COUNT_ROW_CLASS}>
          {showCount !== null && (
            <span data-testid="filter-count-line" style={COUNT_LINE_STYLE}>
              {listFiltered
                ? copy.showCountMatch(showCount)
                : copy.showCount(showCount)}
            </span>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                clearAllFilters();
                // Clear all unmounts itself, so focus lands on the bar.
                const first = segments[0];
                if (first) openerRefs.current[first.key]?.focus();
              }}
              className="cursor-pointer text-[12.5px] font-semibold text-signal underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {copy.clearAll}
            </button>
          )}
          {isDesktop && (
            <span className="ml-auto inline-flex items-center">
              {tasteChip}
            </span>
          )}
        </div>
      </div>

      {activeDef && openDimension && (
        <FilterSheet
          open={!isDesktop}
          title={activeDef.label}
          placeholder={activeDef.placeholder}
          options={activeOptions}
          value={activeValue}
          multi={multiFor(openDimension)}
          onClose={closePopover}
          onSelect={(nextValue) => setFilterValue(openDimension, nextValue)}
        />
      )}

      {openDimension && (
        <FilterPopover
          open={isDesktop}
          title={SEGMENT_LABEL[openDimension]}
          sub={
            openDimension === 'where'
              ? copy.popover.whereSub
              : openDimension === 'vibe'
                ? copy.popover.vibeSub
                : undefined
          }
          width={POPOVER_WIDTH[openDimension]}
          boundRight={barRight}
          inset={
            openDimension === 'where' || openDimension === 'vibe'
              ? 'wide'
              : 'list'
          }
          options={activeOptions}
          value={activeValue}
          anchorRect={anchorRect}
          opener={opener}
          onClose={closePopover}
          onSelect={(nextValue) => setFilterValue(openDimension, nextValue)}
          // "Show N shows" reads the events response's total, the same count
          // the line under the bar shows. Cal view and the crew lens have no
          // total here, so the button is left out rather than given a guess.
          footer={
            openDimension === 'vibe' && showCount !== null ? (
              <VibeShowButton count={showCount} onClick={closePopover} />
            ) : undefined
          }
        >
          {openDimension === 'where' ? (
            <VenueOptionGrid
              venues={venues}
              selected={filterValues.where}
              onToggle={(slug) => toggleFilterValue('where', slug)}
            />
          ) : openDimension === 'vibe' ? (
            <VibeOptionGrid
              selected={filterValues.vibe}
              onToggle={(genre) => toggleFilterValue('vibe', genre)}
            />
          ) : undefined}
        </FilterPopover>
      )}

      {openFilterKey === 'who' && (
        <FilterPopover
          open={isDesktop}
          title={copy.popover.whoTitle}
          sub={CREWS_COPY.lens.pickerSub}
          width={POPOVER_WIDTH.who}
          options={[]}
          value={lensCrew?.id ?? ''}
          anchorRect={anchorRect}
          opener={opener}
          onClose={closePopover}
          onSelect={(crewId) => setLensCrew(crewId || null)}
        >
          <CrewPickerBody
            crews={crews}
            selectedId={lensCrew?.id ?? null}
            compact
            onSelect={(crewId) => {
              setLensCrew(crewId);
              closePopover();
            }}
          />
        </FilterPopover>
      )}

      {(searchParams.get('search') || searchParams.get('venueSlug')) && (
        <button
          type="button"
          onClick={() => {
            updateParams({ search: '', venueSlug: '', from: '' });
          }}
          className="text-sm text-fg-subtle hover:text-fg underline-offset-4 hover:underline"
        >
          {copy.clearSearchButton}
        </button>
      )}
    </div>
  );
}

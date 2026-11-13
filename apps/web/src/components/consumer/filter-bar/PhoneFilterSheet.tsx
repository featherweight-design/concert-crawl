'use client';

// The phone Filters sheet (B+ B6b, `bp-f-filt_sheet_m`): Who, When, Where,
// Price and Vibe in one sheet. Nothing is applied until "Show N shows": the
// picks are a draft, counted against /v1/events as they change, and closing
// the sheet any other way drops them. Where and Vibe each open their full list
// in place (`bp-f-filt_venues_m`, `bp-vibe-vibe_sheet_m`) behind "All N".

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  MAX_LIST_PARAM_VALUES,
  type CrewSummary,
  type VenuePublic,
} from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { CREWS_COPY } from '@/components/consumer/crews/definitions/copy';
import { CrewPatch } from '@/components/consumer/crew-patch';
import { GenreDot } from '@/components/consumer/GenreDot';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { genreColor } from '@/lib/genre-color';
import { useModalDialog } from '@/lib/hooks/useModalDialog';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import {
  FILTER_DEFS,
  VIBE_ORDER,
  compareVenueNames,
  getFilterOptions,
  toggleValue,
  type FilterKey,
} from './filter-defs';
import {
  EMPTY_FILTER_VALUES,
  draftParams,
  pickSingle,
  type FilterDraft,
} from './phone-draft';
import { useDraftShowCount } from './useDraftShowCount';
import { VenueOptionGrid } from './VenueOptionGrid';
import { VibeOptionGrid } from './VibeOptionGrid';

const copy = CONSUMER_COPY.filterBar;

/** The board's Where grid: two rows of four tiles. */
const TILE_COUNT = 8;
/** The board's Vibe chips: the first ten buckets, in the board order. */
const CHIP_COUNT = 10;

type View = 'main' | 'where' | 'vibe';

/**
 * Picked venues first, then the busiest. Worked out when the sheet opens and
 * again on the way back from the full list, never on a tap, so a tile never
 * jumps out from under the finger that picked it.
 */
const orderTiles = (
  venues: VenuePublic[],
  picked: readonly string[],
): VenuePublic[] => {
  const first = picked
    .map((slug) => venues.find((venue) => venue.slug === slug))
    .filter((venue): venue is VenuePublic => venue !== undefined);
  const rest = venues
    .filter((venue) => !picked.includes(venue.slug))
    .sort(
      (left, right) =>
        right.upcomingCount - left.upcomingCount ||
        compareVenueNames(left.name, right.name),
    );
  return [...first, ...rest].slice(0, Math.max(TILE_COUNT, first.length));
};

/** The first ten buckets, plus any picked bucket past them. */
const orderChips = (picked: readonly string[]): string[] => {
  const shown = VIBE_ORDER.slice(0, CHIP_COUNT);
  return [...shown, ...picked.filter((genre) => !shown.includes(genre))];
};

const VIBE_LABEL = new Map(
  getFilterOptions('vibe', [], [...VIBE_ORDER]).map((option) => [
    option.value,
    option.label,
  ]),
);

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

const TITLE_CLASS =
  'text-[24px] leading-[1.15] font-black tracking-[-0.02em] text-fg';

const TEXT_BUTTON_CLASS =
  'cursor-pointer text-[14px] font-semibold text-fg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

const pillStyle = (selected: boolean): CSSProperties => ({
  borderColor: selected ? 'var(--signal)' : 'var(--border-strong)',
  background: selected
    ? 'color-mix(in oklab, var(--signal) 10%, transparent)'
    : 'transparent',
  color: selected ? 'var(--fg)' : 'var(--fg-muted)',
  fontWeight: selected ? 700 : 600,
});

const MOTION_CLASS =
  'transition-colors duration-[var(--motion-fast)] ease-[var(--motion-ease)]';

const Check = ({ color }: { color: string }) => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 6.5l2.5 2.5L10 3.5"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d={back ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface RadioOption {
  value: string;
  label: string;
  leading?: ReactNode;
}

interface RadioPillsProps {
  label: string;
  options: RadioOption[];
  /** The checked value, or null when none is (When and Price at rest). */
  selected: string | null;
  onPick: (value: string) => void;
}

const ROVING_STEP: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/**
 * Who, When and Price: one choice at most, so the pills are a radiogroup, the
 * pattern the crew picker (`CrewPickerBody`) already uses. One tab stop on the
 * checked pill (or the first); the arrows, Home and End move between pills;
 * a tap, Space or Enter picks.
 */
const RadioPills = ({ label, options, selected, onPick }: RadioPillsProps) => {
  const selectedIndex = options.findIndex(
    (option) => option.value === selected,
  );
  const [active, setActive] = useState(
    selectedIndex === -1 ? 0 : selectedIndex,
  );
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const moveTo = (index: number) => {
    const wrapped = (index + options.length) % options.length;
    setActive(wrapped);
    pillRefs.current[wrapped]?.focus();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = ROVING_STEP[event.key];
    if (step !== undefined) {
      event.preventDefault();
      moveTo(active + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(options.length - 1);
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-x-2 gap-y-1.5"
    >
      {options.map((option, index) => {
        const checked = option.value === selected;
        return (
          <button
            key={option.value}
            ref={(element) => {
              pillRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              setActive(index);
              onPick(option.value);
            }}
            className={`inline-flex h-[34px] max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[14px] ${MOTION_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
            style={pillStyle(checked)}
          >
            {option.leading}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

interface SectionProps {
  eyebrow: string;
  link?: ReactNode;
  /**
   * Whether the section names itself as a group. A section of radio pills
   * leaves that to its radiogroup, so the label is announced once.
   */
  grouped?: boolean;
  children: ReactNode;
}

const Section = ({ eyebrow, link, grouped = true, children }: SectionProps) => (
  <div
    {...(grouped && { role: 'group', 'aria-label': eyebrow })}
    data-section={eyebrow}
    className="border-b border-border pt-[15px] pb-3.5 last:border-b-0"
  >
    <div className="mb-2.5 flex h-3 items-center justify-between">
      <span style={EYEBROW_STYLE}>{eyebrow}</span>
      {link}
    </div>
    {children}
  </div>
);

interface PhoneFilterSheetProps {
  /** The filters as applied when the sheet opened. */
  initial: FilterDraft;
  venues: VenuePublic[];
  /** Already gated on the crews flag; empty leaves Who out. */
  crews: CrewSummary[];
  /** The current lens's shows, for the count while the lens stays. */
  lensCount: number | null;
  isCalendarView: boolean;
  /** The page URL as it is, which the draft is laid over for its count. */
  baseQuery: string;
  /** The applied list's total, shown until the draft's own count lands. */
  appliedCount: number | null;
  onApply: (draft: FilterDraft) => void;
  onClose: () => void;
}

/** Mounted only while open, so every opening starts from what is applied. */
export function PhoneFilterSheet({
  initial,
  venues,
  crews,
  lensCount,
  isCalendarView,
  baseQuery,
  appliedCount,
  onApply,
  onClose,
}: PhoneFilterSheetProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const [view, setView] = useState<View>('main');
  // Mounted only while FilterBar reads the phone width (it closes the sheet
  // once the width crosses to desktop), so the trap is always the phone's.
  // Escape closes the sheet from the main view only; inside a full list it
  // steps back, as the back link does (below). The scrim always closes.
  useModalDialog(dialogRef, true, onClose, view === 'main');
  const drag = useSheetDrag(onClose, true);
  const [tiles, setTiles] = useState(() =>
    orderTiles(venues, initial.values.where),
  );
  const [chips, setChips] = useState(() => orderChips(initial.values.vibe));

  // Focus follows the view: into a list's back link, and back onto the "All"
  // link that opened it, since both swap out from under the focused control.
  const backRef = useRef<HTMLButtonElement>(null);
  const allRefs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  const lastList = useRef<View>('main');
  // The views share one scroll container: a full list opens at its top, and
  // the way back lands where the main sheet was left. Set before paint, so a
  // list never flashes in at the main sheet's offset.
  const bodyRef = useRef<HTMLDivElement>(null);
  const mainScroll = useRef(0);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = view === 'main' ? mainScroll.current : 0;
  }, [view]);
  useEffect(() => {
    if (view === 'main') {
      allRefs.current[lastList.current]?.focus({ preventScroll: true });
    } else backRef.current?.focus();
  }, [view]);

  const setValues = (key: FilterKey, values: readonly string[]) =>
    setDraft((current) => ({
      ...current,
      values: { ...current.values, [key]: values },
    }));
  const toggle = (key: FilterKey, value: string) =>
    setDraft((current) => ({
      ...current,
      values: {
        ...current.values,
        [key]: toggleValue(current.values[key], value),
      },
    }));

  const openList = (next: 'where' | 'vibe') => {
    lastList.current = next;
    mainScroll.current = bodyRef.current?.scrollTop ?? 0;
    setView(next);
  };
  const backToMain = () => {
    setTiles(orderTiles(venues, draft.values.where));
    setChips(orderChips(draft.values.vibe));
    setView('main');
  };

  // Escape inside a full list steps back to the main sheet. Read through a
  // ref so the listener sees the latest draft without re-subscribing.
  const backToMainRef = useRef(backToMain);
  backToMainRef.current = backToMain;
  useEffect(() => {
    if (view === 'main') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') backToMainRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [view]);

  // The lens has no events total of its own: its count is the crew's shows.
  const draftCrew = crews.find((crew) => crew.id === draft.crew) ?? null;
  const [initialQuery] = useState(() =>
    draftParams(new URLSearchParams(baseQuery), initial).toString(),
  );
  const query =
    isCalendarView || draftCrew !== null
      ? null
      : draftParams(new URLSearchParams(baseQuery), draft).toString();
  // The draft as the page applied it already has its total (the list's own),
  // so it is never asked for again: not at open, nor on coming back to it.
  const applied =
    query !== null && query === initialQuery && appliedCount !== null;
  const draftCount = useDraftShowCount(applied ? null : query);

  // The button's words and whether its number is current. A count still on
  // its way never passes for the current one: the last number shows dimmed,
  // or with none yet the pending "… shows"; a failed count falls back to
  // "Apply filters", as Cal view (no count) does.
  let cta: { label: string; state: 'ready' | 'pending' | 'none' };
  if (draftCrew !== null) {
    const crewCount =
      draftCrew.id === initial.crew
        ? (lensCount ?? draftCrew.upcomingCount)
        : draftCrew.upcomingCount;
    cta = { label: copy.popover.vibeShow(crewCount), state: 'ready' };
  } else if (applied) {
    cta = { label: copy.popover.vibeShow(appliedCount), state: 'ready' };
  } else if (draftCount.status === 'ready') {
    cta = { label: copy.popover.vibeShow(draftCount.count), state: 'ready' };
  } else if (draftCount.status === 'pending') {
    cta = {
      label:
        draftCount.count === null
          ? copy.showCountPending
          : copy.popover.vibeShow(draftCount.count),
      state: 'pending',
    };
  } else {
    cta = { label: copy.phone.apply, state: 'none' };
  }

  const whereAtCap = draft.values.where.length >= MAX_LIST_PARAM_VALUES;
  const vibeAtCap = draft.values.vibe.length >= MAX_LIST_PARAM_VALUES;

  const allLink = (target: 'where' | 'vibe', total: number) => (
    <button
      type="button"
      ref={(element) => {
        allRefs.current[target] = element;
      }}
      onClick={() => openList(target)}
      data-testid={`filter-sheet-all-${target}`}
      className="-my-2 inline-flex cursor-pointer items-center gap-0.5 py-2 text-[15px] leading-3 font-bold text-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {copy.phone.allCount(total)}
      <Chevron />
    </button>
  );

  const main = (
    <>
      {crews.length > 0 && (
        <Section eyebrow={copy.segment.whoEyebrow} grouped={false}>
          {/* Everyone is the empty value: the lens off. */}
          <RadioPills
            label={copy.segment.whoEyebrow}
            options={[
              { value: '', label: CREWS_COPY.lens.pickerNone },
              ...crews.map((crew) => ({
                value: crew.id,
                label: crew.name,
                leading: (
                  <CrewPatch
                    crewId={crew.id}
                    patchSalt={crew.patchSalt}
                    size={18}
                    // `browse-active-320` draws the whole patch tile at this
                    // size, weave included, as the crews picker does (`tile`).
                    scale="tile"
                  />
                ),
              })),
            ]}
            selected={draft.crew ?? ''}
            onPick={(crewId) =>
              setDraft((current) => ({ ...current, crew: crewId || null }))
            }
          />
        </Section>
      )}

      {/* Cal view picks its own week, so When stays out, as on the bar. */}
      {!isCalendarView && (
        <Section eyebrow={FILTER_DEFS.when.label} grouped={false}>
          <RadioPills
            label={FILTER_DEFS.when.label}
            options={getFilterOptions('when', venues)}
            selected={draft.values.when[0] ?? null}
            onPick={(value) =>
              setValues('when', pickSingle(draft.values.when, value))
            }
          />
        </Section>
      )}

      <Section
        eyebrow={FILTER_DEFS.where.label}
        link={allLink('where', venues.length)}
      >
        <div className="grid grid-cols-4 gap-1">
          {tiles.map((venue) => {
            const on = draft.values.where.includes(venue.slug);
            return (
              <button
                key={venue.slug}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={venue.name}
                disabled={!on && whereAtCap}
                data-testid="venue-tile-option"
                onClick={() => toggle('where', venue.slug)}
                className={`flex min-h-[86px] min-w-0 cursor-pointer flex-col items-center gap-[5px] rounded-[12px] border px-1 pt-2 pb-2 text-center disabled:cursor-not-allowed disabled:opacity-40 ${MOTION_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{
                  borderColor: on ? 'var(--signal)' : 'transparent',
                  background: on
                    ? 'color-mix(in oklab, var(--signal) 10%, transparent)'
                    : 'transparent',
                }}
              >
                <VenueTile slug={venue.slug} name={venue.name} size={40} />
                <span
                  className="line-clamp-2 text-[12px] leading-[1.1] break-words"
                  style={{
                    color: on ? 'var(--fg)' : 'var(--fg-muted)',
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {/* The board's short labels ("Cervantes'") have no field
                      behind them, so the full name wraps to two lines
                      (ruling, 2026-11-12). */}
                  {venue.name}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section eyebrow={copy.segment.priceEyebrow} grouped={false}>
        <RadioPills
          label={copy.segment.priceEyebrow}
          options={getFilterOptions('price', venues)}
          selected={draft.values.price[0] ?? null}
          onPick={(value) =>
            setValues('price', pickSingle(draft.values.price, value))
          }
        />
      </Section>

      <Section
        eyebrow={FILTER_DEFS.vibe.label}
        link={allLink('vibe', VIBE_ORDER.length)}
      >
        <div className="flex flex-wrap gap-x-[7px] gap-y-[7px]">
          {chips.map((genre) => {
            const on = draft.values.vibe.includes(genre);
            const color = genreColor(genre) ?? 'var(--signal)';
            return (
              <button
                key={genre}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!on && vibeAtCap}
                data-testid="vibe-chip-option"
                onClick={() => toggle('vibe', genre)}
                className={`inline-flex h-[30px] cursor-pointer items-center gap-2 rounded-full border pr-3.5 pl-3 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-40 ${MOTION_CLASS} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
                style={{
                  borderColor: on ? color : 'var(--border-strong)',
                  background: on
                    ? `color-mix(in oklab, ${color} 14%, transparent)`
                    : 'var(--surface-1)',
                  color: on ? 'var(--fg)' : 'var(--fg-muted)',
                  fontWeight: on ? 700 : 600,
                }}
              >
                <GenreDot genre={genre} size={8} />
                {VIBE_LABEL.get(genre) ?? genre}
                {on && <Check color={color} />}
              </button>
            );
          })}
        </div>
      </Section>
    </>
  );

  const listKey: FilterKey = view === 'vibe' ? 'vibe' : 'where';
  const zone = drag.zoneProps;

  return createPortal(
    <div className="fixed inset-0 z-[90] sm:hidden">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
        aria-label={copy.filterSheet.closeAriaLabel}
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={copy.phone.filters}
        data-testid="phone-filter-sheet"
        className="sheet-edge absolute bottom-0 left-1/2 flex w-full -translate-x-1/2 flex-col rounded-t-[20px] [--sheet-bg:var(--surface-2)]"
        style={{
          maxWidth: 402,
          maxHeight: 'calc(100dvh - 50px)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
          ...drag.sheetStyle,
        }}
        onTransitionEnd={drag.onSheetTransitionEnd}
      >
        {/* The handle and the header are the drag-down grab zone. */}
        <div {...zone} className="flex shrink-0 justify-center pt-[7px]">
          <div className="h-1 w-10 rounded-full bg-border-strong" />
        </div>

        {view === 'main' ? (
          <div
            {...zone}
            className="mx-4 flex shrink-0 items-center justify-between border-b border-border pt-1 pb-2"
          >
            <h2 className={TITLE_CLASS}>{copy.phone.filters}</h2>
            <button
              type="button"
              onClick={() =>
                setDraft({ values: EMPTY_FILTER_VALUES, crew: null })
              }
              className={TEXT_BUTTON_CLASS}
            >
              {copy.clearAll}
            </button>
          </div>
        ) : (
          <div {...zone} className="shrink-0 px-4 pt-0.5">
            <div className="flex items-center justify-between">
              <button
                ref={backRef}
                type="button"
                onClick={backToMain}
                aria-label={copy.phone.backAria}
                className="-ml-1 inline-flex cursor-pointer items-center gap-1.5 py-1 text-[15px] font-semibold text-fg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <Chevron back />
                {copy.phone.filters}
              </button>
              <button
                type="button"
                onClick={() => setValues(listKey, [])}
                className={TEXT_BUTTON_CLASS}
              >
                {copy.popover.clear}
              </button>
            </div>
            <h2 className={`${TITLE_CLASS} pt-1`}>
              {view === 'where'
                ? FILTER_DEFS.where.label
                : FILTER_DEFS.vibe.placeholder}
            </h2>
            {view === 'vibe' && (
              <p className="pt-1.5 text-[14px] leading-[1.35] text-fg-muted">
                {copy.popover.vibeSub}
              </p>
            )}
          </div>
        )}

        <div
          ref={bodyRef}
          data-testid="filter-sheet-body"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4"
        >
          {view === 'main' ? (
            main
          ) : view === 'where' ? (
            <div className="pt-[11px]">
              <VenueOptionGrid
                venues={venues}
                selected={draft.values.where}
                onToggle={(slug) => toggle('where', slug)}
                variant="sheet"
              />
            </div>
          ) : (
            <div className="pt-[21px]">
              <VibeOptionGrid
                selected={draft.values.vibe}
                onToggle={(genre) => toggle('vibe', genre)}
                columns={1}
              />
            </div>
          )}
        </div>

        <div
          className="shrink-0 px-4 pt-3"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            data-testid="filter-sheet-show"
            data-count-state={cta.state}
            aria-busy={cta.state === 'pending'}
            onClick={() => onApply(draft)}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-[12px] text-[16px] font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              color: 'var(--fg-on-accent)',
              background:
                'linear-gradient(90deg, var(--signal), var(--accent))',
              boxShadow:
                '0 6px 18px color-mix(in oklab, var(--signal) 25%, transparent)',
            }}
          >
            {/* A count on its way dims, so an older number never reads as
                the count for what is picked now. */}
            <span
              className="transition-opacity duration-[var(--motion-fast)] ease-[var(--motion-ease)]"
              style={{ opacity: cta.state === 'pending' ? 0.55 : 1 }}
            >
              {cta.label}
            </span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

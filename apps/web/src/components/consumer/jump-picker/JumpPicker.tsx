'use client';

/*
 * The `YearMonth`/`MatrixCell` contract uses single-letter fields (`y`, `m`, `d`)
 * that this component reads and writes directly; `id-length` still flags those
 * keys in object *literals* and inline type members (it exempts interface
 * members), so relax the rule for property names in this file while keeping it
 * for variables and parameters — matching date-math.ts.
 */
/* eslint id-length: ["error", { "min": 2, "exceptions": ["i", "j", "k", "x", "y", "z", "_"], "properties": "never" }] */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useSheetDrag } from '@/lib/hooks/useSheetDrag';
import {
  addMonths,
  columnOf,
  isoOf,
  monthMatrix,
  pickerWindow,
  ymdKey,
  type MatrixCell,
  type YearMonth,
} from './date-math';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MON3 = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
// Monday-first, to line up with the week strip above it (B+ `cal_jump_m`).
const DOW1 = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONDAY_FIRST = 1;
const DOWFULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const CELL = 44;
const GRID_GAP = 4;

/**
 * The board's dots read as volume, not an exact count: one for a quiet day,
 * three for a busy one. The count itself is in the cell's aria-label.
 */
export const dotsForCount = (count: number): number => {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
};

const STYLE_ID = 'cjp-styles';
const STYLE_CONTENT = [
  // Motion tokens only (CLAUDE.md). The phone sheet rises; the desktop
  // popover scales from its cue.
  '.cjp-pop{transition:transform var(--motion-fast) var(--motion-ease),opacity var(--motion-fast) var(--motion-ease)}',
  '.cjp-pop.scale{opacity:0;transform:translateY(16px)}',
  // The popover grows from the jump cue: WeekStripHeader measures the cue's
  // centre and sets --cjp-origin-x on the positioner when it opens.
  '@media (min-width:640px){.cjp-pop.scale{transform:scale(.95);transform-origin:var(--cjp-origin-x, 24px) -6px}}',
  '.cjp-pop.cjp-in{transform:none;opacity:1}',
  // Popover width on desktop, full-width sheet under 640px (design §2/§10). CSS
  // media query keeps this SSR-safe — no JS viewport read, no hydration skew.
  '.cjp-w{width:min(340px, calc(100vw - 24px))}',
  '@media (max-width:639.98px){.cjp-w{width:100%}}',
  '.cjp-day{cursor:pointer;transition:background var(--motion-fast) var(--motion-ease)}',
  '.cjp-day.cjp-dis{cursor:default}',
  '.cjp-hit:hover:not(.cjp-dis):not([aria-selected="true"]){background:var(--overlay-hover)}',
  'button.cjp-chev{cursor:pointer;transition:background var(--motion-fast) var(--motion-ease),opacity var(--motion-fast) var(--motion-ease)}',
  'button.cjp-chev:hover:not(:disabled){background:var(--overlay-hover)}',
  'button.cjp-chev:disabled{opacity:.32;cursor:default}',
  '@media (prefers-reduced-motion: reduce){.cjp-pop{transition:none!important;transform:none!important;opacity:1!important}.cjp-car{transition:none!important}}',
].join('\n');

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLE_CONTENT;
  document.head.appendChild(styleEl);
}

const partsOf = (iso: string): { y: number; m: number; d: number } => {
  const parts = iso.split('-').map(Number);
  return { y: parts[0] ?? 0, m: (parts[1] ?? 1) - 1, d: parts[2] ?? 1 };
};

const ChevronGlyph = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d={dir === 'left' ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'}
      stroke="var(--fg-muted)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const clampView = (
  ym: YearMonth,
  min: YearMonth,
  max: YearMonth,
): YearMonth => {
  const key = ym.y * 12 + ym.m;
  const minKey = min.y * 12 + min.m;
  const maxKey = max.y * 12 + max.m;
  if (key < minKey) return min;
  if (key > maxKey) return max;
  return ym;
};

const inWindow = (iso: string, from: string, to: string): boolean =>
  iso >= from && iso <= to;

export interface JumpPickerProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  today: string;
  availability: Map<string, number>;
  onPick: (iso: string) => void;
}

export const JumpPicker = ({
  open,
  onClose,
  selectedDate,
  today,
  availability,
  onPick,
}: JumpPickerProps) => {
  const initial = partsOf(selectedDate);
  const [view, setView] = useState<YearMonth>({ y: initial.y, m: initial.m });
  const [mounted, setMounted] = useState(false);
  const [focusIso, setFocusIso] = useState(selectedDate);
  const gridRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  // In a ref, not the effect's deps, so a parent's inline onClose doesn't
  // re-bind the document listener on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Modal on every width: the phone sheet sits over a scrim and the desktop
  // popover over a click-catcher, so focus stays inside either way. Declared
  // before the open-focus effect below, so the trap's container focus runs
  // first and the selected day takes focus after it.
  useFocusTrap(dialogRef, open);
  const drag = useSheetDrag(onClose, open);

  // Escape closes from anywhere, not only from inside the dialog, so the
  // scrim (aria-hidden, a pointer-only close) has a keyboard path too.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (evt: globalThis.KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      evt.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Inject the one-off style tag after commit, not during render — a
  // render-time DOM mutation would run on every (possibly aborted) render.
  useEffect(ensureStyles, []);

  const { min, max, from: winFrom, to: winTo } = pickerWindow(today);
  const todayParts = partsOf(today);
  const todayKey = ymdKey(todayParts.y, todayParts.m, todayParts.d);

  const atMin = view.y === min.y && view.m === min.m;
  const atMax = view.y === max.y && view.m === max.m;

  // On open, focus the selected day.
  useEffect(() => {
    if (!open) return;
    setView({ y: initial.y, m: initial.m });
    setFocusIso(selectedDate);
    pendingFocus.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate]);

  // Scale-in on the frame after mount.
  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Move DOM focus onto the roving-tabindex target when it changes.
  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    const node = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-iso="${focusIso}"]`,
    );
    node?.focus();
    pendingFocus.current = false;
  }, [open, focusIso, view]);

  if (!open) return null;

  const cells = monthMatrix(view.y, view.m, MONDAY_FIRST);

  const isDisabled = (cell: MatrixCell): boolean =>
    !cell.inMonth || ymdKey(cell.y, cell.m, cell.d) < todayKey;

  const hasInMonthShows = cells.some(
    (cell) =>
      cell.inMonth &&
      !isDisabled(cell) &&
      (availability.get(cell.iso) ?? 0) > 0,
  );

  const pageMonth = (delta: number, moveDomFocus: boolean) => {
    const next = clampView(addMonths(view, delta), min, max);
    setView(next);
    // Keep the roving tab-stop inside the newly-viewed month so it never lands
    // on an out-of-month spill cell. In the current month the 1st is in the past
    // (disabled), so land on today instead to avoid a dead tab-stop. Only steal
    // DOM focus for keyboard paging.
    const isCurrentMonth = next.y === todayParts.y && next.m === todayParts.m;
    setFocusIso(isCurrentMonth ? today : isoOf(next.y, next.m, 1));
    if (moveDomFocus) {
      pendingFocus.current = true;
    }
  };

  const moveFocus = (deltaDays: number) => {
    const base = partsOf(focusIso);
    let cursor = new Date(base.y, base.m, base.d);
    for (let guard = 0; guard < 366; guard += 1) {
      cursor = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + deltaDays,
      );
      const cy = cursor.getFullYear();
      const cm = cursor.getMonth();
      const cd = cursor.getDate();
      const iso = isoOf(cy, cm, cd);
      if (!inWindow(iso, winFrom, winTo)) return;
      const past = ymdKey(cy, cm, cd) < todayKey;
      if (past) continue;
      setFocusIso(iso);
      pendingFocus.current = true;
      if (cy !== view.y || cm !== view.m) setView({ y: cy, m: cm });
      return;
    }
  };

  const moveToWeekEnd = (toEnd: boolean) => {
    const base = partsOf(focusIso);
    const cursor = new Date(base.y, base.m, base.d);
    const col = columnOf(cursor.getDay(), MONDAY_FIRST);
    const delta = toEnd ? 6 - col : -col;
    const target = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + delta,
    );
    // Walk inward to the nearest enabled day in the desired direction.
    const step = toEnd ? -1 : 1;
    let probe = target;
    for (let guard = 0; guard < 7; guard += 1) {
      const py = probe.getFullYear();
      const pm = probe.getMonth();
      const pd = probe.getDate();
      const iso = isoOf(py, pm, pd);
      const past = ymdKey(py, pm, pd) < todayKey;
      if (inWindow(iso, winFrom, winTo) && !past) {
        setFocusIso(iso);
        pendingFocus.current = true;
        if (py !== view.y || pm !== view.m) setView({ y: py, m: pm });
        return;
      }
      probe = new Date(py, pm, pd + step);
    }
  };

  const onGridKeyDown = (evt: KeyboardEvent<HTMLDivElement>) => {
    switch (evt.key) {
      case 'ArrowRight':
        evt.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowLeft':
        evt.preventDefault();
        moveFocus(-1);
        break;
      case 'ArrowDown':
        evt.preventDefault();
        moveFocus(7);
        break;
      case 'ArrowUp':
        evt.preventDefault();
        moveFocus(-7);
        break;
      case 'Home':
        evt.preventDefault();
        moveToWeekEnd(false);
        break;
      case 'End':
        evt.preventDefault();
        moveToWeekEnd(true);
        break;
      case 'PageUp':
        evt.preventDefault();
        pageMonth(evt.shiftKey ? -12 : -1, true);
        break;
      case 'PageDown':
        evt.preventDefault();
        pageMonth(evt.shiftKey ? 12 : 1, true);
        break;
      // Escape is intentionally not handled here — it bubbles to the
      // document listener, which closes once. Handling it in both places
      // fired onClose() twice.
      default:
        break;
    }
  };

  const chevBtn: CSSProperties = {
    all: 'unset',
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };

  const footerCopy = hasInMonthShows
    ? CONSUMER_COPY.jumpPickerFooterHint
    : `${CONSUMER_COPY.jumpPickerEmptyPrefix} ${MON3[view.m]}. ${CONSUMER_COPY.jumpPickerEmptySuffix}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label={`${CONSUMER_COPY.jumpPickerDialogPrefix} — ${MONTHS[view.m]} ${view.y}`}
      // A bottom sheet with the B+ gradient top edge on the phone (rule 7), a
      // bordered popover from sm up.
      className={`cjp-pop cjp-w scale focus:outline-none ${mounted ? 'cjp-in' : ''} rounded-t-[22px] [--sheet-bg:var(--bg-elevated)] max-sm:sheet-edge sm:rounded-2xl sm:border sm:border-border-strong sm:[background:var(--bg-elevated)]`}
      style={{
        boxShadow: '0 20px 50px rgba(0,0,0,0.42), 0 2px 8px rgba(0,0,0,0.3)',
        padding: '10px 18px calc(18px + env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        color: 'var(--fg)',
        fontFamily: 'Inter, system-ui',
        ...drag.sheetStyle,
      }}
      onTransitionEnd={drag.onSheetTransitionEnd}
    >
      {/* The handle and the title row are the phone sheet's drag-down grab
          zone (a no-op from sm up, where this is a popover). */}
      <div {...drag.zoneProps}>
        {/* drag handle: the phone sheet's affordance */}
        <div
          aria-hidden="true"
          className="mx-auto mb-2 sm:hidden"
          style={{
            width: 40,
            height: 4,
            borderRadius: 4,
            background: 'var(--border-strong)',
          }}
        />

        {/* title + close */}
        <div className="flex items-center justify-between gap-2">
          <h2
            style={{
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {CONSUMER_COPY.jumpPickerDialogPrefix}
          </h2>
          <button
            type="button"
            className="cjp-chev"
            onClick={onClose}
            aria-label={CONSUMER_COPY.jumpPickerClose}
            style={chevBtn}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
              <path
                d="M2 2l9 9M11 2l-9 9"
                stroke="var(--fg-muted)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* month pager: the month on the left, chevrons on the right */}
      <div className="mb-3 mt-3 flex items-center gap-1">
        <div
          aria-live="polite"
          style={{
            flex: 1,
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '-0.01em',
          }}
        >
          {MONTHS[view.m]} {view.y}
        </div>
        <button
          type="button"
          className="cjp-chev"
          onClick={() => pageMonth(-1, false)}
          disabled={atMin}
          aria-label={CONSUMER_COPY.jumpPickerPrevMonth}
          style={chevBtn}
        >
          <ChevronGlyph dir="left" />
        </button>
        <button
          type="button"
          className="cjp-chev"
          onClick={() => pageMonth(1, false)}
          disabled={atMax}
          aria-label={CONSUMER_COPY.jumpPickerNextMonth}
          style={chevBtn}
        >
          <ChevronGlyph dir="right" />
        </button>
      </div>

      {/* weekday header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: GRID_GAP,
          marginBottom: 6,
        }}
      >
        {DOW1.map((label, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--fg-subtle)',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* day grid */}
      <div
        ref={gridRef}
        role="grid"
        onKeyDown={onGridKeyDown}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: GRID_GAP,
        }}
      >
        {cells.map((cell) => {
          const count = availability.get(cell.iso) ?? 0;
          const past = ymdKey(cell.y, cell.m, cell.d) < todayKey;
          const sel = cell.iso === selectedDate;
          const isToday = cell.iso === today;
          const disabled = isDisabled(cell);
          const dots = disabled ? 0 : dotsForCount(count);

          const numColor = sel
            ? 'var(--fg-on-accent)'
            : !cell.inMonth || past
              ? 'var(--fg-subtle)'
              : 'var(--fg)';

          // Spill days from the neighbouring months are left blank, as on the
          // board; they stay in the DOM so cells keep their ISO keys.
          const opacity = !cell.inMonth ? 0 : past ? 0.5 : 1;

          const countClause =
            count > 0 ? `, ${count} show${count > 1 ? 's' : ''}` : ', no shows';
          const ariaLabel = `${DOWFULL[cell.dow]}, ${MONTHS[cell.m]} ${cell.d}${countClause}${isToday ? ', today' : ''}`;

          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              data-iso={cell.iso}
              data-today={isToday || undefined}
              // Spill days are drawn blank; keep them (and their ISO keys)
              // in the DOM but out of the accessibility tree.
              aria-hidden={!cell.inMonth || undefined}
              className={`cjp-day cjp-hit ${disabled ? 'cjp-dis' : ''}`}
              onClick={disabled ? undefined : () => onPick(cell.iso)}
              tabIndex={cell.iso === focusIso ? 0 : -1}
              aria-disabled={disabled}
              aria-selected={sel}
              aria-label={ariaLabel}
              style={{
                all: 'unset',
                boxSizing: 'border-box',
                position: 'relative',
                height: CELL,
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: sel
                  ? 'linear-gradient(135deg, var(--signal), var(--accent))'
                  : 'transparent',
                opacity,
                boxShadow:
                  isToday && !sel ? 'inset 0 0 0 1.5px var(--signal)' : 'none',
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <span
                style={{
                  fontWeight: sel ? 900 : 700,
                  fontSize: 15,
                  color: numColor,
                  lineHeight: 1,
                }}
              >
                {cell.d}
              </span>
              <span
                aria-hidden="true"
                data-testid="jump-dots"
                className="flex gap-[3px]"
                style={{ height: 4 }}
              >
                {Array.from({ length: dots }).map((_, dotIdx) => (
                  <span
                    key={dotIdx}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 4,
                      background: sel ? 'var(--fg-on-accent)' : 'var(--signal)',
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* footer: the dot legend (or the empty-month line) and the Today reset */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2"
          style={{ fontSize: 13, color: 'var(--fg-muted)' }}
        >
          {hasInMonthShows && (
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'var(--signal)',
              }}
            />
          )}
          {footerCopy}
        </span>
        <button
          type="button"
          onClick={() => onPick(today)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid var(--border-strong)',
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--fg)',
          }}
        >
          {CONSUMER_COPY.jumpPickerToday}
        </button>
      </div>
    </div>
  );
};

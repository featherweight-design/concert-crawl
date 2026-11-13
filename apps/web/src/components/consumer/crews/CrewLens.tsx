'use client';

// The Browse crew lens (#1226 PR-6, handoff crew-browse-lens.jsx): the crew
// picker body and the rail that names an active lens. The picker opens from the
// filter bar's Who (the desktop segment's popover, and the phone Filters
// sheet's Who section since B+ B6b), not from a pill of its own.

import { useId, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CrewSummary } from '@concert-crawl/types';

import { CrewPatch } from '@/components/consumer/crew-patch';
import { CREWS_COPY } from './definitions/copy';

const COPY = CREWS_COPY;

export const LensGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect
      x="1.2"
      y="1.2"
      width="13.6"
      height="13.6"
      rx="4.6"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <circle
      cx="8"
      cy="8"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
);

const PickerCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 8.5l3.2 3.2L13 5"
      stroke="var(--signal)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

interface CrewPickerRowProps {
  /** null is the "Everyone" reset row, which stands in for "Any date". */
  crew: CrewSummary | null;
  selected: boolean;
  compact: boolean;
  /** The group is one tab stop, so only the active row is reachable by Tab. */
  tabbable: boolean;
  rowRef: (node: HTMLButtonElement | null) => void;
  onSelect: () => void;
}

const CrewPickerRow = ({
  crew,
  selected,
  compact,
  tabbable,
  rowRef,
  onSelect,
}: CrewPickerRowProps) => (
  <button
    ref={rowRef}
    type="button"
    onClick={onSelect}
    // Picking a crew is a single-select set, not a set of independent
    // toggles, so the rows carry radio semantics rather than `aria-pressed`.
    role="radio"
    aria-checked={selected}
    tabIndex={tabbable ? 0 : -1}
    className="flex w-full cursor-pointer items-center gap-3 text-left"
    style={{
      minHeight: 56,
      padding: compact ? '10px 14px' : '12px 20px',
      borderBottom: '1px solid var(--border)',
      boxSizing: 'border-box',
      background: selected ? 'var(--surface-1)' : 'transparent',
    }}
  >
    {crew === null ? (
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1.5px dashed var(--border-strong)',
          color: 'var(--fg-subtle)',
        }}
      >
        <Users size={16} aria-hidden="true" />
      </span>
    ) : (
      <CrewPatch
        crewId={crew.id}
        patchSalt={crew.patchSalt}
        size={38}
        scale="tile"
      />
    )}
    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <span
        className="truncate"
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: selected ? 700 : 500,
          fontSize: compact ? 13.5 : 15.5,
          color: selected ? 'var(--signal)' : 'var(--fg)',
        }}
      >
        {crew === null ? COPY.lens.pickerNone : crew.name}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:
            crew !== null && crew.upcomingCount > 0
              ? 'var(--signal)'
              : 'var(--fg-subtle)',
        }}
      >
        {crew === null
          ? COPY.lens.pickerNoneMeta
          : COPY.list.upcomingMeta(crew.upcomingCount)}
      </span>
    </span>
    {selected && <PickerCheck />}
  </button>
);

interface CrewPickerBodyProps {
  crews: CrewSummary[];
  selectedId: string | null;
  compact: boolean;
  onSelect: (crewId: string | null) => void;
}

export const CrewPickerBody = ({
  crews,
  selectedId,
  compact,
  onSelect,
}: CrewPickerBodyProps) => {
  // `null` first: the options are the reset row followed by the crews.
  const options: (CrewSummary | null)[] = [null, ...crews];
  const selectedIndex = options.findIndex(
    (option) => (option?.id ?? null) === selectedId,
  );
  // A radiogroup is a single tab stop, so Tab lands on the checked row and the
  // arrows move within the group from there.
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex === -1 ? 0 : selectedIndex,
  );
  const rowsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const moveTo = (index: number) => {
    const wrapped = (index + options.length) % options.length;
    setActiveIndex(wrapped);
    rowsRef.current[wrapped]?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    if (event.key in step) {
      event.preventDefault();
      moveTo(activeIndex + (step[event.key] ?? 0));
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
      aria-label={COPY.a11y.lensPicker}
      onKeyDown={onKeyDown}
      className="flex flex-col"
    >
      {options.map((crew, index) => (
        <CrewPickerRow
          key={crew?.id ?? 'everyone'}
          crew={crew}
          selected={(crew?.id ?? null) === selectedId}
          compact={compact}
          tabbable={index === activeIndex}
          rowRef={(node) => {
            rowsRef.current[index] = node;
          }}
          onSelect={() => onSelect(crew?.id ?? null)}
        />
      ))}
    </div>
  );
};

interface CrewLensRailProps {
  /** Null when the lens feed failed to load, where "0 shows" would be a lie. */
  count: number | null;
  onClear: () => void;
}

/**
 * Replaces the location eyebrow while a lens is on. The weight of the state
 * lands here and on the page title, never on the chips, and it carries its own
 * dismissal so the lens is always one tap from off.
 */
export const CrewLensRail = ({ count, onClear }: CrewLensRailProps) => (
  <div className="flex items-center gap-[9px]" style={{ minHeight: 22 }}>
    <span
      aria-hidden="true"
      className="shrink-0"
      style={{
        width: 6,
        height: 6,
        borderRadius: 6,
        background: 'var(--signal)',
        boxShadow: '0 0 8px var(--signal)',
      }}
    />
    <span
      className="whitespace-nowrap"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: 'var(--signal)',
      }}
    >
      {COPY.lens.railEyebrow} ·{' '}
      {count === null ? COPY.lens.failedRail : COPY.lens.railCount(count)}
    </span>
    <span
      aria-hidden="true"
      className="h-px flex-1"
      style={{ background: 'var(--border)', minWidth: 8 }}
    />
    <button
      type="button"
      onClick={onClear}
      aria-label={COPY.a11y.lensOff}
      className="shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 22,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        borderBottom: '1px solid var(--border-strong)',
        lineHeight: 1.5,
        outlineColor: 'var(--focus)',
      }}
    >
      {COPY.glyphs.clear} {COPY.lens.railClear}
    </button>
  </div>
);

// The pieces every B+ search row is built from (B19, `07-more-screens/
// more-r3-palette*`, `more-r3-search_m*`): the mono section label, the
// genre-ringed artwork, the query highlight, the selected-row wash and the
// price on the right. Shared by the palette and /search, which are the same
// search drawn at two widths.

import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { genreColor, NEUTRAL_GENRE_COLOR } from '@/lib/genre-color';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { Panel } from '../image-slot';

const copy = CONSUMER_COPY.search;

/** The art box every result row uses, so the columns line up across sections. */
export const RESULT_ART_SIZE = 48;

/** The lead genre's color, or the neutral ring for an ungenred show. */
export const ringColorFor = (genres: string[] | null | undefined): string =>
  genreColor(genres?.[0]) ?? NEUTRAL_GENRE_COLOR;

export function formatDayLabel(dateStr: string): string {
  // Append T00:00:00 to force local-timezone parsing: bare YYYY-MM-DD parses
  // as UTC midnight, which shifts the displayed day for negative offsets.
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function SectionLabel({
  icon,
  label,
  accent = false,
}: {
  icon?: ReactNode;
  label: string;
  accent?: boolean;
}) {
  const color = accent ? 'var(--accent)' : 'var(--fg-muted)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '14px 16px 8px',
      }}
    >
      {icon && (
        <span aria-hidden style={{ color, display: 'inline-flex' }}>
          {icon}
        </span>
      )}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Whether the rows are options of a listbox. The palette provides it so its
 * combobox input can point at the highlighted row with `aria-activedescendant`;
 * /search draws the same rows as plain buttons, where `option` would be an
 * orphan role.
 */
export const ListboxRowsContext = createContext(false);

/** The DOM id of the row at this keyboard index. */
export const resultOptionId = (idx: number): string => `search-option-${idx}`;

/** Read inside a section, once, then hand to {@link resultRowProps} per row. */
export const useListboxRows = (): boolean => useContext(ListboxRowsContext);

/**
 * What every selectable row spreads on its button: the selected marker the
 * scroll-into-view reads, an id the combobox can point at, and, inside the
 * palette's listbox, the option role and its selected state.
 */
export const resultRowProps = (
  listbox: boolean,
  idx: number,
  selected: boolean,
) => ({
  id: resultOptionId(idx),
  'data-selected': selected ? ('true' as const) : undefined,
  ...(listbox ? { role: 'option' as const, 'aria-selected': selected } : {}),
});

/**
 * The name with the typed query lit in --signal, wherever it first matches.
 * Plain text when there is no query or no match, so the accessible name is
 * always the whole name.
 */
export function Highlight({ text, query }: { text: string; query?: string }) {
  const needle = query?.trim() ?? '';
  // Matched on the original text with a case-insensitive pattern, never by
  // lowercasing and slicing: lowercasing can change a string's length ('İ'),
  // which would light the wrong characters.
  const match =
    needle === ''
      ? null
      : new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').exec(
          text,
        );
  if (match === null) return <>{text}</>;
  const at = match.index;
  const end = at + match[0].length;
  return (
    <>
      {text.slice(0, at)}
      <span style={{ color: 'var(--signal)' }}>{text.slice(at, end)}</span>
      {text.slice(end)}
    </>
  );
}

/**
 * The row's artwork through the shared slot, ringed in the lead genre's color
 * with a soft glow (README rule 2), the same ring an event row draws.
 */
export function RingArt({
  name,
  imageUrl,
  photoUrl,
  ring,
}: {
  name: string;
  imageUrl?: string | null | undefined;
  photoUrl?: string | null | undefined;
  ring: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        borderRadius: 10,
        boxShadow: `0 0 0 1.25px ${ring}, 0 0 10px color-mix(in oklch, ${ring} 35%, transparent)`,
      }}
    >
      <Panel
        surface="event"
        name={name}
        artworkUrl={imageUrl ?? null}
        photoUrl={photoUrl ?? null}
        size={RESULT_ART_SIZE}
        radius={10}
      />
    </span>
  );
}

/**
 * A result row's box. The selected row (keyboard or pointer) takes a 2px edge
 * in its ring color and a wash that fades out to the right, as the boards draw
 * the highlighted row.
 */
export const resultRowStyle = (
  selected: boolean,
  ring: string,
): CSSProperties => ({
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '10px 16px 10px 14px',
  width: '100%',
  minHeight: 64,
  boxSizing: 'border-box',
  borderRadius: 14,
  borderLeft: `2px solid ${selected ? ring : 'transparent'}`,
  background: selected
    ? `linear-gradient(90deg, color-mix(in oklch, ${ring} 14%, transparent), transparent 75%)`
    : 'transparent',
  transition: 'background var(--motion-fast) var(--motion-ease)',
});

export const RESULT_NAME_STYLE: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  fontSize: 15.5,
  color: 'var(--fg)',
  letterSpacing: '-0.015em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const RESULT_META_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--fg-muted)',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/** The price on the right: the figure in --fg, or a quiet TBA. */
export function ResultPrice({ value }: { value: string | null | undefined }) {
  return (
    <span
      style={{
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: value ? 13.5 : 11,
        fontWeight: value ? 700 : 500,
        letterSpacing: value ? '0' : '0.12em',
        color: value ? 'var(--fg)' : 'var(--fg-subtle)',
      }}
    >
      {value ? `$${value}` : copy.priceNotAnnounced}
    </span>
  );
}

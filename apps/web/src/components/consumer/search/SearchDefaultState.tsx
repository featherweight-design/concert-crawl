import { Clock, Tag, X } from 'lucide-react';
import type { PopularEvent } from '../../../lib/search/useSearch';
import { GenreChips } from '../GenreChips';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  RESULT_NAME_STYLE,
  ResultPrice,
  RingArt,
  SectionLabel,
  formatDayLabel,
  VenueDateLine,
  resultRowProps,
  resultRowStyle,
  useListboxRows,
  ringColorFor,
} from './ResultParts';

const copy = CONSUMER_COPY.search;

interface SearchDefaultStateProps {
  recentSearches: string[];
  popularEvents: PopularEvent[];
  onPickQuery: (query: string) => void;
  onPickEvent: (type: 'artist', value: string) => void;
  /** Drops one recent search. Without it the chips draw no ×. */
  onRemoveRecent?: ((query: string) => void) | undefined;
  /** The keyboard-selected popular row, as the palette tracks it. */
  selectedIdx?: number | undefined;
  onHover?: ((idx: number) => void) | undefined;
}

/**
 * A recent search as a chip (B+ `more-r3-palette`): the query, which reruns
 * it, and a separate ×, which forgets it. Two buttons side by side rather than
 * one inside the other, so each is its own target.
 */
function RecentChip({
  query,
  onPick,
  onRemove,
}: {
  query: string;
  onPick: () => void;
  onRemove?: (() => void) | undefined;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-1)',
        maxWidth: '100%',
      }}
    >
      <button
        // A recent search is text the reader typed: analytics autocapture
        // skips this control (posthog-js `ph-no-capture`).
        className="ph-no-capture"
        type="button"
        onClick={onPick}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          minHeight: 36,
          padding: onRemove ? '0 4px 0 12px' : '0 14px 0 12px',
          minWidth: 0,
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        <Clock
          size={14}
          strokeWidth={1.75}
          aria-hidden
          style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}
        />
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {query}
        </span>
      </button>
      {onRemove && (
        <button
          className="ph-no-capture"
          type="button"
          onClick={onRemove}
          aria-label={copy.removeRecentAriaLabel(query)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 32,
            height: 36,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-subtle)',
            flexShrink: 0,
          }}
        >
          <X size={12} strokeWidth={2} aria-hidden />
        </button>
      )}
    </span>
  );
}

export function SearchDefaultState({
  recentSearches,
  popularEvents,
  onPickQuery,
  onPickEvent,
  onRemoveRecent,
  selectedIdx = -1,
  onHover,
}: SearchDefaultStateProps) {
  const listbox = useListboxRows();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '0 8px 10px',
      }}
    >
      {recentSearches.length > 0 && (
        <>
          <SectionLabel
            icon={<Clock size={13} strokeWidth={1.75} />}
            label={copy.recentSectionLabel}
          />
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              padding: '0 16px 6px',
            }}
          >
            {recentSearches.map((query) => (
              <RecentChip
                key={query}
                query={query}
                onPick={() => onPickQuery(query)}
                onRemove={
                  onRemoveRecent ? () => onRemoveRecent(query) : undefined
                }
              />
            ))}
          </div>
        </>
      )}

      {popularEvents.length > 0 && (
        <>
          <SectionLabel
            icon={<Tag size={13} strokeWidth={1.75} />}
            label={copy.popularSectionLabel}
            accent
          />
          {popularEvents.map((event, idx) => {
            const ring = ringColorFor(event.genre);
            const selected = selectedIdx === idx;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onPickEvent('artist', event.artist)}
                onMouseEnter={() => onHover?.(idx)}
                {...resultRowProps(listbox, idx, selected)}
                style={resultRowStyle(selected, ring)}
              >
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    flexShrink: 0,
                    textAlign: 'center',
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 800,
                    fontSize: 15,
                    color: 'var(--fg-subtle)',
                  }}
                >
                  {idx + 1}
                </span>
                {/* The slot owns the box, the radius and the source chain, so
                    this row resolves artwork then portrait then generated mark
                    like every other event row. */}
                <RingArt
                  name={event.artist}
                  imageUrl={event.imageUrl}
                  photoUrl={event.artistPhotoUrl}
                  ring={ring}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <span style={RESULT_NAME_STYLE}>{event.artist}</span>
                  <VenueDateLine
                    venue={event.venue.name}
                    date={formatDayLabel(event.date)}
                  />
                  <GenreChips genres={event.genre ?? null} maxChips={1} />
                </span>
                <ResultPrice value={event.ticketPriceMin} />
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

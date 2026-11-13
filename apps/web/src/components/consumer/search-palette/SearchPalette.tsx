'use client';

// The ⌘K search palette (B+ B19: `07-more-screens/more-r3-palette*` on
// desktop, `more-r3-search_m*` below 640px, where it is a full-screen search
// rather than a floating card a phone has no room for).
//
// A modal: Escape and the backdrop close it, Tab stays inside it, and focus
// goes back to whatever opened it. ↑↓ walk the rows (the popular list before
// anything is typed, the results after), and Enter opens the selected one.

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useSearch } from '../../../lib/search/useSearch';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import { CCMark } from '@/components/brand/cc-mark';
import { CCWordmark } from '@/components/brand/cc-wordmark';
import { SearchDefaultState } from '../search/SearchDefaultState';
import { SearchResultsState } from '../search/SearchResultsState';
import { SearchEmptyState } from '../search/SearchEmptyState';
import { SearchLoadingState } from '../search/SearchLoadingState';
import {
  SEARCH_FIELD_BOX,
  SEARCH_FIELD_FONT_SIZE,
  SEARCH_FIELD_GRADIENT_EDGE,
} from '../search/definitions/constants';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ListboxRowsContext, resultOptionId } from '../search/ResultParts';
import { PALETTE_SHEET_QUERY } from './definitions/constants';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

const LISTBOX_ID = 'search-palette-listbox';

const copy = CONSUMER_COPY.search;

// `:not([disabled])` matters: a disabled control cannot take focus, so
// counting one as the trap's tail would let Tab walk out of the dialog.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 24,
  height: 22,
  padding: '0 5px',
  boxSizing: 'border-box',
  borderRadius: 6,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-1)',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
};

const hintStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
};

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const search = useSearch();
  const sheet = useMediaQuery(PALETTE_SHEET_QUERY);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const selectedIdxRef = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const select = (idx: number) => {
    selectedIdxRef.current = idx;
    setSelectedIdx(idx);
  };

  useEffect(() => {
    selectedIdxRef.current = -1;
    setSelectedIdx(-1);
  }, [search.query]);

  // A row reached by the arrow keys can sit below the fold of the scrolling
  // body; keep it in view. `nearest` leaves the scroll alone when it already is.
  useEffect(() => {
    if (selectedIdx < 0) return;
    const row = panelRef.current?.querySelector('[data-selected="true"]');
    if (
      row instanceof HTMLElement &&
      typeof row.scrollIntoView === 'function'
    ) {
      row.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  // The sheet and the dialog are two trees, so crossing the 640px line (a
  // rotation) remounts the input and drops focus and caret. Put both back.
  const sheetRef = useRef(sheet);
  useEffect(() => {
    if (sheetRef.current === sheet) return;
    sheetRef.current = sheet;
    const field = inputRef.current;
    if (!open || field === null) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, [sheet, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      search.clearQuery();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useBodyScrollLock(open);

  // Focus goes back to the control that opened the palette. Without it focus
  // falls to <body> and a keyboard user starts the page over from the top.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement;
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [open]);

  const {
    query,
    popularEvents,
    artistResults,
    artistPageResults,
    venueResults,
    venueFirst,
    navigateTo,
  } = search;
  const browsing = query.trim() === '';

  // On a wide screen the first result is highlighted as soon as typed results
  // arrive (more-r3-palette_typed: the yellow edge and wash on row one), so
  // Enter opens it. The phone sheet has no resting highlight. Typing again
  // clears it above and it comes back with the next results; an arrow key or a
  // hover moves it off row one and this leaves it alone. Only SETTLED results
  // count: the hook keeps the previous query's rows on screen for the debounce,
  // and highlighting one of those would let Enter open a result for text that
  // is no longer in the box.
  const typedResultCount =
    artistResults.length + artistPageResults.length + venueResults.length;
  const settled = !search.isLoading;
  useEffect(() => {
    if (!open || sheet || browsing || !settled || typedResultCount === 0) {
      return;
    }
    if (selectedIdxRef.current < 0) {
      selectedIdxRef.current = 0;
      setSelectedIdx(0);
    }
  }, [open, sheet, browsing, settled, typedResultCount, query]);

  useEffect(() => {
    if (!open) return;

    const totalResults = browsing
      ? popularEvents.length
      : artistPageResults.length + artistResults.length + venueResults.length;

    // Tab stays inside the dialog: `aria-modal` tells assistive tech the page
    // behind is inert, and this makes the keyboard agree.
    function trapTab(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (panel === null) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const head = items[0];
      const tail = items[items.length - 1];
      if (head === undefined || tail === undefined) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        head.focus();
      } else if (event.shiftKey && active === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && active === tail) {
        event.preventDefault();
        head.focus();
      }
    }

    function openSelected(rawIdx: number) {
      if (browsing) {
        const popular = popularEvents[rawIdx];
        if (popular) {
          navigateTo('artist', popular.artist);
          onClose();
        }
        return;
      }
      // B+ order: Artists and Venues (`venueFirst` swaps them), then the
      // artist pages, which own the indices after both.
      const firstCount = venueFirst
        ? venueResults.length
        : artistResults.length;
      const eventCount = artistResults.length + venueResults.length;
      if (rawIdx >= eventCount) {
        const artistPage = artistPageResults[rawIdx - eventCount];
        if (artistPage) {
          navigateTo('artistPage', { slug: artistPage.slug });
          onClose();
        }
        return;
      }
      const pickVenue = venueFirst ? rawIdx < firstCount : rawIdx >= firstCount;
      if (pickVenue) {
        const venue = venueResults[venueFirst ? rawIdx : rawIdx - firstCount];
        if (venue) {
          navigateTo('venue', {
            slug: venue.slug,
            matchingEventId: venue.matchingEventId,
          });
          onClose();
        }
      } else {
        const artist = artistResults[venueFirst ? rawIdx - firstCount : rawIdx];
        if (artist) {
          navigateTo('artist', artist.name);
          onClose();
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Tab') {
        trapTab(event);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        select(Math.min(selectedIdxRef.current + 1, totalResults - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        select(Math.max(selectedIdxRef.current - 1, -1));
      } else if (event.key === 'Enter' && selectedIdxRef.current >= 0) {
        // A focused control inside the panel (a chip's remove, Follow, clear)
        // owns its own Enter; only the input, or nothing focused, opens the
        // highlighted row. Hover moves the highlight, so without this a
        // hovered row would steal Enter from the button the user tabbed to.
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          panelRef.current?.contains(active) &&
          active.tagName !== 'INPUT'
        ) {
          return;
        }
        event.preventDefault();
        openSelected(selectedIdxRef.current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    browsing,
    popularEvents,
    artistResults,
    artistPageResults,
    venueResults,
    venueFirst,
    navigateTo,
    onClose,
  ]);

  if (!open) return null;

  const hasResults =
    artistPageResults.length > 0 ||
    artistResults.length > 0 ||
    venueResults.length > 0;

  const input = (
    <input
      ref={inputRef}
      value={query}
      onChange={(ev) => search.setQuery(ev.target.value)}
      placeholder={copy.paletteSearchPlaceholder}
      aria-label={copy.inputAriaLabel}
      role="combobox"
      aria-expanded="true"
      aria-controls={LISTBOX_ID}
      aria-autocomplete="list"
      {...(selectedIdx >= 0
        ? { 'aria-activedescendant': resultOptionId(selectedIdx) }
        : {})}
      style={{
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        // 16 at phone width: below it iOS Safari zooms the page on focus.
        fontSize: sheet ? SEARCH_FIELD_FONT_SIZE : 18,
        color: 'var(--fg)',
        letterSpacing: '-0.01em',
      }}
    />
  );

  const clear = query ? (
    <button
      type="button"
      onClick={search.clearQuery}
      aria-label={copy.paletteClearAriaLabel}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 24,
        height: 24,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-2)',
        color: 'var(--fg-muted)',
        flexShrink: 0,
      }}
    >
      <X size={12} strokeWidth={1.75} />
    </button>
  ) : null;

  const body = (
    <ListboxRowsContext.Provider value>
      <div
        id={LISTBOX_ID}
        role="listbox"
        aria-label={copy.paletteAriaLabel}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          paddingTop: 2,
        }}
      >
        {browsing && (
          <SearchDefaultState
            recentSearches={search.recentSearches}
            popularEvents={popularEvents}
            onPickQuery={search.setQuery}
            onPickEvent={(type, value) => {
              navigateTo(type, value);
              onClose();
            }}
            onRemoveRecent={search.removeRecent}
            selectedIdx={selectedIdx}
            onHover={select}
          />
        )}
        {!browsing && search.isLoading && <SearchLoadingState />}
        {!browsing && !search.isLoading && hasResults && (
          <SearchResultsState
            artistResults={artistResults}
            artistPageResults={artistPageResults}
            venueResults={venueResults}
            venueFirst={venueFirst}
            selectedIdx={selectedIdx}
            query={query}
            onHover={select}
            onNavigateTo={(type, value) => {
              navigateTo(type, value);
              onClose();
            }}
          />
        )}
        {!browsing && !search.isLoading && !hasResults && (
          <SearchEmptyState query={query} onCtaClick={onClose} />
        )}
      </div>
    </ListboxRowsContext.Provider>
  );

  if (sheet) {
    return (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.paletteAriaLabel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 16px 8px 8px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.backAriaLabel}
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 44,
              height: 44,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg)',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <div
            style={{
              flex: 1,
              // Without this the field keeps its content width at 320 and the
              // clear button runs off the right edge.
              minWidth: 0,
              ...SEARCH_FIELD_BOX,
              ...SEARCH_FIELD_GRADIENT_EDGE,
            }}
          >
            <span
              aria-hidden
              style={{ color: 'var(--signal)', display: 'inline-flex' }}
            >
              <Search size={18} strokeWidth={1.75} />
            </span>
            {input}
            {clear}
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'min(10vh, 84px) 16px 16px',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.paletteAriaLabel}
        onClick={(ev) => ev.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 660,
          maxHeight: 'min(680px, calc(100dvh - 120px))',
          borderRadius: 18,
          overflow: 'hidden',
          // The blue-to-pink edge: the fill on the padding box, the sweep on
          // the border box behind a transparent border.
          border: '1.5px solid transparent',
          background:
            // surface-2 (#171D3A on Electric): the board's lifted navy (the
            // board reads #181d3b in more-r3-palette_typed), not the darker
            // bg-elevated. Only Electric is drawn.
            'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent)) border-box',
          // The colored light behind the palette: one of the two glows README
          // rule 1 grants outside the page's ambient one.
          boxShadow:
            '0 30px 90px -24px color-mix(in oklch, var(--signal) 45%, transparent), 0 0 160px -24px color-mix(in oklch, var(--accent) 40%, transparent), 0 24px 60px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'var(--font-ui)',
          color: 'var(--fg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 18px 0 20px',
            height: 60,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            aria-hidden
            style={{ color: 'var(--signal)', display: 'inline-flex' }}
          >
            <Search size={19} strokeWidth={1.75} />
          </span>
          {input}
          {/* The typed board draws only ESC here: Escape clears and closes. */}
          <kbd style={kbdStyle}>{copy.paletteEscHint}</kbd>
        </div>

        {body}

        <div
          style={{
            flexShrink: 0,
            padding: '0 18px',
            height: 46,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            borderTop: '1px solid var(--border)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--fg-subtle)',
          }}
        >
          <span style={hintStyle}>
            <kbd style={kbdStyle}>
              ↑<span>↓</span>
            </kbd>
            {copy.paletteNavigateHint}
          </span>
          <span style={hintStyle}>
            <kbd style={kbdStyle}>↵</kbd>
            {copy.paletteOpenHint}
          </span>
          <span style={hintStyle}>
            <kbd style={kbdStyle}>{copy.paletteEscHint}</kbd>
            {copy.paletteCloseHint}
          </span>
          <span
            aria-hidden
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CCMark size={22} />
            <CCWordmark size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

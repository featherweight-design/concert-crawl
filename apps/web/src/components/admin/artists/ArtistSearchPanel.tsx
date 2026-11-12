'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  KindLabel,
  SidePanel,
} from '@/components/admin/primitives';
import type {
  AdminArtistRow,
  ArtistsApi,
  SearchCandidate,
} from './artists-api';
import { showLine } from './artist-rules';
import { ArtistPhoto } from './ArtistPhoto';
import {
  ELLIPSIS,
  PHONE_BUTTON,
  ROW_BUTTON,
  SECONDARY_BUTTON,
  TINT_BUTTON,
  gradientBorder,
} from './artist-styles';

const COPY = ADMIN_COPY.artists;
const PANEL = COPY.searchPanel;

type Results =
  | { state: 'loading' }
  | { state: 'failed' }
  | {
      state: 'ready';
      candidates: SearchCandidate[];
      /** From a typed search, not the saved snapshot. */
      searched: boolean;
    };

/** "Lost Lake · Sun Nov 15 · 2 wrong-artist reports", from the row. */
const contextLine = (row: AdminArtistRow): string | null => {
  const parts = [
    showLine(row),
    row.openReportCount > 0 ? COPY.reports(row.openReportCount) : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(PANEL.separator) : null;
};

/**
 * The artist search (`06/artists-search-opens-the-side-panel`,
 * `06/artist-search-mobile`): a 460px side panel on desktop, the full screen
 * on the phone. It opens on the match job's saved candidates; a new name
 * searches Spotify live, on submit only, since each search spends quota.
 */
export const ArtistSearchPanel = ({
  row,
  api,
  isPhone,
  onUse,
  onNotAnArtist,
  onClose,
}: {
  row: AdminArtistRow;
  api: ArtistsApi;
  isPhone: boolean;
  /** Saves the pick through the page's write path (with expectedStatus). */
  onUse: (candidate: SearchCandidate) => void;
  onNotAnArtist: () => void;
  onClose: () => void;
}) => {
  const [query, setQuery] = useState(row.name);
  const [exact, setExact] = useState(false);
  const [results, setResults] = useState<Results>({ state: 'loading' });
  // The term the results on screen came from; undefined is the saved snapshot.
  const lastTerm = useRef<string | undefined>(undefined);

  // Only the latest search lands: a slow first load never covers a newer one.
  const latest = useRef(0);
  const run = useCallback(
    (term?: string) => {
      const mine = ++latest.current;
      lastTerm.current = term;
      setResults({ state: 'loading' });
      api
        .candidates(row.id, term)
        .then((candidates) => {
          if (mine === latest.current)
            setResults({
              state: 'ready',
              candidates,
              searched: term !== undefined,
            });
        })
        .catch((err: unknown) => {
          console.error('[admin artists] artist search failed', row.id, err);
          if (mine === latest.current) setResults({ state: 'failed' });
        });
    },
    [api, row.id],
  );

  // Open on the saved snapshot. The server calls Spotify then only to fill
  // in genres the snapshot lacks; a new name is a live search.
  useEffect(() => {
    run();
    // Closing the panel drops whatever is still in flight.
    return () => {
      latest.current += 1;
    };
  }, [run]);

  const onSubmit = (evt: FormEvent) => {
    evt.preventDefault();
    const typed = query.trim();
    // The row's own name is what the snapshot already holds.
    const term = typed === '' || typed === row.name ? undefined : typed;
    // One search at a time, and never the same one twice (a failed one may
    // be tried again). Exact name filters on the client, so it never counts.
    if (results.state === 'loading') return;
    if (results.state === 'ready' && term === lastTerm.current) return;
    run(term);
  };

  const shown =
    results.state === 'ready'
      ? results.candidates.filter((each) => !exact || each.isExactMatch)
      : [];
  // The current match, else the first result, draws as the selected row.
  const selectedId =
    shown.find((each) => each.id === row.spotifyArtistId)?.id ??
    shown[0]?.id ??
    null;
  const context = contextLine(row);

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 36,
            padding: '0 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
            color: 'var(--fg-subtle)',
            boxSizing: 'border-box',
          }}
        >
          <Search size={14} aria-hidden style={{ flex: 'none' }} />
          <input
            type="search"
            enterKeyHint="search"
            maxLength={200}
            value={query}
            onChange={(evt) => setQuery(evt.target.value)}
            aria-label={PANEL.inputLabel}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          />
        </label>
        <AdminButton
          type="button"
          aria-pressed={exact}
          onClick={() => setExact((prev) => !prev)}
          style={{
            ...(exact ? TINT_BUTTON : SECONDARY_BUTTON),
            height: 36,
            fontSize: 12.5,
          }}
        >
          {PANEL.exactName}
        </AdminButton>
      </form>
      <div role="status" style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
        {results.state === 'loading'
          ? PANEL.loading
          : results.state === 'failed'
            ? PANEL.failed
            : PANEL.results(shown.length)}
      </div>
      {results.state === 'ready' && shown.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          {results.candidates.length > 0
            ? // Exact name hid every hit.
              PANEL.noExact
            : results.searched
              ? PANEL.empty
              : // Nothing saved for this row yet: the search is the way in.
                PANEL.noSaved}
        </div>
      )}
      <ul
        aria-label={COPY.candidates(row.name)}
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {shown.map((candidate) => {
          const selected = candidate.id === selectedId;
          // Picking the current match is Looks right: it keeps the match,
          // which dismisses open reports (or confirms an automatic pick).
          const keeps = candidate.id === row.spotifyArtistId;
          const label = keeps ? COPY.looksRight : PANEL.use;
          return (
            <li
              key={candidate.id}
              aria-current={selected || undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 10px',
                borderRadius: 10,
                ...(selected
                  ? gradientBorder('var(--surface-2)')
                  : { border: '1px solid transparent' }),
              }}
            >
              <ArtistPhoto url={candidate.imageUrl} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 700,
                    ...ELLIPSIS,
                  }}
                >
                  {candidate.name}
                </span>
                {/* Genre only: place, listeners and the top track are held. */}
                {candidate.genres?.[0] && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      ...ELLIPSIS,
                    }}
                  >
                    {candidate.genres[0]}
                  </span>
                )}
              </span>
              <AdminButton
                type="button"
                onClick={() => onUse(candidate)}
                aria-label={COPY.actionFor(label, candidate.name)}
                style={{
                  ...(selected ? TINT_BUTTON : SECONDARY_BUTTON),
                  ...ROW_BUTTON,
                }}
              >
                {label}
              </AdminButton>
            </li>
          );
        })}
      </ul>
    </div>
  );

  if (isPhone) {
    return (
      <AdminSheet
        fullScreen
        backLabel={COPY.title}
        title={PANEL.title(row.name)}
        // The phone board draws the context bare; the desktop one adds "For".
        subtitle={context ?? undefined}
        onClose={onClose}
        footer={
          // "No photo for now" is held, so Not an artist takes the row.
          <AdminButton
            type="button"
            onClick={onNotAnArtist}
            style={{ ...SECONDARY_BUTTON, ...PHONE_BUTTON, height: 42 }}
          >
            {COPY.notAnArtist}
          </AdminButton>
        }
      >
        {body}
      </AdminSheet>
    );
  }

  return (
    <SidePanel
      width={460}
      eyebrow={<KindLabel kind="artist" />}
      title={PANEL.title(row.name)}
      {...(context ? { subtitle: PANEL.forLine(context) } : {})}
      onClose={onClose}
      footerLayout="ruled"
      footer={
        // "No photo for now" is held.
        <AdminButton
          type="button"
          variant="ghost"
          onClick={onNotAnArtist}
          style={{ ...ROW_BUTTON, height: 32 }}
        >
          {COPY.notAnArtist}
        </AdminButton>
      }
    >
      {body}
    </SidePanel>
  );
};

'use client';

import { useState, type CSSProperties } from 'react';
import { Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import type {
  AdminArtistRow,
  ArtistCandidate,
  ArtistsApi,
  ArtistWrite,
} from './artists-api';
import { ReportList } from './ReportList';
import {
  KIND_TONE,
  candidateCards,
  defaultSelection,
  primaryWrite,
  showLine,
  toCheckKind,
  type CandidateCard,
  type ToCheckKind,
} from './artist-rules';
import {
  ELLIPSIS,
  PENDING,
  PHONE_BUTTON,
  PHOTO_PLACEHOLDER,
  ROW_BUTTON,
  SECONDARY_BUTTON,
  TINT_BUTTON,
  gradientBorder,
} from './artist-styles';

const COPY = ADMIN_COPY.artists;

/** The chip and the line beside it. Name-shape hints are held, so Unsure and
 * No match draw the chip alone. */
const KindLine = ({
  row,
  kind,
}: {
  row: AdminArtistRow;
  kind: ToCheckKind;
}) => {
  const reason =
    kind === 'reported'
      ? COPY.reports(row.openReportCount)
      : kind === 'check'
        ? COPY.matchedAutomatically
        : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StatusBadge kind={KIND_TONE[kind]} dot>
        {COPY.kind[kind]}
      </StatusBadge>
      {reason && (
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', ...ELLIPSIS }}>
          {reason}
        </span>
      )}
    </div>
  );
};

/** The plain tile sits behind the photo, so one that fails to load still
 * draws the tile rather than a hole. */
const Photo = ({ url }: { url: string | null }) => (
  <span
    aria-hidden
    style={{
      display: 'block',
      width: 34,
      height: 34,
      flex: 'none',
      borderRadius: '50%',
      overflow: 'hidden',
      background: PHOTO_PLACEHOLDER,
    }}
  >
    {url && (
      // A Spotify CDN photo at 34px; next/image would proxy it for nothing.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={34}
        height={34}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        style={{ display: 'block', objectFit: 'cover' }}
      />
    )}
  </span>
);

const CARD = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 10,
  minWidth: 0,
  textAlign: 'left',
  color: 'var(--fg)',
  fontFamily: 'inherit',
} as const;

const PLAIN_CARD = {
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
} as const;

const CardText = ({ title, line }: { title: string; line: string | null }) => (
  <span style={{ flex: 1, minWidth: 0 }}>
    <span
      style={{ display: 'block', fontSize: 13, fontWeight: 700, ...ELLIPSIS }}
    >
      {title}
    </span>
    {line && (
      <span
        style={{
          display: 'block',
          fontSize: 11.5,
          color: 'var(--fg-muted)',
          ...ELLIPSIS,
        }}
      >
        {line}
      </span>
    )}
  </span>
);

/**
 * The Search card's state. `pending`: it opens the artist search, which lands
 * in 4c C. The rest are the load path for a searched row, which arrives
 * without the match job's candidates.
 */
type SearchCardState = 'pending' | 'idle' | 'loading' | 'failed';

const SEARCH_LINE: Record<SearchCardState, string> = {
  pending: COPY.searchCard.line,
  idle: COPY.searchCard.showCandidates,
  loading: COPY.searchCard.loading,
  failed: COPY.searchCard.failed,
};

const Card = ({
  card,
  selected,
  disabled,
  onSelect,
  search,
  onSearch,
}: {
  card: CandidateCard;
  selected: boolean;
  disabled: boolean;
  onSelect: (candidate: ArtistCandidate) => void;
  search: SearchCardState;
  onSearch: () => void;
}) => {
  if (card.type === 'search') {
    const live = search === 'idle' || search === 'failed';
    return (
      <button
        type="button"
        disabled={!live || disabled}
        onClick={onSearch}
        style={{
          ...CARD,
          ...PLAIN_CARD,
          ...(live ? { cursor: 'pointer' } : PENDING),
        }}
      >
        <Photo url={null} />
        <CardText title={COPY.searchCard.title} line={SEARCH_LINE[search]} />
      </button>
    );
  }
  const { candidate } = card;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(candidate)}
      style={{
        ...CARD,
        cursor: disabled ? 'default' : 'pointer',
        ...(selected ? gradientBorder('var(--surface-2)') : PLAIN_CARD),
      }}
    >
      <Photo url={candidate.imageUrl} />
      {/* Genre only: place and listeners are held (4c rows 1, 2). */}
      <CardText title={candidate.name} line={candidate.genres?.[0] ?? null} />
    </button>
  );
};

/**
 * One To check row (`06/artists-to-check`, `06/artists-mobile`). Desktop draws
 * the candidates inline to pick from. On the phone, Pick opens the same
 * cards and buttons under the row until the full-screen search lands (4c C).
 */
export const ToCheckRow = ({
  row,
  api,
  isPhone,
  busy,
  onWrite,
  onNotAnArtist,
}: {
  row: AdminArtistRow;
  api: ArtistsApi;
  isPhone: boolean;
  busy: boolean;
  onWrite: (write: ArtistWrite) => void;
  onNotAnArtist: () => void;
}) => {
  const kind = toCheckKind(row);
  // A searched row comes without candidates; the Search card loads them.
  const [loaded, setLoaded] = useState<ArtistCandidate[] | null>(null);
  const [search, setSearch] = useState<SearchCardState>(
    row.candidates === null ? 'idle' : 'pending',
  );
  const cards = candidateCards(
    loaded ? { ...row, candidates: loaded } : row,
    kind,
  );
  const [selectedId, setSelectedId] = useState(() => defaultSelection(cards));
  const [picking, setPicking] = useState(false);
  const selected =
    cards
      .flatMap((card) => (card.type === 'artist' ? [card.candidate] : []))
      .find((candidate) => candidate.id === selectedId) ?? null;
  const write = primaryWrite(row, selected);
  const keeps = write !== null && write.kind !== 'use';
  const primaryLabel = keeps ? COPY.looksRight : COPY.useSelected;
  const named = (action: string) => COPY.actionFor(action, row.name);
  const show = showLine(row);

  const loadCandidates = () => {
    setSearch('loading');
    api
      .candidates(row.id)
      .then((next) => {
        const withLoaded = candidateCards({ ...row, candidates: next }, kind);
        setLoaded(next);
        setSelectedId((prev) => prev ?? defaultSelection(withLoaded));
        // The card goes on to mean "search someone else" (4c C).
        setSearch('pending');
      })
      .catch((err: unknown) => {
        console.error('[admin artists] candidates failed', row.id, err);
        setSearch('failed');
      });
  };

  const grid = (
    <div
      role="group"
      aria-label={COPY.candidates(row.name)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        minWidth: 0,
      }}
    >
      {cards.map((card) => (
        <Card
          key={card.type === 'artist' ? card.candidate.id : 'search'}
          card={card}
          selected={card.type === 'artist' && card.candidate.id === selectedId}
          disabled={busy}
          onSelect={(candidate) => setSelectedId(candidate.id)}
          search={search}
          onSearch={loadCandidates}
        />
      ))}
    </div>
  );

  const primary = (size: CSSProperties) => (
    <AdminButton
      type="button"
      disabled={busy || write === null}
      onClick={() => write && onWrite(write)}
      aria-label={named(primaryLabel)}
      style={{
        ...TINT_BUTTON,
        ...size,
        ...(write === null ? PENDING : {}),
      }}
    >
      {primaryLabel}
    </AdminButton>
  );

  const notAnArtist = (size: CSSProperties) => (
    <AdminButton
      type="button"
      variant="ghost"
      disabled={busy}
      onClick={onNotAnArtist}
      aria-label={named(COPY.notAnArtist)}
      style={size}
    >
      {COPY.notAnArtist}
    </AdminButton>
  );

  const reports = kind === 'reported' && (
    <ReportList api={api} artistId={row.id} name={row.name} />
  );

  if (isPhone) {
    const isCheck = kind === 'check';
    return (
      <li
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <KindLine row={row} kind={kind} />
        <span style={{ fontSize: 15, fontWeight: 700 }}>{row.name}</span>
        {show && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {show}
          </span>
        )}
        {reports}
        <span style={{ display: 'flex', gap: 8 }}>
          {isCheck && write ? (
            primary(PHONE_BUTTON)
          ) : (
            // Until the full-screen search (ruling 12, 4c C), Pick opens the
            // desktop row's cards and buttons under the row.
            <AdminButton
              type="button"
              aria-expanded={picking}
              onClick={() => setPicking((prev) => !prev)}
              aria-label={named(COPY.pick)}
              style={{ ...TINT_BUTTON, ...PHONE_BUTTON }}
            >
              {COPY.pick}
            </AdminButton>
          )}
          <AdminButton
            type="button"
            icon={Search}
            disabled
            aria-label={named(COPY.searchButton)}
            style={{ ...SECONDARY_BUTTON, ...PHONE_BUTTON, ...PENDING }}
          >
            {COPY.searchButton}
          </AdminButton>
        </span>
        {picking && !isCheck && (
          <>
            {grid}
            <span style={{ display: 'flex', gap: 8 }}>
              {primary(PHONE_BUTTON)}
              {notAnArtist(PHONE_BUTTON)}
            </span>
          </>
        )}
      </li>
    );
  }

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr auto',
        gap: 16,
        alignItems: 'center',
        padding: '14px 18px',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <KindLine row={row} kind={kind} />
        <div
          style={{ fontSize: 15, fontWeight: 700, marginTop: 6, ...ELLIPSIS }}
        >
          {row.name}
        </div>
        {show && (
          <div
            style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 2 }}
          >
            {show}
          </div>
        )}
        {reports && <div style={{ marginTop: 6 }}>{reports}</div>}
      </div>
      {grid}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
        }}
      >
        {primary(ROW_BUTTON)}
        {notAnArtist(ROW_BUTTON)}
      </div>
    </li>
  );
};

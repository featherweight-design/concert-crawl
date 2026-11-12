'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import type {
  AdminArtistRow,
  ArtistCandidate,
  ArtistWrite,
} from './artists-api';
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

const Photo = ({ url }: { url: string | null }) =>
  url ? (
    // A Spotify CDN photo at 34px; next/image would proxy it for nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={34}
      height={34}
      style={{ flex: 'none', borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    <span
      aria-hidden
      style={{
        width: 34,
        height: 34,
        flex: 'none',
        borderRadius: '50%',
        background: PHOTO_PLACEHOLDER,
      }}
    />
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

const Card = ({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: CandidateCard;
  selected: boolean;
  disabled: boolean;
  onSelect: (candidate: ArtistCandidate) => void;
}) => {
  if (card.type === 'search') {
    // Opens the artist search, which lands in 4c C.
    return (
      <button
        type="button"
        disabled
        style={{ ...CARD, ...PLAIN_CARD, ...PENDING }}
      >
        <Photo url={null} />
        <CardText title={COPY.searchCard.title} line={COPY.searchCard.line} />
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
 * the candidates inline to pick from; the phone draws two buttons that open
 * the search full screen (4c C).
 */
export const ToCheckRow = ({
  row,
  isPhone,
  busy,
  onWrite,
  onNotAnArtist,
}: {
  row: AdminArtistRow;
  isPhone: boolean;
  busy: boolean;
  onWrite: (write: ArtistWrite) => void;
  onNotAnArtist: () => void;
}) => {
  const kind = toCheckKind(row);
  const cards = candidateCards(row, kind);
  const [selectedId, setSelectedId] = useState(() => defaultSelection(cards));
  const selected =
    cards
      .flatMap((card) => (card.type === 'artist' ? [card.candidate] : []))
      .find((candidate) => candidate.id === selectedId) ?? null;
  const write = primaryWrite(row, selected);
  const keeps = write !== null && write.kind !== 'use';
  const show = showLine(row);

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
        <span style={{ display: 'flex', gap: 8 }}>
          {isCheck && write ? (
            <AdminButton
              type="button"
              disabled={busy}
              onClick={() => onWrite(write)}
              style={{ ...TINT_BUTTON, ...PHONE_BUTTON }}
            >
              {COPY.looksRight}
            </AdminButton>
          ) : (
            // Pick opens the artist search full screen (ruling 12, 4c C).
            <AdminButton
              type="button"
              disabled
              style={{ ...TINT_BUTTON, ...PHONE_BUTTON, ...PENDING }}
            >
              {COPY.pick}
            </AdminButton>
          )}
          <AdminButton
            type="button"
            icon={Search}
            disabled
            style={{ ...SECONDARY_BUTTON, ...PHONE_BUTTON, ...PENDING }}
          >
            {COPY.searchButton}
          </AdminButton>
        </span>
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
      </div>
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
            selected={
              card.type === 'artist' && card.candidate.id === selectedId
            }
            disabled={busy}
            onSelect={(candidate) => setSelectedId(candidate.id)}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
        }}
      >
        <AdminButton
          type="button"
          disabled={busy || write === null}
          onClick={() => write && onWrite(write)}
          style={{
            ...TINT_BUTTON,
            ...ROW_BUTTON,
            ...(write === null ? PENDING : {}),
          }}
        >
          {keeps ? COPY.looksRight : COPY.useSelected}
        </AdminButton>
        <AdminButton
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onNotAnArtist}
          style={ROW_BUTTON}
        >
          {COPY.notAnArtist}
        </AdminButton>
      </div>
    </li>
  );
};

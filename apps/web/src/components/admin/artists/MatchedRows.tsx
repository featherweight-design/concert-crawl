'use client';

import { Search, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, RowMenu } from '@/components/admin/primitives';
import type { AdminArtistRow } from './artists-api';
import { showLine } from './artist-rules';
import { ArtistPhoto } from './ArtistPhoto';
import {
  ELLIPSIS,
  PENDING,
  PHONE_BUTTON,
  ROW_BUTTON,
  SECONDARY_BUTTON,
  TINT_BUTTON,
} from './artist-styles';

const COPY = ADMIN_COPY.artists;

const DESKTOP_ROW = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '12px 18px',
  borderTop: '1px solid var(--border)',
} as const;

const PHONE_ROW = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  padding: '12px 0',
  borderBottom: '1px solid var(--border)',
} as const;

/**
 * The Matched row's ⋯ (`11/artist-row-menu`) on the shared row menu. No photo
 * is held, so it draws Change match… (opens the artist search in 4c C) and
 * Not an artist….
 */
const ArtistRowMenu = ({
  row,
  busy,
  onNotAnArtist,
}: {
  row: AdminArtistRow;
  busy: boolean;
  onNotAnArtist: () => void;
}) => (
  <RowMenu
    label={COPY.menu.label(row.name)}
    width={300}
    items={[
      {
        key: 'change',
        icon: Search,
        label: COPY.menu.changeMatch,
        hint: COPY.menu.changeMatchLine,
        disabled: true,
        onSelect: () => undefined,
      },
      {
        key: 'not-an-artist',
        icon: X,
        label: COPY.menu.notAnArtist,
        hint: COPY.menu.notAnArtistLine,
        muted: true,
        divided: true,
        disabled: busy,
        onSelect: onNotAnArtist,
      },
    ]}
  />
);

/** One Matched row (`06/artists-matched`; the phone reuses the To check row). */
export const MatchedRow = ({
  row,
  isPhone,
  busy,
  onNotAnArtist,
}: {
  row: AdminArtistRow;
  isPhone: boolean;
  busy: boolean;
  onNotAnArtist: () => void;
}) => {
  const meta = COPY.matchedMeta(row.upcomingCount, row.watchingCount);
  if (isPhone) {
    return (
      <li style={PHONE_ROW}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{row.name}</span>
        <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{meta}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {/* Change match opens the artist search (4c C). */}
          <AdminButton
            type="button"
            disabled
            aria-label={COPY.actionFor(COPY.changeMatch, row.name)}
            style={{ ...TINT_BUTTON, ...PHONE_BUTTON, ...PENDING }}
          >
            {COPY.changeMatch}
          </AdminButton>
          <AdminButton
            type="button"
            disabled={busy}
            onClick={onNotAnArtist}
            aria-label={COPY.actionFor(COPY.notAnArtist, row.name)}
            style={{ ...SECONDARY_BUTTON, ...PHONE_BUTTON }}
          >
            {COPY.notAnArtist}
          </AdminButton>
        </span>
      </li>
    );
  }
  return (
    <li style={DESKTOP_ROW}>
      <ArtistPhoto url={row.photoUrl} size={44} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 700,
            ...ELLIPSIS,
          }}
        >
          {row.name}
        </span>
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', width: 170 }}>
        {meta}
      </span>
      <ArtistRowMenu row={row} busy={busy} onNotAnArtist={onNotAnArtist} />
    </li>
  );
};

/** One Not artists row (`06/artists-not-artists`). */
export const NotArtistRow = ({
  row,
  isPhone,
  busy,
  onItsAnArtist,
}: {
  row: AdminArtistRow;
  isPhone: boolean;
  busy: boolean;
  onItsAnArtist: () => void;
}) => {
  const show = showLine(row);
  const button = (
    <AdminButton
      type="button"
      disabled={busy}
      onClick={onItsAnArtist}
      aria-label={COPY.actionFor(COPY.itsAnArtist, row.name)}
      style={{
        ...SECONDARY_BUTTON,
        ...(isPhone ? PHONE_BUTTON : ROW_BUTTON),
      }}
    >
      {COPY.itsAnArtist}
    </AdminButton>
  );
  if (isPhone) {
    return (
      <li style={PHONE_ROW}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{row.name}</span>
        {show && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {show}
          </span>
        )}
        <span style={{ display: 'flex' }}>{button}</span>
      </li>
    );
  }
  return (
    <li style={DESKTOP_ROW}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 700,
            ...ELLIPSIS,
          }}
        >
          {row.name}
        </span>
        {show && (
          <span
            style={{
              display: 'block',
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {show}
          </span>
        )}
      </span>
      {button}
    </li>
  );
};

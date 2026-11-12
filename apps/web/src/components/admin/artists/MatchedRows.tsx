'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Search, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';
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

const MenuItem = ({
  icon,
  title,
  line,
  muted,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  muted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onClick}
    style={{
      display: 'flex',
      gap: 12,
      width: '100%',
      padding: '9px 12px',
      borderRadius: 10,
      border: 'none',
      background: 'transparent',
      textAlign: 'left',
      fontFamily: 'inherit',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...(disabled ? PENDING : {}),
    }}
  >
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        flex: 'none',
        borderRadius: 8,
        background: 'var(--surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </span>
    <span>
      <span
        style={{
          display: 'block',
          fontSize: 13.5,
          fontWeight: 600,
          color: muted ? 'var(--fg-muted)' : 'var(--fg)',
        }}
      >
        {title}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--fg-muted)',
          marginTop: 2,
        }}
      >
        {line}
      </span>
    </span>
  </button>
);

/**
 * The Matched row's ⋯ (`11/artist-row-menu`), on the EventRowMenu pattern.
 * No photo is held, so the menu draws Change match and Not an artist.
 */
const ArtistRowMenu = ({
  row,
  onNotAnArtist,
}: {
  row: AdminArtistRow;
  onNotAnArtist: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
      ?.focus();
    const handleClick = (evt: MouseEvent) => {
      if (
        evt.target instanceof Node &&
        !containerRef.current?.contains(evt.target)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        aria-label={COPY.menu.label(row.name)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          border: 'none',
          background: open ? 'var(--surface-2)' : 'transparent',
          cursor: 'pointer',
          padding: 7,
          borderRadius: 7,
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          display: 'inline-flex',
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={COPY.menu.label(row.name)}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 50,
            width: 300,
            padding: 6,
            borderRadius: 14,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Change match opens the artist search (4c C). */}
          <MenuItem
            icon={<Search size={14} color="var(--signal)" />}
            title={COPY.menu.changeMatch}
            line={COPY.menu.changeMatchLine}
            disabled
            onClick={() => undefined}
          />
          <div
            role="separator"
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '6px 8px',
            }}
          />
          <MenuItem
            icon={<X size={14} color="var(--fg-muted)" />}
            title={COPY.menu.notAnArtist}
            line={COPY.menu.notAnArtistLine}
            muted
            onClick={() => {
              setOpen(false);
              onNotAnArtist();
            }}
          />
        </div>
      )}
    </div>
  );
};

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
      <ArtistRowMenu row={row} onNotAnArtist={onNotAnArtist} />
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

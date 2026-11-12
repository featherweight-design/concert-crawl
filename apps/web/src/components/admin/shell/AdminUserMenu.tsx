'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { ChevronDown, ExternalLink, LogOut, Sun } from 'lucide-react';
import { BottomSheet } from '@/components/pwa/BottomSheet';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { adminEnvironment } from '@/lib/admin/environment';
import { THEME_META } from '@/theme/themes';
import { useAdminTheme } from './AdminThemeProvider';
import {
  AdminAvatar,
  displayNameFor,
  type AdminShellUser,
} from './AdminAvatar';

const copy = ADMIN_COPY.shell.userMenu;

const monoLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: '0.14em',
  fontWeight: 500,
  color: 'var(--fg-subtle)',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  textDecoration: 'none',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

const RowIcon = ({ children }: { children: React.ReactNode }) => (
  <span
    style={{
      width: 28,
      height: 28,
      flex: 'none',
      borderRadius: 8,
      background: 'var(--surface-2)',
      color: 'var(--signal)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </span>
);

const RowText = ({
  title,
  hint,
  tone = 'var(--fg)',
}: {
  title: string;
  hint: string;
  tone?: string;
}) => (
  <span style={{ display: 'block' }}>
    <span
      style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: tone }}
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
      {hint}
    </span>
  </span>
);

/** The three lines drawn in `07/user-menu-desktop` and `07/user-menu-mobile`. */
const UserMenuRows = ({ variant }: { variant: 'desktop' | 'phone' }) => {
  const { signOut } = useClerk();
  const { theme } = useAdminTheme();
  return (
    <div
      data-testid="admin-user-menu"
      style={{
        borderRadius: 14,
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-elevated)',
        padding: 6,
        boxShadow: variant === 'desktop' ? 'var(--shadow-lg)' : 'none',
      }}
    >
      <Link href="/events" style={rowStyle}>
        <RowIcon>
          <ExternalLink size={15} aria-hidden />
        </RowIcon>
        <RowText title={copy.openApp} hint={copy.openAppHint} />
      </Link>
      <div style={{ ...rowStyle, cursor: 'default' }}>
        <RowIcon>
          <Sun size={15} aria-hidden />
        </RowIcon>
        <RowText
          title={copy.theme}
          hint={copy.themeHint(THEME_META[theme].label)}
        />
      </div>
      <div
        style={{ height: 1, background: 'var(--border)', margin: '6px 8px' }}
      />
      <button
        type="button"
        style={rowStyle}
        onClick={() => void signOut({ redirectUrl: '/' })}
      >
        <RowIcon>
          <LogOut size={15} aria-hidden />
        </RowIcon>
        <RowText
          title={copy.signOut}
          hint={copy.signOutHint}
          tone={variant === 'phone' ? 'var(--warning)' : 'var(--fg)'}
        />
      </button>
    </div>
  );
};

/** The sidebar's user card, which opens the menu above it on desktop. */
export const SidebarUserMenu = ({ user }: { user: AdminShellUser }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 'calc(100% + 8px)',
            width: 330,
            zIndex: 50,
          }}
        >
          <UserMenuRows variant="desktop" />
        </div>
      )}
      <button
        type="button"
        data-testid="admin-user-menu-trigger"
        aria-expanded={open}
        aria-label={copy.trigger}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: 10,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          color: 'var(--fg)',
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <AdminAvatar user={user} size={30} />
        <span style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <span
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayNameFor(user)}
          </span>
          <span style={monoLabel}>{copy.role}</span>
        </span>
        <ChevronDown size={16} color="var(--fg-muted)" aria-hidden />
      </button>
    </div>
  );
};

/** The avatar in the phone header, which opens the menu as a sheet. */
export const PhoneUserMenu = ({ user }: { user: AdminShellUser }) => {
  const [open, setOpen] = useState(false);
  const environment = ADMIN_COPY.shell.environmentShort[adminEnvironment()];
  return (
    <>
      <button
        type="button"
        data-testid="admin-user-menu-trigger"
        aria-label={copy.trigger}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          padding: 0,
          border: 'none',
          background: 'transparent',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
        }}
      >
        <AdminAvatar user={user} size={32} />
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={copy.trigger}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AdminAvatar user={user} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {displayNameFor(user)}
              </div>
              <span style={{ ...monoLabel, fontWeight: 600 }}>
                {copy.roleIn(environment)}
              </span>
            </div>
          </div>
          <UserMenuRows variant="phone" />
        </div>
      </BottomSheet>
    </>
  );
};

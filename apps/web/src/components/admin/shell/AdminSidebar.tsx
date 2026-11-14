'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CCMark } from '@/components/brand/cc-mark';
import { BRAND_COPY } from '@/components/brand/definitions/copy';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  NAV,
  NAV_GROUPS,
  activeNavKey,
  badgeCountFor,
  type AdminBadgeCounts,
  type NavGroup,
  type NavItem,
} from './nav';
import { SidebarUserMenu } from './AdminUserMenu';
import type { AdminShellUser } from './AdminAvatar';
import { SIDEBAR_WIDTH } from './content-pane';

export { SIDEBAR_WIDTH };

const GROUP_LABELS: Record<NavGroup, string | null> = {
  primary: null,
  manage: ADMIN_COPY.shell.nav.groups.manage,
  system: ADMIN_COPY.shell.nav.groups.system,
};

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 600,
};

export const NeedsYouBadge = ({ count }: { count: number }) => (
  <>
    <span className="sr-only">
      {ADMIN_COPY.shell.nav.badgeAriaLabel(count)}
    </span>
    <span
      aria-hidden
      data-testid="admin-needs-you-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 20,
        height: 20,
        padding: '0 6px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        background: 'var(--accent)',
        color: 'var(--fg-on-accent)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  </>
);

const SidebarLink = ({
  item,
  active,
  count,
}: {
  item: NavItem;
  active: boolean;
  count: number;
}) => {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className="admin-sidebar-link"
      data-active={active || undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        height: 38,
        padding: '0 12px',
        borderRadius: 9,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        textDecoration: 'none',
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        background: active ? 'var(--surface-2)' : undefined,
      }}
    >
      {active && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 9,
            bottom: 9,
            width: 2,
            borderRadius: 2,
            background: 'var(--signal)',
          }}
        />
      )}
      <span
        style={{
          display: 'flex',
          color: active ? 'var(--signal)' : 'var(--fg-muted)',
        }}
      >
        <Icon size={18} aria-hidden />
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {count > 0 && <NeedsYouBadge count={count} />}
    </Link>
  );
};

export const AdminSidebar = ({
  badgeCounts,
  user,
}: {
  badgeCounts?: AdminBadgeCounts;
  user: AdminShellUser;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeKey = activeNavKey(pathname, searchParams);

  return (
    <aside
      data-testid="admin-sidebar"
      style={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '18px 14px 8px',
        }}
      >
        <span
          style={{
            display: 'flex',
            borderRadius: 7,
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <CCMark size={28} />
        </span>
        <span style={{ lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              whiteSpace: 'nowrap',
            }}
          >
            {BRAND_COPY.wordmark.lead}
            <span style={{ color: 'var(--accent)' }}>
              {BRAND_COPY.wordmark.accent}
            </span>
          </span>
          <span
            style={{
              ...mono,
              display: 'block',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
            }}
          >
            {ADMIN_COPY.shell.brand.admin}
          </span>
        </span>
      </div>

      <nav
        aria-label={ADMIN_COPY.shell.nav.ariaLabel}
        style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}
      >
        {NAV_GROUPS.map((group) => {
          const label = GROUP_LABELS[group];
          return (
            <Fragment key={group}>
              {label && (
                <div style={{ padding: '18px 12px 8px' }}>
                  <span
                    style={{
                      ...mono,
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    {label}
                  </span>
                </div>
              )}
              {NAV.filter((item) => item.group === group).map((item) => (
                <SidebarLink
                  key={item.key}
                  item={item}
                  active={item.key === activeKey}
                  count={badgeCountFor(item.key, badgeCounts)}
                />
              ))}
            </Fragment>
          );
        })}
      </nav>

      <div style={{ padding: '8px 12px 14px' }}>
        <SidebarUserMenu user={user} />
      </div>
    </aside>
  );
};

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  MORE_HREF,
  TAB_BAR,
  activeTabKey,
  badgeCountFor,
  navItem,
  type AdminBadgeCounts,
} from './nav';
import { NeedsYouBadge } from './AdminSidebar';
import { TAB_BAR_HEIGHT } from './tab-bar-height';

export { TAB_BAR_HEIGHT };

/** The phone's 4-tab bar: Needs you, Venues, Events, More. */
export const MobileBottomBar = ({
  badgeCounts,
}: {
  badgeCounts?: AdminBadgeCounts;
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeKey = activeTabKey(pathname, searchParams);

  return (
    <nav
      aria-label={ADMIN_COPY.shell.tabBar.ariaLabel}
      data-testid="admin-tab-bar"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        // The home indicator in a standalone PWA sits below the labels.
        height: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxSizing: 'border-box',
        display: 'flex',
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        zIndex: 40,
      }}
    >
      {TAB_BAR.map((key) => {
        const item = key === 'more' ? null : navItem(key);
        const Icon = item ? item.icon : MoreHorizontal;
        const label = item ? item.label : ADMIN_COPY.shell.tabBar.more;
        const href = item ? item.href : MORE_HREF;
        const active = key === activeKey;
        const count = key === 'more' ? 0 : badgeCountFor(key, badgeCounts);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              paddingTop: 10,
              textDecoration: 'none',
              color: active ? 'var(--signal)' : 'var(--fg-subtle)',
            }}
          >
            {active && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 0,
                  width: 28,
                  height: 2,
                  borderRadius: 2,
                  background: 'var(--signal)',
                }}
              />
            )}
            {count > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 5,
                  left: 'calc(50% + 6px)',
                }}
              >
                <NeedsYouBadge count={count} />
              </span>
            )}
            <Icon size={22} aria-hidden />
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

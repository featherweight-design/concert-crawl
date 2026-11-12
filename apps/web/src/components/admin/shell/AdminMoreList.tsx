'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { ChevronRight, ExternalLink, LogOut } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { NAV, type NavGroup, type NavKey } from './nav';

/** What each More row says under its name. Missing numbers fall back to words. */
export interface AdminMoreDetails {
  failingVenues: number | null;
  artistsToCheck: number | null;
  missingPrices: number | null;
  featureFlags: number | null;
  feedbackToRead: number | null;
  /** Mountain Time, already formatted, e.g. "3:00 AM". */
  lastCrawlAt: string | null;
}

const details = ADMIN_COPY.shell.more.details;

const detailFor = (key: NavKey, data: AdminMoreDetails): string => {
  switch (key) {
    case 'health':
      return details.health;
    case 'artists':
      return data.artistsToCheck === null
        ? ADMIN_COPY.shell.nav.artists
        : details.artists(data.artistsToCheck);
    case 'prices':
      return data.missingPrices === null
        ? ADMIN_COPY.shell.nav.prices
        : details.prices(data.missingPrices);
    case 'people':
      return details.people;
    case 'feature-flags':
      return data.featureFlags === null
        ? ADMIN_COPY.shell.nav.featureFlags
        : details.featureFlags(data.featureFlags);
    case 'invite-codes':
      return details.inviteCodes;
    case 'crawl-runs':
      return data.lastCrawlAt === null
        ? details.crawlRunsNever
        : details.crawlRuns(data.lastCrawlAt);
    case 'operations':
      return details.operations;
    default:
      return '';
  }
};

/** Plain counts, never badges: only Needs you carries a badge (rule 1). */
const countFor = (key: NavKey, data: AdminMoreDetails): number => {
  if (key === 'health') return data.failingVenues ?? 0;
  if (key === 'operations') return data.feedbackToRead ?? 0;
  return 0;
};

const MORE_GROUPS: Array<Exclude<NavGroup, 'primary'>> = ['manage', 'system'];

/**
 * Everything the tab bar leaves out. Health joins Manage here because the
 * tab bar has no room for it (`07/more-mobile`).
 */
const itemsFor = (group: Exclude<NavGroup, 'primary'>) => {
  const tabbed: NavKey[] = ['needs-you', 'venues', 'events'];
  const items = NAV.filter(
    (item) => item.group === group && !tabbed.includes(item.key),
  );
  if (group !== 'manage') return items;
  const health = NAV.filter((item) => item.key === 'health');
  return [...health, ...items];
};

const actionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 42,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  font: 'inherit',
  cursor: 'pointer',
};

export const AdminMoreList = ({ data }: { data: AdminMoreDetails }) => {
  const { signOut } = useClerk();
  return (
    <div data-testid="admin-more">
      {MORE_GROUPS.map((group) => (
        <Fragment key={group}>
          <div
            style={{ padding: group === 'manage' ? '4px 0 6px' : '24px 0 6px' }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.16em',
                fontWeight: 600,
                color: 'var(--fg-subtle)',
              }}
            >
              {ADMIN_COPY.shell.nav.groups[group]}
            </span>
          </div>
          {itemsFor(group).map((item) => {
            const Icon = item.icon;
            const count = countFor(item.key, data);
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  color: 'var(--fg)',
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flex: 'none',
                    borderRadius: 10,
                    background: 'var(--surface-2)',
                    color: 'var(--signal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} aria-hidden />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{ display: 'block', fontSize: 15, fontWeight: 600 }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--fg-muted)',
                      marginTop: 2,
                    }}
                  >
                    {detailFor(item.key, data)}
                  </span>
                </span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <span aria-hidden>{count}</span>
                    <span className="sr-only">
                      {ADMIN_COPY.shell.more.countAriaLabel(count)}
                    </span>
                  </span>
                )}
                <ChevronRight size={16} color="var(--fg-subtle)" aria-hidden />
              </Link>
            );
          })}
        </Fragment>
      ))}
      <div style={{ display: 'flex', gap: 8, padding: '16px 0' }}>
        <Link
          href="/events"
          style={{
            ...actionStyle,
            flex: 1,
            minWidth: 0,
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <ExternalLink size={16} aria-hidden />
          {ADMIN_COPY.shell.userMenu.openApp}
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: '/' })}
          style={{
            ...actionStyle,
            background: 'transparent',
            color: 'var(--fg-muted)',
            border: '1px solid transparent',
          }}
        >
          <LogOut size={16} aria-hidden />
          {ADMIN_COPY.shell.userMenu.signOut}
        </button>
      </div>
    </div>
  );
};

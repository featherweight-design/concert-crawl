'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import {
  ChevronRight,
  ExternalLink,
  LogOut,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { NAV, TAB_BAR, type NavGroup, type NavKey } from './nav';

/**
 * What each More row says under its name (#178 item 7): a count as plain
 * text, never a pill, and the row's description when the count is zero or
 * unknown. Only Needs you carries a badge.
 */
export interface AdminMoreDetails {
  /** The Artists review list: no Spotify match or a suspect one. */
  artistsToCheck: number | null;
  missingPrices: number | null;
  featureFlags: number | null;
  feedbackToRead: number | null;
  /** The latest daily crawl's start, already formatted in Mountain Time. */
  lastCrawl: string | null;
}

const details = ADMIN_COPY.shell.more.details;

const counted = (
  count: number | null,
  line: (n: number) => string,
  fallback: string,
): string => (count !== null && count > 0 ? line(count) : fallback);

const detailFor = (key: NavKey, data: AdminMoreDetails): string => {
  switch (key) {
    case 'health':
      // "N site checks failing" needs the site-check source 1c is waiting on;
      // until then the row reads its description, as #178 draws for zero.
      return details.health;
    case 'artists':
      return counted(
        data.artistsToCheck,
        details.artists,
        ADMIN_COPY.shell.nav.artists,
      );
    case 'prices':
      return counted(
        data.missingPrices,
        details.prices,
        ADMIN_COPY.shell.nav.prices,
      );
    case 'people':
      return details.people;
    case 'invite-codes':
      return '';
    case 'feature-flags':
      return counted(
        data.featureFlags,
        details.featureFlags,
        ADMIN_COPY.shell.nav.featureFlags,
      );
    case 'crawl-runs':
      return data.lastCrawl === null ? '' : details.crawlRuns(data.lastCrawl);
    case 'operations':
      return counted(
        data.feedbackToRead,
        details.operations,
        details.operationsDescription,
      );
    case 'needs-you':
    case 'venues':
    case 'events':
      // On the tab bar, so never a More row.
      return '';
  }
};

const MORE_GROUPS: Array<Exclude<NavGroup, 'primary'>> = ['manage', 'system'];

/**
 * Everything the tab bar leaves out. Health joins Manage here because the
 * tab bar has no room for it (`07/more-mobile`).
 */
const itemsFor = (group: Exclude<NavGroup, 'primary'>) => {
  // The interim Invite codes row is drawn only in the sidebar (#178 item 8);
  // the More board has no such row, so phones reach it by URL until 5b.
  const items = NAV.filter(
    (item) =>
      item.group === group &&
      !TAB_BAR.includes(item.key) &&
      item.key !== 'invite-codes',
  );
  if (group !== 'manage') return items;
  const health = NAV.filter((item) => item.key === 'health');
  return [...health, ...items];
};

interface MoreRow {
  key: string;
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
}

/**
 * The robots.txt audit lost its button with the old Venues page, and nothing
 * else links it. It joins System as an interim row, drawn as
 * `08/more-interim-m` draws one: the same row, no badge.
 */
const ROBOTS_AUDIT_ROW: MoreRow = {
  key: 'robots-audit',
  label: ADMIN_COPY.shell.more.robotsAudit.title,
  detail: ADMIN_COPY.shell.more.robotsAudit.detail,
  href: '/admin/venues/robots-audit',
  icon: ShieldCheck,
};

const rowsFor = (
  group: Exclude<NavGroup, 'primary'>,
  data: AdminMoreDetails,
): MoreRow[] => {
  const rows = itemsFor(group).map((item) => ({
    key: item.key,
    label: item.label,
    detail: detailFor(item.key, data),
    href: item.href,
    icon: item.icon,
  }));
  return group === 'system' ? [...rows, ROBOTS_AUDIT_ROW] : rows;
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
          {rowsFor(group, data).map((item) => {
            const Icon = item.icon;
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
                    {item.detail}
                  </span>
                </span>
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

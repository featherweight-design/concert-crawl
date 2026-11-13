'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { buildBreadcrumbs, type Crumb } from './breadcrumbs';
import { usePageTitle } from './PageTitleContext';
import { EnvironmentBadge } from './EnvironmentBadge';
import { PhoneUserMenu } from './AdminUserMenu';
import type { AdminShellUser } from './AdminAvatar';

const useCrumbs = (): Crumb[] => {
  const { pageTitle, pageTrail } = usePageTitle();
  const crumbs = buildBreadcrumbs(usePathname(), useSearchParams());
  if (pageTrail && pageTrail.length > 0 && crumbs.length > 1) {
    return [...crumbs.slice(0, 1), ...pageTrail];
  }
  if (pageTitle && crumbs.length > 1) {
    return [...crumbs.slice(0, -1), { label: pageTitle }];
  }
  return crumbs;
};

/** Desktop: where you are, and which admin you're in. */
export const AdminTopbar = () => {
  const crumbs = useCrumbs();
  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 28px',
        borderBottom: '1px solid var(--border)',
        fontSize: 13.5,
      }}
    >
      <nav
        aria-label={ADMIN_COPY.shell.topbar.breadcrumbAriaLabel}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {crumbs.map((crumb, index) => (
          <span
            // A trail can repeat a label (a venue named "Runs").
            key={`${index}:${crumb.label}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {index > 0 && (
              <span
                aria-hidden
                style={{ color: 'var(--fg-subtle)', margin: '0 6px' }}
              >
                /
              </span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                style={{
                  color: 'var(--fg-muted)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                style={{
                  color: 'var(--fg)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <EnvironmentBadge />
    </header>
  );
};

/** Phone: the page title and your avatar, which opens the user menu. */
export const AdminPhoneHeader = ({ user }: { user: AdminShellUser }) => {
  const crumbs = useCrumbs();
  const title = crumbs[crumbs.length - 1]?.label ?? '';
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 16px 12px',
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <PhoneUserMenu user={user} />
    </header>
  );
};

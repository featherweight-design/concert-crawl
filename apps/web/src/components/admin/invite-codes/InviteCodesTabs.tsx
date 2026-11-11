import Link from 'next/link';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const copy = ADMIN_COPY.inviteCodes.poster.tabs;

const TABS = [
  { key: 'codes', label: copy.codes, href: '/admin/invite-codes' },
  { key: 'posters', label: copy.posters, href: '/admin/invite-codes/posters' },
] as const;

/** Codes and Posters, the invite-codes admin's two pages, as underline tabs. */
export function InviteCodesTabs({ active }: { active: 'codes' | 'posters' }) {
  return (
    <nav aria-label={copy.label} style={{ display: 'flex', gap: 22 }}>
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            prefetch={false}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 44,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
              borderBottom: `2px solid ${on ? 'var(--signal)' : 'transparent'}`,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

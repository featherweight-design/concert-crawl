import Link from 'next/link';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { INVITE_CODES_HREF, postersHref } from '@/lib/poster/posters-href';

const COPY = ADMIN_COPY.codesPage;

export interface PeopleTabCounts {
  people: number | null;
  codes: number | null;
  posters: number | null;
}

/** A tab's count: 12px beside a desktop tab, 11px in a phone segment. */
const Count = ({ value, phone }: { value: number | null; phone: boolean }) =>
  value == null ? null : (
    <span
      style={{
        fontSize: phone ? 11 : 12,
        color: 'var(--fg-subtle)',
        marginLeft: phone ? 5 : 6,
      }}
    >
      {value}
    </span>
  );

/**
 * People, Invite codes, Posters (`07/people`, `07/invite-codes`): underline
 * tabs, or the phone's segments.
 */
export const PeopleTabs = ({
  active,
  isPhone,
  counts,
}: {
  active: 'people' | 'codes' | 'posters';
  isPhone: boolean;
  counts: PeopleTabCounts;
}) => {
  const tabs = [
    {
      key: 'people',
      href: '/admin/people',
      label: COPY.tabs.people,
      count: counts.people,
    },
    {
      key: 'codes',
      href: INVITE_CODES_HREF,
      label: isPhone ? COPY.tabs.codesShort : COPY.tabs.codes,
      count: counts.codes,
    },
    {
      key: 'posters',
      href: postersHref(),
      label: COPY.tabs.posters,
      count: counts.posters,
    },
  ];
  return (
    <nav
      aria-label={COPY.tabs.label}
      style={
        isPhone
          ? {
              display: 'flex',
              padding: 3,
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }
          : { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }
      }
    >
      {tabs.map((tab) => {
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
              justifyContent: 'center',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textDecoration: 'none',
              color: on ? 'var(--fg)' : 'var(--fg-muted)',
              ...(isPhone
                ? {
                    flex: 1,
                    height: 32,
                    borderRadius: 7,
                    fontSize: 12.5,
                    background: on ? 'var(--bg-elevated)' : 'transparent',
                  }
                : {
                    height: 40,
                    padding: '0 14px',
                    fontSize: 14,
                    borderBottom: `2px solid ${on ? 'var(--signal)' : 'transparent'}`,
                  }),
            }}
          >
            {tab.label}
            <Count value={tab.count} phone={isPhone} />
          </Link>
        );
      })}
    </nav>
  );
};

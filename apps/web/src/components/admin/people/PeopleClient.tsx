'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ChevronRight, Search, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  Pagination,
  StatusBadge,
  useIsPhone,
} from '@/components/admin/primitives';
import { codesApi, type ListedInviteCode } from '../invite-codes/codes-api';
import { countPosters } from '../invite-codes/code-rules';
import { PeopleTabs } from './PeopleTabs';
import { PeopleRowsSkeleton } from './PeopleSkeleton';
import { peopleApi, type AdminPerson, type PeoplePage } from './people-api';
import {
  CHIPS,
  PAGE_SIZE,
  ROLE_KIND,
  chipCount,
  codeNameFor,
  fetchPeople,
  joinedLabel,
  lastActiveLabel,
  personHref,
  type Chip,
} from './people-rules';

const COPY = ADMIN_COPY.peoplePage;
const MONO_HEAD: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  color: 'var(--fg-subtle)',
};
const CELL: CSSProperties = {
  minWidth: 0,
  fontSize: 12.5,
  color: 'var(--fg-muted)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};
/** `07/people`'s columns: PERSON flex 1.4, ROLE 120, JOINED flex 1, … */
const COLUMN: Record<keyof typeof COPY.columns, CSSProperties> = {
  person: { flex: 1.4, minWidth: 0 },
  role: { width: 120, flex: 'none', minWidth: 0 },
  joined: { flex: 1, minWidth: 0 },
  lastActive: { width: 110, flex: 'none' },
  watching: { width: 80, flex: 'none' },
};
const COLUMN_KEYS = [
  'person',
  'role',
  'joined',
  'lastActive',
  'watching',
] as const;
const CHEVRON_COLUMN: CSSProperties = {
  width: 20,
  flex: 'none',
  display: 'flex',
  color: 'var(--fg-subtle)',
};

const SEARCH_DEBOUNCE_MS = 250;

const chipLabel = (chip: Chip, isPhone: boolean): string =>
  chip === 'test' && isPhone ? COPY.chips.testShort : COPY.chips[chip];

/** A filter chip as `07/people` draws it; the chosen one has the gradient edge. */
const chipStyle = (on: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  height: 32,
  padding: '0 12px',
  flex: 'none',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
});

const ChipCount = ({ value, on }: { value: number | null; on: boolean }) =>
  value == null ? null : (
    <span
      style={{
        fontSize: 11.5,
        color: on ? 'var(--fg-muted)' : 'var(--fg-subtle)',
      }}
    >
      {value}
    </span>
  );

/** The initial in a signal ring, as the code panel draws a joiner. */
export const Avatar = ({
  handle,
  size,
  initialSize,
}: {
  handle: string | null;
  size: number;
  /** The initial's size; the person page's 56px head draws it at 22. */
  initialSize?: number;
}) => (
  <span
    aria-hidden
    style={{
      width: size,
      height: size,
      flex: 'none',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: initialSize ?? (size > 32 ? 15 : 13),
      color: 'var(--signal)',
      background:
        'linear-gradient(135deg, color-mix(in srgb, var(--signal) 30%, transparent), color-mix(in srgb, var(--accent) 30%, transparent))',
      border: '1.5px solid color-mix(in srgb, var(--signal) 70%, transparent)',
    }}
  >
    {(handle ?? '?').charAt(0).toUpperCase()}
  </span>
);

/** The handle, and the TEST tag on a test account. */
const Handle = ({ person }: { person: AdminPerson }) => (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      minWidth: 0,
      fontSize: 13.5,
      fontWeight: 700,
      color: 'var(--fg)',
    }}
  >
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {person.handle
        ? `@${person.handle}`
        : ADMIN_COPY.codesPage.panel.noHandle}
    </span>
    {person.isTestAccount && (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flex: 'none',
          height: 18,
          marginLeft: 6,
          padding: '0 7px',
          borderRadius: 5,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: '.12em',
          lineHeight: 1,
          color: 'var(--warning)',
          border:
            '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
        }}
      >
        {COPY.testTag}
      </span>
    )}
  </span>
);

const RoleChip = ({ person }: { person: AdminPerson }) => (
  <StatusBadge kind={ROLE_KIND[person.role]} dot>
    {COPY.roles[person.role]}
  </StatusBadge>
);

const ROW_LINK: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  color: 'var(--fg)',
  textDecoration: 'none',
};

/**
 * 5a People (`07/people`, `07/people-mobile`): search, role chips and the
 * list. A row opens the person.
 */
export function PeopleClient({ code }: { code: string | null }) {
  const { getToken } = useAuth();
  const router = useRouter();
  const isPhone = useIsPhone();
  const api = useMemo(() => peopleApi(getToken), [getToken]);
  const codes = useMemo(() => codesApi(getToken), [getToken]);
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<Chip>('everyone');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PeoplePage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allCodes, setAllCodes] = useState<ListedInviteCode[] | null>(null);
  // Only the newest request may draw; a slow older one is dropped.
  const latest = useRef(0);

  useEffect(() => {
    const wait = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(wait);
  }, [typed]);

  const load = useCallback(async () => {
    latest.current += 1;
    const ticket = latest.current;
    setFailed(false);
    setLoading(true);
    try {
      const next = await fetchPeople(api, { search, chip, code }, page);
      if (ticket === latest.current) setResult(next);
    } catch {
      if (ticket === latest.current) setFailed(true);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [api, search, chip, code, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    codes
      .list()
      .then(setAllCodes)
      // The tab counts and the code's name are niceties; the list stands without them.
      .catch(() => undefined);
  }, [codes]);

  const pickChip = (next: Chip) => {
    setChip(next);
    setPage(1);
  };
  const clearCode = () => {
    setPage(1);
    router.replace('/admin/people');
  };
  const clearFilters = () => {
    setTyped('');
    setSearch('');
    pickChip('everyone');
    if (code) clearCode();
  };

  const now = new Date();
  const codeName = code ? codeNameFor(code, allCodes) : null;

  const searchBox = (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        width: isPhone ? '100%' : 260,
        flex: 'none',
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        color: 'var(--fg-subtle)',
      }}
    >
      <Search size={14} aria-hidden />
      <input
        type="search"
        value={typed}
        onChange={(evt) => setTyped(evt.target.value)}
        placeholder={COPY.search}
        aria-label={COPY.search}
        // The API takes up to 100 characters.
        maxLength={100}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--fg)',
        }}
      />
    </label>
  );

  const chips = (
    <div
      role="group"
      aria-label={COPY.chips.label}
      style={{
        display: 'flex',
        gap: 8,
        // The phone's chips scroll sideways (A3 5a #7); desktop wraps.
        ...(isPhone
          ? { overflowX: 'auto', scrollbarWidth: 'none' }
          : { flexWrap: 'wrap' }),
      }}
    >
      {code && (
        <button
          type="button"
          onClick={clearCode}
          aria-label={`${COPY.codeChip(codeName)}. ${COPY.clearCode}`}
          style={chipStyle(true)}
        >
          {COPY.codeChip(codeName)}
          <X size={13} aria-hidden />
        </button>
      )}
      {CHIPS.map((each) => (
        <button
          key={each}
          type="button"
          aria-pressed={chip === each}
          onClick={() => pickChip(each)}
          style={chipStyle(chip === each)}
        >
          {chipLabel(each, isPhone)}
          <ChipCount
            value={chipCount(each, result?.counts)}
            on={chip === each}
          />
        </button>
      ))}
    </div>
  );

  let body;
  if (failed) {
    body = <CouldntLoad page={COPY.title} onRetry={() => void load()} />;
  } else if (result == null) {
    body = <PeopleRowsSkeleton />;
  } else if (result.people.length === 0) {
    body = (
      <EmptyState
        title={COPY.noResults.title}
        body={COPY.noResults.body}
        action={
          <AdminButton
            type="button"
            variant="outline"
            onClick={clearFilters}
            style={{ background: 'var(--surface-2)' }}
          >
            {COPY.noResults.clear}
          </AdminButton>
        }
      />
    );
  } else if (isPhone) {
    body = (
      <ul
        aria-label={COPY.title}
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {result.people.map((person) => {
          const active = lastActiveLabel(person.lastActiveAt, now);
          return (
            <li
              key={person.id}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <Link
                href={personHref(person.id)}
                prefetch={false}
                style={{ ...ROW_LINK, padding: '12px 0' }}
              >
                <Avatar handle={person.handle} size={38} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <Handle person={person} />
                  {active && (
                    <span
                      style={{
                        ...CELL,
                        display: 'block',
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {COPY.active.phone(active)}
                    </span>
                  )}
                </span>
                <RoleChip person={person} />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  } else {
    body = (
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--surface-1)',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{ display: 'flex', gap: 12, padding: '12px 18px' }}
        >
          {COLUMN_KEYS.map((key) => (
            <span key={key} style={{ ...COLUMN[key], ...MONO_HEAD }}>
              {COPY.columns[key]}
            </span>
          ))}
          <span style={CHEVRON_COLUMN} />
        </div>
        <ul
          aria-label={COPY.title}
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
        >
          {result.people.map((person) => (
            <li
              key={person.id}
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <Link
                href={personHref(person.id)}
                prefetch={false}
                style={{ ...ROW_LINK, padding: '10px 18px' }}
              >
                <span
                  style={{
                    ...COLUMN.person,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Avatar handle={person.handle} size={32} />
                  <Handle person={person} />
                </span>
                <span style={COLUMN.role}>
                  <RoleChip person={person} />
                </span>
                <span style={{ ...CELL, ...COLUMN.joined }}>
                  {joinedLabel(person)}
                </span>
                <span style={{ ...CELL, ...COLUMN.lastActive }}>
                  {lastActiveLabel(person.lastActiveAt, now)}
                </span>
                <span style={{ ...CELL, ...COLUMN.watching }}>
                  {/* Blank when they're Watching nothing. */}
                  {person.watching > 0 ? person.watching : null}
                </span>
                <span aria-hidden style={CHEVRON_COLUMN}>
                  <ChevronRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            fontSize: 12.5,
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.footer(result.people.length, result.total)}
          {result.truncated && <div>{COPY.truncated}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 10 : 16,
      }}
    >
      {/* On the phone the shell's top bar carries the title; the board's
          count line sits right under it. */}
      {isPhone ? (
        <p
          style={{
            margin: '-10px 0 0',
            fontSize: 12.5,
            color: 'var(--fg-muted)',
          }}
        >
          {result ? COPY.phoneSubtitle(result.counts['total'] ?? 0) : null}
        </p>
      ) : (
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {COPY.title}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13.5,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.subtitle}
          </p>
        </div>
      )}
      <PeopleTabs
        active="people"
        isPhone={isPhone}
        counts={{
          people: result?.counts['total'] ?? null,
          codes: allCodes?.length ?? null,
          posters: allCodes ? countPosters(allCodes, now) : null,
        }}
      />
      {isPhone ? (
        <>
          {searchBox}
          {chips}
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {searchBox}
          {chips}
        </div>
      )}
      {/* The old rows stay while new ones load, dimmed and marked busy. */}
      <div
        aria-busy={loading}
        style={{
          opacity: loading && result ? 0.6 : 1,
          transition: 'opacity var(--motion-fast) var(--motion-ease)',
        }}
      >
        {body}
      </div>
      {result && result.total > PAGE_SIZE && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          onPageChange={setPage}
          loading={loading}
          itemLabel={COPY.itemLabel}
        />
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, Search } from 'lucide-react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mention, roleLabel } from './flag-drawer-format';
import { PersonRow } from './PersonRow';

const DRAWER = ADMIN_COPY.featureFlags.drawer;

interface FoundPerson {
  id: string;
  handle: string | null;
  role: string;
  isTestAccount: boolean;
}

interface PeopleAnswer {
  people: FoundPerson[];
}

interface FlagPeopleSearchProps {
  flag: AdminFeatureFlag;
  /** A failed add, shown here because this view replaces the panel. */
  error: string | null;
  /** Another people change is in flight: Add waits for it. */
  busy: boolean;
  onBack: () => void;
  /** Adds the person; resolves once the flag has the new list. */
  onAdd: (userId: string) => Promise<void>;
}

const SEARCH_DELAY_MS = 250;

// "Add a person by handle" (`07-people-flags-operations/flag-add-a-person`): the
// drawer's content becomes a search. People who already see the flag say so
// instead of offering Add.
export const FlagPeopleSearch = ({
  flag,
  error,
  busy,
  onBack,
  onAdd,
}: FlagPeopleSearchProps) => {
  const { getToken } = useAuth();
  // Held in a ref so the search depends on the query alone: a new token
  // function must not restart it or wipe the rows.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FoundPerson[] | null>(null);
  // True from the keystroke until its answer lands: the rows still on screen
  // belong to an older query, so they stay but cannot be added.
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const { stage } = flag;
  const named = new Set((flag.people ?? []).map((person) => person.userId));

  useEffect(() => {
    const term = query.trim();
    setFailed(false);
    if (term === '') {
      setFound(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      const load = async () => {
        try {
          const token = await tokenRef.current();
          if (!token) throw new Error('no session token');
          const answer = await apiClient.get<PeopleAnswer>(
            `/v1/admin/people?search=${encodeURIComponent(term)}&test=include&limit=8`,
            token,
          );
          if (cancelled) return;
          setFound(answer.people);
        } catch (err) {
          console.error('[admin] flag people search failed', err);
          if (!cancelled) setFailed(true);
        } finally {
          if (!cancelled) setSearching(false);
        }
      };
      void load();
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // The same rule the API applies: the owner and named people see a flag at Me
  // and at Beta, the Beta role also at Beta, and everyone at Everyone. An admin
  // is not included because of the role.
  const alreadySees = (person: FoundPerson): boolean =>
    stage === 'everyone' ||
    (stage !== 'off' &&
      (named.has(person.id) || flag.stageOwnerUserId === person.id)) ||
    (stage === 'beta' && person.role === 'beta');

  const add = async (person: FoundPerson) => {
    setAdding(person.id);
    try {
      await onAdd(person.id);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div
      data-testid="flag-people-search"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px 4px 0',
          background: 'none',
          border: 'none',
          fontSize: 12.5,
          color: 'var(--fg-muted)',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        {DRAWER.back}
      </button>
      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        {DRAWER.addTitle(flag.label)}
      </h3>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 38,
          padding: '0 12px',
          borderRadius: 10,
          border: '1px solid var(--signal)',
          background: 'var(--surface-1)',
        }}
      >
        <Search size={15} aria-hidden="true" style={{ flex: 'none' }} />
        <input
          // The search is the whole point of this view, so it takes focus.
          autoFocus
          type="text"
          value={query}
          maxLength={100}
          placeholder={DRAWER.searchPlaceholder}
          aria-label={DRAWER.searchAriaLabel}
          data-testid="flag-people-query"
          onChange={(evt) => setQuery(evt.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 13.5,
            color: 'var(--fg)',
          }}
        />
      </label>

      {failed ? (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
          {DRAWER.searchError}
        </div>
      ) : found !== null && found.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {DRAWER.noResults}
        </div>
      ) : found !== null ? (
        <ul
          aria-busy={searching}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 6,
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-elevated)',
            // Rows for an older query: still there, visibly not current.
            opacity: searching ? 0.55 : 1,
          }}
        >
          {found.map((person) => {
            const sees = alreadySees(person);
            const role = roleLabel(person.role);
            const meta = [
              role,
              person.isTestAccount ? DRAWER.test : null,
              sees ? DRAWER.alreadySees : null,
            ]
              .filter((part) => part !== null)
              .join(' · ');
            return (
              <PersonRow
                key={person.id}
                userId={person.id}
                handle={person.handle}
                meta={meta}
                testId={`flag-people-result-${person.id}`}
                style={{ padding: '8px 10px', borderRadius: 9 }}
                trailing={
                  !sees && (
                    <button
                      type="button"
                      disabled={adding !== null || busy || searching}
                      aria-label={DRAWER.addAriaLabel(mention(person.handle))}
                      data-testid={`flag-people-add-${person.id}`}
                      onClick={() => void add(person)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 6px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--signal)',
                        cursor: 'pointer',
                      }}
                    >
                      {DRAWER.add}
                    </button>
                  )
                }
              />
            );
          })}
        </ul>
      ) : null}

      {error !== null && (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {DRAWER.addFooter}
      </div>
    </div>
  );
};

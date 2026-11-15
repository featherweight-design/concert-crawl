'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ExternalLink, Tag } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  useIsPhoneResolved,
} from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import { refusedStatus } from '../invite-codes/codes-api';
import {
  checksApi,
  type CheckSide,
  type OpenCheck,
  type ResolvedCheck,
} from './checks-api';
import { decidedWhen, filedWhen, shortDay } from './checks-rules';
import { kindTag, smallLabel, ticketStyle } from './checks-styles';
import {
  AnswerPill,
  PHONE_PAGE,
  ResolvedChecksPhone,
} from './ResolvedChecksPhone';
import { dollars, priceRange } from './submitted-rules';

const COPY = ADMIN_COPY.pricesChecks;
// The phone's full-width row (`06/price-checks-mobile`): Add a price's words.
const OPEN_TICKET_PAGE = ADMIN_COPY.pricesPage.add.openTicketPage;
const PAGE = 50;
/** The resolved read's largest page (`/prices/resolved`, max 100). */
const RESOLVED_MAX = 100;
/** Open checks are few; one call takes up to the API's most. */
const OPEN_PAGE = 100;

type View = 'open' | 'resolved';

const pillStyle = (on: boolean): CSSProperties => ({
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

// "Use $X" is the tinted cyan answer (`06/prices-price-checks`); "Keep $Y" is
// the quiet ghost beside it.
const useButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: 'var(--signal)',
  background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
};

const fan = (side: CheckSide): string =>
  side.handle === null ? COPY.noHandle : `@${side.handle}`;

/**
 * A LISTED NOW or PRICE CHECK tile. Desktop (`06/prices-price-checks`): 12px
 * radius, 12/14 padding, the Price check edged in the gradient. Phone
 * (`06/price-checks-mobile`): 10px radius and padding, no edge, an 18px price.
 */
const Side = ({
  label,
  side,
  tone,
  edged = false,
  phone,
  words,
}: {
  label: string;
  side: CheckSide;
  tone?: string;
  edged?: boolean;
  phone: boolean;
  words: { today: string; yesterday: string };
}) => (
  <div
    style={{
      minWidth: 0,
      borderRadius: phone ? 10 : 12,
      padding: phone ? 10 : '12px 14px',
      ...(phone
        ? { background: 'var(--surface-2)' }
        : edged
          ? {
              border: '1px solid transparent',
              background:
                'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
            }
          : {
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }),
    }}
  >
    <div
      style={{
        ...smallLabel,
        ...(phone ? { fontSize: 9.5, letterSpacing: '0.14em' } : {}),
        ...(tone ? { color: tone } : {}),
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: phone ? 18 : 22,
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
        marginTop: 4,
      }}
    >
      {priceRange(side.priceMin, side.priceMax)}
    </div>
    <div
      style={{
        fontSize: phone ? 11.5 : 12,
        color: 'var(--fg-muted)',
        marginTop: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {[filedWhen(side.observedAt, words), fan(side)]
        .filter(Boolean)
        .join(' · ')}
    </div>
  </div>
);

/**
 * The Price checks tab (`06/prices-price-checks`, `price-checks-mobile`,
 * `price-checks-resolved-d`): Open and Resolved views. Use takes the fan's
 * price, Keep leaves the listed one; both fans hear back in Submitted prices.
 */
export const PriceChecksTab = () => {
  const { getToken } = useAuth();
  // Null until read, so the first fetch asks for the right page size.
  const phoneResolved = useIsPhoneResolved();
  const isPhone = phoneResolved === true;
  const api = useMemo(() => checksApi(getToken), [getToken]);

  const [view, setView] = useState<View>('open');
  const [open, setOpen] = useState<OpenCheck[]>([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [resolved, setResolved] = useState<ResolvedCheck[]>([]);
  const [resolvedTotal, setResolvedTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [more, setMore] = useState<'idle' | 'loading' | 'failed'>('idle');

  // The phone takes five at a time (`23/checks-resolved-m`).
  const resolvedPageSize = isPhone ? PHONE_PAGE : PAGE;
  const latest = useRef(0);
  const everLoaded = useRef(false);
  // How many resolved rows are on screen, for a refresh to fetch them all
  // again rather than drop the pages Load more added.
  const resolvedShown = useRef(0);
  const moreLatest = useRef(0);
  useEffect(() => {
    resolvedShown.current = resolved.length;
  }, [resolved]);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    const limit = Math.min(
      RESOLVED_MAX,
      Math.max(resolvedPageSize, resolvedShown.current),
    );
    try {
      const [openPage, resolvedPage] = await Promise.all([
        api.open(0, OPEN_PAGE),
        api.resolved(0, limit),
      ]);
      if (mine !== latest.current) return;
      setOpen(openPage.items);
      setOpenTotal(openPage.total);
      setResolved(resolvedPage.items);
      setResolvedTotal(resolvedPage.total);
      setFailed(false);
      setLoaded(true);
      everLoaded.current = true;
    } catch {
      // A refresh that fails after a decision keeps what is on screen: the
      // answer was saved, and a "Couldn't load" page would hide that.
      if (mine === latest.current && !everLoaded.current) setFailed(true);
    }
  }, [api, resolvedPageSize]);

  useEffect(() => {
    if (phoneResolved !== null) void load();
  }, [load, phoneResolved]);

  const decide = async (check: OpenCheck, answer: 'use' | 'keep') => {
    setBusyIds((current) => new Set(current).add(check.contestId));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== check.contestId),
      ),
    );
    try {
      await api.resolve(check, answer, COPY.reason);
      // Decided: take the card off at once, then refresh in the background (a
      // failed refresh keeps the screen, and the card must not linger).
      setOpen((current) =>
        current.filter((entry) => entry.contestId !== check.contestId),
      );
      setOpenTotal((total) => Math.max(0, total - 1));
      void load();
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [check.contestId]:
          refusedStatus(err) === 409 ? COPY.alreadyDecided : COPY.resolveFailed,
      }));
    }
    setBusyIds((current) => {
      const next = new Set(current);
      next.delete(check.contestId);
      return next;
    });
  };

  const loadMoreResolved = async () => {
    // A load() that starts while this runs bumps `latest` and wins: this
    // answer is then stale and dropped. Each Load more takes its own
    // generation too, so a later one supersedes an earlier one.
    const generation = latest.current;
    const mine = ++moreLatest.current;
    setMore('loading');
    try {
      const page = await api.resolved(resolvedShown.current, resolvedPageSize);
      if (generation !== latest.current || mine !== moreLatest.current) {
        if (mine === moreLatest.current) setMore('idle');
        return;
      }
      setResolved((current) => {
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...page.items.filter((row) => !seen.has(row.id))];
      });
      setResolvedTotal(page.total);
      setMore('idle');
    } catch {
      if (mine !== moreLatest.current) return;
      setMore(generation === latest.current ? 'failed' : 'idle');
    }
  };

  if (failed)
    return <CouldntLoad page={COPY.viewsLabel} onRetry={() => void load()} />;
  if (!loaded) return <PageSkeleton rows={3} columns={3} rowHeight={96} />;

  const words = { today: COPY.today, yesterday: COPY.yesterday };
  const showing = view;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        // `23/checks-resolved-m`: 6px from the pills to the resolved list.
        gap: isPhone && view === 'resolved' ? 6 : 14,
      }}
    >
      {/* Open / Resolved pills on both widths (`23/checks-resolved-m` draws
          the desktop's on the phone, the chosen count a step brighter). */}
      <div
        role="group"
        aria-label={COPY.viewsLabel}
        data-testid="price-checks-views"
        style={{ display: 'flex', gap: 8 }}
      >
        {(['open', 'resolved'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={view === key}
            onClick={() => setView(key)}
            style={pillStyle(view === key)}
          >
            {COPY.views[key]}{' '}
            <span
              style={{
                fontSize: 11.5,
                color:
                  isPhone && view === key
                    ? 'var(--fg-muted)'
                    : 'var(--fg-subtle)',
              }}
            >
              {key === 'open' ? openTotal : resolvedTotal}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {showing === 'open' ? (
          open.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={COPY.empty.title}
              body={COPY.empty.body}
            />
          ) : (
            <>
              <ul
                aria-label={COPY.listLabel}
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {open.map((check) => {
                  const busy = busyIds.has(check.contestId);
                  const listed = priceRange(
                    check.listed.priceMin,
                    check.listed.priceMax,
                  );
                  const asked = priceRange(
                    check.check.priceMin,
                    check.check.priceMax,
                  );
                  return (
                    <li
                      key={check.contestId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isPhone ? '1fr' : '1fr 1.6fr auto',
                        gap: isPhone ? 12 : 18,
                        alignItems: 'center',
                        padding: '14px 18px',
                        borderRadius: 14,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-1)',
                      }}
                    >
                      {isPhone ? (
                        // `06/price-checks-mobile`: the kind, then show · date.
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          <span style={kindTag}>{COPY.priceCheck}</span>
                          <span
                            style={{
                              minWidth: 0,
                              fontSize: 12,
                              color: 'var(--fg-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {`${check.title} · ${shortDay(check.date, true)}`}
                          </span>
                        </div>
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {check.title}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              fontSize: 12.5,
                              color: 'var(--fg-muted)',
                              marginTop: 3,
                            }}
                          >
                            <span
                              style={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {check.venueName}
                            </span>
                            <span
                              style={{ flex: 'none', whiteSpace: 'nowrap' }}
                            >
                              {` · ${shortDay(check.date, true)} · ${COPY.watching(check.watching)}`}
                            </span>
                          </div>
                        </div>
                      )}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                          gap: 8,
                        }}
                      >
                        <Side
                          label={COPY.listedNow}
                          side={check.listed}
                          phone={isPhone}
                          words={words}
                        />
                        <Side
                          label={COPY.priceCheck}
                          side={check.check}
                          tone="var(--accent)"
                          edged
                          phone={isPhone}
                          words={words}
                        />
                      </div>
                      {/* Desktop stacks the three answers (`06/prices-price-
                        checks`, 32px); the phone gives the ticket page its own
                        full-width row, then Use and Keep side by side
                        (`06/price-checks-mobile`, ruled order A3 4d #20). */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isPhone ? 8 : 6,
                          alignItems: 'stretch',
                        }}
                      >
                        {isSafeHttpUrl(check.ticketUrl) && (
                          <SafeExternalLink
                            href={check.ticketUrl}
                            style={{
                              ...ticketStyle,
                              height: isPhone ? 40 : 32,
                              fontSize: isPhone ? 13.5 : 12.5,
                            }}
                          >
                            <ExternalLink
                              size={14}
                              strokeWidth={1.8}
                              aria-hidden="true"
                            />
                            {isPhone ? OPEN_TICKET_PAGE : COPY.ticketPage}
                          </SafeExternalLink>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: isPhone ? 'row' : 'column',
                            gap: isPhone ? 8 : 6,
                          }}
                        >
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void decide(check, 'use')}
                            style={{
                              ...useButtonStyle,
                              // A long range wraps on a narrow phone rather
                              // than spill past the card.
                              ...(isPhone
                                ? {
                                    height: 'auto',
                                    minHeight: 38,
                                    minWidth: 0,
                                    whiteSpace: 'normal',
                                  }
                                : { height: 32 }),
                              fontSize: isPhone ? 13 : 12.5,
                              ...(isPhone ? { flex: 1 } : {}),
                              ...(busy
                                ? { opacity: 0.6, cursor: 'default' }
                                : {}),
                            }}
                          >
                            {COPY.takeAnswer(asked)}
                          </button>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void decide(check, 'keep')}
                            style={
                              isPhone
                                ? {
                                    flex: 1,
                                    height: 'auto',
                                    minHeight: 38,
                                    minWidth: 0,
                                    whiteSpace: 'normal',
                                    fontSize: 13,
                                  }
                                : { height: 30 }
                            }
                          >
                            {COPY.keepAnswer(listed)}
                          </AdminButton>
                        </div>
                      </div>
                      {errors[check.contestId] && (
                        <div
                          role="alert"
                          style={{
                            gridColumn: '1 / -1',
                            fontSize: 13,
                            color: 'var(--danger-fg)',
                          }}
                        >
                          {errors[check.contestId]}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!isPhone && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {COPY.footnote}
                </p>
              )}
            </>
          )
        ) : resolved.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={COPY.resolved.empty.title}
            body={COPY.resolved.empty.body}
          />
        ) : isPhone ? (
          <ResolvedChecksPhone
            rows={resolved}
            total={resolvedTotal}
            more={more}
            onLoadMore={() => void loadMoreResolved()}
          />
        ) : (
          <div
            style={{
              borderRadius: 14,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                ...smallLabel,
                display: 'flex',
                gap: 12,
                padding: '12px 18px',
                letterSpacing: '0.14em',
              }}
            >
              <span style={{ flex: 1.6 }}>{COPY.resolved.columns.show}</span>
              <span style={{ flex: 1 }}>{COPY.resolved.columns.answer}</span>
              <span style={{ flex: 1 }}>{COPY.resolved.columns.decided}</span>
            </div>
            <ul
              aria-label={COPY.resolvedLabel}
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {resolved.map((row) => (
                <li
                  key={row.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1.6, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.title ?? ''}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                      }}
                    >
                      {[
                        row.venueName,
                        row.date === null ? '' : shortDay(row.date),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <AnswerPill
                      answer={row.answer}
                      price={row.price === null ? '' : dollars(row.price)}
                    />
                  </div>
                  <div
                    data-testid="resolved-decided-by"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 12.5,
                      color: 'var(--fg-muted)',
                      // A long handle wraps inside its column.
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {[
                      row.decidedBy === null ? null : `@${row.decidedBy}`,
                      decidedWhen(row.decidedAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 18px',
                borderTop: '1px solid var(--border)',
                fontSize: 12.5,
                color: 'var(--fg-subtle)',
              }}
            >
              <span>
                {COPY.resolved.showing(resolved.length, resolvedTotal)}
              </span>
              <span style={{ flex: 1 }} />
              {more === 'failed' && (
                <span role="alert" style={{ color: 'var(--danger)' }}>
                  {COPY.resolved.loadMoreFailed}
                </span>
              )}
              {resolvedTotal > resolved.length && (
                <AdminButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-disabled={more === 'loading' || undefined}
                  onClick={() => {
                    if (more !== 'loading') void loadMoreResolved();
                  }}
                >
                  {more === 'loading'
                    ? COPY.resolved.loadingMore
                    : COPY.resolved.loadMore}
                </AdminButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

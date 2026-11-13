'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Tag } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  CouldntLoad,
  EmptyState,
  PageSkeleton,
  useIsPhone,
} from '@/components/admin/primitives';
import { refusedStatus } from '../invite-codes/codes-api';
import {
  checksApi,
  type CheckSide,
  type OpenCheck,
  type ResolvedCheck,
} from './checks-api';
import { decidedWhen, filedWhen, shortDay } from './checks-rules';
import { priceRange } from './submitted-rules';

const COPY = ADMIN_COPY.pricesChecks;
const PAGE = 50;

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

const smallLabel: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

const fan = (side: CheckSide): string =>
  side.handle === null ? COPY.noHandle : `@${side.handle}`;

const Side = ({
  label,
  side,
  tone,
  words,
}: {
  label: string;
  side: CheckSide;
  tone?: string;
  words: { today: string; yesterday: string };
}) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ ...smallLabel, ...(tone ? { color: tone } : {}) }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>
      {priceRange(side.priceMin, side.priceMax)}
    </div>
    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
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
  const isPhone = useIsPhone();
  const api = useMemo(() => checksApi(getToken), [getToken]);

  const [view, setView] = useState<View>('open');
  const [open, setOpen] = useState<OpenCheck[]>([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [resolved, setResolved] = useState<ResolvedCheck[]>([]);
  const [resolvedTotal, setResolvedTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [more, setMore] = useState<'idle' | 'loading' | 'failed'>('idle');

  const latest = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const [openPage, resolvedPage] = await Promise.all([
        api.open(0, PAGE),
        api.resolved(0, PAGE),
      ]);
      if (mine !== latest.current) return;
      setOpen(openPage.items);
      setOpenTotal(openPage.total);
      setResolved(resolvedPage.items);
      setResolvedTotal(resolvedPage.total);
      setFailed(false);
      setLoaded(true);
    } catch {
      if (mine === latest.current) setFailed(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (check: OpenCheck, answer: 'use' | 'keep') => {
    setBusyId(check.contestId);
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== check.contestId),
      ),
    );
    try {
      await api.resolve(check, answer, COPY.reason);
      await load();
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [check.contestId]:
          refusedStatus(err) === 409 ? COPY.alreadyDecided : COPY.resolveFailed,
      }));
    }
    setBusyId(null);
  };

  const loadMoreResolved = async () => {
    setMore('loading');
    try {
      const page = await api.resolved(resolved.length, PAGE);
      const seen = new Set(resolved.map((row) => row.id));
      setResolved([
        ...resolved,
        ...page.items.filter((row) => !seen.has(row.id)),
      ]);
      setResolvedTotal(page.total);
      setMore('idle');
    } catch {
      setMore('failed');
    }
  };

  if (failed)
    return <CouldntLoad page={COPY.viewsLabel} onRetry={() => void load()} />;
  if (!loaded) return <PageSkeleton rows={3} columns={3} rowHeight={96} />;

  const words = { today: COPY.today, yesterday: COPY.yesterday };
  const showing = isPhone ? 'open' : view;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!isPhone && (
        <div
          role="group"
          aria-label={COPY.viewsLabel}
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
              {COPY.views[key]}
              <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
                {key === 'open' ? openTotal : resolvedTotal}
              </span>
            </button>
          ))}
        </div>
      )}

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
                const busy = busyId === check.contestId;
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
                          fontSize: 12.5,
                          color: 'var(--fg-muted)',
                          marginTop: 3,
                        }}
                      >
                        {[check.venueName, shortDay(check.date, true)]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                      }}
                    >
                      <Side
                        label={COPY.listedNow}
                        side={check.listed}
                        words={words}
                      />
                      <Side
                        label={COPY.priceCheck}
                        side={check.check}
                        tone="var(--accent)"
                        words={words}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        justifyContent: isPhone ? 'stretch' : 'flex-end',
                      }}
                    >
                      <AdminButton
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decide(check, 'use')}
                        style={isPhone ? { flex: 1 } : undefined}
                      >
                        {COPY.takeAnswer(asked)}
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decide(check, 'keep')}
                        style={isPhone ? { flex: 1 } : undefined}
                      >
                        {COPY.keepAnswer(listed)}
                      </AdminButton>
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
                style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}
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
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 22,
                      padding: '0 9px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color:
                        row.answer === 'used'
                          ? 'var(--success)'
                          : 'var(--fg-muted)',
                      background: `color-mix(in srgb, ${row.answer === 'used' ? 'var(--success)' : 'var(--fg-subtle)'} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${row.answer === 'used' ? 'var(--success)' : 'var(--fg-subtle)'} 32%, transparent)`,
                    }}
                  >
                    {row.answer === 'used'
                      ? COPY.resolved.used(
                          row.price === null ? '' : priceRange(row.price, null),
                        )
                      : COPY.resolved.kept(
                          row.price === null ? '' : priceRange(row.price, null),
                        )}
                  </span>
                </div>
                <div
                  style={{ flex: 1, fontSize: 12.5, color: 'var(--fg-muted)' }}
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
            <span>{COPY.resolved.showing(resolved.length, resolvedTotal)}</span>
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
  );
};

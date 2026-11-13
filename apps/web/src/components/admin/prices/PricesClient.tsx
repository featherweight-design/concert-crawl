'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminTabs,
  CouldntLoad,
  PageSkeleton,
  useIsPhone,
} from '@/components/admin/primitives';
import { refusedStatus } from '../invite-codes/codes-api';
import { AddPricePanel, type AddPriceOutcome } from './AddPricePanel';
import {
  MISSING_MAX_PER_CALL,
  MISSING_PAGE_SIZE,
  MissingTab,
  type LoadMoreState,
} from './MissingTab';
import {
  pricesApi,
  type MissingRow,
  type NewPrice,
  type TabCounts,
} from './prices-api';

const COPY = ADMIN_COPY.pricesPage;

export type PricesTab = 'missing' | 'submitted' | 'checks';
const TAB_KEYS: readonly PricesTab[] = ['missing', 'submitted', 'checks'];

const tabCountOf = (counts: TabCounts, tab: PricesTab): number =>
  tab === 'missing'
    ? counts.missing
    : tab === 'submitted'
      ? counts.submitted
      : counts.checksOpen;

const switchStyle = (on: boolean): CSSProperties => ({
  position: 'relative',
  flex: 'none',
  width: 40,
  height: 24,
  borderRadius: 999,
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  background: on
    ? 'linear-gradient(90deg, var(--signal), var(--accent))'
    : 'var(--border-strong)',
});

const ApproveCard = ({
  on,
  people,
  onToggle,
}: {
  on: boolean;
  people: number;
  onToggle: () => void;
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 18px',
      borderRadius: 14,
      border: '1px solid transparent',
      background:
        'linear-gradient(var(--surface-1), var(--surface-1)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
    }}
  >
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={COPY.approve.label}
      onClick={onToggle}
      style={switchStyle(on)}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: 'var(--fg)',
        }}
      />
    </button>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>
        {COPY.approve.label}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 3 }}>
        {COPY.approve.helper}
      </div>
    </div>
    <span
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        background: 'color-mix(in srgb, var(--fg-subtle) 14%, transparent)',
        border:
          '1px solid color-mix(in srgb, var(--fg-subtle) 32%, transparent)',
      }}
    >
      {COPY.approve.people(people)}
    </span>
  </div>
);

/**
 * 4d Prices: the page shell and the Missing a price tab. The Submitted prices
 * and Price checks tabs link to their Review pages until the redesigned tabs
 * replace them.
 */
export const PricesClient = ({ initialTab }: { initialTab: PricesTab }) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const isPhone = useIsPhone();
  const api = useMemo(() => pricesApi(getToken), [getToken]);

  const [tab, setTab] = useState<PricesTab>(initialTab);
  const [counts, setCounts] = useState<TabCounts | null>(null);
  const [rows, setRows] = useState<MissingRow[]>([]);
  const [loadState, setLoadState] = useState<LoadMoreState>('idle');
  const [failed, setFailed] = useState(false);
  const [approveOn, setApproveOn] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState<MissingRow | null>(null);
  const savingApprove = useRef(false);

  // Only the newest load may write: a slow older one must not overwrite it.
  const latestLoad = useRef(0);
  // How many rows Load more has put on screen, so a refresh after a save keeps
  // them (the API serves at most 100 in one call).
  const loadedCount = useRef(0);
  const load = useCallback(async () => {
    const mine = ++latestLoad.current;
    try {
      const [nextCounts, list] = await Promise.all([
        api.tabs(),
        api.missing(
          0,
          Math.min(
            MISSING_MAX_PER_CALL,
            Math.max(loadedCount.current, MISSING_PAGE_SIZE),
          ),
        ),
      ]);
      if (mine !== latestLoad.current) return;
      loadedCount.current = list.rows.length;
      setCounts(nextCounts);
      setRows(list.rows);
      setFailed(false);
    } catch {
      if (mine === latestLoad.current) setFailed(true);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLoadMore = async () => {
    setLoadState('loading');
    try {
      const list = await api.missing(rows.length, MISSING_PAGE_SIZE);
      const seen = new Set(rows.map((row) => row.eventId));
      const merged = [
        ...rows,
        ...list.rows.filter((row) => !seen.has(row.eventId)),
      ];
      loadedCount.current = merged.length;
      setRows(merged);
      setLoadState('idle');
    } catch {
      setLoadState('failed');
    }
  };

  // A link to `?tab=` while the page is mounted changes the prop, not the mount.
  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    // The toggle is a convenience: a failed read hides it, not the page.
    api.approveMyself().then(setApproveOn, () => setApproveOn(null));
  }, [api]);

  const onTab = (next: PricesTab) => {
    setTab(next);
    router.replace(
      next === 'missing' ? '/admin/prices' : `/admin/prices?tab=${next}`,
    );
  };

  const onToggle = async () => {
    // One save at a time: a second click mid-request would race the rollback.
    if (approveOn === null || savingApprove.current) return;
    savingApprove.current = true;
    const next = !approveOn;
    setApproveOn(next);
    try {
      await api.setApproveMyself(next);
    } catch {
      setApproveOn(!next);
      setNotice(COPY.approve.saveFailed);
    } finally {
      savingApprove.current = false;
    }
  };

  const onSubmit = async (
    price: NewPrice,
    extras: { soldOut: boolean; sourceUrl: string | null },
    next: boolean,
  ): Promise<AddPriceOutcome> => {
    const published = adding;
    try {
      await api.addPrice(price);
    } catch (err) {
      return {
        ok: false,
        error:
          refusedStatus(err) === 409
            ? COPY.add.alreadyPriced
            : COPY.add.saveFailed,
      };
    }
    setNotice(null);
    if (extras.soldOut) {
      try {
        await api.markSoldOut(price.eventId, extras.sourceUrl);
      } catch {
        setNotice(COPY.add.soldOutFailed);
      }
    }
    await load();
    if (!next || published === null) {
      setAdding(null);
      return { ok: true };
    }
    try {
      const following = await api.missingNext(published.eventId);
      if (following === null) setNotice(COPY.add.nothingLeft);
      setAdding(following);
    } catch {
      setAdding(null);
    }
    return { ok: true };
  };

  const panel = adding && (
    <AddPricePanel
      key={adding.eventId}
      row={adding}
      onClose={() => setAdding(null)}
      onSubmit={onSubmit}
    />
  );

  const tabs = TAB_KEYS.map((key) => ({
    key,
    label: (
      <>
        {isPhone ? COPY.phoneTabs[key] : COPY.tabs[key]}
        <span
          style={{
            fontSize: 12,
            color: 'var(--fg-subtle)',
            marginLeft: 6,
          }}
        >
          {counts ? tabCountOf(counts, key) : ''}
        </span>
      </>
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isPhone && (
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            {COPY.title}
          </h1>
        )}
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-muted)' }}>
          {isPhone
            ? approveOn === null
              ? COPY.subtitle
              : approveOn
                ? COPY.approve.phoneOn
                : COPY.approve.phoneOff
            : COPY.subtitle}
        </p>
      </header>

      {!isPhone && approveOn !== null && counts && (
        <ApproveCard
          on={approveOn}
          people={counts.peopleSubmitting}
          onToggle={() => void onToggle()}
        />
      )}

      <AdminTabs
        tabs={tabs}
        value={tab}
        onChange={onTab}
        label={COPY.tabsLabel}
        tabId={(key) => `prices-tab-${key}`}
        panelId={() => 'prices-panel'}
        variant={isPhone ? 'segments' : 'underline'}
        phone={isPhone}
        testId="prices-tabs"
      />

      {notice && (
        <div role="status" style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
          {notice}
        </div>
      )}

      <div
        id="prices-panel"
        role="tabpanel"
        aria-labelledby={`prices-tab-${tab}`}
      >
        {tab === 'missing' ? (
          failed ? (
            <CouldntLoad page={COPY.title} onRetry={() => void load()} />
          ) : counts === null ? (
            <PageSkeleton rows={5} columns={4} rowHeight={64} />
          ) : (
            <>
              {!isPhone && (
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {COPY.missing.hint}
                </p>
              )}
              <MissingTab
                rows={rows}
                total={counts.missing}
                adding={adding?.eventId ?? null}
                loadState={loadState}
                onAdd={setAdding}
                onLoadMore={() => void onLoadMore()}
              />
            </>
          )
        ) : (
          <Link
            href={
              tab === 'submitted'
                ? '/admin/review?tab=submissions'
                : '/admin/review?tab=prices'
            }
            style={{ fontSize: 14, color: 'var(--signal)' }}
          >
            {tab === 'submitted' ? COPY.interim.submitted : COPY.interim.checks}
          </Link>
        )}
      </div>

      {panel}
    </div>
  );
};

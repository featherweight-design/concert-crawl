import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { AdminEmailDelivery, AdminSettings } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SectionHead, StatusBadge } from '@/components/admin/primitives';
import { LlmBudgetControl } from './LlmBudgetControl';
import {
  crawlTileState,
  formatMonth,
  formatMtTime,
  formatUsd,
  type CostTileState,
  type CrawlSummary,
} from './health-model';

const copy = ADMIN_COPY.health;
const count = (value: number) => value.toLocaleString('en-US');

/** Copy that the phone board shortens: both render, the breakpoint picks one. */
export const Dual = ({ desk, phone }: { desk: string; phone: string }) => (
  <>
    <span className="health-desk">{desk}</span>
    <span className="health-phone">{phone}</span>
  </>
);

/** Summary and button read the one Needs you count (G11), so they agree. */
export const HealthHeader = ({
  needsYou,
  href,
}: {
  needsYou: number | null;
  href: string;
}) => (
  <SectionHead
    title={copy.title}
    // The phone shows the title once, in the shell's top bar.
    titleClassName="health-desk"
    subtitle={
      needsYou === null ? undefined : (
        <Dual
          desk={copy.summary(needsYou)}
          phone={copy.summaryPhone(needsYou)}
        />
      )
    }
    actions={
      // The phone board has no button (gap G12).
      <span className="health-desk">
        <Link
          href={href}
          data-testid="health-open-needs-you"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 34,
            padding: '0 12px',
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: 'var(--fg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <Inbox size={14} aria-hidden="true" />
          {copy.openNeedsYou(needsYou)}
        </Link>
      </span>
    }
  />
);

const Tile = ({
  testId,
  label,
  value,
  detail,
  pill,
}: {
  testId: string;
  label: ReactNode;
  value: string;
  detail: ReactNode;
  pill?: ReactNode;
}) => (
  <div
    data-testid={testId}
    style={{
      minWidth: 0,
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--surface-1)',
      padding: '16px 18px',
      display: 'grid',
      gridTemplateRows: '14px 36px 36px 22px',
      rowGap: 10,
      alignContent: 'start',
    }}
  >
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        lineHeight: '14px',
        letterSpacing: '0.14em',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 28,
        lineHeight: '36px',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 12.5,
        lineHeight: '18px',
        color: 'var(--fg-muted)',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}
    >
      {detail}
    </div>
    <div>{pill}</div>
  </div>
);

const COST_PILLS: Record<
  Exclude<CostTileState, 'noBudget'>,
  { kind: 'success' | 'warning' | 'danger'; desk: string; phone: string }
> = {
  under: {
    kind: 'success',
    desk: copy.tiles.cost.under,
    phone: copy.tiles.cost.underPhone,
  },
  willGoOver: {
    kind: 'warning',
    desk: copy.tiles.cost.willGoOver,
    phone: copy.tiles.cost.willGoOver,
  },
  over: {
    kind: 'danger',
    desk: copy.tiles.cost.overPill,
    phone: copy.tiles.cost.overPill,
  },
};

export interface HealthTilesProps {
  crawl: CrawlSummary;
  artists: { matched: number; soon: number | null; toCheck: number };
  cost: {
    month: number;
    mtdUsd: number;
    budgetUsd: number | null;
    paceUsd: number;
    state: CostTileState;
  };
  /** The settings the cost tile's budget panel edits, and last month's spend. */
  settings: AdminSettings;
  lastMonthUsd: number | null;
  delivery: AdminEmailDelivery;
}

export const HealthTiles = ({
  crawl,
  artists,
  cost,
  settings,
  lastMonthUsd,
  delivery,
}: HealthTilesProps) => {
  const crawlState = crawlTileState(crawl);
  const time = crawl.finishedAt ? formatMtTime(crawl.finishedAt) : '';
  const month = formatMonth(cost.month);
  const pace = formatUsd(cost.paceUsd);
  const budget = cost.budgetUsd === null ? '' : formatUsd(cost.budgetUsd);
  const costPill = cost.state === 'noBudget' ? null : COST_PILLS[cost.state];
  const siteDetail = [
    copy.tiles.site.emails(delivery.hours),
    delivery.failed > 0 ? copy.tiles.site.failed(delivery.failed) : null,
    delivery.lastSentAt
      ? copy.tiles.site.lastSent(formatMtTime(delivery.lastSentAt))
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="health-tiles" data-testid="health-tiles">
      <Tile
        testId={`health-tile-crawl-${crawlState}`}
        label={
          <Dual
            desk={copy.tiles.crawl.label}
            phone={copy.tiles.crawl.labelPhone}
          />
        }
        value={copy.tiles.crawl.value(crawl.ok, crawl.total)}
        detail={
          crawlState === 'noRuns' ? (
            copy.tiles.crawl.noRuns
          ) : crawlState === 'failed' ? (
            // GAP G2: "The {m} new failures are in Needs you" needs "new"
            // defined and a per-venue Needs you lookup; until then, the count.
            copy.tiles.crawl.failed(crawl.failed)
          ) : (
            <Dual
              desk={copy.tiles.crawl.finished(
                time,
                count(crawl.shows),
                count(crawl.added),
              )}
              phone={copy.tiles.crawl.finishedPhone(time, count(crawl.added))}
            />
          )
        }
        pill={
          crawlState === 'onTime' ? (
            <StatusBadge kind="success" dot>
              {copy.tiles.crawl.onTime}
            </StatusBadge>
          ) : crawlState === 'failed' ? (
            <StatusBadge kind="warning" dot>
              {copy.tiles.crawl.failedPill(crawl.failed)}
            </StatusBadge>
          ) : null
        }
      />
      <Tile
        testId="health-tile-artists"
        label={copy.tiles.artists.label}
        value={count(artists.matched)}
        detail={
          artists.soon === null ? (
            <Dual
              desk={copy.tiles.artists.toCheck(artists.toCheck)}
              phone={copy.tiles.artists.toCheckPhone(artists.toCheck)}
            />
          ) : (
            <Dual
              desk={copy.tiles.artists.soon(artists.soon)}
              phone={copy.tiles.artists.soonPhone(artists.soon)}
            />
          )
        }
        // GAP G3: every drawn Artists pill is a Spotify sync state, ruled out.
      />
      <LlmBudgetControl
        settings={settings}
        spentUsd={cost.mtdUsd}
        paceUsd={cost.paceUsd}
        lastMonthUsd={lastMonthUsd}
      >
        <Tile
          testId={`health-tile-cost-${cost.state}`}
          label={
            <Dual
              desk={copy.tiles.cost.label(month)}
              phone={copy.tiles.cost.labelPhone(month)}
            />
          }
          value={formatUsd(cost.mtdUsd)}
          detail={
            cost.state === 'over' ? (
              copy.tiles.cost.over(budget)
            ) : cost.state === 'noBudget' ? (
              <Dual
                desk={copy.tiles.cost.noBudget(pace)}
                phone={copy.tiles.cost.noBudgetPhone(pace)}
              />
            ) : (
              <Dual
                desk={copy.tiles.cost.ofBudget(budget, pace)}
                phone={copy.tiles.cost.ofBudgetPhone(budget, pace)}
              />
            )
          }
          pill={
            costPill ? (
              <StatusBadge kind={costPill.kind} dot>
                <Dual desk={costPill.desk} phone={costPill.phone} />
              </StatusBadge>
            ) : (
              // No budget: the pill points at the panel that sets one.
              <StatusBadge kind="neutral">
                {copy.tiles.cost.setBudget}
              </StatusBadge>
            )
          }
        />
      </LlmBudgetControl>
      <Tile
        testId="health-tile-site"
        label={
          <Dual
            desk={copy.tiles.site.label}
            phone={copy.tiles.site.labelPhone}
          />
        }
        value={copy.tiles.site.value(delivery.sent)}
        detail={siteDetail}
        // GAP G4: no email-only state is drawn, so the tile has no pill.
      />
    </div>
  );
};

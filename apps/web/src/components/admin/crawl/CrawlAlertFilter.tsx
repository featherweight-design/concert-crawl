import Link from 'next/link'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface CrawlAlertFilterProps {
  hasAlert: boolean
}

// Two-state filter rendered as a Link pair so it works inside the
// admin/crawl server component without lifting any client state (#804).
// The URL search param `hasAlert` is the single source of truth — the
// "Show alerts only" link sets ?hasAlert=true and the "Show all" link
// drops the param. Next.js re-renders the server component on navigation,
// which re-fetches /v1/admin/crawl/runs with the new filter applied and
// rebuilds the run-history table with only suspicious rows.
//
// aria-current="page" is the correct active-state attribute for an
// anchor; aria-pressed is reserved for buttons / toggle widgets and is
// ignored or mis-announced on links.
export const CrawlAlertFilter = ({ hasAlert }: CrawlAlertFilterProps) => {
  const allActive = !hasAlert
  const alertsActive = hasAlert

  return (
    <div
      role="group"
      aria-label={ADMIN_COPY.crawlHistoryTable.filterAriaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
      }}
    >
      <Link
        href="/admin/crawl"
        aria-current={allActive ? 'page' : undefined}
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          border: `1px solid ${allActive ? 'var(--accent)' : 'var(--border)'}`,
          background: allActive ? 'var(--accent)' : 'transparent',
          color: allActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
          textDecoration: 'none',
        }}
      >
        {ADMIN_COPY.crawlHistoryTable.filterShowAll}
      </Link>
      <Link
        href="/admin/crawl?hasAlert=true"
        aria-current={alertsActive ? 'page' : undefined}
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          border: `1px solid ${alertsActive ? 'var(--accent)' : 'var(--border)'}`,
          background: alertsActive ? 'var(--accent)' : 'transparent',
          color: alertsActive ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
          textDecoration: 'none',
        }}
      >
        {ADMIN_COPY.crawlHistoryTable.filterAlertsOnly}
      </Link>
    </div>
  )
}

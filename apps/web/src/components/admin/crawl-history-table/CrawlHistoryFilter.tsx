import Link from 'next/link'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface CrawlHistoryFilterProps {
  /** Current path (e.g. /admin/venues/abc). The consumer passes the
   * actual mount path so the filter doesn't need to know the routing
   * convention. The "Show all" link points here verbatim; the
   * "Show alerts only" link appends ?hasAlert=true. */
  basePath: string
  hasAlert: boolean
}

// Two-state filter rendered as a Link pair so it works inside the
// CrawlHistoryTable server component without lifting any client state
// (#804). The URL search param is the single source of truth — the
// "Show alerts only" link sets ?hasAlert=true and the "Show all" link
// drops the param. Next.js re-renders the server component on navigation,
// which re-fetches the API with the new filter applied.
export const CrawlHistoryFilter = ({
  basePath,
  hasAlert,
}: CrawlHistoryFilterProps) => {
  const allActive = !hasAlert
  const alertsActive = hasAlert

  return (
    <div
      role="group"
      aria-label={ADMIN_COPY.crawlHistoryTable.filterAriaLabel}
      className="inline-flex items-center gap-2 text-sm"
    >
      <Link
        href={basePath}
        aria-pressed={allActive}
        className={`inline-flex items-center rounded-full border px-3 py-1 transition-colors ${
          allActive
            ? 'border-accent bg-accent text-fg-on-accent'
            : 'border-border text-fg-muted hover:bg-surface-1 hover:text-fg'
        }`}
      >
        {ADMIN_COPY.crawlHistoryTable.filterShowAll}
      </Link>
      <Link
        href={`${basePath}?hasAlert=true`}
        aria-pressed={alertsActive}
        className={`inline-flex items-center rounded-full border px-3 py-1 transition-colors ${
          alertsActive
            ? 'border-accent bg-accent text-fg-on-accent'
            : 'border-border text-fg-muted hover:bg-surface-1 hover:text-fg'
        }`}
      >
        {ADMIN_COPY.crawlHistoryTable.filterAlertsOnly}
      </Link>
    </div>
  )
}

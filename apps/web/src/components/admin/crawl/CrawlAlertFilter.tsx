import Link from 'next/link'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface CrawlAlertFilterProps {
  hasAlert: boolean
  /** Other URL search params already on the page (venueId, tab, etc.).
   *  The filter merges its own hasAlert toggle into these so navigating
   *  the filter doesn't reset the operator's current venue selection
   *  or active inspector tab. */
  otherParams: Record<string, string>
}

function buildHref(
  otherParams: Record<string, string>,
  hasAlertOn: boolean,
): string {
  const params = new URLSearchParams(otherParams)
  if (hasAlertOn) {
    params.set('hasAlert', 'true')
  } else {
    params.delete('hasAlert')
  }
  const qs = params.toString()
  return qs ? `/admin/crawl?${qs}` : '/admin/crawl'
}

// Two-state filter rendered as a Link pair so it works inside the
// admin/crawl server component without lifting any client state (#804).
// The URL search param `hasAlert` is the single source of truth — the
// "Show alerts only" link sets ?hasAlert=true and the "Show all" link
// drops the param. Other params (venueId, tab) are preserved so
// toggling the filter doesn't clobber an operator's current selection.
//
// aria-current="page" is the correct active-state attribute for an
// anchor; aria-pressed is reserved for buttons / toggle widgets and is
// ignored or mis-announced on links.
export const CrawlAlertFilter = ({
  hasAlert,
  otherParams,
}: CrawlAlertFilterProps) => {
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
        href={buildHref(otherParams, false)}
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
        href={buildHref(otherParams, true)}
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

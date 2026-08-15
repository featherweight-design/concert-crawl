import { StatusBadge } from '@/components/admin/primitives'
import {
  CRAWL_STATUS_DISPLAY,
  isCrawlDisplayStatus,
} from '@/components/admin/definitions/crawl-status'

interface CrawlStatusBadgeProps {
  /**
   * Widened to `string` on purpose: several endpoints hand back a raw status
   * column, and a status added server-side should render as itself rather
   * than disappear or borrow another status's colour.
   */
  status: string | null
  variant?: 'soft' | 'outline' | 'mono'
  dot?: boolean
}

export const CrawlStatusBadge = ({
  status,
  variant = 'soft',
  dot = false,
}: CrawlStatusBadgeProps) => {
  const key = status ?? 'never'
  const display = isCrawlDisplayStatus(key)
    ? CRAWL_STATUS_DISPLAY[key]
    : { label: key, kind: 'neutral' as const }

  return (
    <StatusBadge kind={display.kind} variant={variant} dot={dot}>
      {display.label}
    </StatusBadge>
  )
}

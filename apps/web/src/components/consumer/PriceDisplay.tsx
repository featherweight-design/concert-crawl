import type { PriceSource } from '@concert-crawl/types'

interface PriceDisplayProps {
  priceMin: string | null
  priceMax: string | null
  priceSource: PriceSource | null
  venueName: string
  ticketUrl: string | null
}

function formatPrice(min: string | null, max: string | null): string | null {
  if (!min) return null
  const minNum = parseFloat(min)
  if (isNaN(minNum)) return null
  const minStr = `$${minNum.toFixed(0)}`
  if (!max) return minStr
  const maxNum = parseFloat(max)
  if (isNaN(maxNum) || maxNum <= minNum) return minStr
  return `${minStr}–$${maxNum.toFixed(0)}`
}

function sourceLabel(source: PriceSource, venueName: string): string {
  switch (source) {
    case 'structured_data':
      return `From ${venueName}`
    case 'ticketmaster':
      return 'From Ticketmaster'
    case 'eventbrite':
      return 'From Eventbrite'
    case 'dice':
      return 'From Dice.fm'
    case 'songkick':
      return 'From Songkick'
    case 'bandsintown':
      return 'From Bandsintown'
    case 'seatgeek':
      return 'From SeatGeek · resale prices'
    case 'community':
      return 'Community reported'
  }
}

function isAxsVenue(ticketUrl: string | null): boolean {
  return ticketUrl?.includes('axs.com') ?? false
}

export function PriceDisplay({
  priceMin,
  priceMax,
  priceSource,
  venueName,
  ticketUrl,
}: PriceDisplayProps) {
  const formatted = formatPrice(priceMin, priceMax)
  const axs = isAxsVenue(ticketUrl)

  if (formatted && priceSource) {
    const label = sourceLabel(priceSource, venueName)
    const isSeatGeek = priceSource === 'seatgeek'
    const isCommunity = priceSource === 'community'

    return (
      <div>
        <p className="text-foreground font-medium">
          {formatted}
          {axs && isSeatGeek && (
            <span className="text-muted-foreground ml-1 text-xs">(resale)</span>
          )}
        </p>
        {isCommunity ? (
          <p
            className="text-muted-foreground text-xs"
            title="Prices submitted by Concert Crawl community members. Not verified by venue."
          >
            {label}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">{label}</p>
        )}
        {axs && isSeatGeek && (
          <p className="text-muted-foreground text-xs">
            AXS doesn&apos;t list face value publicly
          </p>
        )}
      </div>
    )
  }

  if (axs) {
    return (
      <div>
        <p className="text-muted-foreground text-sm">
          AXS doesn&apos;t share pricing publicly — check back closer to the
          show or call the box office
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-muted-foreground text-sm">Price not yet available</p>
    </div>
  )
}

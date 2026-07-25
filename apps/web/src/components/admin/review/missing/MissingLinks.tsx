'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { resolveVenueCheckUrl } from '@/lib/admin/missing'

const linkStyle: CSSProperties = {
  color: 'inherit',
  textDecoration: 'underline',
  textDecorationColor: 'var(--border)',
  textUnderlineOffset: 3,
}

export interface MissingEventLinkProps {
  eventId: string
  title: string
  style?: CSSProperties
}

// The missing row points at the admin record rather than /events/[id]: the
// consumer detail route deliberately 404s once firstMissingAt is set, so a
// consumer link would be dead for every row in this list by definition.
export const MissingEventLink = ({
  eventId,
  title,
  style,
}: MissingEventLinkProps) => (
  <Link
    href={`/admin/events/${eventId}/edit`}
    aria-label={ADMIN_COPY.review.missing.openEventAria(title)}
    style={{ ...linkStyle, ...style }}
  >
    {title}
  </Link>
)

export interface MissingVenueLinkProps {
  venueId: string | null
  venueName: string | null
  style?: CSSProperties
}

// venueName comes from a LEFT JOIN and venueId from the event row, so the two
// are independently nullable. The link is gated on venueId alone — a nameless
// venue still has a working admin page worth reaching.
export const MissingVenueLink = ({
  venueId,
  venueName,
  style,
}: MissingVenueLinkProps) => {
  const label = venueName ?? ADMIN_COPY.review.missing.venueUnknown
  if (venueId === null) {
    return <span style={style}>{label}</span>
  }
  return (
    <Link
      href={`/admin/venues/${venueId}`}
      aria-label={ADMIN_COPY.review.missing.openVenueAria(venueName)}
      style={{ ...linkStyle, ...style }}
    >
      {label}
    </Link>
  )
}

export interface VenueCheckLinkProps {
  title: string
  eventUrl: string | null
  sourceUrl: string | null
  style?: CSSProperties
}

export const VenueCheckLink = ({
  title,
  eventUrl,
  sourceUrl,
  style,
}: VenueCheckLinkProps) => {
  const href = resolveVenueCheckUrl(eventUrl, sourceUrl)
  if (href === null) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ADMIN_COPY.review.missing.checkAtVenueAria(title)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--accent)',
        textDecoration: 'none',
        ...style,
      }}
    >
      {ADMIN_COPY.review.missing.checkAtVenue}
      <ExternalLink size={11} aria-hidden="true" />
    </a>
  )
}

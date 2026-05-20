import { googleMapsEmbedUrl, googleMapsUrl } from '../definitions/lib'

interface MapPlaceholderProps {
  venueAddress: string | null
  searchQuery: string
}

export function MapPlaceholder({
  venueAddress,
  searchQuery,
}: MapPlaceholderProps) {
  if (venueAddress) {
    return (
      <div
        className="relative overflow-hidden rounded-[10px] border border-border"
        style={{ height: 160 }}
      >
        <iframe
          title="Venue map"
          src={googleMapsEmbedUrl(venueAddress)}
          width="100%"
          height="160"
          className="[filter:invert(90%)_hue-rotate(180deg)]"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label={`Map showing ${venueAddress}`}
        />
      </div>
    )
  }

  return (
    <a
      href={googleMapsUrl(searchQuery)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${searchQuery} in Google Maps`}
      className="block"
    >
      <div className="relative h-[110px] overflow-hidden rounded-[10px] border border-border bg-surface-1 transition-opacity hover:opacity-80">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 360 110"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <rect width="360" height="110" fill="var(--surface-1)" />
          <g
            stroke="var(--border-strong)"
            strokeWidth="0.6"
            fill="none"
            opacity="0.6"
          >
            <path d="M 0 28 Q 90 23 180 33 T 360 26" />
            <path d="M 0 55 Q 120 50 200 62 T 360 57" />
            <path d="M 0 82 Q 80 77 160 87 T 360 80" />
            <path d="M 80 0 Q 85 37 82 73 T 88 110" />
            <path d="M 200 0 Q 205 46 198 82 T 204 110" />
            <path d="M 300 0 Q 295 41 302 78 T 298 110" />
          </g>
          <circle cx="180" cy="55" r="8" fill="var(--accent)" opacity="0.8" />
          <circle cx="180" cy="55" r="3" fill="var(--fg-on-accent)" />
        </svg>
        <div
          className="absolute bottom-[7px] left-2.5 text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            letterSpacing: '0.04em',
          }}
        >
          {searchQuery}
        </div>
      </div>
    </a>
  )
}

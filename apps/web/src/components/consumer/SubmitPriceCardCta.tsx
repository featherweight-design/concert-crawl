import Link from 'next/link'

interface SubmitPriceCardCtaProps {
  eventId: string
}

export function SubmitPriceCardCta({ eventId }: SubmitPriceCardCtaProps) {
  return (
    <Link
      href={`/events/${eventId}/submit-price`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px dashed var(--border-strong)',
        color: 'var(--fg-muted)',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 12.5,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
          }}
        >
          Saw a different price?
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 11.5,
            color: 'var(--fg-muted)',
            letterSpacing: '-0.005em',
          }}
        >
          Two confirms moves a community price out of pending.
        </span>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--signal)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        Submit
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 2l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  )
}

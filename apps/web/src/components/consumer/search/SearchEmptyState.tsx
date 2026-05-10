import Link from 'next/link'
import { Search } from 'lucide-react'

interface SearchEmptyStateProps {
  query: string
}

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  return (
    <div
      style={{
        padding: '60px 24px 40px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-muted)',
          marginBottom: 6,
        }}
      >
        <Search size={22} strokeWidth={1.5} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 17,
          color: 'var(--fg)',
          letterSpacing: '-0.02em',
        }}
      >
        Nothing for &ldquo;{query}&rdquo;.
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--fg-muted)',
          lineHeight: 1.45,
          maxWidth: 280,
        }}
      >
        Try another spelling, or browse what&rsquo;s on tonight.
      </div>
      <Link
        href="/events"
        style={{
          marginTop: 14,
          padding: '10px 18px',
          borderRadius: 999,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '-0.01em',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Browse all shows →
      </Link>
    </div>
  )
}

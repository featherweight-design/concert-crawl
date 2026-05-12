import type { SubmissionDisplayStatus } from '@concert-crawl/types'

interface StatusPillProps {
  status: SubmissionDisplayStatus
}

const STATUS_STYLE: Record<
  SubmissionDisplayStatus,
  { label: string; color: string }
> = {
  confirmed: { label: 'confirmed', color: 'var(--success)' },
  pending: { label: 'pending', color: 'var(--warning)' },
  disputed: { label: 'disputed', color: 'var(--danger)' },
}

const FALLBACK_STYLE = { label: 'pending', color: 'var(--warning)' }

export function StatusPill({ status }: StatusPillProps) {
  const { label, color } = STATUS_STYLE[status] ?? FALLBACK_STYLE
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 999,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase' as const,
        color,
        background: `color-mix(in oklch, ${color} 10%, transparent)`,
        border: `1px solid ${color}`,
      }}
    >
      {label}
    </span>
  )
}

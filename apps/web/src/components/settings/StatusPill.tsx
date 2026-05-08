import type { SubmissionDisplayStatus } from '@concert-crawl/types'

interface StatusPillProps {
  status: SubmissionDisplayStatus
}

const STATUS_STYLE: Record<
  SubmissionDisplayStatus,
  { label: string; color: string }
> = {
  confirmed: { label: 'confirmed', color: 'var(--success)' },
  pending: { label: 'pending', color: 'var(--fg-subtle)' },
  disputed: { label: 'disputed', color: 'var(--warning)' },
}

export function StatusPill({ status }: StatusPillProps) {
  const { label, color } = STATUS_STYLE[status]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{
        fontFamily: 'var(--font-mono)',
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

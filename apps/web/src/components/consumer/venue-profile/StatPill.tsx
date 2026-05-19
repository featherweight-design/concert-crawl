interface StatPillProps {
  label: string
  value: string
  signal?: boolean
}

export function StatPill({ label, value, signal = false }: StatPillProps) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span
        className="text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        className="font-bold"
        style={{
          fontSize: '12px',
          color: signal ? 'var(--signal)' : 'var(--fg)',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  count?: string
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span
        className="shrink-0 text-[14px] text-fg"
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {title}
      </span>
      <div className="h-px flex-1 bg-border" />
      {count && (
        <span
          className="shrink-0 text-fg-subtle"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

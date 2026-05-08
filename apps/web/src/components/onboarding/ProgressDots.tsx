interface ProgressDotsProps {
  total: number
  index: number
}

export function ProgressDots({ total, index }: ProgressDotsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, ii) => {
        const isDone = ii < index
        const isActive = ii === index
        return (
          <span
            key={ii}
            style={{
              width: isActive ? 28 : 8,
              height: 8,
              borderRadius: 999,
              background: isActive
                ? 'var(--signal)'
                : isDone
                  ? 'var(--signal-muted)'
                  : 'var(--surface-3)',
              transition: 'width 0.25s ease, background 0.2s ease',
            }}
          />
        )
      })}
    </div>
  )
}

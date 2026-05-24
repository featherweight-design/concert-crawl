interface RunHistoryBlocksProps {
  data: number[]
}

export const RunHistoryBlocks = ({ data }: RunHistoryBlocksProps) => {
  if (!data.length) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {data.map((val, idx) => (
          <div
            key={idx}
            style={{
              width: 10,
              height: 18,
              borderRadius: 2,
              opacity: 0.85,
              background: val === 1 ? 'var(--success)' : 'var(--danger)',
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'var(--fg-subtle)',
        }}
      >
        Last {data.length} runs
      </span>
    </div>
  )
}

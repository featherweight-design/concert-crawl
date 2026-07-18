import { ADMIN_COPY } from '@/components/admin/definitions/copy'

interface RunHistoryBlocksProps {
  data: number[]
}

export const RunHistoryBlocks = ({ data }: RunHistoryBlocksProps) => {
  if (!data.length) return null

  return (
    <div
      // Stack the label below the run blocks so the two never overlap at
      // narrow tile widths (≤320px) where a side-by-side row can't fit both.
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
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
        {ADMIN_COPY.dashboard.runHistoryBlocks.lastNRuns(data.length)}
      </span>
    </div>
  )
}

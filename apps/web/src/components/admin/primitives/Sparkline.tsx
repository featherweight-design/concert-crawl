interface SparklineProps {
  data: number[]
  flag?: 'spike' | 'soldout' | null
  width?: number
  height?: number
}

export const Sparkline = ({
  data,
  flag,
  width = 80,
  height = 24,
}: SparklineProps) => {
  if (!data.length) return <div style={{ width, height }} />

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((val, idx) => {
    const pointX = (idx / Math.max(data.length - 1, 1)) * width
    const pointY = height - ((val - min) / range) * (height - 4) - 2
    return `${pointX},${pointY}`
  })

  const color =
    flag === 'spike'
      ? 'var(--danger)'
      : flag === 'soldout'
        ? 'var(--fg-subtle)'
        : 'var(--signal)'
  const lastPointX = data.length > 1 ? width : width / 2
  const lastPointY =
    height - ((data[data.length - 1]! - min) / range) * (height - 4) - 2

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastPointX} cy={lastPointY} r={1.6} fill={color} />
    </svg>
  )
}

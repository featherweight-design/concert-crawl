// Centered state layout (glyph disc · dotted eyebrow · title · body · CTA
// stack) shared by the Spotify empty/failure/success screens (#763 PR 5).
// Mirrors StateBody/GreenDisc from the design handoff's spotify-states.jsx.

type EyebrowTone = 'muted' | 'signal' | 'danger' | 'warning'

const EYEBROW_COLOR: Record<EyebrowTone, string> = {
  muted: 'var(--fg-subtle)',
  signal: 'var(--signal)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
}

type DiscTone = 'signal' | 'muted' | 'danger'

const DISC_STYLE: Record<DiscTone, { background: string; border: string }> = {
  signal: {
    background: 'color-mix(in oklch, var(--signal) 14%, var(--surface-1))',
    border: '1px solid color-mix(in oklch, var(--signal) 30%, transparent)',
  },
  muted: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-strong)',
  },
  danger: {
    background: 'color-mix(in oklch, var(--danger) 16%, var(--surface-1))',
    border: '1px solid color-mix(in oklch, var(--danger) 36%, transparent)',
  },
}

export const StateGlyphDisc = ({
  tone = 'signal',
  children,
}: {
  tone?: DiscTone
  children: React.ReactNode
}) => (
  <div
    className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px]"
    style={DISC_STYLE[tone]}
  >
    {children}
  </div>
)

interface StateBodyProps {
  glyph: React.ReactNode
  eyebrow: string
  eyebrowTone?: EyebrowTone
  title: string
  body: React.ReactNode
  children?: React.ReactNode
}

export const StateBody = ({
  glyph,
  eyebrow,
  eyebrowTone = 'muted',
  title,
  body,
  children,
}: StateBodyProps) => {
  const eyebrowColor = EYEBROW_COLOR[eyebrowTone]
  return (
    <div className="my-auto flex flex-col items-center text-center">
      <div className="mb-[18px]">{glyph}</div>
      <div
        className="mb-2.5 flex items-center gap-[7px] text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ fontFamily: 'var(--font-mono)', color: eyebrowColor }}
      >
        <span
          aria-hidden
          className="h-[5px] w-[5px] rounded-full"
          style={{ background: eyebrowColor }}
        />
        {eyebrow}
      </div>
      <h2 className="mb-2.5 max-w-[300px] text-[25px] font-black leading-[1.14] tracking-[-0.03em] text-fg">
        {title}
      </h2>
      <p className="mb-[22px] max-w-[300px] text-[13.5px] leading-[1.5] text-fg-muted">
        {body}
      </p>
      {children && (
        <div className="flex w-full max-w-[300px] flex-col gap-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

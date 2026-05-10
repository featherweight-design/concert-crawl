import { Eyebrow, Lede, StepHeading } from './_primitives'

export function YoureIn() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <Eyebrow tone="accent">You&apos;re in</Eyebrow>
      <StepHeading>
        One last thing.
        <br />
        <span style={{ color: 'var(--accent)' }}>
          You&apos;ll be shaping the app.
        </span>
      </StepHeading>
      <Lede>
        You&apos;re not just here to use the thing — you&apos;re here to make
        it better. When something changes, we&apos;ll ask what you think. When
        something breaks, we want to know.
      </Lede>
      <Lede>
        The Give Feedback button lives in your menu — always there, never
        buried. Tap it and you&apos;ll see a quick category picker and a
        free-form message field. Thirty seconds. I read every one.
      </Lede>
    </div>
  )
}

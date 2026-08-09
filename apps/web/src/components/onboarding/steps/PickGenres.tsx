'use client'

// Onboarding step 6 of 8. Chips over the bucket labels the browse Vibe filter
// already uses, so a visitor meets the same vocabulary here and on the events
// list rather than two taxonomies for one idea.
//
// ⚠️ These are NOT saved as a preference. There is no column and no migration;
// the selection filters the next step's suggestion query and then goes away.
// (Gate 1 decision D3: artists carry no genre of their own either, so the
// filter runs against the genres of the events they are billed on.)

import { Eyebrow, StepHeading, Lede } from './_primitives'
import { ONBOARDING_COPY } from '../definitions/copy'

const copy = ONBOARDING_COPY.pickGenres

interface PickGenresProps {
  genres: string[]
  selected: ReadonlySet<string>
  onToggle: (genre: string) => void
}

export function PickGenres({ genres, selected, onToggle }: PickGenresProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <StepHeading>{copy.heading}</StepHeading>
      <Lede>{copy.lede}</Lede>

      {genres.length === 0 ? (
        <Lede>{copy.empty}</Lede>
      ) : (
        <div
          role="group"
          aria-label={copy.groupLabel}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {genres.map((genre) => {
            const on = selected.has(genre)
            return (
              <button
                key={genre}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggle(genre)}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                style={{
                  // 44px tall so a chip is a thumb target, not a word. Selected
                  // reads through fill AND border, never colour alone.
                  minHeight: 44,
                  padding: '0 14px',
                  borderRadius: 10,
                  background: on ? 'var(--signal)' : 'var(--surface-1)',
                  border: `1px solid ${on ? 'var(--signal)' : 'var(--border)'}`,
                  color: on ? 'var(--fg-on-accent)' : 'var(--fg)',
                  fontFamily: 'Inter, system-ui',
                  fontSize: 13.5,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  textTransform: 'capitalize',
                }}
              >
                {genre}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

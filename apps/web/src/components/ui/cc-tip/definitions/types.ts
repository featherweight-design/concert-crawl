// Tip content is declared as data, never as JSX at the call site, so the copy
// is reviewable in one file and reusable across surfaces.

export type TipTone = 'neutral' | 'good' | 'warn' | 'bad'

interface TipBase {
  // The overlay's header line, and the trigger's accessible name unless the
  // call site passes a `triggerLabel` to override the latter.
  label: string
}

export interface TipText extends TipBase {
  variant: 'text'
  body: string
}

export interface TipTitled extends TipBase {
  variant: 'titled'
  title: string
  body: string
}

export interface TipDefs extends TipBase {
  variant: 'defs'
  intro?: string
  rows: ReadonlyArray<{ tone: TipTone; title: string; body: string }>
}

export interface TipSteps extends TipBase {
  variant: 'steps'
  steps: readonly string[]
  footer?: string
}

export interface TipExample extends TipBase {
  variant: 'example'
  rows: ReadonlyArray<{
    title: string
    body: string
    say: string
    not: string
  }>
}

export interface TipDos extends TipBase {
  variant: 'dos'
  dos: readonly string[]
  donts: readonly string[]
}

export type TipContent =
  TipText | TipTitled | TipDefs | TipSteps | TipExample | TipDos

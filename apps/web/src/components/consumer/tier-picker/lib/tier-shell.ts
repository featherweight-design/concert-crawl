// Tone shells — verbatim parity with the locked TierCard
// (monetization-tier-states.jsx tierShell). Semantic tokens only, so all
// nine themes hold.

import type { TierKey } from '../definitions/types'

export interface TierShell {
  background: string
  border: string
  accent: string
  shadow: string
}

const SHELLS: Record<TierKey, TierShell> = {
  free: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
    accent: 'var(--fg-muted)',
    shadow: 'none',
  },
  supporter: {
    background: 'color-mix(in oklch, var(--accent) 5%, var(--surface-1))',
    border: '1px solid color-mix(in oklch, var(--accent) 28%, var(--border))',
    accent: 'var(--accent)',
    shadow: 'none',
  },
  premium: {
    background: 'color-mix(in oklch, var(--signal) 5%, var(--surface-1))',
    border:
      '1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))',
    accent: 'var(--signal)',
    shadow: '0 0 0 1px color-mix(in oklch, var(--signal) 22%, transparent)',
  },
  founder: {
    background:
      'linear-gradient(155deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)) 0%, color-mix(in oklch, var(--signal) 8%, var(--surface-1)) 100%)',
    border:
      '1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong))',
    accent: 'var(--signal)',
    shadow: '0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)',
  },
}

export const tierShell = (key: TierKey): TierShell => SHELLS[key]

/** Free's accent is neutral — its "current" stamp uses border-strong. */
export const isNeutralAccent = (shell: TierShell): boolean =>
  shell.accent === 'var(--fg-muted)'

export const stampColor = (shell: TierShell): string =>
  isNeutralAccent(shell) ? 'var(--border-strong)' : shell.accent

// Shared style constants for the triage panel. Kept out of the components so
// the visually-hidden recipe is written once — several elements in this panel
// exist only for screen readers and drifting copies of `clip` would silently
// start showing text.

import type { CSSProperties } from 'react'

export const ADMIN_FONT = "'Inter', system-ui, -apple-system, sans-serif"
export const ADMIN_MONO =
  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

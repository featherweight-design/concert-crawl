import type { GuideChipKey } from '@concert-crawl/types'

interface GuideIconProps {
  chipType: GuideChipKey
  size?: number
}

// Lucide-style 24×24 line glyphs, one per v1 chip key. Ported verbatim from the
// design prototype (guide-data.jsx). Decorative only — every consumer of this
// component pairs it with a text label, so the svg is always aria-hidden.
const PATHS: Record<GuideChipKey, React.ReactNode> = {
  accessibility: (
    <>
      <circle cx="12" cy="4" r="2" />
      <path d="M6 7l4 1.2V13m0 0l-2.4 6M10 13l4 .4 2.5 5.6M6.5 7h7" />
    </>
  ),
  parking: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9.5 16.5V8h3.2a2.6 2.6 0 010 5.2H9.5" />
    </>
  ),
  age_policy: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8" cy="11.5" r="2" />
      <path d="M5.4 16.2a2.9 2.9 0 015.2 0M14 9.5h4.5M14 13h3.5" />
    </>
  ),
  bag_check: (
    <>
      <path d="M5.5 8h13l1 12H4.5l1-12z" />
      <path d="M8.5 8V6.5a3.5 3.5 0 017 0V8" />
    </>
  ),
  coat_check: (
    <path d="M12 4.5a2 2 0 00-1.6 3.2c.4.5.6.9.6 1.3 0 .6-.4 1-1 1.3L4 13.5a1.4 1.4 0 00-.8 1.3V17a1 1 0 001 1h15.6a1 1 0 001-1v-2.2a1.4 1.4 0 00-.8-1.3L14 10.3" />
  ),
  will_call: (
    <>
      <path d="M3 8.5A1.5 1.5 0 014.5 7h15A1.5 1.5 0 0121 8.5v2a1.8 1.8 0 000 3v2A1.5 1.5 0 0119.5 17h-15A1.5 1.5 0 013 15.5v-2a1.8 1.8 0 000-3v-2z" />
      <path d="M13 7v10" strokeDasharray="1.5 2.2" />
    </>
  ),
  food_drink: (
    <path d="M6 3v6a3 3 0 006 0V3M9 3v6M15 3c-1.2.6-2 2-2 3.6 0 1.7.8 2.6 2 2.9V21" />
  ),
  transit: (
    <>
      <rect x="5" y="3.5" width="14" height="13" rx="2.5" />
      <path d="M5 11h14M9 3.5v7.5M15 3.5v7.5" />
      <path d="M8 16.5L6 20M16 16.5L18 20" />
      <circle cx="9" cy="13.7" r=".6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.7" r=".6" fill="currentColor" stroke="none" />
    </>
  ),
}

export const GuideIcon = ({ chipType, size = 16 }: GuideIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {PATHS[chipType]}
  </svg>
)

// The sweeping light band that marks a placeholder as loading rather than
// broken, from design_handoff_discovery_loading (DL_MOTION owns the timing).
//
// No hooks and no 'use client', so server route fallbacks can render it too.
// The parent must be `position: relative` and clip its overflow.

// Tied to --fg so it lightens on dark themes and darkens on Light, and leaves
// --accent alone: a skeleton is never brand presence.
const SWEEP_ANIMATION = 'dlSweep 1500ms cubic-bezier(0.4,0,0.2,1) infinite'

export const SweepOverlay = () => (
  <div
    aria-hidden
    // `.dl-sweep` is what prefers-reduced-motion hides in globals.css.
    className="dl-sweep pointer-events-none absolute inset-0"
    style={{
      background:
        'linear-gradient(100deg, transparent 32%, color-mix(in oklch, var(--fg) 11%, transparent) 50%, transparent 68%)',
      animation: SWEEP_ANIMATION,
    }}
  />
)

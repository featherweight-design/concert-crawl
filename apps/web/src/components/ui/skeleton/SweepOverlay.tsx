// The sweeping light band that marks a placeholder as loading rather than
// broken, from design_handoff_discovery_loading. The timing is the B+ motion
// scale's, not the old DL_MOTION's.
//
// No hooks and no 'use client', so server route fallbacks can render it too.
// The parent must be `position: relative` and clip its overflow.

// Tied to --fg so it lightens on dark themes and darkens on Light, and leaves
// --accent alone: a skeleton is never brand presence.
// The sheen sweeps on the slow motion step and the shared ease (B+ rule 9),
// so it keeps time with every other motion in the app.
export const SWEEP_ANIMATION =
  'dlSweep var(--motion-slow) var(--motion-ease) infinite';

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
);

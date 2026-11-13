// The desktop panel's 2px signal-to-pink top edge (addendum 2, item 16,
// `notifications-panel-d`). An SVG stroke rather than a CSS border so it
// follows the 18px corners and fades out down the sides, exactly as drawn.
// Decorative and non-interactive; the 390 x 36 viewBox is the panel's width.

import { useId } from 'react';

export const NotifPanelEdge = () => {
  const uid = useId();
  const gradientId = `${uid}-edge`;
  const fadeId = `${uid}-fade`;
  const maskId = `${uid}-mask`;
  return (
    <svg
      aria-hidden="true"
      data-testid="notif-panel-edge"
      width="100%"
      height="36"
      viewBox="0 0 390 36"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        // An absolute child anchors to the padding box, inside the panel's
        // 1px border; -1 puts the stroke on the border box as drawn.
        left: -1,
        top: -1,
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--signal)" />
          {/* A style, not the stopColor attribute: custom properties resolve in
              CSS, and the one derived stop must follow the theme. */}
          <stop offset="1" style={{ stopColor: 'var(--cta-end)' }} />
        </linearGradient>
        <linearGradient id={fadeId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.5" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={maskId}>
          <rect width="390" height="36" fill={`url(#${fadeId})`} />
        </mask>
      </defs>
      <path
        d="M1 36 V18 A17 17 0 0 1 18 1 H372 A17 17 0 0 1 389 18 V36"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
};

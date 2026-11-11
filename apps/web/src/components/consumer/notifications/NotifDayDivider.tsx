// The sticky day divider (#737). Ported from notifications-panel.jsx.
//
// `role="presentation"` on purpose: the label is scenery for the eye. Every
// row already speaks its own age ("2 hours ago") inside its accessible name,
// so announcing "Today" as a heading would double the information without
// adding any.
//
// It is opaque (--bg-elevated) rather than translucent because rows scroll
// underneath it.

import { NMono } from './NMono';

export const NotifDayDivider = ({ label }: { label: string }) => (
  <div
    role="presentation"
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 2,
      // B+ (`bp-s-notif_m`): the label sits low over its hairline, with air
      // above it, so a day run reads as a section rather than a stripe.
      padding: '20px 16px 9px',
      background: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <NMono size={10} ls="0.18em">
      {label}
    </NMono>
  </div>
);

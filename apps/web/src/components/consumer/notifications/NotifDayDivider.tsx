// The sticky day divider (#737). Ported from notifications-panel.jsx.
//
// `role="presentation"` on purpose: the label is scenery for the eye. Every
// row already speaks its own age ("2 hours ago") inside its accessible name,
// so announcing "Today" as a heading would double the information without
// adding any.
//
// It is opaque (--bg-elevated) rather than translucent because rows scroll
// underneath it.

import { NMono } from './NMono'

export const NotifDayDivider = ({ label }: { label: string }) => (
  <div
    role="presentation"
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 2,
      padding: '7px 14px 6px',
      background: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <NMono>{label}</NMono>
  </div>
)

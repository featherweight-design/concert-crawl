'use client'

import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export const AllEventsTabContent = () => (
  <div
    style={{
      padding: '64px 32px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      textAlign: 'center',
    }}
  >
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 17,
        fontWeight: 700,
        color: 'var(--fg)',
        marginBottom: 8,
      }}
    >
      {ADMIN_COPY.review.tabs.allEventsPlaceholderHeading}
    </div>
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        color: 'var(--fg-muted)',
        lineHeight: 1.5,
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {ADMIN_COPY.review.tabs.allEventsPlaceholderBody}
    </div>
  </div>
)

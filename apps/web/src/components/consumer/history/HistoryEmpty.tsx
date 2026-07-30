// Entitled user with nothing behind them yet (#70),
// design_handoff_concert_history/history-routes.jsx:57-93.
//
// Reuses the shipped EmptyState so History matches Watching's "Crickets."
// treatment instead of forking a second empty-state look, and adds the handoff's
// dashed stub badge above it.

import { EmptyState } from '@/components/consumer/empty-state'
import { StubStamp } from '@/components/consumer/going/StubStamp'
import { HISTORY_COPY } from './definitions/copy'

const COPY = HISTORY_COPY.empty

export const HistoryEmpty = () => (
  <div className="flex flex-col items-center">
    <div
      aria-hidden
      className="flex items-center justify-center rounded-[14px] border-[1.5px] border-dashed border-border-strong bg-surface-1"
      style={{ width: 64, height: 64 }}
    >
      <StubStamp artist="placeholder-empty" size={36} />
    </div>
    <EmptyState
      state="no-data"
      eyebrow={COPY.eyebrow}
      title={COPY.headline}
      body={COPY.body}
      primaryCta={{ label: COPY.cta, href: '/events' }}
    />
  </div>
)

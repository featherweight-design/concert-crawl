'use client';

import type { ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  KindLabel,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import { PhoneItemPage } from './PhoneItemPage';
import {
  answeredName,
  evidenceText,
  kindLabelOf,
  metaOf,
  panelTitleOf,
  whatOf,
} from './needs-you-rules';
import type { AnswerParams, NeedsYouAnswer, QueueRow } from './needs-you-api';
import { ShowDroppedPanel } from './panels/ShowDroppedPanel';
import { ShowMovedPanel } from './panels/ShowMovedPanel';
import { ArtistPanel } from './panels/ArtistPanel';
import { BugPanel } from './panels/BugPanel';
import { EventPanel } from './panels/EventPanel';
import { PriceCheckPanel } from './panels/PriceCheckPanel';
import { VenuePanel } from './panels/VenuePanel';

const COPY = ADMIN_COPY.needsYou;

interface EvidenceSlotProps {
  row: QueueRow;
  /** Mountain Time's today, `YYYY-MM-DD`. */
  today: string;
  /** True when this item is first in the queue's own order. */
  ranksFirst: boolean;
  busy: boolean;
  onClose: () => void;
  onAnswer: (answer: NeedsYouAnswer, params?: AnswerParams) => void;
  /** The phone's ⋯ sheet snoozes from the item itself. */
  onSnooze: (until: string) => void;
  onNotUseful: (reason: string) => void;
}

/** The kinds whose panel is drawn per kind; the rest keep the generic one. */
const drawnPanel = (kind: QueueRow['kind']) => {
  switch (kind) {
    case 'show-dropped':
      return ShowDroppedPanel;
    case 'show-moved':
      return ShowMovedPanel;
    case 'venue-failing':
    case 'venue-blocked':
      return VenuePanel;
    case 'artist':
      return ArtistPanel;
    case 'event-low-confidence':
      return EventPanel;
    case 'price-check':
      return PriceCheckPanel;
    case 'bug':
      return BugPanel;
    default:
      return null;
  }
};

/**
 * The item's own panel: `SidePanel` beside the list on desktop (so you can
 * work down the queue), over the page on the phone. 2b draws the shell: what
 * happened, the evidence lines the API sends, and every answer. Each kind's
 * drawn evidence (the run bars, the two prices, the match) lands in 2c, in
 * `[data-testid="evidence-panel"]`.
 */
export const EvidenceSlot = ({
  row,
  today,
  ranksFirst,
  busy,
  onClose,
  onAnswer,
  onSnooze,
  onNotUseful,
}: EvidenceSlotProps) => {
  const isPhone = useIsPhone();
  const Drawn = drawnPanel(row.kind);
  // Desktop docks the panel beside the list; the phone opens the item as a
  // full page (`02/an-item-mobile`) with its own back row, ⋯ and answer footer.
  const frame = (
    title: string,
    subtitle: string | undefined,
    body: ReactNode,
  ) =>
    isPhone ? (
      <PhoneItemPage
        eyebrow={<KindLabel kind={kindLabelOf(row.kind)} />}
        title={title}
        menuTitle={answeredName(row.title)}
        venue={
          row.venueId && row.venueName
            ? { id: row.venueId, name: row.venueName }
            : null
        }
        busy={busy}
        onClose={onClose}
        onSnooze={onSnooze}
        onNotUseful={row.venueId ? onNotUseful : undefined}
      >
        {subtitle && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>
            {subtitle}
          </p>
        )}
        {body}
      </PhoneItemPage>
    ) : (
      <SidePanel
        inline
        onClose={onClose}
        eyebrow={<KindLabel kind={kindLabelOf(row.kind)} />}
        title={title}
        {...(subtitle ? { subtitle } : {})}
      >
        {body}
      </SidePanel>
    );
  if (Drawn)
    return frame(
      panelTitleOf(row),
      undefined,
      <div
        data-testid="evidence-panel"
        data-kind={row.kind}
        style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <Drawn
          row={row}
          today={today}
          ranksFirst={ranksFirst}
          busy={busy}
          onAnswer={onAnswer}
        />
      </div>,
    );
  return frame(
    row.title,
    metaOf(row),
    <div
      data-testid="evidence-panel"
      data-kind={row.kind}
      style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <p style={{ margin: 0, fontSize: 14, color: 'var(--fg)' }}>
        {whatOf(row)}
      </p>
      {row.evidence.length > 0 && (
        <section>
          <h3 style={SECTION_HEAD}>{COPY.panel.details}</h3>
          <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
            {row.evidence.map((line) => (
              <div
                key={line.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <dt style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                  {line.label}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: 'var(--fg)',
                    textAlign: 'right',
                  }}
                >
                  {evidenceText(line.label, line.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <section>
        <h3 style={SECTION_HEAD}>{COPY.panel.yourAnswer}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {row.answers.map((answer) => (
            <AdminButton
              key={answer.slug}
              variant={answer.suggested ? 'gradient' : 'outline'}
              disabled={busy}
              data-testid="needs-you-answer"
              data-slug={answer.slug}
              onClick={() => onAnswer(answer)}
            >
              {answer.label}
            </AdminButton>
          ))}
        </div>
      </section>
    </div>,
  );
};

const SECTION_HEAD = {
  margin: '0 0 10px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  color: 'var(--fg-subtle)',
} as const;

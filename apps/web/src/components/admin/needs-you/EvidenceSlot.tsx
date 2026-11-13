'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  KindLabel,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import {
  evidenceText,
  kindLabelOf,
  metaOf,
  panelTitleOf,
  whatOf,
} from './needs-you-rules';
import type { NeedsYouAnswer, QueueRow } from './needs-you-api';
import { ShowDroppedPanel } from './panels/ShowDroppedPanel';
import { ShowMovedPanel } from './panels/ShowMovedPanel';
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
  onAnswer: (answer: NeedsYouAnswer) => void;
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
}: EvidenceSlotProps) => {
  const isPhone = useIsPhone();
  const Drawn = drawnPanel(row.kind);
  if (Drawn)
    return (
      <SidePanel
        inline={!isPhone}
        onClose={onClose}
        eyebrow={<KindLabel kind={kindLabelOf(row.kind)} />}
        title={panelTitleOf(row)}
      >
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
        </div>
      </SidePanel>
    );
  return (
    <SidePanel
      inline={!isPhone}
      onClose={onClose}
      eyebrow={<KindLabel kind={kindLabelOf(row.kind)} />}
      title={row.title}
      subtitle={metaOf(row)}
    >
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
      </div>
    </SidePanel>
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

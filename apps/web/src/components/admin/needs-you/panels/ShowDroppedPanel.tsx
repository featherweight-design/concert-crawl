'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  droppedWhat,
  mountainStamp,
  whenChipOf,
  whoSeesDropped,
} from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import {
  AnswerButtons,
  Chip,
  ChipRow,
  Prose,
  RowCard,
  Section,
} from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;

/** `02/show-dropped-off-a-calendar`. */
export const ShowDroppedPanel = ({
  row,
  today,
  ranksFirst,
  busy,
  onAnswer,
}: PanelProps) => {
  const chip = whenChipOf(row.fanDate, today);
  const seen = row.lastSeenAt ? mountainStamp(row.lastSeenAt) : null;
  // Only where the classifier looked and found no same-act listing elsewhere:
  // a null or 'moved' classification makes no such claim.
  const noneElsewhere =
    row.classification === 'crawl_gap' || row.classification === 'removed';
  return (
    <>
      <ChipRow>
        {chip && (
          <Chip kind={chip.soon ? 'accent' : 'neutral'} dot>
            {chip.text}
          </Chip>
        )}
        {row.watchers > 0 && (
          <Chip kind="neutral">
            {ADMIN_COPY.needsYou.watching(row.watchers)}
          </Chip>
        )}
      </ChipRow>
      <Section label={PANEL.whatHappened}>
        <Prose>
          {droppedWhat(row)}
          {row.otherShowsCrawledFine
            ? ` ${PANEL.showDropped.otherFine(row.otherShowsCrawledFine, row.venueName)}`
            : ''}
        </Prose>
      </Section>
      {(seen || noneElsewhere) && (
        <Section label={PANEL.checkedForYou}>
          <RowCard
            rows={[
              ...(seen ? [{ label: PANEL.lastSeen, value: seen }] : []),
              // A same-act listing elsewhere would have made this a show-moved
              // item, so a dropped show has none: the board's row is honest.
              ...(noneElsewhere
                ? [
                    {
                      label: PANEL.showDropped.sameAct,
                      value: PANEL.showDropped.noneFound,
                    },
                  ]
                : []),
            ]}
          />
        </Section>
      )}
      <Section label={PANEL.whoSeesIt}>
        <Prose>{whoSeesDropped(row, today, ranksFirst)}</Prose>
      </Section>
      <AnswerButtons
        row={row}
        busy={busy}
        note={PANEL.showDropped.answerNote}
        onAnswer={onAnswer}
      />
    </>
  );
};

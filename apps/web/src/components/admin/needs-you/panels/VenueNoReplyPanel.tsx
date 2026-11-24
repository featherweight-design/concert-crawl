'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { VenueStatus } from '@/components/admin/primitives/VenueStatus';
import { permissionMailto } from '@/lib/admin/permission-note';
import { evidenceValue } from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import { AnswerButtons, ChipRow, Prose, RowCard, Section } from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;
const COPY = PANEL.venue.noReply;

/** `05/no-reply-d` and `05/no-reply-m`: a draft with a permission note out for 14 days. */
export const VenueNoReplyPanel = ({ row, busy, onAnswer }: PanelProps) => {
  const asked = evidenceValue(row, 'Asked');
  const email = evidenceValue(row, 'Sent to');
  const found = evidenceValue(row, 'Shows found');
  const robots = evidenceValue(row, 'robots.txt');
  const fans = evidenceValue(row, 'Asked for by');
  const stands = [
    ...(asked
      ? [{ label: COPY.asked, value: email ? `${asked}, to ${email}` : asked }]
      : []),
    {
      label: COPY.stepsDone,
      value: `${COPY.basics}, ${COPY.source(found)}`,
    },
    ...(robots ? [{ label: PANEL.venue.robotsTxt, value: robots }] : []),
    ...(fans ? [{ label: COPY.askedFor, value: COPY.fans(fans) }] : []),
  ];
  return (
    <>
      <ChipRow>
        <VenueStatus
          venue={{
            active: false,
            wentLiveAt: null,
            crawlPausedAt: null,
            blockedAt: null,
            consecutiveFailures: 0,
            robotsTxtAllowed: true,
          }}
          crawlingLabel={COPY.waitingChip}
        />
      </ChipRow>
      <Section label={PANEL.whatHappened}>
        <Prose>{COPY.whatHappened(row.venueName, asked)}</Prose>
      </Section>
      <Section label={COPY.whereItStands}>
        <RowCard rows={stands} />
      </Section>
      <Section label={PANEL.whoSeesIt}>
        <Prose>{COPY.nobodyYet(row.venueName)}</Prose>
      </Section>
      <AnswerButtons
        row={row}
        busy={busy}
        note={COPY.note}
        onAnswer={(answer, params) => {
          // Ask again sends the note from the admin's own mail, so the link
          // opens inside the tap that answers.
          if (answer.slug === 'ask_again' && row.venueName) {
            window.location.href = permissionMailto(row.venueName, email);
          }
          onAnswer(answer, params);
        }}
      />
    </>
  );
};

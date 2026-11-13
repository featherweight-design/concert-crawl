'use client';

import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { minutesSince, pagePathOf } from '../needs-you-rules';
import type { PanelProps } from './panel-props';
import {
  AnswerButtons,
  Chip,
  ChipRow,
  LinkButton,
  Prose,
  RowCard,
  Section,
} from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;

/** `02/bug-or-error-report`. The reply box waits for the reply endpoint (5d). */
export const BugPanel = ({ row, busy, onAnswer }: PanelProps) => {
  const facts = row.bugFacts;
  const minutes = minutesSince(facts?.createdAt ?? null, Date.now());
  const page = row.evidence.find((line) => line.label === 'Page')?.value;
  const rows = [
    ...(facts?.handle
      ? [{ label: PANEL.bug.from, value: `@${facts.handle}` }]
      : []),
    ...(page ? [{ label: PANEL.bug.page, value: pagePathOf(page) }] : []),
  ];
  const message = facts?.message ?? row.title;

  return (
    <>
      <ChipRow>
        <Chip kind="neutral" dot>
          {minutes === null
            ? PANEL.bug.kind
            : PANEL.bug.newChip(PANEL.bug.ago(minutes))}
        </Chip>
        {minutes !== null && <Chip kind="neutral">{PANEL.bug.kind}</Chip>}
      </ChipRow>
      <Section label={PANEL.bug.report}>
        <Prose>{`“${message}”`}</Prose>
        {facts?.screenshot && (
          // eslint-disable-next-line @next/next/no-img-element -- the reporter's inline data image, never fetched from a URL
          <img
            src={facts.screenshot}
            alt={PANEL.bug.screenshotAlt}
            data-testid="bug-screenshot"
            style={{
              display: 'block',
              maxWidth: '100%',
              marginTop: 10,
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}
          />
        )}
      </Section>
      {rows.length > 0 && (
        <Section label={PANEL.bug.context}>
          <RowCard rows={rows} />
        </Section>
      )}
      <AnswerButtons
        row={row}
        busy={busy}
        note={null}
        extra={
          facts?.issueUrl ? (
            <LinkButton
              href={facts.issueUrl}
              external
              testId="open-github"
              icon={<ExternalLink size={14} aria-hidden />}
            >
              {PANEL.bug.openGithub}
            </LinkButton>
          ) : null
        }
        onAnswer={onAnswer}
      />
    </>
  );
};

'use client';

import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  priceDay,
  priceRangeOf,
  todayStamp,
  whenChipOf,
  whenWord,
} from '../needs-you-rules';
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

const PriceCard = ({
  label,
  price,
  when,
  fans,
  accent,
  testId,
}: {
  label: string;
  price: string | null;
  when: string | null;
  fans: number | null;
  accent: boolean;
  testId: string;
}) => (
  <div
    data-testid={testId}
    style={{
      flex: '1 1 140px',
      minWidth: 0,
      padding: 12,
      borderRadius: 12,
      // The card under check wears the gradient ring (`price-check-m`).
      ...(accent
        ? {
            border: '1.5px solid transparent',
            background:
              'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent)) border-box',
          }
        : {
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
          }),
    }}
  >
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.12em',
        color: 'var(--fg-subtle)',
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 800,
        margin: '6px 0',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {price ?? ''}
    </div>
    {/* One line: the day, then how many fans ("Sep 18 · 1 fan"). */}
    {(when || fans !== null) && (
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {[when, fans !== null ? PANEL.priceCheck.fans(fans) : null]
          .filter((part) => part)
          .join(' · ')}
      </div>
    )}
  </div>
);

/** `02/price-check`. */
export const PriceCheckPanel = ({ row, today, busy, onAnswer }: PanelProps) => {
  const facts = row.priceFacts;
  const chip = whenChipOf(row.fanDate, today);
  const listed = facts ? priceRangeOf(facts.listed, facts.listedMax) : null;
  const checked = facts ? priceRangeOf(facts.checked, facts.checkedMax) : null;
  const listedDay = priceDay(facts?.listedAt ?? null);
  const chipText = [chip?.text.split(' · ')[0], row.venueName]
    .filter((part) => part)
    .join(' · ');
  const checkerAll = facts?.checkerSubmissions ?? 0;

  return (
    <>
      <ChipRow>
        {chipText && (
          <Chip kind={chip?.soon ? 'accent' : 'neutral'} dot>
            {chipText}
          </Chip>
        )}
        {row.watchers > 0 && (
          <Chip kind="neutral">
            {ADMIN_COPY.needsYou.watching(row.watchers)}
          </Chip>
        )}
      </ChipRow>
      <Section label={PANEL.priceCheck.twoPrices}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <PriceCard
            testId="price-listed"
            label={PANEL.priceCheck.listedNow}
            price={listed}
            when={listedDay ? PANEL.priceCheck.submitted(listedDay) : null}
            fans={facts?.listedFans ?? null}
            accent={false}
          />
          <PriceCard
            testId="price-checked"
            label={PANEL.priceCheck.check}
            price={checked}
            when={todayStamp(facts?.checkedAt ?? null, today)}
            fans={facts?.checkedFans ?? null}
            accent
          />
        </div>
      </Section>
      {checkerAll > 0 && (
        <Section label={PANEL.checkedForYou}>
          <RowCard
            rows={[
              {
                label: PANEL.priceCheck.checker,
                value: PANEL.priceCheck.checkerValue(
                  checkerAll,
                  facts?.checkerApproved ?? 0,
                ),
              },
            ]}
          />
        </Section>
      )}
      {row.watchers > 0 && row.fanDate && (
        <Section label={PANEL.whoSeesIt}>
          <Prose>
            {PANEL.priceCheck.watching(
              row.watchers,
              whenWord(row.fanDate, today),
            )}
          </Prose>
        </Section>
      )}
      <AnswerButtons
        row={row}
        busy={busy}
        note={PANEL.priceCheck.note}
        labelOf={(answer) =>
          answer.slug === 'use_checked_price' && checked
            ? PANEL.priceCheck.use(checked)
            : answer.slug === 'keep_listed_price' && listed
              ? PANEL.priceCheck.keep(listed)
              : answer.label
        }
        extra={
          facts?.ticketUrl ? (
            <LinkButton
              href={facts.ticketUrl}
              external
              testId="open-ticket-page"
              icon={<ExternalLink size={14} aria-hidden />}
            >
              {PANEL.priceCheck.openTicket}
            </LinkButton>
          ) : null
        }
        extraFirst
        onAnswer={onAnswer}
      />
    </>
  );
};

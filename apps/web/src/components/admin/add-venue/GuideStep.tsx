'use client';

/**
 * Add a venue, step 4: First-timer guide (`05/step-4-first-timer-guide-optional`,
 * `05/guide-mobile`, `05/guide-nothing-to-draft-from`). The sections are drafted
 * from the venue's own pages when the step opens; each is editable, and
 * Continue saves what is written (a draft, published with the venue). The
 * Insider tip is the admin's own and never drafted.
 */

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { GUIDE_CHIP_ORDER, GUIDE_FIELD_MAX_LENGTH } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import { Card } from '@/components/admin/venues/source/source-parts';
import type { GuideDrafts } from '@/lib/admin/guide-drafts-schema';
import {
  draftedHost,
  pathOf,
  sectionFor,
  sourceLabel,
  tagOf,
  type GuideFields,
  type GuideTag,
} from './guide-rules';

const COPY = ADMIN_COPY.addVenue.guide;
const SECTION_NAMES = ADMIN_COPY.venueGuide.section;

const lineStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.45,
  margin: 0,
};

const TAG_KIND = {
  drafted: 'signal',
  check: 'warning',
  blank: 'neutral',
  yours: 'neutral',
} as const;

/** The draft's cost as "$0.02"; null when the route asked nothing. */
const costLabel = (cost: number | null): string | null =>
  cost === null ? null : `$${cost.toFixed(2)}`;

/** idle until the flow starts the first draft; the flow owns the call. */
export type GuideStatus = 'idle' | 'drafting' | 'failed' | 'ready';

interface GuideStepProps {
  phone: boolean;
  status: GuideStatus;
  /** A Redraft failed: the fields stay as they were. */
  redraftFailed: boolean;
  /** What the route last returned; null before the first draft or after a failure. */
  drafts: GuideDrafts | null;
  fields: GuideFields;
  /** True once the admin chose to write it themselves, or the drafts landed. */
  opened: boolean;
  /** Why Continue's save failed, shown under the fields. */
  saveError: string | null;
  /** Starts a draft; the flow runs one call at a time and keeps its result. */
  onDraft: (again: boolean) => void;
  onFields: (fields: GuideFields) => void;
  onOpened: () => void;
  onSkip: () => void;
}

const fieldStyle = (phone: boolean): CSSProperties => ({
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 76,
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg)',
  color: 'var(--fg)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  // 16px on the phone, so iOS Safari doesn't zoom into the field.
  fontSize: phone ? 16 : 13.5,
  lineHeight: 1.5,
  resize: 'vertical',
});

const Tag = ({ tag }: { tag: GuideTag }) => (
  <StatusBadge kind={TAG_KIND[tag]} dot>
    {COPY.tags[tag]}
  </StatusBadge>
);

export const GuideStep = ({
  phone,
  status,
  redraftFailed,
  drafts,
  fields,
  opened,
  saveError,
  onDraft,
  onFields,
  onOpened,
  onSkip,
}: GuideStepProps) => {
  // The first draft starts once per venue: the flow guards it, so Back and
  // Continue (a remount) never spend a second model call.
  useEffect(() => {
    if (status === 'idle') onDraft(false);
    // Mount only: a draft is a model call and must not rerun on a prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, []);

  const change = (patch: Partial<GuideFields>) =>
    onFields({ ...fields, ...patch });

  if ((status === 'idle' || status === 'drafting') && drafts === null) {
    return (
      <>
        <Heading phone={phone} sub={COPY.sub} />
        <Card
          title={COPY.drafting}
          phone={phone}
          testId="add-venue-guide-drafting"
        >
          <p style={lineStyle}>{COPY.draftingSub}</p>
        </Card>
      </>
    );
  }

  if (status === 'failed' && !opened) {
    return (
      <>
        <Heading phone={phone} sub={COPY.sub} />
        <Card
          title={COPY.failedTitle}
          phone={phone}
          testId="add-venue-guide-failed"
          warning
        >
          <p style={lineStyle} role="alert">
            {COPY.failedBody}
          </p>
          <Actions>
            <AdminButton variant="outline" onClick={() => onDraft(false)}>
              {COPY.tryAgain}
            </AdminButton>
            <AdminButton variant="ghost" onClick={onOpened}>
              {COPY.writeMyself}
            </AdminButton>
          </Actions>
        </Card>
      </>
    );
  }

  const empty =
    drafts !== null &&
    drafts.sections.every((section) => section.state === 'blank');
  if (empty && !opened) {
    return (
      <>
        <Heading phone={phone} sub={COPY.sub} />
        <Card
          title={COPY.nothingTitle}
          phone={phone}
          testId="add-venue-guide-nothing"
        >
          <div>
            <StatusBadge kind="neutral" dot>
              {COPY.nothingBadge}
            </StatusBadge>
          </div>
          <p style={lineStyle}>{COPY.nothingBody}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {drafts.sources.map((source) => (
              <li
                key={source.url}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: '1px solid var(--border)',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--fg-muted)' }}>
                  {sourceLabel(source)}
                </span>
                <span>{COPY.pageStatus[source.status]}</span>
              </li>
            ))}
          </ul>
          <Actions>
            <AdminButton variant="outline" onClick={onOpened}>
              {COPY.writeMyself}
            </AdminButton>
            <AdminButton variant="ghost" onClick={onSkip}>
              {ADMIN_COPY.addVenue.footer.skip}
            </AdminButton>
          </Actions>
        </Card>
      </>
    );
  }

  const host = drafts === null ? null : draftedHost(drafts);
  const pages =
    drafts === null
      ? []
      : drafts.sources
          .filter((source) => source.status === 'read')
          .map((source) => pathOf(source.url));
  return (
    <>
      <Heading phone={phone} sub={COPY.sub} />
      <Card
        title={COPY.cardTitle}
        phone={phone}
        testId="add-venue-guide"
        actions={
          drafts === null ? undefined : (
            <AdminButton
              variant="outline"
              size="sm"
              icon={Sparkles}
              disabled={status === 'drafting'}
              onClick={() => onDraft(true)}
              data-testid="add-venue-guide-redraft"
            >
              {status === 'drafting' ? COPY.redrafting : COPY.redraft}
            </AdminButton>
          )
        }
      >
        {redraftFailed && (
          <p role="alert" style={{ ...lineStyle, color: 'var(--danger)' }}>
            {COPY.redraftFailed}
          </p>
        )}
        {drafts !== null && host !== null && (
          <p style={lineStyle}>
            {COPY.drafted(
              `${host}${pages.length === 0 ? '' : ` ${pages.join(' and ')}`}`,
              costLabel(drafts.costUsd),
            )}
          </p>
        )}
        <Field
          phone={phone}
          testId="add-venue-guide-field-insider_tip"
          label={SECTION_NAMES.insider_tip}
          eyebrow={COPY.surfacedFirst}
          tag={<Tag tag="yours" />}
          value={fields.insiderTip}
          placeholder={COPY.insiderPlaceholder}
          hint={COPY.insiderHint}
          onChange={(insiderTip) => change({ insiderTip })}
        />
        {GUIDE_CHIP_ORDER.map((key) => {
          const section = sectionFor(drafts, key);
          const text = fields.chips[key];
          const tag = tagOf(drafts, key, text);
          const path = section?.sourceUrl ? pathOf(section.sourceUrl) : null;
          return (
            <Field
              key={key}
              phone={phone}
              testId={`add-venue-guide-field-${key}`}
              label={SECTION_NAMES[key]}
              required={key === 'accessibility'}
              tag={<Tag tag={tag} />}
              value={text}
              hint={
                path === null || tag === 'yours' || tag === 'blank'
                  ? undefined
                  : section?.note
                    ? COPY.fromNote(path, section.note)
                    : COPY.from(path)
              }
              highlight={tag === 'check'}
              onChange={(body) =>
                change({ chips: { ...fields.chips, [key]: body } })
              }
            />
          );
        })}
        {saveError !== null && (
          <p role="alert" style={{ ...lineStyle, color: 'var(--danger)' }}>
            {saveError}
          </p>
        )}
      </Card>
    </>
  );
};

const Heading = ({ phone, sub }: { phone: boolean; sub: string }) => (
  <div>
    <h1 style={{ margin: 0, fontSize: phone ? 20 : 22, fontWeight: 800 }}>
      {COPY.title}
    </h1>
    <p style={{ ...lineStyle, marginTop: 6 }}>{sub}</p>
  </div>
);

const Actions = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
);

const Field = ({
  phone,
  testId,
  label,
  eyebrow,
  required = false,
  tag,
  value,
  placeholder,
  hint,
  highlight = false,
  onChange,
}: {
  phone: boolean;
  testId: string;
  label: string;
  eyebrow?: string;
  required?: boolean;
  tag: ReactNode;
  value: string;
  placeholder?: string;
  hint?: string | undefined;
  highlight?: boolean;
  onChange: (value: string) => void;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label htmlFor={testId} style={{ fontSize: 14, fontWeight: 700 }}>
        {label}
      </label>
      {eyebrow !== undefined && (
        <span style={{ fontSize: 10.5, color: 'var(--fg-subtle)' }}>
          {eyebrow}
        </span>
      )}
      {required && (
        <span style={{ fontSize: 10.5, color: 'var(--danger)' }}>
          {COPY.required}
        </span>
      )}
      <span style={{ flex: 1 }} />
      {tag}
    </div>
    <textarea
      id={testId}
      data-testid={testId}
      value={value}
      aria-required={required || undefined}
      aria-describedby={`${testId}-meta`}
      maxLength={GUIDE_FIELD_MAX_LENGTH}
      {...(placeholder === undefined ? {} : { placeholder })}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...fieldStyle(phone),
        ...(highlight ? { borderColor: 'var(--warning)' } : {}),
      }}
    />
    <div
      id={`${testId}-meta`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        fontSize: 12,
        color: 'var(--fg-subtle)',
      }}
    >
      <span>{hint ?? ''}</span>
      <span>{COPY.left(GUIDE_FIELD_MAX_LENGTH - value.length)}</span>
    </div>
  </div>
);

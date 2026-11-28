'use client';

/**
 * Add a venue, step 5: Review (`05/review-desktop`, `05/review-not-ready`,
 * `05/step-5-review-mobile`, and the phone addendum's going live and go live
 * failed). One row per step with its state, then what happens on Go live.
 * Go live itself sits in the shell's footer. Icon and Guide have no step in
 * this build, so they read as skipped. Source must have passed a test.
 */

import type { CSSProperties, ReactNode } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, StatusBadge } from '@/components/admin/primitives';
import {
  Card,
  linkButton,
} from '@/components/admin/venues/source/source-parts';
import type { BasicsDraft } from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;
const REVIEW = COPY.review;

const lineStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.45,
  margin: 0,
};

const Row = ({
  testId,
  name,
  detail,
  badge,
  onEdit,
}: {
  testId: string;
  name: string;
  detail: string;
  badge: ReactNode;
  onEdit?: () => void;
}) => (
  <div
    data-testid={testId}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderTop: '1px solid var(--border)',
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
      <div style={{ ...lineStyle, overflowWrap: 'anywhere' }}>{detail}</div>
    </div>
    {badge}
    {onEdit !== undefined && (
      <button
        type="button"
        onClick={onEdit}
        data-testid={`${testId}-edit`}
        style={linkButton}
      >
        {REVIEW.edit}
      </button>
    )}
  </div>
);

const basicsDetail = (basics: BasicsDraft): string =>
  [basics.address.trim(), basics.slug === '' ? '' : `/v/${basics.slug}`]
    .filter((part) => part !== '')
    .join(' · ');

interface ReviewStepProps {
  phone: boolean;
  basics: BasicsDraft;
  /** Shows the passing test found; null when Source has not passed. */
  found: number | null;
  going: boolean;
  /** The icon saved on step 3, as its Review line; null when skipped. */
  iconLine?: string | null;
  /** Go live was refused or failed: nothing was published. */
  failed: 'failed' | 'robots' | null;
  onRetry: () => void;
  onEditBasics: () => void;
  onEditSource: () => void;
  onSaveDraft: () => void;
}

export const ReviewStep = ({
  phone,
  basics,
  found,
  going,
  iconLine = null,
  failed,
  onRetry,
  onEditBasics,
  onEditSource,
  onSaveDraft,
}: ReviewStepProps) => {
  const ready = found !== null;
  const name = basics.name.trim() || COPY.rail.unnamed;
  return (
    <>
      <div>
        <h1 style={{ margin: 0, fontSize: phone ? 20 : 22, fontWeight: 800 }}>
          {ready ? REVIEW.title : REVIEW.notReadyTitle}
        </h1>
        {!ready && (
          <div style={{ marginTop: 8 }}>
            <StatusBadge kind="warning" dot>
              {REVIEW.notReadyBadge}
            </StatusBadge>
          </div>
        )}
        <p style={{ ...lineStyle, marginTop: 6 }}>
          {ready ? REVIEW.sub : REVIEW.notReadySub}
        </p>
      </div>
      <Card title={name} phone={phone} testId="add-venue-review-rows">
        <Row
          testId="add-venue-review-basics"
          name={REVIEW.rows.basics}
          detail={basicsDetail(basics)}
          badge={<StatusBadge kind="success">{REVIEW.done}</StatusBadge>}
          onEdit={onEditBasics}
        />
        <Row
          testId="add-venue-review-source"
          name={REVIEW.rows.source}
          detail={ready ? REVIEW.sourcePassed(found) : REVIEW.sourceNotPassed}
          badge={
            ready ? (
              <StatusBadge kind="success">{REVIEW.done}</StatusBadge>
            ) : (
              <StatusBadge kind="warning">{REVIEW.required}</StatusBadge>
            )
          }
          onEdit={onEditSource}
        />
        <Row
          testId="add-venue-review-icon"
          name={REVIEW.rows.icon}
          detail={iconLine ?? REVIEW.skipped}
          badge={
            iconLine === null ? (
              <StatusBadge>{REVIEW.later}</StatusBadge>
            ) : (
              <StatusBadge kind="success">{REVIEW.done}</StatusBadge>
            )
          }
        />
        <Row
          testId="add-venue-review-guide"
          name={REVIEW.rows.guide}
          detail={REVIEW.skipped}
          badge={<StatusBadge>{REVIEW.later}</StatusBadge>}
        />
        <Row
          testId="add-venue-review-details"
          name={REVIEW.rows.details}
          detail={REVIEW.detailsLine}
          badge={<StatusBadge>{REVIEW.later}</StatusBadge>}
        />
      </Card>
      {ready && (
        <Card
          title={REVIEW.when.title}
          phone={phone}
          testId="add-venue-review-when"
        >
          <Row
            testId="add-venue-review-when-shows"
            name={REVIEW.when.shows}
            detail={REVIEW.when.showsValue}
            badge={null}
          />
          <Row
            testId="add-venue-review-when-nightly"
            name={REVIEW.when.nightly}
            detail={REVIEW.when.nightlyValue}
            badge={null}
          />
          <p style={lineStyle}>{REVIEW.when.note}</p>
        </Card>
      )}
      {ready && failed !== null && !going && (
        <div
          role="alert"
          data-testid="add-venue-go-live-failed"
          style={{
            border: '1px solid var(--danger)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <strong style={{ fontSize: 14 }}>{REVIEW.failedTitle(name)}</strong>
          <p style={lineStyle}>
            {failed === 'robots' ? REVIEW.failedRobots : REVIEW.failedBody}
          </p>
          <div>
            {failed === 'robots' ? (
              <AdminButton
                variant="outline"
                onClick={onEditSource}
                data-testid="add-venue-go-live-fix"
              >
                {REVIEW.fixSource}
              </AdminButton>
            ) : (
              <AdminButton
                variant="outline"
                onClick={onRetry}
                data-testid="add-venue-go-live-retry"
              >
                {REVIEW.tryAgain}
              </AdminButton>
            )}
          </div>
        </div>
      )}
      {ready ? (
        <p style={lineStyle} data-testid="add-venue-go-live-sub">
          {REVIEW.goLiveSub}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <AdminButton
            variant="outline"
            onClick={onEditSource}
            data-testid="add-venue-fix-source"
          >
            {REVIEW.fixSource}
          </AdminButton>
          <AdminButton
            variant="ghost"
            onClick={onSaveDraft}
            data-testid="add-venue-save-draft"
          >
            {REVIEW.saveDraft}
          </AdminButton>
        </div>
      )}
    </>
  );
};

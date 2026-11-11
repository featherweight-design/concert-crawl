'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ER_POLICY } from '@concert-crawl/types';
import { ApiError } from '@/lib/api';
import { fileEventReport, withdrawEventReport } from '@/lib/events';
import { REPORTING_COPY } from './definitions/copy';
import { REPORT_TOKENS } from './reportTokens';
import { ReportGlyph } from './ReportTypeMark';
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import { denverTodayUtcMs } from '@/lib/time';

const copy = REPORTING_COPY.evidenceForm;

const AZURE = 'oklch(0.62 0.12 240)';
const NOTES_MAX_CHARS = 280;

// ── Evidence method type ──────────────────────────────────────────
type EvidenceMethod =
  'got_email' | 'saw_social' | 'venue_posted' | 'was_there' | 'something_else';

type ApiEvidenceMethod =
  'bought_myself' | 'saw_listing' | 'venue_site' | 'other';

const EVIDENCE_METHOD_TO_API: Record<EvidenceMethod, ApiEvidenceMethod> = {
  got_email: 'saw_listing',
  saw_social: 'saw_listing',
  venue_posted: 'venue_site',
  was_there: 'bought_myself',
  something_else: 'other',
};

type ReportType = 'sold-out' | 'cancelled' | 'postponed';

// ── Evidence option data ──────────────────────────────────────────
interface EvidenceOptionData {
  method: EvidenceMethod;
  label: string;
  description: string;
}

const EVIDENCE_OPTIONS: EvidenceOptionData[] = [
  {
    method: 'got_email',
    label: copy.evidenceOptions.gotEmail.label,
    description: copy.evidenceOptions.gotEmail.description,
  },
  {
    method: 'saw_social',
    label: copy.evidenceOptions.sawSocial.label,
    description: copy.evidenceOptions.sawSocial.description,
  },
  {
    method: 'venue_posted',
    label: copy.evidenceOptions.venuePosted.label,
    description: copy.evidenceOptions.venuePosted.description,
  },
  {
    method: 'was_there',
    label: copy.evidenceOptions.wasThere.label,
    description: copy.evidenceOptions.wasThere.description,
  },
  {
    method: 'something_else',
    label: copy.evidenceOptions.somethingElse.label,
    description: copy.evidenceOptions.somethingElse.description,
  },
];

// ── EvidenceOption (internal) ─────────────────────────────────────
interface EvidenceOptionProps {
  option: EvidenceOptionData;
  isSelected: boolean;
  onSelect: (method: EvidenceMethod) => void;
}

const EvidenceOption = ({
  option,
  isSelected,
  onSelect,
}: EvidenceOptionProps) => {
  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(option.method)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          onSelect(option.method);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: isSelected ? `1.5px solid ${AZURE}` : '1px solid var(--border)',
        background: isSelected
          ? `color-mix(in oklab, ${AZURE} 10%, transparent)`
          : 'var(--surface-1)',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Radio dot */}
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: '2px',
          border: isSelected
            ? `2px solid ${AZURE}`
            : '1.5px solid var(--border)',
          background: isSelected ? AZURE : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSelected && (
          <svg
            width="9"
            height="7"
            viewBox="0 0 9 7"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 3.5L3.5 6L8 1"
              stroke="var(--fg-on-accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'var(--fg)',
            lineHeight: 1.3,
          }}
        >
          {option.label}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          {option.description}
        </span>
      </div>
    </div>
  );
};

// ── Days until show ───────────────────────────────────────────────
const getDaysUntil = (eventDate: string): number => {
  const nowUtc = denverTodayUtcMs();
  const eventUtc = new Date(eventDate).getTime();
  return Math.ceil((eventUtc - nowUtc) / (1000 * 60 * 60 * 24));
};

// ── Props ─────────────────────────────────────────────────────────
export interface EvidenceFormProps {
  open: boolean;
  onClose: () => void;
  reportType: ReportType;
  eventId: string;
  eventDate: string;
  /** The show's title, recapped on the Report filed sheet. */
  eventTitle: string;
  onSuccess?: () => void;
  /**
   * The viewer's own unresolved report on this show, if the page knows of one.
   * The API allows one open report per person per show; when it refuses a
   * second, the form offers to withdraw this one.
   */
  ownReportId?: string | null;
}

// ── Main component ────────────────────────────────────────────────
export const EvidenceForm = ({
  open,
  onClose,
  reportType,
  eventId,
  eventDate,
  eventTitle,
  onSuccess,
  ownReportId = null,
}: EvidenceFormProps) => {
  const { getToken } = useAuth();
  const [filed, setFiled] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<EvidenceMethod | null>(
    null,
  );
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // A sheet closed some other way than Back to show must not reopen on the
  // filed state of a report made earlier.
  useEffect(() => {
    if (!open) setFiled(false);
  }, [open]);

  const daysUntil = getDaysUntil(eventDate);
  // Same window and counts the API applies (event-reports.ts), inclusive of
  // the threshold day.
  const isImminent =
    daysUntil >= 0 && daysUntil <= ER_POLICY.imminentThresholdDays;
  const confirmsNeeded = isImminent
    ? ER_POLICY.confirmsRequiredImminent
    : ER_POLICY.confirmsRequired;
  const tokens = REPORT_TOKENS[reportType];

  const handleSubmit = async () => {
    if (selectedMethod === null) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const token = await getToken();
      if (!token) {
        setErrorMsg('You must be signed in to file a report.');
        setSubmitting(false);
        return;
      }

      await fileEventReport(
        eventId,
        {
          status: reportType,
          evidenceMethod: EVIDENCE_METHOD_TO_API[selectedMethod],
          ...(sourceUrl.trim() ? { evidenceUrl: sourceUrl.trim() } : {}),
          ...(notes.trim() ? { note: notes.trim() } : {}),
        },
        token,
      );

      // The page refreshes once the filed sheet is dismissed (onSuccess).
      // The answers are spent: the next report starts from a blank form.
      setSelectedMethod(null);
      setSourceUrl('');
      setNotes('');
      setFiled(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'report_exists') {
        setAlreadyReported(true);
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (filed) {
    return (
      <ReportFiled
        open={open}
        reportType={reportType}
        eventTitle={eventTitle}
        confirmsNeeded={confirmsNeeded}
        onDone={() => {
          setFiled(false);
          onSuccess?.();
          onClose();
        }}
      />
    );
  }

  if (alreadyReported) {
    return (
      <AlreadyReported
        open={open}
        onClose={() => {
          setAlreadyReported(false);
          onClose();
        }}
        onSeeReport={() => {
          setAlreadyReported(false);
          onSuccess?.();
          onClose();
        }}
        {...(ownReportId !== null && {
          // Back to the form with what they wrote, so they can file again.
          onWithdraw: async () => {
            const token = await getToken();
            if (!token) throw new Error('Not signed in');
            await withdrawEventReport(eventId, ownReportId, token);
            setAlreadyReported(false);
          },
        })}
      />
    );
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Add evidence for your report"
      sheetHeight="tall"
      header={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
              }}
            >
              {copy.eyebrow}
            </span>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              {copy.cancelButton}
            </button>
          </div>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </h2>
        </>
      }
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => {
              void handleSubmit();
            }}
            disabled={selectedMethod === null || submitting}
            style={{
              background: tokens.color,
              height: 48,
              borderRadius: 10,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
              color: 'var(--fg-on-accent)',
              border: 'none',
              cursor:
                selectedMethod !== null && !submitting
                  ? 'pointer'
                  : 'not-allowed',
              opacity: selectedMethod !== null && !submitting ? 1 : 0.45,
              width: '100%',
              transition: 'opacity 0.12s',
            }}
          >
            {submitting ? 'Submitting…' : copy.submitButton}
          </button>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
              textAlign: 'center' as const,
              margin: 0,
            }}
          >
            {copy.promotionNote(confirmsNeeded)}
          </p>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Report type recap */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
            border: '1px solid var(--border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 700,
            color: tokens.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
          }}
        >
          {reportType === 'sold-out'
            ? 'Sold out'
            : reportType === 'cancelled'
              ? 'Cancelled'
              : 'Postponed'}
        </div>

        {isImminent && (
          <div
            style={{
              background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <path
                d="M8 2L14 13H2L8 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M8 6.5V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="10.8" r="0.7" fill="currentColor" />
            </svg>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
              }}
            >
              {copy.imminentWarning(
                daysUntil,
                confirmsNeeded,
                ER_POLICY.confirmsRequired,
              )}
            </span>
          </div>
        )}

        <div
          role="radiogroup"
          aria-label={copy.methodGroupAriaLabel}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {EVIDENCE_OPTIONS.map((opt) => (
            <EvidenceOption
              key={opt.method}
              option={opt}
              isSelected={selectedMethod === opt.method}
              onSelect={setSelectedMethod}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: 12,
              color: 'var(--fg-muted)',
            }}
          >
            {copy.sourceLinkLabel}
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(evt) => setSourceUrl(evt.target.value)}
            placeholder={copy.sourceLinkPlaceholder}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--fg)',
              background: 'var(--surface-1)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              {copy.notesLabel}
            </label>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                color: 'var(--fg-subtle)',
              }}
            >
              {copy.charCountSuffix(notes.length, NOTES_MAX_CHARS)}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(evt) => {
              if (evt.target.value.length <= NOTES_MAX_CHARS) {
                setNotes(evt.target.value);
              }
            }}
            placeholder={copy.notesPlaceholder}
            maxLength={NOTES_MAX_CHARS}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: '8px 10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--fg-subtle)',
              background: 'var(--surface-1)',
              outline: 'none',
              width: '100%',
              minHeight: 56,
              resize: 'vertical' as const,
              boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {errorMsg && (
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: 'var(--danger)',
              margin: 0,
            }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </ModalShell>
  );
};

// ── Report filed ──────────────────────────────────────────────────
// Replaces the form once the report is in, recapping it as a pending card
// with no confirms yet. Every way out goes back to the show and refreshes it.
function ReportFiled({
  open,
  reportType,
  eventTitle,
  confirmsNeeded,
  onDone,
}: {
  open: boolean;
  reportType: ReportType;
  eventTitle: string;
  confirmsNeeded: number;
  onDone: () => void;
}) {
  const copy = REPORTING_COPY.evidenceForm.reportFiled;
  const tokens = REPORT_TOKENS[reportType];

  return (
    <ModalShell
      open={open}
      onClose={onDone}
      ariaLabel={copy.heading}
      header={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: tokens.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--fg-subtle)' }}>{copy.eyebrow}</span>
            <span
              aria-hidden="true"
              style={{ flex: 1, height: 1, background: 'var(--border)' }}
            />
          </div>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: 30,
              letterSpacing: '-0.03em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </h2>
        </>
      }
      footer={
        <button
          type="button"
          onClick={onDone}
          style={{
            background: 'var(--signal)',
            height: 48,
            width: '100%',
            borderRadius: 10,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: 14.5,
            color: 'var(--fg-on-accent)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {copy.backButton}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            margin: 0,
          }}
        >
          {copy.body(confirmsNeeded)}
        </p>
        <div
          data-testid="report-filed-recap"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            border: `1.5px dashed ${tokens.border}`,
            background: 'var(--surface-1)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              color: tokens.color,
              background: tokens.bgStrong,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <ReportGlyph kind={reportType} size={18} />
          </span>
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 14.5,
                color: 'var(--fg)',
                overflowWrap: 'anywhere',
              }}
            >
              {copy.recap(tokens.label, eventTitle)}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                color: tokens.color,
              }}
            >
              {Array.from({ length: confirmsNeeded }).map((_, idx) => (
                <span
                  key={idx}
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    border: `1.1px solid ${tokens.color}`,
                  }}
                />
              ))}
              <span style={{ marginLeft: 4 }}>
                {copy.progress(confirmsNeeded)}
              </span>
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Already reported ──────────────────────────────────────────────
// The API keeps one open report per person per show. A second filing comes
// back 409 report_exists, and this replaces the form rather than showing the
// raw server message.
function AlreadyReported({
  open,
  onClose,
  onSeeReport,
  onWithdraw,
}: {
  open: boolean;
  onClose: () => void;
  onSeeReport: () => void;
  onWithdraw?: () => Promise<void>;
}) {
  const copy = REPORTING_COPY.evidenceForm.alreadyReported;
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);

  const handleWithdraw = async () => {
    if (!onWithdraw) return;
    setWithdrawing(true);
    setWithdrawFailed(false);
    try {
      await onWithdraw();
    } catch {
      setWithdrawFailed(true);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={copy.eyebrow}
      header={
        <>
          <span
            style={{
              display: 'block',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            {copy.eyebrow}
          </span>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </h2>
        </>
      }
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={onSeeReport}
            style={{
              background: 'var(--signal)',
              height: 48,
              borderRadius: 10,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
              color: 'var(--fg-on-accent)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copy.seeReportButton}
          </button>
          {onWithdraw && (
            <button
              type="button"
              onClick={() => {
                void handleWithdraw();
              }}
              disabled={withdrawing}
              style={{
                background: 'none',
                height: 48,
                borderRadius: 10,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: 14.5,
                color: 'var(--warning)',
                border: '1px solid var(--border-strong)',
                cursor: withdrawing ? 'not-allowed' : 'pointer',
              }}
            >
              {copy.withdrawButton}
            </button>
          )}
        </div>
      }
    >
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
          margin: 0,
        }}
      >
        {copy.body}
      </p>
      {withdrawFailed && (
        <p
          role="alert"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 12,
            color: 'var(--danger)',
            margin: '10px 0 0',
          }}
        >
          {copy.withdrawError}
        </p>
      )}
    </ModalShell>
  );
}

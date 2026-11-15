'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminCardRow,
  ConfirmDialog,
  PersonAvatar,
} from '@/components/admin/primitives';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import {
  shortDate,
  shortTime,
} from '@/components/admin/venues/overview/overview-rules';
import { StatusChip } from '@/components/consumer/StatusChip';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';
import {
  EVIDENCE_METHODS,
  type EvidenceMethod,
  type SoldOutRecord,
} from './event-detail';

const COPY = ADMIN_COPY.eventEdit.soldOut;

/** The note's limit: `event_reports.note` is varchar(280). */
export const NOTE_MAX = 280;

/** What the mark form holds before it is saved. */
export interface Evidence {
  /** Nothing is picked at first; Save waits for one (addendum 7 §6). */
  method: EvidenceMethod | null;
  url: string;
  note: string;
}

export const NO_EVIDENCE: Evidence = { method: null, url: '', note: '' };

/**
 * Whether Save can send it: a method is picked, and the link, if any, is
 * http(s) (the API refuses any other).
 */
export const evidenceReady = (evidence: Evidence): boolean =>
  evidence.method !== null &&
  (evidence.url.trim() === '' || isSafeHttpUrl(evidence.url.trim()));

/** The POST body: blanks are left out, as nothing recorded. */
export const evidenceBody = (
  evidence: Evidence,
): { evidenceMethod: EvidenceMethod; evidenceUrl?: string; note?: string } => {
  const url = evidence.url.trim();
  const note = evidence.note.trim();
  return {
    evidenceMethod: evidence.method ?? 'other',
    ...(url !== '' && { evidenceUrl: url }),
    ...(note !== '' && { note }),
  };
};

/** "axs.com/events/52114": the link without its scheme or `www.`. */
export const linkText = (url: string): string => {
  if (!isSafeHttpUrl(url)) return url;
  const { hostname, pathname, search } = new URL(url);
  const path = `${pathname}${search}`.replace(/\/$/, '');
  return `${hostname.replace(/^www\./, '')}${path}`;
};

/** "Nov 9, 7:15 PM", Mountain Time. */
const stamp = (iso: string): string =>
  COPY.when(shortDate(iso), shortTime(iso));

const BOX: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 14,
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
};

const LABEL: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

const SMALL: CSSProperties = { fontSize: 12.5, color: 'var(--fg-muted)' };

/** A link value, cut short with its external mark (`06/sold-out-live-d`). */
const SourceLink = ({ url }: { url: string }) =>
  isSafeHttpUrl(url) ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="sold-out-source"
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 4,
        maxWidth: '100%',
        color: 'var(--signal)',
        textDecoration: 'none',
        overflowWrap: 'anywhere',
      }}
    >
      {linkText(url)}
      <ExternalLink size={11} aria-hidden style={{ flex: 'none' }} />
    </a>
  ) : (
    // A stored link that isn't http(s) is shown, never linked.
    <span style={{ overflowWrap: 'anywhere' }}>{url}</span>
  );

const None = ({ children }: { children: ReactNode }) => (
  <span style={{ color: 'var(--fg-subtle)' }}>{children}</span>
);

/**
 * Picking Sold out (`06/sold-out-mark-d`, phone `06/sold-out-mark-m`): how
 * the admin knows, an optional link and note, and who Saving tells. Two
 * columns of methods on desktop, one on the phone.
 */
export const SoldOutForm = ({
  value,
  onChange,
  watchingCount,
  phone,
}: {
  value: Evidence;
  onChange: (next: Evidence) => void;
  watchingCount: number;
  phone: boolean;
}) => (
  <div data-testid="sold-out-form" style={BOX}>
    <div id="sold-out-question" style={{ fontSize: 14, fontWeight: 700 }}>
      {COPY.question}
    </div>
    <div
      role="radiogroup"
      aria-labelledby="sold-out-question"
      style={{
        display: 'grid',
        gridTemplateColumns: phone ? '1fr' : '1fr 1fr',
        gap: 6,
      }}
    >
      {EVIDENCE_METHODS.map((method) => {
        const checked = value.method === method;
        return (
          <label
            key={method}
            data-testid={`sold-out-method-${method}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 14,
              cursor: 'pointer',
              border: checked
                ? '1.5px solid var(--signal)'
                : '1px solid var(--border)',
              background: checked
                ? 'color-mix(in srgb, var(--signal) 7%, transparent)'
                : 'transparent',
            }}
          >
            <input
              type="radio"
              name="sold-out-method"
              value={method}
              checked={checked}
              onChange={() => onChange({ ...value, method })}
              style={{
                appearance: 'none',
                width: 16,
                height: 16,
                margin: 0,
                flex: 'none',
                borderRadius: '50%',
                border: `1.5px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
                background: checked
                  ? 'radial-gradient(circle, var(--signal) 0 4px, transparent 4.5px)'
                  : 'transparent',
              }}
            />
            {COPY.methods[method]}
          </label>
        );
      })}
    </div>
    <div>
      <label htmlFor="sold-out-url" style={LABEL}>
        {COPY.sourceLabel}
      </label>
      <input
        id="sold-out-url"
        type="url"
        inputMode="url"
        value={value.url}
        onChange={(evt) => onChange({ ...value, url: evt.target.value })}
        placeholder={COPY.sourcePlaceholder}
        maxLength={500}
        style={{
          ...inputStyle(
            value.url.trim() !== '' && !isSafeHttpUrl(value.url.trim()),
          ),
          // 16px on the phone, so focusing the field never zooms the page.
          ...(phone && { fontSize: 16 }),
        }}
      />
    </div>
    <div>
      <label htmlFor="sold-out-note" style={LABEL}>
        {COPY.noteLabel}
      </label>
      <textarea
        id="sold-out-note"
        value={value.note}
        onChange={(evt) => onChange({ ...value, note: evt.target.value })}
        placeholder={COPY.notePlaceholder}
        maxLength={NOTE_MAX}
        rows={2}
        style={{
          ...inputStyle(false),
          height: 'auto',
          minHeight: 56,
          padding: '10px 12px',
          lineHeight: 1.45,
          resize: 'vertical',
          ...(phone && { fontSize: 16 }),
        }}
      />
      <div
        data-testid="sold-out-note-count"
        style={{
          fontSize: 12,
          color: 'var(--fg-subtle)',
          marginTop: 5,
          textAlign: 'right',
        }}
      >
        {COPY.noteCount(value.note.length, NOTE_MAX)}
      </div>
    </div>
    <div style={SMALL}>{COPY.notice(watchingCount)}</div>
  </div>
);

/**
 * Save asks first (`06/sold-out-confirm-d`, phone sheet
 * `06/sold-out-confirm-m`): it tells the Watching, so it repeats what will be
 * recorded. `onConfirm` saves; the caller closes it once that settles.
 */
export const SoldOutConfirm = ({
  artist,
  watchingCount,
  evidence,
  onCancel,
  onConfirm,
}: {
  artist: string;
  watchingCount: number;
  evidence: Evidence;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) => {
  const url = evidence.url.trim();
  const note = evidence.note.trim();
  const [pending, setPending] = useState(false);
  // The Event confirms' dialog and buttons (`EventConfirm`), without its own
  // failure line: a failed mark closes this and shows the page's Couldn't
  // change, with Try again.
  return (
    <ConfirmDialog
      title={COPY.confirmTitle(artist)}
      confirmLabel={COPY.confirm}
      confirmVariant="gradient"
      buttonSize="large"
      pending={pending}
      onConfirm={() => {
        setPending(true);
        void onConfirm().finally(() => setPending(false));
      }}
      onCancel={onCancel}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>{COPY.confirmBody(watchingCount)}</div>
          <div data-testid="sold-out-confirm-rows">
            <AdminCardRow label={COPY.howYouKnew}>
              {evidence.method === null ? (
                <None>{COPY.noneValue}</None>
              ) : (
                COPY.methods[evidence.method]
              )}
            </AdminCardRow>
            <AdminCardRow label={COPY.source}>
              {url === '' ? (
                <None>{COPY.noneValue}</None>
              ) : (
                <SourceLink url={url} />
              )}
            </AdminCardRow>
            <AdminCardRow label={COPY.note}>
              {note === '' ? <None>{COPY.noneValue}</None> : note}
            </AdminCardRow>
          </div>
        </div>
      }
    />
  );
};

/**
 * A live Sold out (`06/sold-out-live-d`, phone `06/sold-out-live-m`, states
 * in `06/sold-out-states`): read only, from the promoted report. A fan's
 * report reads Reported and Made live with its confirms; an admin's mark is
 * one Marked row, and "How you knew".
 */
export const SoldOutRecordView = ({ record }: { record: SoldOutRecord }) => {
  const { reporter } = record;
  const admin = reporter.kind === 'admin';
  return (
    <div
      data-testid="sold-out-record"
      data-reporter={reporter.kind}
      style={{ ...BOX, gap: 10 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.14em',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.recordTitle}
        </span>
        <span style={{ flex: 1 }} />
        <StatusChip
          status="soldout"
          label={ADMIN_COPY.eventsList.status.soldout}
        />
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
      >
        <PersonAvatar
          initialOf={reporter.handle}
          avatarColor={reporter.avatarColor}
          avatarSecondColor={reporter.avatarSecondColor}
          size={26}
          initialSize={11}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {reporter.handle === null
              ? COPY.noHandle
              : COPY.handle(reporter.handle)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
            {admin ? COPY.admin : COPY.fan}
          </div>
        </div>
      </div>
      {record.note === null ? (
        <div style={{ fontSize: 13.5, color: 'var(--fg-subtle)' }}>
          {COPY.noNote}
        </div>
      ) : (
        <div
          data-testid="sold-out-note"
          style={{ fontSize: 13.5, lineHeight: 1.5, overflowWrap: 'anywhere' }}
        >
          {COPY.quote(record.note)}
        </div>
      )}
      <div>
        <AdminCardRow label={admin ? COPY.howYouKnew : COPY.howTheyKnew}>
          {COPY.methods[record.evidenceMethod]}
        </AdminCardRow>
        <AdminCardRow label={COPY.source}>
          {record.evidenceUrl === null ? (
            <None>{COPY.noneRecorded}</None>
          ) : (
            <SourceLink url={record.evidenceUrl} />
          )}
        </AdminCardRow>
        {admin ? (
          <AdminCardRow label={COPY.marked}>
            {stamp(record.reportedAt)}
          </AdminCardRow>
        ) : (
          <>
            <AdminCardRow label={COPY.reported}>
              {stamp(record.reportedAt)}
            </AdminCardRow>
            <AdminCardRow label={COPY.madeLive}>
              {COPY.madeLiveValue(
                stamp(record.madeLiveAt),
                record.confirmsCount,
              )}
            </AdminCardRow>
          </>
        )}
      </div>
      <div style={{ ...SMALL, lineHeight: 1.45 }}>{COPY.recordFoot}</div>
    </div>
  );
};

'use client';

/** The Source tab's collapsible Advanced section: page loading, wait until, wait for, reader. */

import { ChevronDown, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { WAIT_UNTIL_VALUES } from '@/components/admin/definitions/constants';
import {
  Segments,
  advancedHint,
  advancedLabel,
  advancedRow,
  errorStyle,
  inputStyle,
} from './source-parts';
import {
  PAGE_LOADINGS,
  READERS,
  crawlModeOf,
  pageLoadingOf,
  type SourceDraft,
  type SourceErrors,
} from './source-rules';

const COPY = ADMIN_COPY.venueSource;

export const SourceAdvanced = ({
  ids,
  draft,
  errors,
  saving,
  phone,
  open: advancedOpen,
  onToggle,
  edit,
}: {
  /** The tab's `useId` prefix; every id here hangs off it. */
  ids: string;
  draft: SourceDraft;
  errors: SourceErrors;
  saving: boolean;
  phone: boolean;
  open: boolean;
  onToggle: () => void;
  edit: (patch: Partial<SourceDraft>) => void;
}) => {
  const advancedId = `${ids}-advanced`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        aria-expanded={advancedOpen}
        aria-controls={advancedId}
        onClick={onToggle}
        style={{
          display: 'flex',
          // Phone stacks the line under the label, beside the chevron.
          alignItems: phone && !advancedOpen ? 'flex-start' : 'center',
          gap: 8,
          width: '100%',
          padding: phone || advancedOpen ? '12px 0 0' : '12px 0',
          background: 'none',
          border: 'none',
          borderTop: '1px solid var(--border)',
          color: 'var(--fg)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {advancedOpen ? (
          <ChevronDown
            size={14}
            color="var(--fg-muted)"
            aria-hidden
            style={{ flex: 'none' }}
          />
        ) : (
          <ChevronRight
            size={14}
            color="var(--fg-muted)"
            aria-hidden
            style={{ flex: 'none' }}
          />
        )}
        <span
          style={
            phone
              ? { display: 'flex', flexDirection: 'column', minWidth: 0 }
              : {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                }
          }
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {COPY.advanced.label}
          </span>
          {!advancedOpen && (
            <span
              style={{
                fontSize: 12.5,
                color: 'var(--fg-subtle)',
                lineHeight: 1.4,
                ...(phone && { marginTop: 2 }),
              }}
            >
              {COPY.advanced.collapsedLine}
            </span>
          )}
        </span>
      </button>
      {advancedOpen && (
        <div
          id={advancedId}
          data-testid="source-advanced"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div style={advancedRow(false)}>
            <span style={advancedLabel}>{COPY.advanced.pageLoading.label}</span>
            <Segments
              name={`${ids}-loading`}
              label={COPY.advanced.pageLoading.label}
              options={PAGE_LOADINGS.map((value) => ({
                value,
                label: COPY.advanced.pageLoading[value],
              }))}
              value={pageLoadingOf(draft.crawlMode)}
              disabled={saving}
              onChange={(value) => edit({ crawlMode: crawlModeOf(value) })}
            />
            <div style={advancedHint}>{COPY.advanced.pageLoading.hint}</div>
          </div>
          <div style={advancedRow(false)}>
            <span style={advancedLabel}>{COPY.advanced.waitUntil.label}</span>
            <Segments
              name={`${ids}-wait-until`}
              label={COPY.advanced.waitUntil.label}
              options={WAIT_UNTIL_VALUES.map((value) => ({
                value,
                label: COPY.advanced.waitUntil[value],
              }))}
              value={draft.waitUntil}
              disabled={saving}
              onChange={(value) => edit({ waitUntil: value })}
            />
          </div>
          <div style={advancedRow(draft.mode !== 'page')}>
            <label htmlFor={`${ids}-wait-for`} style={advancedLabel}>
              {COPY.advanced.waitFor.label}
            </label>
            <input
              id={`${ids}-wait-for`}
              value={draft.waitFor}
              placeholder={COPY.advanced.waitFor.placeholder}
              disabled={saving}
              aria-invalid={errors.waitFor !== undefined}
              onChange={(evt) => edit({ waitFor: evt.target.value })}
              style={{
                ...inputStyle(errors.waitFor !== undefined, true),
                // source-advanced-open draws Wait for at 40, not 38.
                height: 40,
              }}
            />
            {errors.waitFor === undefined ? (
              <div style={advancedHint}>{COPY.advanced.waitFor.hint}</div>
            ) : (
              <div role="alert" style={{ ...errorStyle, marginTop: 0 }}>
                {errors.waitFor}
              </div>
            )}
          </div>
          {draft.mode === 'page' && (
            <div style={advancedRow(true)}>
              <span style={advancedLabel}>{COPY.advanced.reader.label}</span>
              <Segments
                name={`${ids}-reader`}
                label={COPY.advanced.reader.label}
                options={READERS.map((value) => ({
                  value,
                  label: COPY.advanced.reader[value],
                }))}
                value={draft.reader}
                disabled={saving}
                onChange={(value) => edit({ reader: value })}
              />
              <div style={advancedHint}>
                {draft.reader === 'detail-page'
                  ? COPY.advanced.detailPage
                  : COPY.advanced.reader.hint}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

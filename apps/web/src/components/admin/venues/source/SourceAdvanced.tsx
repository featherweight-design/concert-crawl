'use client';

/**
 * The Source tab's Advanced section (`18/*`): page loading, reader, wait until
 * and wait for. Closed, it says "All automatic" or chips each setting forced
 * by hand, with Back to Automatic. Open, desktop draws it as its own card
 * under the two columns (`SourceAdvancedCard`); the phone stacks the controls
 * in How we read it.
 */

import type { CSSProperties, Ref } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { WAIT_UNTIL_VALUES } from '@/components/admin/definitions/constants';
import {
  Card,
  Chips,
  Segments,
  advancedHint,
  advancedLabel,
  advancedRow,
  errorStyle,
  forcedChip,
  inputStyle,
  linkButton,
} from './source-parts';
import {
  PAGE_LOADINGS,
  READERS,
  advancedUnsavedCount,
  canGoBackToAutomatic,
  crawlModeOf,
  forcedChipsOf,
  pageLoadingOf,
  readerLockOf,
  sellerName,
  type SourceColumns,
  type SourceDraft,
  type SourceErrors,
} from './source-rules';

const COPY = ADMIN_COPY.venueSource;
const ADVANCED = COPY.advanced;

/** The controls' id, for the toggle's `aria-controls`. */
export const advancedIdOf = (ids: string) => `${ids}-advanced`;

const BackToAutomatic = ({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={saving}
    onClick={onClick}
    style={{
      ...linkButton,
      ...(saving && { cursor: 'not-allowed', opacity: 0.6 }),
    }}
  >
    {ADVANCED.backToAutomatic}
  </button>
);

/**
 * The four controls. `grid` is desktop's two by two (Page loading and Reader
 * on top, 20 by 28 apart); `stack` is the phone's rows, each under a rule.
 */
const AdvancedControls = ({
  ids,
  draft,
  saved,
  errors,
  saving,
  layout,
  edit,
}: {
  ids: string;
  draft: SourceDraft;
  saved: SourceColumns;
  errors: SourceErrors;
  saving: boolean;
  layout: 'grid' | 'stack';
  edit: (patch: Partial<SourceDraft>) => void;
}) => {
  const grid = layout === 'grid';
  const cell = (last: boolean): CSSProperties =>
    grid
      ? { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }
      : advancedRow(last);
  const lock = readerLockOf(draft, saved);
  const readerOptions = READERS.map((value) => ({
    value,
    label: ADVANCED.reader[value],
  }));

  const reader =
    lock !== null ? (
      <div style={cell(false)}>
        <span style={advancedLabel}>{ADVANCED.reader.label}</span>
        <div>
          <span data-testid="source-reader-locked" style={forcedChip}>
            {lock.kind === 'feed'
              ? sellerName(lock.seller)
              : ADVANCED.reader.manual}
          </span>
        </div>
        <div style={advancedHint}>
          {lock.kind === 'feed'
            ? ADVANCED.reader.lockedHints.feed(sellerName(lock.seller))
            : ADVANCED.reader.lockedHints.manual}
        </div>
      </div>
    ) : draft.mode === 'page' ? (
      <div style={cell(false)}>
        <span style={advancedLabel}>{ADVANCED.reader.label}</span>
        {/* The phone wraps the reader as chips (`18/source-advanced-m`). */}
        {grid ? (
          <Segments
            name={`${ids}-reader`}
            label={ADVANCED.reader.label}
            options={readerOptions}
            value={draft.reader}
            disabled={saving}
            onChange={(value) => edit({ reader: value })}
          />
        ) : (
          <Chips
            name={`${ids}-reader`}
            label={ADVANCED.reader.label}
            options={readerOptions}
            value={draft.reader}
            disabled={saving}
            onChange={(value) => edit({ reader: value })}
          />
        )}
        <div style={advancedHint}>{ADVANCED.reader.hints[draft.reader]}</div>
      </div>
    ) : null;

  return (
    <div
      id={grid ? undefined : advancedIdOf(ids)}
      data-testid="source-advanced"
      style={
        grid
          ? {
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '20px 28px',
            }
          : { display: 'flex', flexDirection: 'column' }
      }
    >
      <div style={cell(false)}>
        <span style={advancedLabel}>{ADVANCED.pageLoading.label}</span>
        <Segments
          name={`${ids}-loading`}
          label={ADVANCED.pageLoading.label}
          options={PAGE_LOADINGS.map((value) => ({
            value,
            label: ADVANCED.pageLoading[value],
          }))}
          value={pageLoadingOf(draft.crawlMode)}
          disabled={saving}
          onChange={(value) => edit({ crawlMode: crawlModeOf(value) })}
        />
        <div style={advancedHint}>
          {ADVANCED.pageLoading.hints[pageLoadingOf(draft.crawlMode)]}
        </div>
      </div>
      {reader}
      <div style={cell(false)}>
        <span style={advancedLabel}>{ADVANCED.waitUntil.label}</span>
        <Segments
          name={`${ids}-wait-until`}
          label={ADVANCED.waitUntil.label}
          options={WAIT_UNTIL_VALUES.map((value) => ({
            value,
            label: ADVANCED.waitUntil[value],
          }))}
          value={draft.waitUntil}
          disabled={saving}
          onChange={(value) => edit({ waitUntil: value })}
        />
      </div>
      <div style={cell(true)}>
        <label htmlFor={`${ids}-wait-for`} style={advancedLabel}>
          {ADVANCED.waitFor.label}
        </label>
        <input
          id={`${ids}-wait-for`}
          value={draft.waitFor}
          placeholder={ADVANCED.waitFor.placeholder}
          disabled={saving}
          aria-invalid={errors.waitFor !== undefined}
          onChange={(evt) => edit({ waitFor: evt.target.value })}
          style={{
            ...inputStyle(errors.waitFor !== undefined, true),
            // The boards draw Wait for at 40, not 38.
            height: 40,
          }}
        />
        {errors.waitFor === undefined ? (
          <div style={advancedHint}>{ADVANCED.waitFor.hint}</div>
        ) : (
          <div role="alert" style={{ ...errorStyle, marginTop: 0 }}>
            {errors.waitFor}
          </div>
        )}
      </div>
    </div>
  );
};

type SectionProps = {
  /** The tab's `useId` prefix; every id here hangs off it. */
  ids: string;
  draft: SourceDraft;
  /** The saved columns: the locks and the unsaved count read them. */
  saved: SourceColumns;
  errors: SourceErrors;
  saving: boolean;
  onBackToAutomatic: () => void;
  edit: (patch: Partial<SourceDraft>) => void;
};

/**
 * Advanced in How we read it: the toggle row, closed state's chips and
 * Back to Automatic, and the phone's open controls.
 */
export const SourceAdvanced = ({
  ids,
  draft,
  saved,
  savedDraft,
  errors,
  saving,
  phone,
  open,
  onToggle,
  onBackToAutomatic,
  toggleRef,
  edit,
}: SectionProps & {
  savedDraft: SourceDraft;
  phone: boolean;
  open: boolean;
  onToggle: () => void;
  /** Focus lands here after Hide or Back to Automatic. */
  toggleRef: Ref<HTMLButtonElement>;
}) => {
  const chips = open ? [] : forcedChipsOf(draft, saved);
  const forced = chips.length > 0;
  const showBack = !open && canGoBackToAutomatic(draft);
  const unsaved = open ? 0 : advancedUnsavedCount(draft, savedDraft);
  // Closed: "All automatic", or "Set by hand" over the chips. Open: desktop
  // points at the card below; the phone's controls follow directly.
  const line = open
    ? phone
      ? null
      : ADVANCED.openBelow
    : forced
      ? ADVANCED.setByHand
      : ADVANCED.collapsedLine;
  // The phone stacks the line under the label, beside the chevron.
  const stacked = phone && line !== null;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '12px 0 0',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: stacked ? 'flex-start' : 'center',
            gap: 8,
          }}
        >
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={advancedIdOf(ids)}
            onClick={onToggle}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: stacked ? 'flex-start' : 'center',
              gap: 8,
              minWidth: 0,
              padding: 0,
              background: 'none',
              border: 'none',
              color: 'var(--fg)',
              fontFamily: 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Chevron
              size={14}
              color="var(--fg-muted)"
              aria-hidden
              style={{ flex: 'none' }}
            />
            <span
              style={
                stacked
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
                {ADVANCED.label}
              </span>
              {line !== null && (
                <span
                  style={{
                    fontSize: 12.5,
                    // "Set by hand" reads a step brighter than the quiet line.
                    color: forced ? 'var(--fg-muted)' : 'var(--fg-subtle)',
                    lineHeight: 1.4,
                    ...(stacked && { marginTop: 2 }),
                  }}
                >
                  {line}
                </span>
              )}
            </span>
          </button>
          {showBack && (
            <BackToAutomatic saving={saving} onClick={onBackToAutomatic} />
          )}
        </div>
        {forced && (
          <div
            data-testid="source-advanced-forced"
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              paddingLeft: 22,
            }}
          >
            {chips.map((chip) => (
              <span key={chip} style={forcedChip}>
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
      {unsaved > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--warning)' }}>
          {ADVANCED.unsaved(unsaved)}
        </div>
      )}
      {phone && open && (
        <AdvancedControls
          ids={ids}
          draft={draft}
          saved={saved}
          errors={errors}
          saving={saving}
          layout="stack"
          edit={edit}
        />
      )}
    </div>
  );
};

/**
 * Desktop's open Advanced (`18/source-advanced-d`): a full-width card under
 * the two columns, so they stay even. Back to Automatic and Hide sit in its
 * header.
 */
export const SourceAdvancedCard = ({
  ids,
  draft,
  saved,
  errors,
  saving,
  onBackToAutomatic,
  onHide,
  edit,
}: SectionProps & { onHide: () => void }) => (
  <Card
    title={ADVANCED.label}
    phone={false}
    testId="source-advanced-card"
    id={advancedIdOf(ids)}
    actions={
      <>
        {canGoBackToAutomatic(draft) && (
          <BackToAutomatic saving={saving} onClick={onBackToAutomatic} />
        )}
        <button
          type="button"
          onClick={onHide}
          style={{
            ...linkButton,
            marginLeft: 14,
            fontWeight: 400,
            color: 'var(--fg-muted)',
          }}
        >
          {ADVANCED.hide}
        </button>
      </>
    }
  >
    <AdvancedControls
      ids={ids}
      draft={draft}
      saved={saved}
      errors={errors}
      saving={saving}
      layout="grid"
      edit={edit}
    />
  </Card>
);

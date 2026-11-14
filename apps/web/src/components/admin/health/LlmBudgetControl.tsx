'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  LLM_BUDGET_WARN_AT_PERCENTS,
  type AdminSettings,
} from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  SaveFailedToast,
  SidePanel,
  useIsPhone,
  useSnapBack,
} from '@/components/admin/primitives';
import {
  budgetPatch,
  MAX_BUDGET_USD,
  parseBudget,
  type BudgetDraft,
} from './budget-model';
import { formatUsd } from './health-model';

const copy = ADMIN_COPY.health.budget;

const eyebrowStyle = {
  display: 'inline-block',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9.5,
  letterSpacing: '0.14em',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--signal)',
  border: '1px solid color-mix(in srgb, var(--signal) 50%, transparent)',
  borderRadius: 4,
  padding: '3px 7px',
} satisfies React.CSSProperties;

const labelStyle = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
} satisfies React.CSSProperties;

/** A Warn-me pill, as `03/llm-budget-panel` draws it: h32, 0 12px, 13px. */
const warnPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  borderRadius: 999,
} satisfies React.CSSProperties;

export const warnPillOffStyle = {
  ...warnPillStyle,
  color: 'var(--fg-muted)',
  background: 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
  border: '1px solid var(--border)',
} satisfies React.CSSProperties;

/** The chosen pill: the signal-to-accent ring on `--surface-2`. */
export const warnPillOnStyle = {
  ...warnPillStyle,
  color: 'var(--fg)',
  background:
    'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
  border: '1px solid transparent',
} satisfies React.CSSProperties;

export const SWITCH_TRACK_ON =
  'linear-gradient(90deg, var(--signal), var(--cta-end))';

const toText = (value: number | null): string =>
  value === null ? '' : `$${value}`;

export interface LlmBudgetControlProps {
  settings: AdminSettings;
  /** Month to date and what it paces to, as the cost tile reads them. */
  spentUsd: number;
  paceUsd: number;
  /** Last month's total, or null when the cost window did not reach it. */
  lastMonthUsd: number | null;
  /** The cost tile, drawn by the server; it becomes the button that opens this. */
  children: ReactNode;
}

/**
 * The cost tile, made the way into the LLM budget panel
 * (`03/llm-budget-panel`): a side panel on desktop, a sheet on the phone. Save
 * PATCHes only the settings that changed. A save that fails snaps back to what
 * is saved and says so, and keeps the draft so Try again re-sends it.
 */
export const LlmBudgetControl = ({
  settings,
  spentUsd,
  paceUsd,
  lastMonthUsd,
  children,
}: LlmBudgetControlProps) => {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const router = useRouter();
  const { getToken } = useAuth();

  const saved: BudgetDraft = useMemo(
    () => ({
      llmMonthlyBudgetUsd: settings.llmMonthlyBudgetUsd,
      llmBudgetWarnAtPercent: settings.llmBudgetWarnAtPercent,
      llmBudgetFallbackToStructured: settings.llmBudgetFallbackToStructured,
    }),
    [
      settings.llmMonthlyBudgetUsd,
      settings.llmBudgetWarnAtPercent,
      settings.llmBudgetFallbackToStructured,
    ],
  );

  const [amount, setAmount] = useState(toText(saved.llmMonthlyBudgetUsd));
  const [warnAt, setWarnAt] = useState(saved.llmBudgetWarnAtPercent);
  const [fallback, setFallback] = useState(saved.llmBudgetFallbackToStructured);
  const [touched, setTouched] = useState(false);

  // `save` swallows the failure into `failed`, so the persist wrapper says
  // whether this attempt landed.
  const landed = useRef(false);
  const snap = useSnapBack<BudgetDraft>(saved, async (next) => {
    landed.current = false;
    const token = await getToken();
    if (!token) throw new Error('No session');
    const patch = budgetPatch(saved, next);
    if (Object.keys(patch).length > 0) {
      await apiClient.patch('/v1/admin/settings', token, patch);
    }
    landed.current = true;
  });

  const parsed = parseBudget(amount);
  const invalid = !parsed.ok;

  const reset = () => {
    setAmount(toText(snap.value.llmMonthlyBudgetUsd));
    setWarnAt(snap.value.llmBudgetWarnAtPercent);
    setFallback(snap.value.llmBudgetFallbackToStructured);
    setTouched(false);
    snap.dismiss();
  };

  const openPanel = () => {
    reset();
    setOpen(true);
  };

  const onSave = async () => {
    setTouched(true);
    if (!parsed.ok) return;
    await snap.save({
      llmMonthlyBudgetUsd: parsed.value,
      llmBudgetWarnAtPercent: warnAt,
      llmBudgetFallbackToStructured: fallback,
    });
    if (landed.current) {
      setOpen(false);
      // The tile and the cost chart read the new budget.
      router.refresh();
    }
  };

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label htmlFor="llm-budget-amount" style={labelStyle}>
          {copy.amountLabel}
        </label>
        <input
          id="llm-budget-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          aria-invalid={touched && invalid}
          aria-describedby="llm-budget-amount-note"
          onChange={(event) => setAmount(event.target.value)}
          style={{
            width: '100%',
            height: 44,
            padding: '0 14px',
            fontSize: 16,
            color: 'var(--fg)',
            background: 'var(--bg)',
            border: `1px solid ${touched && invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
            borderRadius: 10,
            outline: 'none',
          }}
        />
        <p
          id="llm-budget-amount-note"
          role={touched && invalid ? 'alert' : undefined}
          style={{
            margin: '6px 0 0',
            fontSize: 12.5,
            color: touched && invalid ? 'var(--danger)' : 'var(--fg-subtle)',
          }}
        >
          {touched && invalid
            ? copy.amountInvalid(formatUsd(MAX_BUDGET_USD))
            : copy.amountHint}
        </p>
      </div>

      <div role="group" aria-labelledby="llm-budget-warn">
        <span id="llm-budget-warn" style={labelStyle}>
          {copy.warnLabel}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {LLM_BUDGET_WARN_AT_PERCENTS.map((percent) => {
            const on = warnAt === percent;
            return (
              <button
                key={percent}
                type="button"
                aria-pressed={on}
                onClick={() => setWarnAt(percent)}
                style={on ? warnPillOnStyle : warnPillOffStyle}
              >
                {copy.warnOption(percent)}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 0',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            id="llm-budget-runs-out"
            style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}
          >
            {copy.runsOutLabel}
          </div>
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {fallback ? copy.runsOutOn : copy.runsOutOff}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={fallback}
          aria-labelledby="llm-budget-runs-out"
          onClick={() => setFallback(!fallback)}
          style={{
            flex: 'none',
            position: 'relative',
            width: 40,
            height: 24,
            cursor: 'pointer',
            borderRadius: 999,
            border: 'none',
            padding: 0,
            // The board's track, `linear-gradient(90deg,#7AE6FF,#de96df)`:
            // --signal to --cta-end, which resolve to those on Electric.
            background: fallback ? SWITCH_TRACK_ON : 'var(--border-strong)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 3,
              left: fallback ? 19 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              // `#E8F3FF` on the board: the light thumb on either track.
              background: 'var(--fg)',
              transition: 'left var(--motion-fast) var(--motion-ease)',
            }}
          />
        </button>
      </div>

      <dl style={{ margin: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 0',
            borderTop: '1px solid var(--border)',
            fontSize: 13,
          }}
        >
          <dt style={{ color: 'var(--fg-muted)' }}>{copy.soFar}</dt>
          <dd style={{ margin: 0, textAlign: 'right' }}>
            {copy.soFarValue(formatUsd(spentUsd), formatUsd(paceUsd))}
          </dd>
        </div>
        {lastMonthUsd !== null && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 0',
              borderTop: '1px solid var(--border)',
              fontSize: 13,
            }}
          >
            <dt style={{ color: 'var(--fg-muted)' }}>{copy.lastMonth}</dt>
            <dd style={{ margin: 0, textAlign: 'right' }}>
              {formatUsd(lastMonthUsd)}
            </dd>
          </div>
        )}
      </dl>

      {snap.failed && (
        <SaveFailedToast
          what={copy.failedWhat}
          saved={copy.stillSaved(
            saved.llmMonthlyBudgetUsd === null
              ? null
              : formatUsd(saved.llmMonthlyBudgetUsd),
          )}
          onRetry={() => void onSave()}
          retrying={snap.saving}
        />
      )}
    </div>
  );

  const footer = (
    <>
      <AdminButton
        type="button"
        variant="gradient"
        fullWidth
        disabled={snap.saving}
        onClick={() => void onSave()}
      >
        {snap.saving ? copy.saving : copy.save}
      </AdminButton>
      <AdminButton
        type="button"
        variant="outline"
        disabled={snap.saving}
        onClick={() => setOpen(false)}
      >
        {copy.cancel}
      </AdminButton>
    </>
  );

  return (
    <>
      {/* A div, not a button: the tile is block content, which a button may
          not hold. Its own text (label, value, detail) is the accessible name. */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        data-testid="llm-budget-trigger"
        onClick={openPanel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPanel();
          }
        }}
        style={{ cursor: 'pointer', borderRadius: 14, height: '100%' }}
      >
        {children}
      </div>
      {open &&
        (isPhone ? (
          <AdminSheet
            onClose={() => setOpen(false)}
            title={copy.title}
            subtitle={copy.body}
            footer={footer}
            dismissible={!snap.saving}
          >
            {body}
          </AdminSheet>
        ) : (
          <SidePanel
            onClose={() => setOpen(false)}
            eyebrow={<span style={eyebrowStyle}>{copy.eyebrow}</span>}
            title={copy.title}
            subtitle={copy.body}
            footer={footer}
            dismissible={!snap.saving}
          >
            {body}
          </SidePanel>
        ))}
    </>
  );
};

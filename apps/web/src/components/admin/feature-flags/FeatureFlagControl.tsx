'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import type {
  AdminFeatureFlag,
  FeatureFlagKey,
} from '@concert-crawl/entitlements';
import { apiClient, ApiError } from '@/lib/api';
import {
  Panel,
  AdminButton,
  RelTime,
  useDialogKeyboard,
} from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.featureFlags;

type Stage = 'off' | 'me' | 'beta' | 'everyone';

// The ladder, lowest rung first (`07-people-flags-operations/*-admin-feature-flags`).
const STAGES: readonly Stage[] = ['off', 'me', 'beta', 'everyone'];

const stageOf = (flag: AdminFeatureFlag): Stage =>
  flag.stage ?? (flag.enabled ? 'everyone' : 'off');

const rankOf = (stage: Stage): number => STAGES.indexOf(stage);

interface FeatureFlagControlProps {
  initial: AdminFeatureFlag[];
}

/** A step the admin picked on a production flag that needs the extra ask. */
interface PendingEveryone {
  flag: AdminFeatureFlag;
  from: Stage;
}

export const FeatureFlagControl = ({ initial }: FeatureFlagControlProps) => {
  const { getToken } = useAuth();
  const [flags, setFlags] = useState<AdminFeatureFlag[]>(initial);
  const [pending, setPending] = useState<FeatureFlagKey | null>(null);
  const [asking, setAsking] = useState<PendingEveryone | null>(null);
  const [error, setError] = useState<{
    key: FeatureFlagKey;
    message: string;
  } | null>(null);

  const moveFlag = async (
    flag: AdminFeatureFlag,
    stage: Stage,
    confirm?: boolean,
  ) => {
    setPending(flag.key);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        // The dialog has to close on this branch too: the error renders in the
        // row underneath the overlay, so leaving it open hides the only
        // explanation the admin gets.
        setError({ key: flag.key, message: COPY.saveError });
        setAsking(null);
        return;
      }
      const updated = await apiClient.patch<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}`,
        token,
        confirm === true ? { stage, confirm } : { stage },
      );
      setFlags((prev) =>
        prev.map((row) => (row.key === updated.key ? updated : row)),
      );
      setAsking(null);
    } catch (err) {
      console.error('[admin] feature flag save failed', flag.key, err);
      // A 409 is the production lock: the flag is not verified here yet.
      const message =
        err instanceof ApiError && err.status === 409
          ? COPY.lockedError
          : err instanceof ApiError
            ? `${COPY.saveError} ${err.message}`
            : COPY.saveError;
      setError({ key: flag.key, message });
      setAsking(null);
    } finally {
      setPending(null);
    }
  };

  const pick = (flag: AdminFeatureFlag, stage: Stage) => {
    const from = stageOf(flag);
    if (stage === from || pending !== null) return;
    // Production asks first before a flag goes to everyone.
    if (flag.environment === 'production' && stage === 'everyone') {
      setAsking({ flag, from });
      return;
    }
    void moveFlag(flag, stage);
  };

  return (
    <Panel padding={0}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          padding: '12px 18px',
        }}
      >
        <span style={{ ...COLUMN_HEAD, flex: '1 1 240px' }}>
          {COPY.columnFlag}
        </span>
        <span style={{ ...COLUMN_HEAD, flex: '1 1 320px', maxWidth: 360 }}>
          {COPY.columnWhoSees}
        </span>
        <span
          style={{
            ...COLUMN_HEAD,
            flex: '0 0 190px',
            textAlign: 'right',
          }}
        >
          {COPY.columnVerified}
        </span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {flags.map((flag) => (
          <FlagRow
            key={flag.key}
            flag={flag}
            error={error?.key === flag.key ? error.message : null}
            onPick={(stage) => pick(flag, stage)}
          />
        ))}
      </ul>

      {asking && (
        <EveryoneInProductionAsk
          flag={asking.flag}
          from={asking.from}
          pending={pending === asking.flag.key}
          onCancel={() => {
            if (pending !== null) return;
            setAsking(null);
          }}
          onConfirm={() => void moveFlag(asking.flag, 'everyone', true)}
        />
      )}
    </Panel>
  );
};

const COLUMN_HEAD = {
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  color: 'var(--fg-subtle)',
  textTransform: 'uppercase',
} as const;

interface FlagRowProps {
  flag: AdminFeatureFlag;
  error: string | null;
  onPick: (stage: Stage) => void;
}

const FlagRow = ({ flag, error, onPick }: FlagRowProps) => {
  const stage = stageOf(flag);
  const people = flag.people?.length ?? 0;
  // Production keeps a flag locked until it is verified there: a step UP is
  // closed, stepping down never is.
  const locked = flag.locked === true;

  return (
    <li
      data-testid={`flag-row-${flag.key}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 24,
        padding: '16px 18px',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
            {flag.label}
          </span>
          {people > 0 && (
            <span
              data-testid={`flag-people-${flag.key}`}
              style={{ fontSize: 12, color: 'var(--signal)' }}
            >
              {COPY.peopleCount(people)}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            marginTop: 3,
            lineHeight: 1.5,
          }}
        >
          {flag.description}
        </div>
        <div
          style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 5 }}
        >
          {flag.updatedAt ? (
            <>
              {`${COPY.changedPrefix} `}
              <RelTime iso={flag.updatedAt} />
            </>
          ) : (
            COPY.neverToggled
          )}
        </div>
        {error !== null && (
          <div
            role="alert"
            style={{ fontSize: 13, color: 'var(--danger)', marginTop: 6 }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 320px', maxWidth: 360 }}>
        <div
          role="group"
          aria-label={COPY.ladderAriaLabel(flag.label)}
          style={{
            display: 'flex',
            padding: 3,
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        >
          {STAGES.map((step) => {
            const selected = step === stage;
            const closed = locked && rankOf(step) > rankOf(stage);
            return (
              <button
                key={step}
                type="button"
                aria-pressed={selected}
                aria-describedby={
                  closed ? `flag-locked-${flag.key}` : undefined
                }
                disabled={closed}
                data-testid={`flag-step-${flag.key}-${step}`}
                onClick={() => onPick(step)}
                style={{
                  flex: 1,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 10px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: closed || selected ? 'default' : 'pointer',
                  background: selected ? 'var(--bg-elevated)' : 'transparent',
                  color: selected ? 'var(--fg)' : 'var(--fg-muted)',
                  boxShadow: selected
                    ? '0 0 0 1px var(--border-strong)'
                    : 'none',
                  opacity: closed ? 0.45 : 1,
                }}
              >
                {COPY.stage[step]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: '0 0 190px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 5,
        }}
      >
        {flag.verifiedAt ? (
          <>
            <span
              data-testid={`flag-verified-${flag.key}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 22,
                padding: '0 9px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 600,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                color: 'var(--success)',
                background:
                  'color-mix(in oklab, var(--success) 14%, transparent)',
                border:
                  '1px solid color-mix(in oklab, var(--success) 32%, transparent)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--success)',
                }}
              />
              {`${COPY.verifiedOn} `}
              <RelTime iso={flag.verifiedAt} />
            </span>
          </>
        ) : (
          <>
            <span
              data-testid={`flag-unverified-${flag.key}`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg-muted)',
              }}
            >
              {locked ? COPY.lockedChip : COPY.notVerified}
            </span>
            {locked && (
              <span
                id={`flag-locked-${flag.key}`}
                style={{
                  fontSize: 11.5,
                  color: 'var(--fg-subtle)',
                  textAlign: 'right',
                }}
              >
                {COPY.lockedCaption}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
};

interface EveryoneInProductionAskProps {
  flag: AdminFeatureFlag;
  from: Stage;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// "Everyone in production asks first" (`07-people-flags-operations`). The board
// also reads staging's step into this dialog; production never reads staging
// (Hugh's ruling), so only this environment's own step is shown.
const EveryoneInProductionAsk = ({
  flag,
  from,
  pending,
  onCancel,
  onConfirm,
}: EveryoneInProductionAskProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogKeyboard(panelRef, onCancel, { dismissible: !pending });
  const heading = COPY.everyoneAsk.title(flag.label);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(evt) => {
        if (pending) return;
        if (evt.target === evt.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: 460,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--signal)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 14px' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
            }}
          >
            {heading}
          </h3>
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
            }}
          >
            {COPY.everyoneAsk.body(flag.label)}
          </div>
          <div
            data-testid="everyone-ask-step"
            style={{
              marginTop: 14,
              fontSize: 12.5,
              color: 'var(--fg)',
              fontWeight: 600,
            }}
          >
            {COPY.everyoneAsk.step(COPY.stage[from], COPY.stage.everyone)}
          </div>
        </div>
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            background: 'var(--surface-1)',
          }}
        >
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {COPY.confirmCancel}
          </AdminButton>
          <AdminButton variant="primary" onClick={onConfirm} disabled={pending}>
            {COPY.everyoneAsk.accept}
          </AdminButton>
        </div>
      </div>
    </div>
  );
};

'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { FlagDrawer } from './FlagDrawer';
import { StageLadder, type Stage } from './StageLadder';

const COPY = ADMIN_COPY.featureFlags;

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
  // The flag whose Mark verified ask is open, by key: the ask reads the live
  // row, not a copy taken when it opened.
  const [verifyingKey, setVerifyingKey] = useState<FeatureFlagKey | null>(null);
  // The flag whose drawer (people, verified line, History) is open, by key.
  const [openKey, setOpenKey] = useState<FeatureFlagKey | null>(null);
  const [error, setError] = useState<{
    key: FeatureFlagKey;
    message: string;
  } | null>(null);

  // One save at a time: gets a token, runs the call and swaps the flag's row
  // for the answer. The Everyone ask closes on a failure (the error renders in
  // the row underneath, so leaving it open would hide it); the Mark verified
  // ask stays open and shows the error itself, so the ticks and note survive.
  const mutate = async (
    flag: AdminFeatureFlag,
    failure: string,
    run: (token: string) => Promise<AdminFeatureFlag>,
  ) => {
    if (pending !== null) return;
    setPending(flag.key);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError({ key: flag.key, message: failure });
        return;
      }
      const updated = await run(token);
      setFlags((prev) =>
        prev.map((row) => (row.key === updated.key ? updated : row)),
      );
      setVerifyingKey(null);
    } catch (err) {
      console.error('[admin] feature flag save failed', flag.key, err);
      // A 409 is the production lock: the flag is not verified here yet.
      const message =
        err instanceof ApiError && err.status === 409
          ? COPY.lockedError
          : err instanceof ApiError
            ? `${failure} ${err.message}`
            : failure;
      setError({ key: flag.key, message });
    } finally {
      setPending(null);
      setAsking(null);
    }
  };

  const moveFlag = (flag: AdminFeatureFlag, stage: Stage, confirm?: boolean) =>
    mutate(flag, COPY.saveError, (token) =>
      apiClient.patch<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}`,
        token,
        confirm === true ? { stage, confirm } : { stage },
      ),
    );

  const markVerified = (
    flag: AdminFeatureFlag,
    note: string,
    checks: Record<CheckKey, boolean>,
  ) =>
    mutate(flag, COPY.markVerified.error, (token) =>
      apiClient.post<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}/verify`,
        token,
        note === '' ? { checks } : { note, checks },
      ),
    );

  const undoVerified = (flag: AdminFeatureFlag) =>
    mutate(flag, COPY.markVerified.error, (token) =>
      apiClient.delete<AdminFeatureFlag>(
        `/v1/admin/feature-flags/${flag.key}/verify`,
        token,
      ),
    );

  const pick = (flag: AdminFeatureFlag, stage: Stage) => {
    const from = flag.stage;
    if (stage === from || pending !== null) return;
    // Production asks first before a flag goes to everyone.
    if (flag.environment === 'production' && stage === 'everyone') {
      setAsking({ flag, from });
      return;
    }
    void moveFlag(flag, stage);
  };

  const verifying = flags.find((row) => row.key === verifyingKey) ?? null;
  const open = flags.find((row) => row.key === openKey) ?? null;

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
            onOpen={() => setOpenKey(flag.key)}
            onMarkVerified={() => {
              if (pending === null) setVerifyingKey(flag.key);
            }}
            onUndoVerified={() => void undoVerified(flag)}
            saving={pending === flag.key}
          />
        ))}
      </ul>

      {open && (
        <FlagDrawer
          flag={open}
          saving={pending === open.key}
          onClose={() => setOpenKey(null)}
          onPick={(stage) => pick(open, stage)}
          onFlag={(updated) =>
            setFlags((prev) =>
              prev.map((row) => (row.key === updated.key ? updated : row)),
            )
          }
          onMarkVerified={() => {
            if (pending === null) setVerifyingKey(open.key);
          }}
          onUndoVerified={() => void undoVerified(open)}
        />
      )}

      {verifying && (
        <MarkVerifiedAsk
          flag={verifying}
          pending={pending === verifying.key}
          error={error?.key === verifying.key ? error.message : null}
          onCancel={() => {
            if (pending !== null) return;
            setVerifyingKey(null);
          }}
          onConfirm={(note, checks) =>
            void markVerified(verifying, note, checks)
          }
        />
      )}

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

const LINK_BUTTON: CSSProperties = {
  background: 'none',
  border: 'none',
  // A larger hit area than the 12px text: the link is the only way back.
  padding: '8px 6px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--signal)',
  cursor: 'pointer',
  textDecoration: 'underline',
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
  onOpen: () => void;
  onMarkVerified: () => void;
  onUndoVerified: () => void;
  saving: boolean;
}

const FlagRow = ({
  flag,
  error,
  onPick,
  onOpen,
  onMarkVerified,
  onUndoVerified,
  saving,
}: FlagRowProps) => {
  const { stage } = flag;
  // The verified mark is set on staging; the production control is not drawn.
  const onStaging = flag.environment !== 'production';
  const people = flag.people?.length ?? 0;
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
          {/* The boards do not draw what opens the drawer; the name does. */}
          <button
            type="button"
            onClick={onOpen}
            aria-label={COPY.drawer.openAriaLabel(flag.label)}
            data-testid={`flag-open-${flag.key}`}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--fg)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {flag.label}
          </button>
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
        <StageLadder flag={flag} onPick={onPick} />
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
            {onStaging && (
              <button
                type="button"
                onClick={onUndoVerified}
                disabled={saving}
                aria-label={COPY.markVerified.undoAriaLabel(flag.label)}
                data-testid={`flag-undo-verified-${flag.key}`}
                style={LINK_BUTTON}
              >
                {COPY.markVerified.undo}
              </button>
            )}
          </>
        ) : onStaging && stage !== 'off' ? (
          <>
            <AdminButton
              variant="outline"
              size="sm"
              onClick={onMarkVerified}
              disabled={saving}
              data-testid={`flag-mark-verified-${flag.key}`}
            >
              {COPY.markVerified.button}
            </AdminButton>
            <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
              {COPY.markVerified.hint}
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

interface AskDialogProps {
  heading: string;
  pending: boolean;
  onCancel: () => void;
  children: ReactNode;
  footer: ReactNode;
}

// The shell both asks share: backdrop, keyboard handling, heading, a body
// slot and a footer slot.
const AskDialog = ({
  heading,
  pending,
  onCancel,
  children,
  footer,
}: AskDialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogKeyboard(panelRef, onCancel, { dismissible: !pending });

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
          {children}
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
          {footer}
        </div>
      </div>
    </div>
  );
};

const ASK_BODY: CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: 'var(--fg-muted)',
  lineHeight: 1.6,
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
}: EveryoneInProductionAskProps) => (
  <AskDialog
    heading={COPY.everyoneAsk.title(flag.label)}
    pending={pending}
    onCancel={onCancel}
    footer={
      <>
        <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
          {COPY.confirmCancel}
        </AdminButton>
        <AdminButton variant="primary" onClick={onConfirm} disabled={pending}>
          {COPY.everyoneAsk.accept}
        </AdminButton>
      </>
    }
  >
    <div style={ASK_BODY}>{COPY.everyoneAsk.body(flag.label)}</div>
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
  </AskDialog>
);

const CHECK_KEYS = ['triedAsMe', 'checkedOnPhone', 'checkedFlagOff'] as const;

type CheckKey = (typeof CHECK_KEYS)[number];

interface MarkVerifiedAskProps {
  flag: AdminFeatureFlag;
  pending: boolean;
  /** A failed save, shown here because the row behind the overlay is hidden. */
  error: string | null;
  onCancel: () => void;
  onConfirm: (note: string, checks: Record<CheckKey, boolean>) => void;
}

// "Mark verified asks first" (`07-people-flags-operations`): three ticks the
// admin must make, an optional note. The ticks are stored as booleans beside
// the note.
const MarkVerifiedAsk = ({
  flag,
  pending,
  error,
  onCancel,
  onConfirm,
}: MarkVerifiedAskProps) => {
  const ask = COPY.markVerified;
  const [ticks, setTicks] = useState<Record<CheckKey, boolean>>({
    triedAsMe: false,
    checkedOnPhone: false,
    checkedFlagOff: false,
  });
  const [note, setNote] = useState('');
  const complete = CHECK_KEYS.every((key) => ticks[key]);

  return (
    <AskDialog
      heading={ask.title(flag.label)}
      pending={pending}
      onCancel={onCancel}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
            {COPY.confirmCancel}
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={() => onConfirm(note.trim(), ticks)}
            disabled={pending || !complete}
          >
            {ask.accept}
          </AdminButton>
        </>
      }
    >
      <div style={ASK_BODY}>{ask.body}</div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {CHECK_KEYS.map((key) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--fg)',
            }}
          >
            <input
              type="checkbox"
              checked={ticks[key]}
              disabled={pending}
              data-testid={`verify-check-${key}`}
              onChange={(evt) =>
                setTicks((prev) => ({ ...prev, [key]: evt.target.checked }))
              }
            />
            {ask.checks[key]}
          </label>
        ))}
      </div>
      <label
        style={{
          display: 'block',
          marginTop: 16,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {ask.noteLabel}
        {/* A textarea so the drawn placeholder wraps at 320 instead of clipping. */}
        <textarea
          value={note}
          rows={2}
          maxLength={500}
          disabled={pending}
          placeholder={ask.notePlaceholder}
          data-testid="verify-note"
          aria-describedby={`verify-note-help-${flag.key}`}
          onChange={(evt) => setNote(evt.target.value)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 6,
            padding: '8px 10px',
            fontSize: 13,
            fontFamily: 'inherit',
            lineHeight: 1.4,
            resize: 'none',
            color: 'var(--fg)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        />
      </label>
      <div
        id={`verify-note-help-${flag.key}`}
        style={{ marginTop: 6, fontSize: 11.5, color: 'var(--fg-subtle)' }}
      >
        {ask.noteHelp}
      </div>
      {error && (
        <div
          role="alert"
          style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}
    </AskDialog>
  );
};

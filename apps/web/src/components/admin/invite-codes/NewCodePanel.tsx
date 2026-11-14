'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, useIsPhone } from '@/components/admin/primitives';
import { CodeTakenError, type ListedCode, type NewCode } from './codes-api';
import {
  cleanCode,
  cleanLabel,
  codeProblem,
  expiresAtFor,
  seatsFrom,
  suggestCode,
  type ExpiryChoice,
} from './code-rules';
import {
  CANCEL,
  ExpiryPills,
  Field,
  Hint,
  INPUT,
  SeatsField,
  type SeatsChoice,
} from './CodeFormParts';
import { CodeSurface } from './CodeSurface';
import { MONO } from './code-styles';

const COPY = ADMIN_COPY.codesPage.form;
// As drawn on `07/new-code-in-flow` and `07/new-code-mobile`.
const PRESETS = [1, 10, 25, 50, 100] as const;

/**
 * `07/new-code-in-flow` with `12/code-taken-d`. The code is suggested from the
 * label until it's typed over. Recipient email is held (Hugh).
 */
export const NewCodePanel = ({
  create,
  onCreated,
  onClose,
}: {
  create: (body: NewCode) => Promise<ListedCode>;
  /** `posterNext` is true when Make a poster for it next was on. */
  onCreated: (code: ListedCode, posterNext: boolean) => void;
  onClose: () => void;
}) => {
  const isPhone = useIsPhone();
  const [label, setLabel] = useState('');
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const [seatsChoice, setSeatsChoice] = useState<SeatsChoice>('50');
  const [typedSeats, setTypedSeats] = useState('');
  const [expiry, setExpiry] = useState<ExpiryChoice>('d90');
  const [posterNext, setPosterNext] = useState(true);
  const [toggleFocus, setToggleFocus] = useState(false);
  const [taken, setTaken] = useState<CodeTakenError | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  const code = typedCode ?? suggestCode(label);
  const seats = seatsFrom(seatsChoice, typedSeats);
  const problem = codeProblem(code);
  const codeOk = problem === null;
  const canMake = seats != null && codeOk && !pending;
  const offerPoster = seats != null && seats > 1;

  const make = async () => {
    if (!canMake) return;
    setPending(true);
    setTaken(null);
    setFailed(false);
    const expiresAt = expiresAtFor(expiry, new Date());
    const storedLabel = cleanLabel(label);
    try {
      const made = await create({
        maxUses: seats,
        ...(storedLabel ? { label: storedLabel } : {}),
        ...(expiresAt ? { expiresAt } : {}),
        ...(code ? { code } : {}),
      });
      onCreated(made, offerPoster && posterNext);
    } catch (err) {
      if (err instanceof CodeTakenError) setTaken(err);
      else setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <CodeSurface
      title={isPhone ? COPY.newTitle : COPY.newPanelTitle}
      label={isPhone ? COPY.newTitle : COPY.newPanelTitle}
      bareHeader
      // Dismissal stays on and is refused here while saving: toggling the
      // surface's `dismissible` re-runs its focus trap and drops focus.
      onClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <>
          <AdminButton
            type="button"
            disabled={!canMake}
            onClick={() => void make()}
            fullWidth={isPhone}
            variant="gradient"
            style={{
              height: isPhone ? 46 : 40,
              fontSize: isPhone ? 15 : 14,
              // The phone sheet stacks its footer; flex 1 would squash it.
              ...(isPhone ? {} : { flex: 1 }),
              borderRadius: 9,
            }}
          >
            {COPY.make}
          </AdminButton>
          {/* The phone sheet has no Cancel (`07/new-code-mobile`). */}
          {!isPhone && (
            <AdminButton
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
              style={CANCEL}
            >
              {COPY.cancel}
            </AdminButton>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label={COPY.label} htmlFor="new-code-label">
          <input
            id="new-code-label"
            value={label}
            maxLength={120}
            onChange={(evt) => setLabel(evt.target.value)}
            style={INPUT}
          />
        </Field>
        <Field label={COPY.code} htmlFor="new-code-code">
          <input
            id="new-code-code"
            value={code}
            maxLength={20}
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={taken || problem ? true : undefined}
            aria-describedby="new-code-code-hint"
            onChange={(evt) => {
              setTaken(null);
              setTypedCode(cleanCode(evt.target.value));
            }}
            style={{
              ...INPUT,
              ...MONO,
              fontSize: 13,
              borderColor: taken ? 'var(--danger)' : 'var(--border-strong)',
            }}
          />
          <div id="new-code-code-hint">
            {taken ? (
              <>
                <Hint tone="var(--danger)" alert>
                  {COPY.codeTaken(taken.code, taken.suggestion)}
                </Hint>
                <Hint>{COPY.codeRule}</Hint>
              </>
            ) : (
              <Hint>{problem ?? COPY.codeHint}</Hint>
            )}
          </div>
        </Field>
        <SeatsField
          presets={PRESETS}
          choice={seatsChoice}
          typed={typedSeats}
          onChoice={setSeatsChoice}
          onTyped={setTypedSeats}
          hint={COPY.seatsNewHint}
          error={null}
        />
        <ExpiryPills value={expiry} onChange={setExpiry} />
        {offerPoster && (
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={posterNext}
              onChange={(evt) => setPosterNext(evt.target.checked)}
              // The real box is hidden, so the drawn one shows keyboard focus.
              onFocus={(evt) =>
                setToggleFocus(evt.currentTarget.matches(':focus-visible'))
              }
              onBlur={() => setToggleFocus(false)}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
            />
            <span
              aria-hidden
              style={{
                outline: toggleFocus ? '2px solid var(--signal)' : 'none',
                outlineOffset: 2,
                width: 18,
                height: 18,
                marginTop: 1,
                borderRadius: 5,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: posterNext ? 'var(--signal)' : 'transparent',
                border: posterNext ? 'none' : '1px solid var(--border-strong)',
                color: 'var(--bg)',
              }}
            >
              {posterNext && <Check size={12} strokeWidth={3} />}
            </span>
            <span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                {COPY.posterNext}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  marginTop: 2,
                }}
              >
                {COPY.posterNextHint}
              </span>
            </span>
          </label>
        )}
        {failed && (
          <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
            {COPY.makeFailed}
          </div>
        )}
      </div>
    </CodeSurface>
  );
};

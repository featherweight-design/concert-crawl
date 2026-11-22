'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { usePathname } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useTheme } from '@/theme/ThemeProvider';
import { ModalShell } from '@/components/consumer/modal-shell';
import { deviceSummary } from '@/components/consumer/error-report/lib/report-context';
import { clearDraft, loadDraft, saveDraft } from '@/lib/feedback-draft';
import {
  FEEDBACK_SCREENSHOT_TYPES,
  MAX_FEEDBACK_SCREENSHOT_BYTES,
  isFeedbackScreenshotType,
} from '@concert-crawl/types';

type FeedbackCategory = 'bug' | 'idea' | 'praise' | 'other';
type ModalState = 'form' | 'loading' | 'success' | 'error';

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug', label: CONSUMER_COPY.feedback.modal.categories.bug },
  { key: 'idea', label: CONSUMER_COPY.feedback.modal.categories.idea },
  { key: 'praise', label: CONSUMER_COPY.feedback.modal.categories.praise },
  { key: 'other', label: CONSUMER_COPY.feedback.modal.categories.other },
];

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { getToken } = useAuth();
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? 'anonymous';
  const [state, setState] = useState<ModalState>('form');
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [catError, setCatError] = useState(false);
  const [msgError, setMsgError] = useState(false);
  const [screenshot, setScreenshot] = useState<{
    name: string;
    dataUrl: string;
  } | null>(null);
  // Why the picked file was refused (wrong type, or too big), shown under
  // the picker until the fan picks again or removes it.
  const [screenshotError, setScreenshotError] = useState<
    'type' | 'size' | null
  >(null);
  // Banner shown when a previously-saved draft was rehydrated on open.
  // User can dismiss via "Discard draft" which also clears localStorage.
  const [draftRestored, setDraftRestored] = useState(false);
  // True when saveAndCloseLater hit a storage failure (quota / privacy mode).
  // Surfaces an inline message in the error state so we never silently
  // close while the button promised the draft was saved.
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const prevOpenRef = useRef(false);
  // Lifted from FormFields so discardDraft / reset can clear the underlying
  // <input type="file"> value when the screenshot state goes away. Without
  // this, re-attaching the same file after a discard doesn't fire onChange
  // because the input's value never changed.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Holds the pending reset() timer scheduled by handleClose so a quick
  // reopen can cancel it before it fires and wipes a freshly-restored
  // draft (#834 Copilot R3 — race condition: timer fires 300ms after
  // close, user reopens within that window, useEffect hydrates draft,
  // then timer fires and resets state).
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFileInput = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const cancelPendingReset = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  // Cleanup the timer on unmount so an in-flight reset doesn't fire
  // against an unmounted component.
  useEffect(() => cancelPendingReset, [cancelPendingReset]);

  // Hydrate from a saved draft whenever the modal opens (false→true).
  // This is the only place we read from localStorage so we don't fight
  // with the user's in-progress typing.
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;
    // Cancel any pending close-reset timer so it can't fire mid-hydration
    // and wipe the draft we just restored (#834 Copilot R3).
    cancelPendingReset();
    const draft = loadDraft();
    if (!draft) return;
    setCategory(draft.category);
    setMessage(draft.message);
    setScreenshot(draft.screenshot);
    setCatError(false);
    setMsgError(false);
    setDraftRestored(true);
    // If the modal was previously closed mid-error/success, ensure we
    // land back on the form when rehydrating so the user sees the draft.
    setState('form');
  }, [open, cancelPendingReset]);

  const handleScreenshotChange = useCallback(
    (file: File | null) => {
      setScreenshotError(null);
      if (!file) {
        setScreenshot(null);
        return;
      }
      // The same types and size the API keeps: refuse here, before reading,
      // so the fan knows rather than the screenshot silently going missing.
      const refusal = !isFeedbackScreenshotType(file.type)
        ? 'type'
        : file.size > MAX_FEEDBACK_SCREENSHOT_BYTES
          ? 'size'
          : null;
      if (refusal) {
        setScreenshot(null);
        setScreenshotError(refusal);
        clearFileInput();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const { result } = reader;
        if (typeof result === 'string') {
          setScreenshot({ name: file.name, dataUrl: result });
        }
      };
      reader.readAsDataURL(file);
    },
    [clearFileInput],
  );

  const reset = useCallback(() => {
    setState('form');
    setCategory(null);
    setMessage('');
    setCatError(false);
    setMsgError(false);
    setScreenshot(null);
    setScreenshotError(null);
    setDraftRestored(false);
    setDraftSaveFailed(false);
    clearFileInput();
  }, [clearFileInput]);

  // Issue #829: return from the error state back to the form WITHOUT
  // wiping category/message/screenshot so the user can correct + retry.
  // Also clears draftSaveFailed (#834 Copilot R2) — otherwise a user who
  // hit a save failure, returned to the form, then hit another submit
  // error would still see the stale "Couldn't save your draft" alert.
  const returnToForm = useCallback(() => {
    setState('form');
    setDraftSaveFailed(false);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Replace any pending reset so a rapid close/reopen/close sequence
    // can't queue multiple resets that fire after a draft hydration.
    cancelPendingReset();
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      reset();
    }, 300);
  }, [cancelPendingReset, onClose, reset]);

  // Issue #830: "Save and come back" — persist the current draft to
  // localStorage, then close. Reopening the modal will rehydrate it.
  // If saveDraft fails (quota exceeded, storage disabled, privacy mode)
  // we keep the modal open and surface the failure inline so the user's
  // inputs aren't silently discarded by the subsequent close.
  const saveAndCloseLater = useCallback(() => {
    const saved = saveDraft({ category, message, screenshot });
    if (saved) {
      setDraftSaveFailed(false);
      handleClose();
    } else {
      setDraftSaveFailed(true);
    }
  }, [category, handleClose, message, screenshot]);

  const discardDraft = useCallback(() => {
    clearDraft();
    setDraftRestored(false);
    setCategory(null);
    setMessage('');
    setScreenshot(null);
    setScreenshotError(null);
    setCatError(false);
    setMsgError(false);
    clearFileInput();
  }, [clearFileInput]);

  const handleSubmit = useCallback(async () => {
    const catInvalid = !category;
    const msgInvalid = !message.trim();
    if (catInvalid || msgInvalid) {
      setCatError(catInvalid);
      setMsgError(msgInvalid);
      return;
    }

    setState('loading');

    const token = await getToken();
    if (!token) {
      setState('error');
      return;
    }

    // The same coarse summary a problem report sends, so admin's Device
    // column reads one way and never stores a fingerprintable agent.
    const device =
      typeof navigator !== 'undefined'
        ? deviceSummary(navigator.userAgent)
        : 'unknown';

    try {
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: pathname,
          metadata: {
            theme,
            build: APP_VERSION,
            device,
            screenshot: screenshot?.dataUrl,
          },
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      // Successful submission invalidates any saved draft.
      clearDraft();
      setDraftRestored(false);
      setState('success');
    } catch (err) {
      console.error('Feedback submission failed', err);
      setState('error');
    }
  }, [category, getToken, message, pathname, screenshot, theme]);

  const handleCategoryChange = useCallback((cat: FeedbackCategory) => {
    setCategory(cat);
    setCatError(false);
  }, []);

  const handleMessageChange = useCallback((msg: string) => {
    setMessage(msg);
    setMsgError(false);
  }, []);

  const showForm = state === 'form' || state === 'loading';
  const ctxData: CtxData = {
    route: pathname,
    theme,
    build: APP_VERSION,
    device:
      typeof navigator !== 'undefined'
        ? navigator.userAgent.slice(0, 120)
        : 'unknown',
    user: userEmail,
  };

  // fan-send-feedback and fan-feedback-sent-m draw no header rail and no
  // pinned footer: the title, the chips, the field and Send sit in one
  // column, and the sheet fits its content.
  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      ariaLabel={CONSUMER_COPY.feedback.modal.ariaLabel}
      sheetHeight="fit"
    >
      <div>
        {state === 'success' && <SuccessState onDone={handleClose} />}
        {state === 'error' && (
          <ErrorState
            onRetry={returnToForm}
            onSaveForLater={saveAndCloseLater}
            saveFailed={draftSaveFailed}
          />
        )}
        {showForm && (
          <FormFields
            state={state}
            category={category}
            setCategory={handleCategoryChange}
            message={message}
            setMessage={handleMessageChange}
            catError={catError}
            msgError={msgError}
            ctxData={ctxData}
            screenshot={screenshot}
            screenshotError={screenshotError}
            onScreenshotChange={handleScreenshotChange}
            draftRestored={draftRestored}
            onDiscardDraft={discardDraft}
            fileInputRef={fileInputRef}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </ModalShell>
  );
}

// ── Shared form fields ─────────────────────────────────────────────────────

interface CtxData {
  route: string;
  theme: string;
  build: string;
  device: string;
  user: string;
}

interface ScreenshotValue {
  name: string;
  dataUrl: string;
}

interface FormProps {
  state: ModalState;
  category: FeedbackCategory | null;
  setCategory: (cat: FeedbackCategory) => void;
  message: string;
  setMessage: (msg: string) => void;
  catError: boolean;
  msgError: boolean;
  ctxData: CtxData;
  screenshot: ScreenshotValue | null;
  screenshotError: 'type' | 'size' | null;
  onScreenshotChange: (file: File | null) => void;
  draftRestored: boolean;
  onDiscardDraft: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}

function FormFields({
  state,
  category,
  setCategory,
  message,
  setMessage,
  catError,
  msgError,
  ctxData,
  screenshot,
  screenshotError,
  onScreenshotChange,
  draftRestored,
  onDiscardDraft,
  fileInputRef,
  onSubmit,
}: FormProps) {
  const disabled = state === 'loading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {draftRestored && (
        <DraftRestoredBanner onDiscard={onDiscardDraft} disabled={disabled} />
      )}
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 19,
          color: 'var(--fg)',
        }}
      >
        {CONSUMER_COPY.feedback.modal.form.heading}
      </h2>

      {/* Category chips */}
      <div>
        <div
          role="group"
          aria-label={CONSUMER_COPY.feedback.modal.form.categoryGroupLabel}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => setCategory(cat.key)}
                style={{
                  all: 'unset',
                  cursor: disabled ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  height: 34,
                  padding: '0 13px',
                  borderRadius: 999,
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 600,
                  fontSize: 13,
                  // The selected chip: a gradient rim on --surface-2.
                  border: `1px solid ${
                    active
                      ? 'transparent'
                      : catError
                        ? 'var(--warning)'
                        : 'var(--border)'
                  }`,
                  background: active
                    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
                    : 'transparent',
                  color: active ? 'var(--fg)' : 'var(--fg-muted)',
                  transition:
                    'color var(--motion-fast) var(--motion-ease), border-color var(--motion-fast) var(--motion-ease)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
        {catError && (
          <HelpText tone="error">
            {CONSUMER_COPY.feedback.modal.errors.categoryRequired}
          </HelpText>
        )}
      </div>

      {/* Message */}
      <div>
        <textarea
          className="fb-textarea"
          value={message}
          onChange={(ev) => setMessage(ev.target.value)}
          disabled={disabled}
          aria-label={CONSUMER_COPY.feedback.modal.form.messagePlaceholder}
          placeholder={CONSUMER_COPY.feedback.modal.form.messagePlaceholder}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 110,
            boxSizing: 'border-box',
            padding: 12,
            background: 'var(--bg)',
            color: 'var(--fg)',
            border: `1px solid ${msgError ? 'var(--warning)' : 'var(--border-strong)'}`,
            borderRadius: 12,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            opacity: disabled ? 0.6 : 1,
            transition: 'border-color var(--motion-fast) var(--motion-ease)',
          }}
        />
        {msgError && (
          <HelpText tone="error">
            {CONSUMER_COPY.feedback.modal.errors.messageRequired}
          </HelpText>
        )}
      </div>

      {/* Screenshot attachment */}
      <div>
        <Eyebrow>{CONSUMER_COPY.feedback.modal.form.screenshotEyebrow}</Eyebrow>
        <input
          ref={fileInputRef}
          type="file"
          accept={FEEDBACK_SCREENSHOT_TYPES.join(',')}
          style={{ display: 'none' }}
          disabled={disabled}
          onChange={(ev) => {
            onScreenshotChange(ev.target.files?.[0] ?? null);
          }}
        />
        {screenshot ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 10,
              background: 'var(--surface-1)',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'color-mix(in oklab, var(--signal) 14%, transparent)',
                color: 'var(--signal)',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 8l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--fg)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {screenshot.name}
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label={
                CONSUMER_COPY.feedback.modal.form.screenshotRemoveAriaLabel
              }
              onClick={() => {
                onScreenshotChange(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                all: 'unset',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: 5,
                color: 'var(--fg-subtle)',
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            style={{
              all: 'unset',
              cursor: disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 14px',
              border: '1.5px dashed var(--border-strong)',
              borderRadius: 10,
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-2)',
                color: 'var(--signal)',
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect
                  x="2"
                  y="3.5"
                  width="12"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="2.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M5.5 3.5l1-1.2h3l1 1.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <span
                style={{ color: 'var(--fg)', fontSize: 13, fontWeight: 700 }}
              >
                {CONSUMER_COPY.feedback.modal.form.screenshotAttachLabel}
              </span>
              <span
                style={{
                  color: 'var(--fg-subtle)',
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                {CONSUMER_COPY.feedback.modal.form.screenshotAttachSublabel}
              </span>
            </span>
          </button>
        )}
        {screenshotError && (
          <div role="alert">
            <HelpText tone="error">
              {screenshotError === 'size'
                ? CONSUMER_COPY.feedback.modal.errors.screenshotTooBig
                : CONSUMER_COPY.feedback.modal.errors.screenshotWrongType}
            </HelpText>
          </div>
        )}
      </div>

      <ContextDisclosure ctx={ctxData} />

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          lineHeight: 1.45,
          color: 'var(--fg-subtle)',
        }}
      >
        {CONSUMER_COPY.feedback.modal.form.note}
      </p>
      <SubmitButton loading={disabled} onClick={onSubmit}>
        {CONSUMER_COPY.feedback.modal.footer.submit}
      </SubmitButton>
    </div>
  );
}

// ── Status states ─────────────────────────────────────────────────────────

// fan-feedback-sent-m: a check tile, the heading, the note, and Done.
function SuccessState({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        role="status"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 10,
          padding: '18px 8px 4px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border:
              '1px solid color-mix(in oklab, var(--success) 40%, transparent)',
            background: 'color-mix(in oklab, var(--success) 10%, transparent)',
            color: 'var(--success)',
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 19,
            fontWeight: 800,
            color: 'var(--fg)',
          }}
        >
          {CONSUMER_COPY.feedback.modal.success.heading}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-ui)',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 300,
            color: 'var(--fg-muted)',
          }}
        >
          {CONSUMER_COPY.feedback.modal.success.body}
        </p>
      </div>
      <SubmitButton onClick={onDone}>
        {CONSUMER_COPY.feedback.modal.success.primaryAction}
      </SubmitButton>
    </div>
  );
}

function ErrorState({
  onRetry,
  onSaveForLater,
  saveFailed,
}: {
  // Primary action — return to the form WITHOUT clearing inputs (#829).
  onRetry: () => void;
  // Secondary action — persist the draft to localStorage then close (#830).
  onSaveForLater: () => void;
  // True when the most recent saveForLater attempt failed; surfaces an
  // inline notice so the user knows the draft wasn't persisted.
  saveFailed: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '8px 0',
      }}
    >
      <StatusRail />
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.0,
          color: 'var(--fg)',
          textWrap: 'balance',
        }}
      >
        {CONSUMER_COPY.feedback.modal.error.heading}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--fg-muted)',
          lineHeight: 1.55,
          letterSpacing: '-0.005em',
          textWrap: 'pretty',
        }}
      >
        {CONSUMER_COPY.feedback.modal.error.body}
      </div>
      {saveFailed && (
        <div
          role="alert"
          style={{
            fontSize: 13,
            color: 'var(--warning)',
            lineHeight: 1.5,
            letterSpacing: '-0.005em',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--warning)',
            background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
          }}
        >
          {CONSUMER_COPY.feedback.modal.draftBanner.saveFailed}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 4,
        }}
      >
        <SubmitButton onClick={onRetry}>
          {CONSUMER_COPY.feedback.modal.error.primaryAction}
        </SubmitButton>
        <SecondaryButton onClick={onSaveForLater}>
          {CONSUMER_COPY.feedback.modal.error.secondaryAction}
        </SecondaryButton>
      </div>
    </div>
  );
}

// ── Context disclosure ────────────────────────────────────────────────────

function ContextDisclosure({ ctx }: { ctx: CtxData }) {
  const [open, setOpen] = useState(false);
  const rows: { key: string; value: string }[] = [
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.route,
      value: ctx.route,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.theme,
      value: ctx.theme,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.build,
      value: ctx.build,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.device,
      value: ctx.device,
    },
    {
      key: CONSUMER_COPY.feedback.modal.contextDisclosure.fields.user,
      value: ctx.user,
    },
  ];
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            color: 'var(--fg-muted)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .15s',
            flexShrink: 0,
          }}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {CONSUMER_COPY.feedback.modal.contextDisclosure.toggleLabel}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.10em',
          }}
        >
          {CONSUMER_COPY.feedback.modal.contextDisclosure.fieldCount}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: '4px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            borderTop: '1px solid var(--border)',
          }}
        >
          {rows.map((row) => (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr',
                gap: 10,
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--fg-subtle)',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                }}
              >
                {row.key}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  letterSpacing: '0.01em',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Primitive atoms ───────────────────────────────────────────────────────

function DraftRestoredBanner({
  onDiscard,
  disabled,
}: {
  onDiscard: () => void;
  disabled: boolean;
}) {
  // Keyboard focus visibility (#834 Copilot R2). The previous `all: 'unset'`
  // wiped the browser's default focus outline and there's no app-wide
  // :focus-visible style covering this surface — keyboard users couldn't see
  // where focus landed. Inline state mirrors :focus-visible behaviour
  // (focus from keyboard only) without dragging in a CSS-module just for
  // one button.
  const [focusVisible, setFocusVisible] = useState(false);
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid var(--border-strong)',
        background: 'color-mix(in oklab, var(--signal) 8%, var(--surface-1))',
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--fg)',
          letterSpacing: '-0.005em',
        }}
      >
        {CONSUMER_COPY.feedback.modal.draftBanner.message}
      </span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={disabled}
        aria-label={CONSUMER_COPY.feedback.modal.draftBanner.discardAriaLabel}
        onFocus={(ev) => {
          // matches() guards against jsdom (test env) where the pseudo
          // selector is unimplemented — keep the focus ring visible there
          // rather than dropping it silently.
          const target = ev.currentTarget;
          const matchesFn = target.matches.bind(target);
          let visible = true;
          try {
            visible = matchesFn(':focus-visible');
          } catch {
            visible = true;
          }
          setFocusVisible(visible);
        }}
        onBlur={() => setFocusVisible(false)}
        onPointerDown={() => setFocusVisible(false)}
        style={{
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          background: 'transparent',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          outline: 'none',
          boxShadow: focusVisible ? '0 0 0 2px var(--signal)' : 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {CONSUMER_COPY.feedback.modal.draftBanner.discardLabel}
      </button>
    </div>
  );
}

function Eyebrow({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: error ? 'var(--warning)' : 'var(--fg-subtle)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function HelpText({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'muted' | 'error';
}) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: tone === 'error' ? 'var(--warning)' : 'var(--fg-subtle)',
        marginTop: 6,
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </div>
  );
}

// Only the error state has a rail: the success screen carries its own header.
function StatusRail() {
  const accent = 'var(--warning)';
  const label = CONSUMER_COPY.feedback.modal.statusRail.errorLabel;
  const code = CONSUMER_COPY.feedback.modal.statusRail.errorCode;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: accent,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: accent,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {code}
      </span>
    </div>
  );
}

function SubmitButton({
  children,
  onClick,
  loading = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        all: 'unset',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 46,
        width: '100%',
        boxSizing: 'border-box',
        padding: '0 12px',
        background: 'linear-gradient(135deg, var(--signal), var(--cta-end))',
        color: 'var(--fg-on-accent)',
        border: '1px solid transparent',
        borderRadius: 9,
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 15,
        whiteSpace: 'nowrap',
        opacity: loading ? 0.55 : 1,
        transition: 'opacity var(--motion-fast) var(--motion-ease)',
      }}
    >
      {loading && <Spinner />}
      <span>
        {loading ? CONSUMER_COPY.feedback.modal.footer.submitting : children}
      </span>
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  fullWidth = true,
}: {
  children: React.ReactNode;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        boxSizing: 'border-box',
        height: 44,
        padding: '0 16px',
        borderRadius: 10,
        color: 'var(--fg-muted)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '-0.005em',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1.6px solid currentColor',
        borderTopColor: 'transparent',
        animation: 'fbSpin 0.8s linear infinite',
      }}
    />
  );
}

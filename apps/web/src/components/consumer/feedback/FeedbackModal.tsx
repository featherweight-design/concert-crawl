'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import {
  Check,
  ChevronDown,
  CircleAlert,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { useThemeName } from '@/theme/ThemeProvider';
import { ModalShell } from '@/components/consumer/modal-shell';
import { deviceSummary } from '@/components/consumer/error-report/lib/report-context';
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport';
import { clearDraft, loadDraft, saveDraft } from '@/lib/feedback-draft';
import {
  FEEDBACK_SCREENSHOT_TYPES,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  MAX_FEEDBACK_SCREENSHOT_BYTES,
  isFeedbackScreenshotType,
  type FanFeedbackCategory as FeedbackCategory,
} from '@concert-crawl/types';

// `error` is the send-failed state: the form stays as the fan left it and a
// banner sits above Try again. The draft is already saved by then.
type ModalState = 'form' | 'loading' | 'success' | 'error';

const MODAL = CONSUMER_COPY.feedback.modal;

// fb-sending-m: while a send is in flight the kinds, the field, the attach
// row and What we send lock and dim to 55%.
const DIMMED = 0.55;
// How long a send may take before it counts as failed and the draft is saved.
const SEND_TIMEOUT_MS = 30_000;

// In the order addendum 3's `02/fan-suggest-a-venue-m` draws them.
const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: 'bug', label: MODAL.categories.bug },
  { key: 'idea', label: MODAL.categories.idea },
  { key: 'venue_suggestion', label: MODAL.categories.venueSuggestion },
  { key: 'praise', label: MODAL.categories.praise },
  { key: 'other', label: MODAL.categories.other },
];

const isVenue = (category: FeedbackCategory | null): boolean =>
  category === 'venue_suggestion';

// A venue suggestion's fields ride in the message, with no metadata keys:
// the name, the website when given, then Anything else after a blank line.
// Admin quotes the whole message (feedback-item-rules `headOf`).
const venueMessage = (name: string, website: string, notes: string): string =>
  [[name.trim(), website.trim()].filter(Boolean).join('\n'), notes.trim()]
    .filter(Boolean)
    .join('\n\n')
    // Text carried over from a longer note can pass Anything else's cap, so
    // the joined message is held to the API's cap rather than sent to a 422.
    .slice(0, MAX_FEEDBACK_MESSAGE_LENGTH);

// The three fields' caps, with the two separators, fit the API's message cap.
const VENUE_NAME_MAX = 200;
const WEBSITE_MAX = 500;
const NOTES_MAX =
  MAX_FEEDBACK_MESSAGE_LENGTH - VENUE_NAME_MAX - WEBSITE_MAX - '\n\n\n'.length;

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export const FeedbackModal = ({ open, onClose }: FeedbackModalProps) => {
  const pathname = usePathname();
  // Never throws outside the provider: the modal mounts in the account menu.
  const theme = useThemeName();
  const { getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  // Whose draft this is: a signed-in fan's own, never the last user's on a
  // shared phone (Hugh, 2026-11-22). Signed out keeps the device-wide draft.
  const draftOwner = user?.id ?? null;
  const isMobile = useIsMobileViewport();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? 'anonymous';
  const [state, setState] = useState<ModalState>('form');
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [catError, setCatError] = useState(false);
  const [msgError, setMsgError] = useState(false);
  // Suggest a venue's fields. They stay in memory when the fan switches kind
  // (757 A5); only the kind on screen is sent or saved.
  const [venueName, setVenueName] = useState('');
  const [website, setWebsite] = useState('');
  const [nameError, setNameError] = useState(false);
  const [screenshot, setScreenshot] = useState<ScreenshotValue | null>(null);
  // Why the picked file was refused (wrong type, or too big), shown under
  // the attach row until the fan picks again or removes it.
  const [screenshotError, setScreenshotError] = useState<
    'type' | 'size' | null
  >(null);
  // Banner shown when a previously-saved draft was rehydrated on open.
  // User can dismiss via "Discard draft" which also clears localStorage.
  const [draftRestored, setDraftRestored] = useState(false);
  // True when the automatic draft save on a failed send hit a storage
  // failure (quota / privacy mode). Swaps the send-failed banner's text so
  // it never claims a save that didn't happen.
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  // Set once this open has read its draft; cleared when the sheet closes.
  const hydratedRef = useRef(false);
  // Lifted from FormFields so discardDraft / reset can clear the underlying
  // <input type="file"> value when the screenshot state goes away. Without
  // this, re-attaching the same file after a discard doesn't fire onChange
  // because the input's value never changed.
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Validation moves focus to the first missing field.
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const venueNameRef = useRef<HTMLInputElement>(null);
  // Holds the pending reset() timer scheduled by closeSheet so a quick
  // reopen can cancel it before it fires and wipes a freshly-restored
  // draft (#834 Copilot R3 — race condition: timer fires 300ms after
  // close, user reopens within that window, useEffect hydrates draft,
  // then timer fires and resets state).
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A2: × and Esc still close while sending, and the send carries on. While
  // it is in flight the sheet keeps its sending state (a reopen shows it, so
  // nothing can send twice). If it lands with the sheet closed, the sheet
  // resets; a failure has already saved the draft for the next open.
  const sendingRef = useRef(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  // Bumped by every reset, so a screenshot still being read when the sheet
  // resets is not attached to the fresh one.
  const readGenRef = useRef(0);

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

  // Hydrate from a saved draft once per open, after Clerk has said who is
  // signed in, so a signed-in fan never loads the signed-out draft first.
  // This is the only place we read from localStorage so we don't fight
  // with the user's in-progress typing.
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (!userLoaded || hydratedRef.current) return;
    hydratedRef.current = true;
    if (sendingRef.current) return;
    // Cancel any pending close-reset timer so it can't fire mid-hydration
    // and wipe the draft we just restored (#834 Copilot R3).
    cancelPendingReset();
    const draft = loadDraft(draftOwner);
    if (!draft) return;
    setCategory(draft.category);
    setMessage(draft.message);
    setScreenshot(draft.screenshot);
    setVenueName(draft.venueName);
    setWebsite(draft.website);
    setCatError(false);
    setMsgError(false);
    setNameError(false);
    setDraftRestored(true);
    // If the modal was previously closed mid-error/success, ensure we
    // land back on the form when rehydrating so the user sees the draft.
    setState('form');
  }, [open, userLoaded, draftOwner, cancelPendingReset]);

  const pickScreenshot = useCallback(
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
      const gen = readGenRef.current;
      reader.onerror = () => {
        console.warn('Feedback screenshot could not be read', reader.error);
      };
      reader.onload = () => {
        const { result } = reader;
        if (gen !== readGenRef.current) return;
        if (typeof result === 'string') {
          setScreenshot({ name: file.name, dataUrl: result });
        }
      };
      reader.readAsDataURL(file);
    },
    [clearFileInput],
  );

  const reset = useCallback(() => {
    readGenRef.current += 1;
    setState('form');
    setCategory(null);
    setMessage('');
    setVenueName('');
    setWebsite('');
    setCatError(false);
    setMsgError(false);
    setNameError(false);
    setScreenshot(null);
    setScreenshotError(null);
    setDraftRestored(false);
    setDraftSaveFailed(false);
    clearFileInput();
  }, [clearFileInput]);

  // 757 A5: a draft keeps only what the current kind shows, so a hidden
  // screenshot is not kept with a venue suggestion, nor venue fields with a
  // bug.
  const currentDraft = useCallback(() => {
    const venue = isVenue(category);
    return {
      category,
      message,
      screenshot: venue ? null : screenshot,
      venueName: venue ? venueName : '',
      website: venue ? website : '',
    };
  }, [category, message, screenshot, venueName, website]);

  const closeSheet = useCallback(() => {
    // Closing a failed send keeps the draft (fb-send-failed-m), edits
    // made since the failure included.
    if (state === 'error') saveDraft(currentDraft(), draftOwner);
    onClose();
    // Replace any pending reset so a rapid close/reopen/close sequence
    // can't queue multiple resets that fire after a draft hydration.
    cancelPendingReset();
    // A send in flight resets the sheet itself when it lands.
    if (sendingRef.current) return;
    resetTimerRef.current = setTimeout(() => {
      resetTimerRef.current = null;
      reset();
    }, 300);
  }, [cancelPendingReset, currentDraft, draftOwner, onClose, reset, state]);

  const discardDraft = useCallback(() => {
    clearDraft(draftOwner);
    setDraftRestored(false);
    setCategory(null);
    setMessage('');
    setVenueName('');
    setWebsite('');
    setScreenshot(null);
    setScreenshotError(null);
    setCatError(false);
    setMsgError(false);
    setNameError(false);
    clearFileInput();
  }, [clearFileInput, draftOwner]);

  // Send is never disabled: a press with something missing marks each
  // missing field in place and moves focus to the first one.
  const submitFeedback = useCallback(async () => {
    const venue = isVenue(category);
    const catInvalid = !category;
    // Suggest a venue needs only the name; Anything else is optional.
    const nameInvalid = venue && !venueName.trim();
    const msgInvalid = !venue && !message.trim();
    if (catInvalid || nameInvalid || msgInvalid) {
      setCatError(catInvalid);
      setNameError(nameInvalid);
      setMsgError(msgInvalid);
      if (catInvalid) firstChipRef.current?.focus();
      else if (nameInvalid) venueNameRef.current?.focus();
      else textareaRef.current?.focus();
      return;
    }
    if (sendingRef.current) return;

    sendingRef.current = true;
    setState('loading');
    setDraftSaveFailed(false);

    // The sheet was closed while sending: start it fresh for the next open.
    const landedClosed = () => {
      sendingRef.current = false;
      if (openRef.current) return false;
      reset();
      return true;
    };

    // A4: the draft is written the moment a send fails, so the banner is
    // true as soon as it shows. If the fan already closed the sheet, the
    // draft is restored on the next open.
    const failSend = () => {
      const saved = saveDraft(currentDraft(), draftOwner);
      if (landedClosed()) return;
      setDraftSaveFailed(!saved);
      setState('error');
    };

    // The same coarse summary a problem report sends, so admin's Device
    // column reads one way and never stores a fingerprintable agent.
    const device =
      typeof navigator !== 'undefined'
        ? deviceSummary(navigator.userAgent)
        : 'unknown';

    try {
      const token = await getToken();
      if (!token) throw new Error('no session token');
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        // A hung request would hold "Sending…" forever; give up and save.
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: venue
            ? venueMessage(venueName, website, message)
            : message.trim(),
          pageUrl: pathname,
          metadata: {
            theme,
            build: APP_VERSION,
            device,
            // Hidden under Suggest a venue, so never sent with one (757 A5).
            screenshot: venue ? undefined : screenshot?.dataUrl,
          },
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      // Successful submission invalidates any saved draft. A send the fan
      // closed on gets no toast (A2).
      clearDraft(draftOwner);
      if (landedClosed()) return;
      setDraftRestored(false);
      setState('success');
    } catch (err) {
      console.error('Feedback submission failed', err);
      failSend();
    }
  }, [
    category,
    currentDraft,
    draftOwner,
    getToken,
    message,
    pathname,
    reset,
    screenshot,
    theme,
    venueName,
    website,
  ]);

  const pickCategory = useCallback((cat: FeedbackCategory) => {
    setCategory(cat);
    setCatError(false);
  }, []);

  const editMessage = useCallback((msg: string) => {
    setMessage(msg);
    if (msg.trim()) setMsgError(false);
  }, []);

  const editVenueName = useCallback((name: string) => {
    setVenueName(name);
    if (name.trim()) setNameError(false);
  }, []);

  // The same five fields the request carries, so the list never claims
  // more (or less) than what rides along.
  const ctxData: CtxData = {
    page: pathname,
    device:
      typeof navigator !== 'undefined'
        ? deviceSummary(navigator.userAgent)
        : 'unknown',
    theme,
    appVersion: APP_VERSION,
    account: userEmail,
  };

  const success = state === 'success';

  // fan-send-feedback and the feedback-modal-states boards draw no header
  // rail and no pinned footer: the title, the chips, the field and Send sit
  // in one column, and the sheet fits its content. Desktop is a centered
  // modal with × top right, 440px wide once sent.
  return (
    <ModalShell
      open={open}
      onClose={closeSheet}
      ariaLabel={MODAL.ariaLabel}
      sheetHeight="fit"
      desktopWidth={success ? 440 : 520}
    >
      <div style={{ position: 'relative' }}>
        {isMobile ? (
          // The phone sheet draws no ×: it closes by drag or the scrim. A
          // keyboard or screen-reader user still needs a control, so it
          // shows only while focused.
          <span className="sr-only focus-within:not-sr-only">
            <CloseButton onClick={closeSheet} />
          </span>
        ) : (
          <CloseButton onClick={closeSheet} />
        )}
        {success ? (
          <SuccessState onDone={closeSheet} />
        ) : (
          <FormFields
            isMobile={isMobile}
            state={state}
            gap={isMobile ? 12 : 14}
            category={category}
            setCategory={pickCategory}
            message={message}
            setMessage={editMessage}
            catError={catError}
            msgError={msgError}
            venueName={venueName}
            setVenueName={editVenueName}
            website={website}
            setWebsite={setWebsite}
            nameError={nameError}
            ctxData={ctxData}
            screenshot={screenshot}
            screenshotError={screenshotError}
            onScreenshotChange={pickScreenshot}
            draftRestored={draftRestored}
            onDiscardDraft={discardDraft}
            draftSaveFailed={draftSaveFailed}
            fileInputRef={fileInputRef}
            firstChipRef={firstChipRef}
            textareaRef={textareaRef}
            venueNameRef={venueNameRef}
            onSubmit={submitFeedback}
          />
        )}
      </div>
    </ModalShell>
  );
};

// ── Form ──────────────────────────────────────────────────────────────────

interface CtxData {
  page: string;
  device: string;
  theme: string;
  appVersion: string;
  account: string;
}

interface ScreenshotValue {
  name: string;
  dataUrl: string;
}

interface FormProps {
  isMobile: boolean;
  state: ModalState;
  gap: number;
  category: FeedbackCategory | null;
  setCategory: (cat: FeedbackCategory) => void;
  message: string;
  setMessage: (msg: string) => void;
  catError: boolean;
  msgError: boolean;
  venueName: string;
  setVenueName: (name: string) => void;
  website: string;
  setWebsite: (site: string) => void;
  nameError: boolean;
  ctxData: CtxData;
  screenshot: ScreenshotValue | null;
  screenshotError: 'type' | 'size' | null;
  onScreenshotChange: (file: File | null) => void;
  draftRestored: boolean;
  onDiscardDraft: () => void;
  draftSaveFailed: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  firstChipRef: React.RefObject<HTMLButtonElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  venueNameRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}

function FormFields({
  isMobile,
  state,
  gap,
  category,
  setCategory,
  message,
  setMessage,
  catError,
  msgError,
  venueName,
  setVenueName,
  website,
  setWebsite,
  nameError,
  ctxData,
  screenshot,
  screenshotError,
  onScreenshotChange,
  draftRestored,
  onDiscardDraft,
  draftSaveFailed,
  fileInputRef,
  firstChipRef,
  textareaRef,
  venueNameRef,
  onSubmit,
}: FormProps) {
  const disabled = state === 'loading';
  const failed = state === 'error';
  const ids = useId();
  const catErrorId = `${ids}-cat-error`;
  const msgErrorId = `${ids}-msg-error`;
  const labelId = `${ids}-label`;
  const venue = category === 'venue_suggestion';
  const field = MODAL.form.field[venue ? 'none' : (category ?? 'none')];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      <h2
        style={{
          margin: 0,
          // Clears the desktop × drawn top right.
          paddingRight: 40,
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 19,
          color: 'var(--fg)',
        }}
      >
        {MODAL.form.heading}
      </h2>

      {draftRestored && (
        <DraftRestoredBanner onDiscard={onDiscardDraft} disabled={disabled} />
      )}

      {/* Kind chips */}
      <div>
        <div
          role="group"
          aria-label={MODAL.form.categoryGroupLabel}
          aria-describedby={catError ? catErrorId : undefined}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            opacity: disabled ? DIMMED : 1,
          }}
        >
          {CATEGORIES.map((cat, index) => {
            const active = category === cat.key;
            return (
              <button
                key={cat.key}
                ref={index === 0 ? firstChipRef : undefined}
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
                  border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
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
          <FieldError id={catErrorId}>
            {MODAL.errors.categoryRequired}
          </FieldError>
        )}
      </div>

      {venue ? (
        <VenueFields
          isMobile={isMobile}
          disabled={disabled}
          venueName={venueName}
          setVenueName={setVenueName}
          website={website}
          setWebsite={setWebsite}
          notes={message}
          setNotes={setMessage}
          nameError={nameError}
          nameRef={venueNameRef}
        />
      ) : (
        <>
          {/* Message: its label sits above the box, the hint is the placeholder */}
          <div>
            <div
              id={labelId}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: 6,
              }}
            >
              {field.label}
            </div>
            <textarea
              ref={textareaRef}
              className="fb-textarea"
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              disabled={disabled}
              maxLength={MAX_FEEDBACK_MESSAGE_LENGTH}
              aria-labelledby={labelId}
              aria-invalid={msgError || undefined}
              aria-describedby={msgError ? msgErrorId : undefined}
              placeholder={field.hint}
              style={{
                display: 'block',
                width: '100%',
                minHeight: 96,
                boxSizing: 'border-box',
                padding: 12,
                background: 'var(--bg)',
                color: 'var(--fg)',
                border: `1px solid ${msgError ? 'var(--danger)' : 'var(--border-strong)'}`,
                borderRadius: 12,
                fontFamily: 'var(--font-ui)',
                // 16 on the phone: iOS zooms the page into a smaller field.
                fontSize: isMobile ? 16 : 14,
                lineHeight: 1.45,
                resize: 'vertical',
                outline: 'none',
                opacity: disabled ? DIMMED : 1,
                transition:
                  'border-color var(--motion-fast) var(--motion-ease)',
              }}
            />
            {msgError && (
              <FieldError id={msgErrorId}>
                {MODAL.errors.messageRequired}
              </FieldError>
            )}
          </div>

          <ScreenshotRow
            screenshot={screenshot}
            error={screenshotError}
            disabled={disabled}
            fileInputRef={fileInputRef}
            onChange={onScreenshotChange}
          />
        </>
      )}

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          lineHeight: 1.45,
          color: 'var(--fg-subtle)',
        }}
      >
        {MODAL.form.note}
      </p>

      <ContextDisclosure ctx={ctxData} disabled={disabled} />

      {failed && <SendFailedBanner saveFailed={draftSaveFailed} />}

      <SubmitButton loading={disabled} onClick={onSubmit}>
        {failed ? MODAL.sendFailed.primaryAction : MODAL.footer.submit}
      </SubmitButton>
    </div>
  );
}

// ── Suggest a venue fields ────────────────────────────────────────────────

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-ui)',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

// `02/fan-suggest-a-venue-m`: 44px fields on --bg, a 12px radius, 14px text
// (16 on the phone, as the box, so iOS does not zoom).
const fieldStyle = (
  isMobile: boolean,
  disabled: boolean,
  invalid = false,
): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  color: 'var(--fg)',
  border: `1px solid ${invalid ? 'var(--danger)' : 'var(--border-strong)'}`,
  borderRadius: 12,
  fontFamily: 'var(--font-ui)',
  fontSize: isMobile ? 16 : 14,
  outline: 'none',
  opacity: disabled ? DIMMED : 1,
  transition: 'border-color var(--motion-fast) var(--motion-ease)',
});

interface VenueFieldsProps {
  isMobile: boolean;
  disabled: boolean;
  venueName: string;
  setVenueName: (name: string) => void;
  website: string;
  setWebsite: (site: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  nameError: boolean;
  nameRef: React.RefObject<HTMLInputElement | null>;
}

// Picking Suggest a venue swaps the box for Venue name, Website (optional)
// and Anything else? (optional). Anything else is the box's own text, so it
// carries over both ways when the fan switches kind (757 Q4).
function VenueFields({
  isMobile,
  disabled,
  venueName,
  setVenueName,
  website,
  setWebsite,
  notes,
  setNotes,
  nameError,
  nameRef,
}: VenueFieldsProps) {
  const ids = useId();
  const nameId = `${ids}-venue-name`;
  const nameErrorId = `${ids}-venue-name-error`;
  const siteId = `${ids}-venue-site`;
  const siteHintId = `${ids}-venue-site-hint`;
  const notesId = `${ids}-venue-notes`;
  const COPY = MODAL.form.venue;

  return (
    <>
      <div>
        <label htmlFor={nameId} style={fieldLabelStyle}>
          {COPY.nameLabel}
        </label>
        <input
          ref={nameRef}
          id={nameId}
          className="fb-textarea"
          type="text"
          value={venueName}
          onChange={(ev) => setVenueName(ev.target.value)}
          disabled={disabled}
          maxLength={VENUE_NAME_MAX}
          placeholder={COPY.namePlaceholder}
          aria-invalid={nameError || undefined}
          aria-describedby={nameError ? nameErrorId : undefined}
          style={{
            ...fieldStyle(isMobile, disabled, nameError),
            height: 44,
            padding: '0 12px',
          }}
        />
        {nameError && (
          <FieldError id={nameErrorId}>
            {MODAL.errors.venueNameRequired}
          </FieldError>
        )}
      </div>

      <div>
        <label htmlFor={siteId} style={fieldLabelStyle}>
          {COPY.websiteLabel}
        </label>
        <input
          id={siteId}
          className="fb-textarea"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={website}
          onChange={(ev) => setWebsite(ev.target.value)}
          disabled={disabled}
          maxLength={WEBSITE_MAX}
          placeholder={COPY.websitePlaceholder}
          aria-describedby={siteHintId}
          style={{
            ...fieldStyle(isMobile, disabled),
            height: 44,
            padding: '0 12px',
          }}
        />
        <div
          id={siteHintId}
          style={{
            marginTop: 5,
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            color: 'var(--fg-subtle)',
          }}
        >
          {COPY.websiteHint}
        </div>
      </div>

      <div>
        <label htmlFor={notesId} style={fieldLabelStyle}>
          {COPY.notesLabel}
        </label>
        <textarea
          id={notesId}
          className="fb-textarea"
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          disabled={disabled}
          maxLength={NOTES_MAX}
          placeholder={COPY.notesPlaceholder}
          style={{
            ...fieldStyle(isMobile, disabled),
            minHeight: 72,
            padding: 12,
            lineHeight: 1.45,
            resize: 'vertical',
          }}
        />
      </div>
    </>
  );
}

// ── Screenshot attach row ─────────────────────────────────────────────────

// Base64 turns every 3 bytes into 4 characters, so the data URL alone gives
// the file's size back (a restored draft has no File to ask).
function screenshotSize(dataUrl: string): string {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Math.floor((base64.length * 3) / 4);
  const mb = bytes / (1024 * 1024);
  return mb >= 0.1
    ? MODAL.form.screenshotSizeMb(mb.toFixed(1))
    : MODAL.form.screenshotSizeKb(
        String(Math.max(1, Math.round(bytes / 1024))),
      );
}

function ScreenshotRow({
  screenshot,
  error,
  disabled,
  fileInputRef,
  onChange,
}: {
  screenshot: ScreenshotValue | null;
  error: 'type' | 'size' | null;
  disabled: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
}) {
  const ids = useId();
  const pick = () => fileInputRef.current?.click();

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={FEEDBACK_SCREENSHOT_TYPES.join(',')}
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={(ev) => {
          onChange(ev.target.files?.[0] ?? null);
        }}
      />
      {screenshot ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: 8,
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            opacity: disabled ? DIMMED : 1,
          }}
        >
          {/* Picking again replaces the attached file. */}
          <button
            type="button"
            disabled={disabled}
            onClick={pick}
            aria-label={MODAL.form.screenshotAttachLabel}
            style={{
              all: 'unset',
              cursor: disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                flex: 'none',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg)',
                backgroundImage: `url("${screenshot.dataUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            />
            <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {screenshot.name}
              </span>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                  color: 'var(--fg-subtle)',
                }}
              >
                {screenshotSize(screenshot.dataUrl)}
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label={MODAL.form.screenshotRemoveAriaLabel}
            onClick={() => {
              onChange(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            style={{
              all: 'unset',
              cursor: disabled ? 'default' : 'pointer',
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: 10,
              flex: 'none',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border)',
              color: 'var(--fg-muted)',
            }}
          >
            {/* 44px hit area around the 36px button. */}
            <span
              aria-hidden="true"
              style={{ position: 'absolute', inset: -4 }}
            />
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={pick}
          aria-describedby={error ? `${ids}-error` : undefined}
          style={{
            all: 'unset',
            cursor: disabled ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 12px 8px 8px',
            borderRadius: 12,
            border: `1px dashed ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
            opacity: disabled ? DIMMED : 1,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flex: 'none',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--border)',
              border: '1px solid var(--border)',
              color: 'var(--signal)',
            }}
          >
            <ImageIcon size={18} strokeWidth={1.6} />
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              {MODAL.form.screenshotAttachLabel}
            </span>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
                color: 'var(--fg-subtle)',
              }}
            >
              {MODAL.form.screenshotAttachSublabel}
            </span>
          </span>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--fg-subtle)',
            }}
          >
            {MODAL.form.screenshotOptional}
          </span>
        </button>
      )}
      {error && (
        <div role="alert">
          <FieldError id={`${ids}-error`}>
            {error === 'size'
              ? MODAL.errors.screenshotTooBig
              : MODAL.errors.screenshotWrongType}
          </FieldError>
        </div>
      )}
    </div>
  );
}

// ── Status states ─────────────────────────────────────────────────────────

// fan-feedback-sent-m and fb-sent-d: a check tile, the heading, the note,
// and Done.
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
          <Check size={26} strokeWidth={2} />
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
          {MODAL.success.heading}
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
          {MODAL.success.body}
        </p>
      </div>
      <SubmitButton onClick={onDone}>
        {MODAL.success.primaryAction}
      </SubmitButton>
    </div>
  );
}

// fb-send-failed-m: the form stays put and this sits above Try again. A
// failed draft save swaps the body for the draftBanner.saveFailed line.
function SendFailedBanner({ saveFailed }: { saveFailed: boolean }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 12,
        border: '1px solid color-mix(in oklab, var(--danger) 45%, transparent)',
        background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
      }}
    >
      <span
        aria-hidden="true"
        style={{ flex: 'none', marginTop: 1, color: 'var(--danger)' }}
      >
        <CircleAlert size={16} strokeWidth={2} />
      </span>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--fg)',
          }}
        >
          {MODAL.sendFailed.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            lineHeight: 1.45,
            color: 'var(--fg-muted)',
            marginTop: 2,
          }}
        >
          {saveFailed ? MODAL.draftBanner.saveFailed : MODAL.sendFailed.body}
        </div>
      </div>
    </div>
  );
}

// ── What we send with it ──────────────────────────────────────────────────

// fb-what-we-send-m: one quiet line, closed by default, opening in place to
// the five fields the request carries.
function ContextDisclosure({
  ctx,
  disabled,
}: {
  ctx: CtxData;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const fields = MODAL.contextDisclosure.fields;
  const rows: { key: string; value: string }[] = [
    { key: fields.page, value: ctx.page },
    { key: fields.device, value: ctx.device },
    { key: fields.theme, value: ctx.theme },
    { key: fields.appVersion, value: ctx.appVersion },
    { key: fields.account, value: ctx.account },
  ];
  return (
    <div style={{ opacity: disabled ? DIMMED : 1 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          all: 'unset',
          cursor: disabled ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {MODAL.contextDisclosure.toggleLabel}
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-fast) var(--motion-ease)',
          }}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          style={{
            marginTop: 8,
            borderRadius: 12,
            border: '1px solid var(--border)',
            padding: '4px 12px',
          }}
        >
          {rows.map((row, index) => (
            <div
              key={row.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '7px 0',
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                borderTop: index === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <span style={{ color: 'var(--fg-subtle)', flex: 'none' }}>
                {row.key}
              </span>
              <span
                style={{
                  color: 'var(--fg)',
                  textAlign: 'right',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
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

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={MODAL.closeAriaLabel}
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        position: 'absolute',
        top: -4,
        right: -6,
        width: 30,
        height: 30,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-muted)',
      }}
    >
      <X size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

// fb-draft-restored-m: right below the title, above the kinds.
function DraftRestoredBanner({
  onDiscard,
  disabled,
}: {
  onDiscard: () => void;
  disabled: boolean;
}) {
  // Keyboard focus visibility (#834 Copilot R2). `all: 'unset'` would wipe
  // the browser's default focus outline and there's no app-wide
  // :focus-visible style covering this surface. Inline state mirrors
  // :focus-visible behaviour (focus from keyboard only) without dragging in
  // a CSS-module just for one button.
  const [focusVisible, setFocusVisible] = useState(false);
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 12,
        border: '1px solid color-mix(in oklab, var(--signal) 30%, transparent)',
        background: 'color-mix(in oklab, var(--signal) 7%, transparent)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--fg)',
      }}
    >
      <span>{MODAL.draftBanner.message}</span>
      <button
        type="button"
        onClick={onDiscard}
        disabled={disabled}
        aria-label={MODAL.draftBanner.discardAriaLabel}
        onFocus={(ev) => {
          // matches() guards against jsdom (test env) where the pseudo
          // selector is unimplemented — keep the focus ring visible there
          // rather than dropping it silently.
          const target = ev.currentTarget;
          let visible = true;
          try {
            visible = target.matches(':focus-visible');
          } catch (err) {
            console.warn('matches(:focus-visible) unsupported', err);
            visible = true;
          }
          setFocusVisible(visible);
        }}
        onBlur={() => setFocusVisible(false)}
        onPointerDown={() => setFocusVisible(false)}
        style={{
          all: 'unset',
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--signal)',
          borderRadius: 4,
          boxShadow: focusVisible ? '0 0 0 2px var(--signal)' : 'none',
          opacity: disabled ? DIMMED : 1,
        }}
      >
        {MODAL.draftBanner.discardLabel}
      </button>
    </div>
  );
}

// One error line for every field: the alert icon, --danger, 6px under it.
function FieldError({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'flex-start',
        marginTop: 6,
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        lineHeight: 1.4,
        color: 'var(--danger)',
      }}
    >
      <span aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
        <CircleAlert size={14} strokeWidth={2} />
      </span>
      {children}
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
        opacity: loading ? DIMMED : 1,
        transition: 'opacity var(--motion-fast) var(--motion-ease)',
      }}
    >
      {loading && <Spinner />}
      <span>{loading ? MODAL.footer.submitting : children}</span>
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

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  clearPendingReport,
  clearPendingReportSavedAt,
  savePendingReport,
} from './lib/pending-report';
import {
  deviceSummary,
  isReportableId,
  reportPage,
} from './lib/report-context';
import { classifyReportFailure, sendErrorReport } from './lib/send-report';

const copy = CONSUMER_COPY.errorReport.card;
const NOTE_MAX = 900;

type CardState = 'prompt' | 'form' | 'sending' | 'sent' | 'failed' | 'refused';

// The desktop boards draw the card smaller than the phone's: a 20px heading and
// 34px chips (a mouse needs no 44px target). `!important` only where the phone
// size is inline.
const CARD_CSS = `
@media (min-width: 900px) {
  [data-testid='error-tell-us-card'] { padding: 18px !important; border-radius: 20px !important; margin-top: 0 !important; }
  .cc-tu-h { font-size: 20px !important; }
  .cc-tu-chip { min-height: 34px !important; padding: 0 14px !important; font-size: 13px !important; }
}
`;

/**
 * The card's edge for `global-error` only: the `sheet-edge` utility's own
 * definition (globals.css), which that page cannot load because it replaces
 * the root layout. `global-error` injects it; every other page draws the edge
 * from the utility class itself.
 */
export const CARD_EDGE_FALLBACK_CSS = `
[data-testid='error-tell-us-card'] {
  border: 1.5px solid transparent;
  border-bottom-width: 0;
  background:
    linear-gradient(var(--sheet-bg, var(--surface-1)), var(--sheet-bg, var(--surface-1))) padding-box,
    linear-gradient(to bottom, transparent 0, transparent 20px, var(--sheet-bg, var(--surface-1)) 72px) border-box,
    linear-gradient(90deg, var(--signal), var(--accent)) border-box;
}
`;

interface ErrorTellUsCardProps {
  /**
   * The error ID: the server's digest for a server-side throw, or the id the
   * page minted for a client-side throw (see `ErrorReport`).
   */
  digest?: string | undefined;
  /** The browser's Sentry event for a client-side throw. */
  sentryEventId?: string | undefined;
  /**
   * The send came back 401: the session is gone. The report is already saved
   * for the next signed-in launch; the page switches to its signed-out layout,
   * which has no card.
   */
  onSignedOut: () => void;
  /**
   * Done on the refused state: the page closes the card and keeps the error
   * ID (addendum-3 row 17).
   */
  onDone: () => void;
}

// "Safari on iPhone" reads "iPhone · Safari" on the board.
const deviceLabel = (summary: string): string =>
  summary.replace(/^(.+) on (.+)$/, '$2 · $1');

// The fallbacks are for `global-error`, which has no next/font variables.
const MONO: CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 11,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const chipStyle = (selected: boolean): CSSProperties => ({
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 999,
  border: `1px solid ${selected ? 'var(--signal)' : 'var(--border-strong)'}`,
  background: selected
    ? 'color-mix(in oklch, var(--signal) 14%, transparent)'
    : 'transparent',
  color: selected ? 'var(--fg)' : 'var(--fg-muted)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
});

const GRADIENT_BUTTON: CSSProperties = {
  minHeight: 48,
  padding: '0 22px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(90deg, var(--signal), var(--accent))',
  color: 'var(--fg-on-accent)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 800,
  cursor: 'pointer',
};

const QUIET_BUTTON: CSSProperties = {
  minHeight: 44,
  padding: '0 8px',
  border: 'none',
  background: 'none',
  color: 'var(--fg-muted)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

/**
 * The Tell us card under the error (12-error-page, signed in): asks what you
 * were doing with one tap, an optional note, and lists what it attaches. It
 * files the report through the same-origin `/api/error-report`, which forwards
 * it to the `/v1/feedback` the old "Tell us what happened" form used, so the
 * card itself needs no Clerk hook. A send that failed for a passing reason
 * (or a lost session) is kept on the device and sent the next time the app
 * opens; a refused one (429 or another rejection) is not kept.
 */
export const ErrorTellUsCard = ({
  digest,
  sentryEventId,
  onSignedOut,
  onDone,
}: ErrorTellUsCardProps) => {
  const pathname = usePathname() ?? '';
  const [state, setState] = useState<CardState>('prompt');
  const [doing, setDoing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [device, setDevice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Set by Edit: the failed card's button unmounts, so focus has to be sent on
  // to the form's heading or it drops to the page.
  const [focusForm, setFocusForm] = useState(false);
  // The `savedAt` of the copy this card put on the device (a failed send), so
  // a refused Send again can drop it, and only it: the slot is shared, and
  // another error page may have saved over it since.
  const savedAt = useRef<number | null>(null);

  const sending = state === 'sending';
  // `err-m-sending`: while the send is in flight the chips, note, attach list
  // and Cancel dim and stop answering.
  const DIM: CSSProperties = sending ? { opacity: 0.4 } : {};

  const page = reportPage(pathname);
  // The list shows whichever id the failure has: the error ID (a server
  // throw's digest or the page's minted id), else the browser throw's Sentry
  // event. An id of another shape is left off.
  const shownId = [digest, sentryEventId].find(isReportableId);

  useEffect(() => {
    setDevice(deviceSummary(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!focusForm || state !== 'form') return;
    formHeadingRef.current?.focus();
    setFocusForm(false);
  }, [focusForm, state]);

  // Sent, failed and refused replace the form, so focus follows to the new
  // heading.
  useEffect(() => {
    if (state === 'sent' || state === 'failed' || state === 'refused') {
      headingRef.current?.focus();
    }
  }, [state]);

  const send = async () => {
    if (doing === null || state === 'sending') return;
    const draft = { doing, note, digest, sentryEventId, page };
    setState('sending');
    try {
      await sendErrorReport(draft, navigator.userAgent);
      clearPendingReport();
      savedAt.current = null;
      setState('sent');
    } catch (err) {
      console.error('[error report] send failed', err);
      const failure = classifyReportFailure(err);
      if (failure === 'refused') {
        // Not saved and not retried: the same report gets the same answer.
        // "It isn't saved" must hold, so a copy this card saved on an earlier
        // failed try goes too, if the slot still holds it; a report another
        // page saved stays.
        if (savedAt.current !== null) {
          clearPendingReportSavedAt(savedAt.current);
          savedAt.current = null;
        }
        setState('refused');
        return;
      }
      // Transient, or the session is gone: kept for the next signed-in launch.
      savedAt.current = savePendingReport(draft);
      if (failure === 'signed-out') {
        onSignedOut();
        return;
      }
      setState('failed');
    }
  };

  const tag =
    state === 'sent'
      ? {
          eyebrow: copy.sentEyebrow,
          label: copy.sentTag,
          color: 'var(--success)',
        }
      : state === 'failed'
        ? {
            eyebrow: copy.failedEyebrow,
            label: copy.failedTag,
            color: 'var(--danger)',
          }
        : state === 'refused'
          ? {
              eyebrow: copy.failedEyebrow,
              label: copy.refusedTag,
              color: 'var(--warning)',
            }
          : state === 'sending'
            ? {
                eyebrow: copy.eyebrow,
                label: copy.tagSending,
                color: 'var(--signal)',
              }
            : {
                eyebrow: copy.eyebrow,
                label: state === 'prompt' ? copy.tagOptional : copy.tagOpen,
                color: 'var(--accent)',
              };

  return (
    <section
      data-testid="error-tell-us-card"
      className="sheet-edge"
      style={{
        ['--sheet-bg' as string]: 'var(--surface-1)',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 18,
        padding: 20,
        textAlign: 'left',
        marginTop: 24,
      }}
    >
      <style>{CARD_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...MONO }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            flex: 'none',
            borderRadius: 7,
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <svg
            aria-hidden
            width="22"
            height="22"
            viewBox="0 0 96 96"
            focusable="false"
            style={{ display: 'block' }}
          >
            <rect width="96" height="96" rx="16" fill="var(--bg)" />
            <circle
              cx="72"
              cy="24"
              r="20"
              fill="var(--accent)"
              opacity="0.22"
            />
            <circle
              cx="72"
              cy="24"
              r="12"
              fill="var(--accent)"
              opacity="0.42"
            />
            <circle cx="72" cy="24" r="7" fill="var(--signal)" />
            <circle cx="14" cy="76" r="2" fill="var(--signal)" opacity="0.4" />
            <circle cx="34" cy="64" r="3" fill="var(--signal)" opacity="0.55" />
            <circle cx="50" cy="50" r="4" fill="var(--signal)" opacity="0.7" />
            <circle cx="66" cy="32" r="6" fill="var(--signal)" opacity="0.9" />
          </svg>
        </span>
        <span
          aria-hidden
          style={{
            // The boards draw one dot for every state: 6px with a 3px ring of
            // the same colour at 20%, not a glow.
            width: 6,
            height: 6,
            borderRadius: '50%',
            flex: 'none',
            background: tag.color,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${tag.color} 20%, transparent)`,
          }}
        />
        <span style={{ color: 'var(--fg-muted)' }}>{tag.eyebrow}</span>
        <span
          aria-hidden
          style={{ flex: 1, height: 1, background: 'var(--border)' }}
        />
        <span
          role={sending ? 'status' : undefined}
          style={{ color: tag.color, fontWeight: 700 }}
        >
          {tag.label}
        </span>
      </div>

      {state === 'sent' ? (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span
            aria-hidden
            data-testid="error-sent-check"
            style={{
              display: 'inline-flex',
              flex: 'none',
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border:
                '1px solid color-mix(in srgb, var(--success) 55%, transparent)',
              background: 'color-mix(in srgb, var(--success) 14%, transparent)',
              color: 'var(--success)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 9.5l3.2 3.2L14 5.8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="cc-tu-h"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: '-0.03em',
              }}
            >
              {copy.sentHeading}
            </h2>
            <p
              style={{
                margin: '6px 0 0',
                color: 'var(--fg-muted)',
                fontSize: 15,
              }}
            >
              {copy.sentBody}
            </p>
            <p
              style={{
                margin: '12px 0 0',
                color: 'var(--fg-subtle)',
                fontSize: 13,
              }}
            >
              <span style={MONO}>{copy.sentLabel}</span> {doing}
              {shownId ? ` · ${copy.withErrorId} ${shownId}` : ''}
            </p>
          </div>
        </div>
      ) : state === 'failed' ? (
        <div style={{ marginTop: 16 }}>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="cc-tu-h"
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: '-0.03em',
            }}
          >
            {copy.failedHeading}
          </h2>
          <p
            style={{
              margin: '6px 0 0',
              color: 'var(--fg-muted)',
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {copy.failedBody}
          </p>
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              border: '1px dashed var(--border-strong)',
              background: 'var(--surface-2)',
              color: 'var(--fg-muted)',
              fontSize: 15,
            }}
          >
            <div
              style={{
                ...MONO,
                fontSize: 10,
                color: 'var(--fg-subtle)',
                marginBottom: 6,
              }}
            >
              <span
                aria-hidden
                data-testid="error-saved-dot"
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  marginRight: 8,
                  verticalAlign: 'middle',
                  background: 'var(--warning)',
                }}
              />
              {copy.savedHeading}
            </div>
            <strong style={{ color: 'var(--fg)' }}>{doing}.</strong>
            {note.trim() === '' ? '' : ` ${note.trim()}`}
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              style={QUIET_BUTTON}
              onClick={() => {
                // Editing means the saved copy is about to be replaced; it
                // must not go out on its own if the edit is abandoned.
                clearPendingReport();
                savedAt.current = null;
                setFocusForm(true);
                setState('form');
              }}
            >
              {copy.edit}
            </button>
            <button
              type="button"
              onClick={() => void send()}
              style={{
                ...GRADIENT_BUTTON,
                background: 'transparent',
                border: '1px solid var(--signal)',
                color: 'var(--fg)',
              }}
            >
              {copy.sendAgain}
            </button>
          </div>
        </div>
      ) : state === 'refused' ? (
        <div style={{ marginTop: 16 }}>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="cc-tu-h"
            // Board error-report-refused-m: 22px / 900 / -0.025em (the desktop
            // .cc-tu-h rule still sets 20px from 900px).
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.025em',
            }}
          >
            {copy.refusedHeading}
          </h2>
          <p
            // Board: 13.5px, 4px under the heading, line-height 1.45.
            style={{
              margin: '4px 0 0',
              color: 'var(--fg-muted)',
              fontSize: 13.5,
              lineHeight: 1.45,
            }}
          >
            {copy.refusedBody}
          </p>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onDone}
              // Board: 46px tall, 0 22px padding, radius 12, 14.5px / 700.
              style={{
                ...GRADIENT_BUTTON,
                minHeight: 46,
                padding: '0 22px',
                borderRadius: 12,
                background: 'transparent',
                border: '1px solid var(--border-strong)',
                color: 'var(--fg)',
                fontSize: 14.5,
                fontWeight: 700,
              }}
            >
              {copy.done}
            </button>
          </div>
        </div>
      ) : (
        <form
          style={{ marginTop: 16 }}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <h2
            ref={formHeadingRef}
            tabIndex={-1}
            className="cc-tu-h"
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: '-0.03em',
            }}
          >
            {copy.heading}
          </h2>
          {state === 'prompt' ? (
            <p
              style={{
                margin: '6px 0 0',
                color: 'var(--fg-muted)',
                fontSize: 15,
              }}
            >
              {copy.sub}
            </p>
          ) : null}
          <div
            role="radiogroup"
            aria-label={copy.chipsLabel}
            aria-disabled={sending}
            style={{
              marginTop: 14,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              ...DIM,
            }}
          >
            {copy.chips.map((chip, index) => (
              <button
                key={chip}
                ref={(node) => {
                  chipRefs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={doing === chip}
                // Radio contract: one tab stop (the chosen chip, or the first
                // while none is chosen), arrow keys move the choice.
                tabIndex={(doing ?? copy.chips[0]) === chip ? 0 : -1}
                onClick={() => {
                  if (sending) return;
                  setDoing(chip);
                  if (state === 'prompt') setState('form');
                }}
                onKeyDown={(event) => {
                  const step =
                    event.key === 'ArrowRight' || event.key === 'ArrowDown'
                      ? 1
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                        ? -1
                        : 0;
                  if (step === 0 || sending) return;
                  event.preventDefault();
                  const next =
                    (index + step + copy.chips.length) % copy.chips.length;
                  const nextChip = copy.chips[next];
                  if (nextChip === undefined) return;
                  setDoing(nextChip);
                  if (state === 'prompt') setState('form');
                  chipRefs.current[next]?.focus();
                }}
                className="cc-tu-chip"
                aria-disabled={sending}
                style={chipStyle(doing === chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {state === 'prompt' ? null : (
            <>
              <textarea
                aria-label={copy.noteLabel}
                value={note}
                maxLength={NOTE_MAX}
                rows={3}
                placeholder={copy.notePlaceholder}
                onChange={(event) => setNote(event.target.value)}
                readOnly={sending}
                style={{
                  ...DIM,
                  marginTop: 16,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--signal)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 16,
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  ...MONO,
                  fontSize: 10,
                  color: 'var(--fg-subtle)',
                  margin: '14px 0 6px',
                  ...DIM,
                }}
              >
                <span aria-hidden style={{ color: 'var(--success)' }}>
                  ✓{' '}
                </span>
                {copy.attachHeading}
              </div>
              <dl style={{ margin: 0, ...DIM }}>
                {[
                  ...(shownId ? [[copy.errorId, shownId] as const] : []),
                  [copy.page, page] as const,
                  [copy.device, deviceLabel(device)] as const,
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 0',
                      borderTop: '1px solid var(--border)',
                      fontSize: 14,
                    }}
                  >
                    <dt
                      style={{
                        ...MONO,
                        fontSize: 10,
                        color: 'var(--fg-subtle)',
                      }}
                    >
                      {label}
                    </dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                        color: 'var(--fg-muted)',
                        overflowWrap: 'anywhere',
                        textAlign: 'right',
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  aria-disabled={sending}
                  style={{ ...QUIET_BUTTON, ...DIM }}
                  onClick={() => {
                    if (sending) return;
                    setDoing(null);
                    setNote('');
                    setState('prompt');
                  }}
                >
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  disabled={doing === null}
                  aria-disabled={sending}
                  style={{
                    ...GRADIENT_BUTTON,
                    opacity: doing === null ? 0.4 : sending ? 0.7 : 1,
                  }}
                >
                  {state === 'sending' ? copy.sending : `${copy.send} →`}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </section>
  );
};

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Send } from 'lucide-react';
import type {
  AdminEmailPreview,
  AdminTestEmailOption,
  AdminTestEmailResult,
} from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  CouldntLoad,
  SaveFailedToast,
  Spinner,
} from '@/components/admin/primitives';
import { Toast } from '@/components/admin/people/PersonParts';

const COPY = ADMIN_COPY.operations.emails;
const NAMES = new Map<string, string>(Object.entries(COPY.names));

const OPTIONS_PATH = '/v1/admin/notifications/test-email/options';
const previewPath = (key: string) =>
  `/v1/admin/notifications/test-email/${encodeURIComponent(key)}/preview`;

/** How long the "Test sent" toast stays up. */
const SENT_TOAST_MS = 6000;

type FailureKey = keyof typeof COPY.sendFailedBody;

type Load<T> =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; data: T };

type Send =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; to: string; subject: string }
  | { kind: 'failed'; reason: FailureKey };

const nameOf = (option: AdminTestEmailOption) =>
  NAMES.get(option.key) ?? option.label;

/** `07/emails`' chip: the board's gradient outline when picked. */
const chipStyle = (on: boolean): CSSProperties => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  flex: 'none',
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1px solid transparent' : '1px solid var(--border)',
  background: on
    ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box'
    : 'transparent',
});

/** `07/emails`' cyan-tint "Send me a test". */
const sendButtonStyle = (phone: boolean): CSSProperties => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: phone ? 42 : 34,
  width: phone ? '100%' : undefined,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: phone ? 14 : 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  color: 'var(--signal)',
  background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
});

/**
 * The email itself, as it lands: its HTML in a script-free frame sized to its
 * content, or its text when it has no HTML (the invite code).
 */
const EmailFrame = ({
  preview,
  title,
}: {
  preview: AdminEmailPreview;
  title: string;
}) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const fit = () => {
    const body = frameRef.current?.contentDocument?.body;
    if (body) setHeight(body.scrollHeight + 16);
  };
  if (preview.html.trim() === '') {
    return (
      <div
        data-testid="email-preview-text"
        style={{
          padding: 24,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {preview.text}
      </div>
    );
  }
  return (
    <iframe
      ref={frameRef}
      data-testid="email-preview-frame"
      title={title}
      // No scripts run; same origin only so the frame can be sized to fit.
      sandbox="allow-same-origin"
      srcDoc={preview.html}
      onLoad={fit}
      style={{ display: 'block', width: '100%', height, border: 0 }}
    />
  );
};

/**
 * Operations › Emails (`07/emails`, `07/emails-mobile`, `07/test-email-sent`):
 * one chip per email the app still sends, its preview, and Send me a test,
 * which mails the preview to ADMIN_EMAIL.
 */
export const EmailsTab = ({ isPhone }: { isPhone: boolean }) => {
  const { getToken, isLoaded } = useAuth();
  const [options, setOptions] = useState<Load<AdminTestEmailOption[]>>({
    kind: 'loading',
  });
  const [picked, setPicked] = useState<string | null>(null);
  const [preview, setPreview] = useState<Load<AdminEmailPreview>>({
    kind: 'loading',
  });
  const [send, setSend] = useState<Send>({ kind: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const get = useCallback(
    async <T,>(path: string): Promise<T> => {
      const token = await getToken();
      if (!token) throw new Error('Not signed in');
      return apiClient.get<T>(path, token);
    },
    [getToken],
  );

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setOptions({ kind: 'loading' });
    get<AdminTestEmailOption[]>(OPTIONS_PATH)
      .then((data) => {
        if (cancelled) return;
        setOptions({ kind: 'ready', data });
        setPicked((current) =>
          current !== null && data.some((option) => option.key === current)
            ? current
            : (data[0]?.key ?? null),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [get, isLoaded, attempt]);

  useEffect(() => {
    if (picked === null) return;
    let cancelled = false;
    setPreview({ kind: 'loading' });
    get<AdminEmailPreview>(previewPath(picked))
      .then((data) => {
        if (!cancelled) setPreview({ kind: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setPreview({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [get, picked, attempt]);

  // The sent toast leaves on its own.
  useEffect(() => {
    if (send.kind !== 'sent') return;
    const timer = window.setTimeout(
      () => setSend({ kind: 'idle' }),
      SENT_TOAST_MS,
    );
    return () => window.clearTimeout(timer);
  }, [send]);

  const sendTest = async () => {
    if (picked === null || send.kind === 'sending') return;
    setSend({ kind: 'sending' });
    try {
      const token = await getToken();
      if (!token) throw new Error('Not signed in');
      const result = await apiClient.post<AdminTestEmailResult>(
        '/v1/admin/notifications/test-email',
        token,
        { emailKey: picked },
      );
      setSend(
        result.sent
          ? {
              kind: 'sent',
              to: result.sentTo,
              subject:
                preview.kind === 'ready' && preview.data.emailKey === picked
                  ? preview.data.subject
                  : '',
            }
          : { kind: 'failed', reason: result.reason },
      );
    } catch {
      setSend({ kind: 'failed', reason: 'request' });
    }
  };

  const retry = () => setAttempt((count) => count + 1);

  if (options.kind === 'failed') {
    return (
      <CouldntLoad page={ADMIN_COPY.operations.tabs.emails} onRetry={retry} />
    );
  }
  if (options.kind === 'loading') {
    return (
      <div
        role="status"
        aria-busy="true"
        data-testid="emails-loading"
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <span className="sr-only">{ADMIN_COPY.states.loading}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[96, 120, 140].map((width) => (
            <div
              key={width}
              className="admin-skeleton"
              style={{ width, height: 32, borderRadius: 999 }}
            />
          ))}
        </div>
        <div
          className="admin-skeleton"
          style={{ height: 320, borderRadius: 14 }}
        />
      </div>
    );
  }

  const pickedOption = options.data.find((option) => option.key === picked);
  const sending = send.kind === 'sending';

  const sendButton = (
    <button
      type="button"
      data-testid="emails-send-test"
      onClick={() => void sendTest()}
      disabled={picked === null || sending}
      aria-busy={sending || undefined}
      style={{
        ...sendButtonStyle(isPhone),
        opacity: picked === null ? 0.5 : 1,
      }}
    >
      {sending ? (
        <Spinner size={14} />
      ) : (
        <Send size={14} strokeWidth={2} aria-hidden />
      )}
      {sending ? COPY.sending : COPY.sendTest}
    </button>
  );

  return (
    <div
      data-testid="emails-tab"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isPhone ? 12 : 16,
      }}
    >
      <div
        role="radiogroup"
        aria-label={COPY.chipsLabel}
        data-testid="emails-chips"
        style={{
          display: 'flex',
          gap: isPhone ? 6 : 8,
          // The phone scrolls the row sideways, as the board's clipped row
          // implies, so every email stays reachable.
          flexWrap: isPhone ? 'nowrap' : 'wrap',
          overflowX: isPhone ? 'auto' : 'visible',
          scrollbarWidth: 'none',
        }}
      >
        {options.data.map((option) => {
          const on = option.key === picked;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`emails-chip-${option.key}`}
              onClick={() => setPicked(option.key)}
              style={chipStyle(on)}
            >
              {nameOf(option)}
            </button>
          );
        })}
      </div>

      {!isPhone && (
        <div
          data-testid="emails-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface-1)',
          }}
        >
          <span style={{ flex: 1, fontSize: 13, color: 'var(--fg-muted)' }}>
            {COPY.note}
          </span>
          {sendButton}
        </div>
      )}

      {send.kind === 'failed' && (
        <SaveFailedToast
          title={COPY.sendFailedTitle}
          body={COPY.sendFailedBody[send.reason]}
          onRetry={() => void sendTest()}
          onDismiss={() => setSend({ kind: 'idle' })}
        />
      )}

      <div
        data-testid="emails-preview"
        style={{
          padding: isPhone ? 14 : 24,
          borderRadius: 14,
          background: 'var(--surface-2)',
        }}
      >
        {preview.kind === 'failed' ? (
          <CouldntLoad
            page={pickedOption ? nameOf(pickedOption) : undefined}
            onRetry={retry}
          />
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 600,
              margin: '0 auto',
              borderRadius: 12,
              overflow: 'hidden',
              // The email's own canvas, light in either theme, as it lands.
              background: '#fff',
              color: '#141826',
            }}
          >
            {preview.kind === 'loading' ? (
              <div
                role="status"
                aria-busy="true"
                style={{
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="sr-only">{COPY.previewLoading}</span>
                <Spinner size={18} />
              </div>
            ) : (
              <EmailFrame
                preview={preview.data}
                title={COPY.previewTitle(
                  pickedOption ? nameOf(pickedOption) : preview.data.subject,
                )}
              />
            )}
          </div>
        )}
      </div>

      {isPhone && sendButton}

      {send.kind === 'sent' && (
        <Toast
          title={COPY.sentTitle(send.to)}
          body={send.subject === '' ? null : COPY.sentBody(send.subject)}
        />
      )}
    </div>
  );
};

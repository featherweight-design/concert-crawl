'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { ModalShell } from '@/components/consumer/modal-shell';
import { deviceSummary, reportPage } from './lib/report-context';

const copy = CONSUMER_COPY.errorReport;

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '';
const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'dev';
const WHAT_MAX = 2000;
const DOING_MAX = 1000;

interface ErrorReportFormProps {
  open: boolean;
  onClose: () => void;
  /** The server's digest for a server-side throw. */
  digest?: string | undefined;
  /** The browser's Sentry event for a client-side throw. */
  sentryEventId?: string | undefined;
}

type SendState = 'form' | 'sending' | 'sent' | 'failed';

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-1)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-ui)',
  fontSize: 16,
  resize: 'vertical',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--fg)',
};

/**
 * Asks what broke while it is fresh, from the error page itself. It files an
 * ordinary bug into admin feedback (the same `/v1/feedback` the edge tab
 * uses), carrying the error's id so the team can find the report Sentry
 * already holds. The reporter's words go only to our own table, never to
 * Sentry.
 */
export function ErrorReportForm({
  open,
  onClose,
  digest,
  sentryEventId,
}: ErrorReportFormProps) {
  const { getToken } = useAuth();
  const pathname = usePathname();
  const [what, setWhat] = useState('');
  const [doing, setDoing] = useState('');
  const [state, setState] = useState<SendState>('form');

  const canSend = what.trim().length > 0 && state !== 'sending';

  const send = async () => {
    if (!canSend) return;
    setState('sending');
    try {
      const token = await getToken();
      if (!token) throw new Error('signed out');
      const res = await fetch(`${API_URL}/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: 'bug',
          message: what.trim(),
          pageUrl: reportPage(pathname ?? ''),
          metadata: {
            source: 'error',
            build: APP_VERSION,
            device:
              typeof navigator === 'undefined'
                ? 'unknown'
                : deviceSummary(navigator.userAgent),
            ...(doing.trim() === '' ? {} : { doing: doing.trim() }),
            ...(digest === undefined ? {} : { digest }),
            ...(sentryEventId === undefined ? {} : { sentryEventId }),
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('sent');
    } catch (err) {
      console.error('[error report] send failed', err);
      setState('failed');
    }
  };

  const footer =
    state === 'sent' ? (
      <button type="button" onClick={onClose} style={primaryButton}>
        {copy.close}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => void send()}
        disabled={!canSend}
        style={{ ...primaryButton, opacity: canSend ? 1 : 0.4 }}
      >
        {state === 'sending'
          ? copy.sending
          : state === 'failed'
            ? copy.retry
            : copy.send}
      </button>
    );

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={copy.ariaLabel}
      sheetHeight={state === 'sent' ? 'short' : 'tall'}
      header={
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          {state === 'sent' ? copy.sentTitle : copy.title}
        </h2>
      }
      footer={footer}
      mobileFooter={footer}
    >
      {state === 'sent' ? (
        <p style={{ margin: 0, color: 'var(--fg-muted)', fontSize: 14 }}>
          {copy.sentBody}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={labelStyle}>
            {copy.whatLabel}
            <textarea
              value={what}
              maxLength={WHAT_MAX}
              rows={4}
              placeholder={copy.whatPlaceholder}
              onChange={(event) => setWhat(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>
              {copy.doingLabel}{' '}
              <span style={{ fontWeight: 400, color: 'var(--fg-subtle)' }}>
                {copy.doingHint}
              </span>
            </span>
            <textarea
              value={doing}
              maxLength={DOING_MAX}
              rows={3}
              onChange={(event) => setDoing(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-subtle)' }}>
            {copy.attach}
          </p>
          {state === 'failed' && (
            <p
              role="alert"
              style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}
            >
              {copy.failed}
            </p>
          )}
        </div>
      )}
    </ModalShell>
  );
}

const primaryButton: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 20px',
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'var(--fg)',
  color: 'var(--bg)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { STANDALONE_ERROR_COPY } from './definitions/copy';
import { CheckIcon, LogoMark } from './ErrorMarks';
import { removePendingReports, savePendingReport } from './lib/pending';
import {
  DOING_KEYS,
  NOTE_MAX,
  sendErrorReport,
  type DoingKey,
  type ErrorReportBody,
} from './lib/report';

const copy = STANDALONE_ERROR_COPY.card;

export type CardState = 'prompt' | 'form' | 'sending' | 'sent' | 'failed';

type Tone = 'accent' | 'signal' | 'success' | 'danger';

const RAIL: Record<CardState, { label: string; code: string; tone: Tone }> = {
  prompt: { label: copy.rail.prompt, code: copy.code.prompt, tone: 'accent' },
  form: { label: copy.rail.prompt, code: copy.code.form, tone: 'accent' },
  sending: { label: copy.rail.prompt, code: copy.code.sending, tone: 'signal' },
  sent: { label: copy.rail.sent, code: copy.code.sent, tone: 'success' },
  failed: { label: copy.rail.failed, code: copy.code.failed, tone: 'danger' },
};

interface TellUsCardProps {
  errorId: string;
  page: string;
  device: string;
  /** Whose session this report was written under, for the saved copy. */
  owner: string;
  /** A send came back 401: the session is gone, so the card goes too. */
  onSignedOut: () => void;
}

/**
 * The signed-in Tell us card: one tap on what they were doing is a report,
 * the note is optional, and a send that fails is kept on the device for the
 * next launch to deliver.
 */
export const TellUsCard = ({
  errorId,
  page,
  device,
  owner,
  onSignedOut,
}: TellUsCardProps) => {
  const [state, setState] = useState<CardState>('prompt');
  // Whether the failed report is kept for the next launch. A refusal the
  // server would repeat is not, so the card must not promise it.
  const [saved, setSaved] = useState(false);
  const [doing, setDoing] = useState<DoingKey | undefined>();
  const [note, setNote] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  // Sent and failed replace what the person was looking at, so focus follows.
  useEffect(() => {
    if (state === 'sent' || state === 'failed') headingRef.current?.focus();
  }, [state]);

  const trimmedNote = note.trim();
  const canSend = doing !== undefined || trimmedNote !== '';
  const doingLabel = doing === undefined ? undefined : copy.doing[doing];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || state === 'sending') return;
    const body: ErrorReportBody = {
      errorId,
      page,
      device,
      ...(doing === undefined ? {} : { doing }),
      ...(trimmedNote === '' ? {} : { note: trimmedNote }),
    };
    setState('sending');
    const result = await sendErrorReport(body);
    if (result === 'sent') {
      removePendingReports([errorId]);
      setState('sent');
    } else if (result === 'unauthorized') {
      // The session is gone, but the report is still theirs: keep it for the
      // launch after they sign back in.
      savePendingReport(body, owner);
      onSignedOut();
    } else if (result === 'rejected') {
      removePendingReports([errorId]);
      setSaved(false);
      setState('failed');
    } else {
      savePendingReport(body, owner);
      setSaved(true);
      setState('failed');
    }
  };

  const choose = (key: DoingKey) => {
    setDoing(key);
    if (state === 'prompt') setState('form');
  };

  const cancel = () => {
    setDoing(undefined);
    setNote('');
    setState('prompt');
  };

  const rail = RAIL[state];

  return (
    <section className="cc-err-card" aria-labelledby={headingId}>
      <div className="cc-err-rail">
        <LogoMark size={20} />
        <span className={`cc-err-dot cc-err-tone-${rail.tone}`} />
        <span>{rail.label}</span>
        <span className="cc-err-rail-line" />
        <span className={`cc-err-tone-${rail.tone}`}>{rail.code}</span>
      </div>

      {state === 'sent' ? (
        <div className="cc-err-sent">
          <span className="cc-err-check">
            <CheckIcon size={18} />
          </span>
          <div>
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="cc-err-h2"
            >
              {copy.sentHeading}
            </h2>
            <p className="cc-err-sub">{copy.sentBody}</p>
            <p className="cc-err-meta">
              <span className="cc-err-label">{copy.sentLabel}</span>
              {copy.sentSummary(doingLabel, errorId)}
            </p>
          </div>
        </div>
      ) : state === 'failed' ? (
        <form onSubmit={(event) => void submit(event)}>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="cc-err-h2"
          >
            {copy.failedHeading}
          </h2>
          <p className="cc-err-sub">
            {saved ? copy.failedBody : copy.rejectedBody}
          </p>
          {saved && (
            <div className="cc-err-saved">
              <span className="cc-err-label">
                <span className="cc-err-dot" />
                {copy.savedLabel}
              </span>
              <p>
                {doingLabel !== undefined && <strong>{doingLabel}.</strong>}
                {doingLabel !== undefined && trimmedNote !== '' && ' '}
                {trimmedNote}
              </p>
            </div>
          )}
          <div className="cc-err-foot">
            <button
              type="button"
              className="cc-err-text-btn"
              onClick={() => setState('form')}
            >
              {copy.edit}
            </button>
            <button type="submit" className="cc-err-outline">
              {copy.sendAgain}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          <h2 id={headingId} className="cc-err-h2">
            {copy.heading}
          </h2>
          {state === 'prompt' && <p className="cc-err-sub">{copy.sub}</p>}
          <fieldset className="cc-err-fields" disabled={state === 'sending'}>
            <div
              role="radiogroup"
              aria-labelledby={headingId}
              className="cc-err-chips"
            >
              {DOING_KEYS.map((key) => (
                <label key={key} className="cc-err-radio">
                  <input
                    type="radio"
                    name={`${headingId}-doing`}
                    value={key}
                    checked={doing === key}
                    onChange={() => choose(key)}
                  />
                  <span className="cc-err-pill">{copy.doing[key]}</span>
                </label>
              ))}
            </div>
            {state !== 'prompt' && (
              <>
                <textarea
                  className="cc-err-note"
                  aria-label={copy.note}
                  placeholder={copy.note}
                  maxLength={NOTE_MAX}
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <div className="cc-err-attach">
                  <div className="cc-err-attach-head">
                    <CheckIcon size={12} />
                    <span className="cc-err-label">{copy.attachHeading}</span>
                  </div>
                  <dl style={{ margin: 0 }}>
                    <div className="cc-err-row">
                      <dt className="cc-err-label">{copy.attachErrorId}</dt>
                      <dd>{errorId}</dd>
                    </div>
                    <div className="cc-err-row">
                      <dt className="cc-err-label">{copy.attachPage}</dt>
                      <dd>{page}</dd>
                    </div>
                    <div className="cc-err-row">
                      <dt className="cc-err-label">{copy.attachDevice}</dt>
                      <dd>{device}</dd>
                    </div>
                  </dl>
                </div>
                <div className="cc-err-foot">
                  <button
                    type="button"
                    className="cc-err-text-btn"
                    onClick={cancel}
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="submit"
                    className="cc-err-send"
                    disabled={!canSend}
                  >
                    {state === 'sending' ? copy.sending : copy.send}
                  </button>
                </div>
              </>
            )}
          </fieldset>
        </form>
      )}
    </section>
  );
};

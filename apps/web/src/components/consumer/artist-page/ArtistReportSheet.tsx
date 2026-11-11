'use client';

import { useAuth } from '@clerk/nextjs';
import {
  ARTIST_REPORT_NOTE_MAX,
  ARTIST_REPORT_REASONS,
  type ArtistMatchSummary,
  type ArtistReportReason,
  type ArtistReportSummary,
} from '@concert-crawl/types';
import { useId, useRef, useState } from 'react';

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import {
  ReportResultSheet,
  ResultOutlineButton,
  ResultPrimaryButton,
} from '@/components/consumer/reporting/ReportResultSheet';
import { REPORT_TOKENS } from '@/components/consumer/reporting/reportTokens';
import { ApiError } from '@/lib/api';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

import { Panel } from '../image-slot';

import { ARTIST_COPY } from './definitions/copy';
import { fileArtistReport, withdrawArtistReport } from './lib/artist-reports';

const copy = ARTIST_COPY.report;
const AMBER = REPORT_TOKENS.postponed;

const MONO = {
  fontFamily: 'JetBrains Mono, monospace',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const FIELD = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-1)',
  color: 'var(--fg)',
  fontFamily: 'Inter, sans-serif',
  fontSize: 14,
  outline: 'none',
};

const FIELD_LABEL = {
  fontFamily: 'Inter, sans-serif',
  fontWeight: 700,
  fontSize: 13.5,
  color: 'var(--fg)',
};

/**
 * A 409 carries the open report, but the API client drops the body of a failed
 * request. Nothing on this surface reads the id, so a stand-in with the
 * reason the fan just picked is enough to put the card in its reported state.
 */
const conflictSummary = (reason: ArtistReportReason): ArtistReportSummary => ({
  id: '',
  reason,
  createdAt: new Date().toISOString(),
});

type Outcome = 'sent' | 'error' | null;

export interface ArtistReportSheetProps {
  open: boolean;
  onClose: () => void;
  slug: string;
  name: string;
  photoUrl: string | null;
  match: ArtistMatchSummary | null;
  /** The viewer's open report. Non-null opens on Already reported. */
  reported: ArtistReportSummary | null;
  onReported: (summary: ArtistReportSummary) => void;
  onWithdrawn: () => void;
}

export const ArtistReportSheet = ({
  open,
  onClose,
  slug,
  name,
  photoUrl,
  match,
  reported,
  onReported,
  onWithdrawn,
}: ArtistReportSheetProps) => {
  const { getToken } = useAuth();
  // The answers live here, above the views, so Try again and Close keep them.
  const [reason, setReason] = useState<ArtistReportReason | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);
  const inFlight = useRef(false);

  const close = () => {
    // A closed sheet reopens on the form (or on Already reported), never on a
    // result from the last time it was open.
    setOutcome(null);
    setWithdrawFailed(false);
    onClose();
  };

  const submit = async () => {
    if (reason === null || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setLinkError(null);
    setNoteError(null);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      const trimmedLink = link.trim();
      const trimmedNote = note.trim();
      const summary = await fileArtistReport(
        slug,
        {
          reason,
          ...(trimmedLink === '' ? {} : { spotifyLink: trimmedLink }),
          ...(trimmedNote === '' ? {} : { note: trimmedNote }),
        },
        token,
      );
      onReported(summary);
      setReason(null);
      setLink('');
      setNote('');
      setOutcome('sent');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // One open report per artist: this is Already reported, not a failure.
        onReported(conflictSummary(reason));
        setOutcome(null);
      } else if (err instanceof ApiError && err.status === 422) {
        // The server decides what a Spotify link is and what a note may say.
        if (err.code === 'invalid_spotify_link')
          setLinkError(copy.sheet.linkError);
        else setNoteError(err.message);
        setOutcome(null);
      } else {
        console.warn('artist report failed', err);
        setOutcome('error');
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    setWithdrawFailed(false);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Not signed in');
      await withdrawArtistReport(slug, token);
      onWithdrawn();
      close();
    } catch (err) {
      // Nothing open any more is the outcome the fan asked for.
      if (err instanceof ApiError && err.status === 404) {
        onWithdrawn();
        close();
      } else {
        setWithdrawFailed(true);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const view = outcome ?? (reported === null ? 'form' : 'already');

  if (view === 'sent' && reported !== null) {
    return (
      <ReportResultSheet
        open={open}
        onClose={close}
        rail={copy.sent.rail}
        code={copy.sent.code}
        title={copy.sent.title}
        body={copy.sent.body(name)}
        closeLabel={copy.closeAria}
        actions={
          <ResultPrimaryButton onClick={close}>
            {copy.sent.back}
          </ResultPrimaryButton>
        }
      >
        <div
          data-testid="artist-report-stub"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            borderRadius: 12,
            border: `1.5px dashed ${AMBER.border}`,
            background: 'var(--surface-1)',
          }}
        >
          <Panel surface="artist" name={name} photoUrl={photoUrl} size={44} />
          <div
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: 15,
                color: 'var(--fg)',
                overflowWrap: 'anywhere',
              }}
            >
              {copy.sent.stub(name, copy.reasonShort[reported.reason])}
            </span>
            <span
              style={{
                ...MONO,
                fontSize: 9,
                fontWeight: 700,
                color: AMBER.color,
              }}
            >
              {copy.sent.stubStatus}
            </span>
          </div>
        </div>
      </ReportResultSheet>
    );
  }

  if (view === 'already') {
    return (
      <ReportResultSheet
        open={open}
        onClose={close}
        rail={copy.already.rail}
        code={copy.already.code}
        title={copy.already.title}
        body={copy.already.body}
        closeLabel={copy.closeAria}
        actions={
          <>
            <ResultPrimaryButton onClick={close}>
              {copy.already.back}
            </ResultPrimaryButton>
            <ResultOutlineButton
              amber
              disabled={withdrawing}
              onClick={() => {
                void withdraw();
              }}
            >
              {copy.already.withdraw}
            </ResultOutlineButton>
          </>
        }
      >
        {withdrawFailed ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              color: 'var(--danger)',
            }}
          >
            {copy.already.withdrawError}
          </p>
        ) : null}
      </ReportResultSheet>
    );
  }

  if (view === 'error') {
    return (
      <ReportResultSheet
        open={open}
        onClose={close}
        rail={copy.error.rail}
        code={copy.error.code}
        title={copy.error.title}
        body={copy.error.body}
        closeLabel={copy.closeAria}
        actions={
          <>
            <ResultPrimaryButton
              disabled={sending}
              onClick={() => {
                void submit();
              }}
            >
              {copy.error.retry}
            </ResultPrimaryButton>
            <ResultOutlineButton onClick={close}>
              {copy.error.close}
            </ResultOutlineButton>
          </>
        }
      />
    );
  }

  return (
    <ReportForm
      open={open}
      onClose={close}
      name={name}
      photoUrl={photoUrl}
      match={match}
      reason={reason}
      onReason={setReason}
      link={link}
      onLink={(value) => {
        setLink(value);
        setLinkError(null);
      }}
      linkError={linkError}
      note={note}
      onNote={(value) => {
        setNote(value);
        setNoteError(null);
      }}
      noteError={noteError}
      sending={sending}
      onSubmit={() => {
        void submit();
      }}
    />
  );
};

// ── The form ──────────────────────────────────────────────────────

interface ReportFormProps {
  open: boolean;
  onClose: () => void;
  name: string;
  photoUrl: string | null;
  match: ArtistMatchSummary | null;
  reason: ArtistReportReason | null;
  onReason: (reason: ArtistReportReason) => void;
  link: string;
  onLink: (value: string) => void;
  linkError: string | null;
  note: string;
  onNote: (value: string) => void;
  noteError: string | null;
  sending: boolean;
  onSubmit: () => void;
}

const ReportForm = ({
  open,
  onClose,
  name,
  photoUrl,
  match,
  reason,
  onReason,
  link,
  onLink,
  linkError,
  note,
  onNote,
  noteError,
  sending,
  onSubmit,
}: ReportFormProps) => {
  const ids = useId();
  const reasonsLabelId = `${ids}-reasons`;
  const linkId = `${ids}-link`;
  const linkHintId = `${ids}-link-hint`;
  const linkErrorId = `${ids}-link-error`;
  const noteId = `${ids}-note`;
  const noteErrorId = `${ids}-note-error`;
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canSend = reason !== null && !sending;

  // Arrow keys move the choice, as they do in a native radio group.
  const onCardKey = (evt: React.KeyboardEvent, index: number) => {
    const last = ARTIST_REPORT_REASONS.length - 1;
    let target: number | null = null;
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowRight') {
      target = index === last ? 0 : index + 1;
    } else if (evt.key === 'ArrowUp' || evt.key === 'ArrowLeft') {
      target = index === 0 ? last : index - 1;
    }
    if (target === null) return;
    evt.preventDefault();
    const next = ARTIST_REPORT_REASONS[target];
    if (next === undefined) return;
    onReason(next);
    cardRefs.current[target]?.focus();
  };

  const genres =
    match?.genres !== null &&
    match?.genres !== undefined &&
    match.genres.length > 0
      ? match.genres.join(' / ')
      : null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel={copy.sheet.title}
      sheetHeight="tall"
      header={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span style={{ ...MONO, fontSize: 9, color: AMBER.color }}>
              {copy.sheet.eyebrow}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                ...MONO,
                fontSize: 9,
                color: 'var(--fg-subtle)',
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              {copy.sheet.close}
            </button>
          </div>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {copy.sheet.title}
          </h2>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
              margin: '8px 0 0',
            }}
          >
            {copy.sheet.subtitle}
          </p>
        </>
      }
      footer={
        <div className="flex w-full flex-col items-center gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 10,
              border: 'none',
              background: AMBER.color,
              color: 'var(--fg-on-accent)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.45,
              transition: 'opacity var(--motion-fast) var(--motion-ease)',
            }}
          >
            {copy.sheet.submit}
          </button>
          <p
            style={{
              ...MONO,
              fontSize: 9,
              letterSpacing: '0.04em',
              color: 'var(--fg-subtle)',
              margin: 0,
              textAlign: 'center',
            }}
          >
            {copy.sheet.footnote}
          </p>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {match === null ? null : (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ ...MONO, fontSize: 9, color: 'var(--fg-subtle)' }}>
              {copy.sheet.matchLabel}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface-1)',
              }}
            >
              <Panel
                surface="artist"
                name={name}
                photoUrl={photoUrl}
                size={48}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 800,
                    fontSize: 15,
                    color: 'var(--fg)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {name}
                </span>
                <span
                  style={{ ...MONO, fontSize: 9, color: 'var(--fg-muted)' }}
                >
                  {genres === null
                    ? copy.sheet.matchMetaNoGenres
                    : copy.sheet.matchMeta(genres)}
                </span>
              </div>
              {isSafeHttpUrl(match.spotifyUrl) ? (
                <a
                  href={match.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flexShrink: 0,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 700,
                    fontSize: 13,
                    color: 'var(--signal)',
                    textDecoration: 'none',
                  }}
                >
                  {copy.sheet.matchLink}
                </a>
              ) : null}
            </div>
          </section>
        )}

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            id={reasonsLabelId}
            style={{ ...MONO, fontSize: 9, color: 'var(--fg-subtle)' }}
          >
            {copy.sheet.reasonsLabel}
          </span>
          <div
            role="radiogroup"
            aria-labelledby={reasonsLabelId}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {ARTIST_REPORT_REASONS.map((value, index) => {
              const selected = reason === value;
              // Roving tabindex: one stop in the group, the checked card (or
              // the first while nothing is checked).
              const tabStop = selected || (reason === null && index === 0);
              return (
                <div
                  key={value}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={tabStop ? 0 : -1}
                  onClick={() => onReason(value)}
                  onKeyDown={(evt) => {
                    if (evt.key === 'Enter' || evt.key === ' ') {
                      evt.preventDefault();
                      onReason(value);
                      return;
                    }
                    onCardKey(evt, index);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: selected
                      ? `1.5px solid ${AMBER.color}`
                      : '1px solid var(--border)',
                    background: selected ? AMBER.bg : 'var(--surface-1)',
                    cursor: 'pointer',
                    transition:
                      'border-color var(--motion-fast) var(--motion-ease), background var(--motion-fast) var(--motion-ease)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      flexShrink: 0,
                      marginTop: 1,
                      boxSizing: 'border-box',
                      border: selected
                        ? `2px solid ${AMBER.color}`
                        : '1.5px solid var(--border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: AMBER.color,
                        }}
                      />
                    ) : null}
                  </span>
                  <span
                    style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--fg)',
                        lineHeight: 1.3,
                      }}
                    >
                      {copy.sheet.reasons[value].title}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 12.5,
                        color: 'var(--fg-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {copy.sheet.reasons[value].sub}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor={linkId} style={FIELD_LABEL}>
            {copy.sheet.linkLabel}
          </label>
          <input
            id={linkId}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={link}
            onChange={(evt) => onLink(evt.target.value)}
            placeholder={copy.sheet.linkPlaceholder}
            aria-invalid={linkError !== null}
            aria-describedby={
              linkError === null ? linkHintId : `${linkHintId} ${linkErrorId}`
            }
            style={{
              ...FIELD,
              ...(linkError === null ? {} : { borderColor: 'var(--danger)' }),
            }}
          />
          {linkError === null ? null : (
            <p
              id={linkErrorId}
              role="alert"
              style={{
                margin: 0,
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              {linkError}
            </p>
          )}
          <p
            id={linkHintId}
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: 12.5,
              lineHeight: 1.45,
              color: 'var(--fg-subtle)',
            }}
          >
            {copy.sheet.linkHint}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor={noteId} style={FIELD_LABEL}>
            {copy.sheet.noteLabel}
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={ARTIST_REPORT_NOTE_MAX}
            onChange={(evt) => onNote(evt.target.value)}
            placeholder={copy.sheet.notePlaceholder}
            aria-invalid={noteError !== null}
            aria-describedby={noteError === null ? undefined : noteErrorId}
            rows={3}
            style={{
              ...FIELD,
              minHeight: 76,
              resize: 'vertical',
              ...(noteError === null ? {} : { borderColor: 'var(--danger)' }),
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {noteError === null ? (
              <span />
            ) : (
              <p
                id={noteErrorId}
                role="alert"
                style={{
                  margin: 0,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'var(--danger)',
                }}
              >
                {noteError}
              </p>
            )}
            <span
              style={{
                ...MONO,
                fontSize: 10,
                letterSpacing: '0.04em',
                color: 'var(--fg-subtle)',
                flexShrink: 0,
              }}
            >
              {copy.sheet.counter(note.length, ARTIST_REPORT_NOTE_MAX)}
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

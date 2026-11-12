'use client';

import {
  ARTIST_REPORT_LINK_MAX,
  ARTIST_REPORT_NOTE_MAX,
  ARTIST_REPORT_REASONS,
  type ArtistMatchSummary,
  type ArtistReportReason,
} from '@concert-crawl/types';
import { useId, useRef } from 'react';

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';
import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

import { Panel } from '../image-slot';

import { ARTIST_COPY } from './definitions/copy';
import {
  REPORT_AMBER as AMBER,
  REPORT_MONO as MONO,
} from '@/components/consumer/reporting/reportTokens';

const copy = ARTIST_COPY.report;

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
 * The wrong-artist form: the current match, the four reasons, an optional
 * Spotify link and note. Stateless: `ArtistReportSheet` owns the answers so
 * Try again and Close keep them.
 */
export interface ArtistReportFormProps {
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

export const ArtistReportForm = ({
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
}: ArtistReportFormProps) => {
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
              // The glyph stays small; the hit area is a full 44px tall, and
              // the negative margin keeps the eyebrow row's height as drawn.
              style={{
                ...MONO,
                fontSize: 9,
                color: 'var(--fg-subtle)',
                background: 'none',
                border: 'none',
                minHeight: 44,
                padding: '0 12px',
                margin: '-14px -12px -14px 0',
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
                  {copy.sheet.matchLink}{' '}
                  <span aria-hidden="true">{copy.sheet.matchLinkArrow}</span>
                  <span className="sr-only"> {copy.sheet.newTab}</span>
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
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1"
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
            maxLength={ARTIST_REPORT_LINK_MAX}
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

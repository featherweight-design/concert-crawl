'use client';

import { useAuth } from '@clerk/nextjs';
import type {
  ArtistMatchSummary,
  ArtistReportReason,
  ArtistReportSummary,
} from '@concert-crawl/types';
import { useRef, useState } from 'react';

import {
  ReportResultSheet,
  ResultOutlineButton,
  ResultPrimaryButton,
} from '@/components/consumer/reporting/ReportResultSheet';
import { ApiError } from '@/lib/api';

import { ArtistReportForm } from './ArtistReportForm';
import { ArtistReportSentStub } from './ArtistReportSentStub';
import { ARTIST_COPY } from './definitions/copy';
import { fileArtistReport, withdrawArtistReport } from './lib/artist-reports';

const copy = ARTIST_COPY.report;

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

/** Why a send failed, so the error sheet says what actually happened. */
type ErrorKind = 'network' | 'busy' | 'signedOut';

class SignedOutError extends Error {}

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
  const [errorKind, setErrorKind] = useState<ErrorKind>('network');
  const inFlight = useRef(false);
  // Bumped on every close, so a request that settles after the sheet closed
  // cannot write its result into the next opening.
  const opening = useRef(0);

  const close = () => {
    // A closed sheet reopens on the form (or on Already reported), never on a
    // result from the last time it was open.
    opening.current += 1;
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
    const thisOpening = opening.current;
    try {
      const token = await getToken();
      if (token === null) throw new SignedOutError();
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
      if (opening.current === thisOpening) setOutcome('sent');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // One open report per artist: this is Already reported, not a failure.
        onReported(conflictSummary(reason));
        // As after a send: those answers are spent, so the next report starts clean.
        setReason(null);
        setLink('');
        setNote('');
        setOutcome(null);
      } else if (err instanceof ApiError && err.status === 422) {
        // The server decides what a Spotify link is and what a note may say.
        // Only moderation's reason is written for the fan; any other 422
        // (schema validation) gets our own words.
        if (err.code === 'invalid_spotify_link')
          setLinkError(copy.sheet.linkError);
        else if (err.code === 'note_rejected') setNoteError(err.message);
        else {
          console.warn('artist report rejected', err);
          setNoteError(copy.sheet.noteError);
        }
        setOutcome(null);
      } else if (opening.current === thisOpening) {
        console.warn('artist report failed', err);
        setErrorKind(
          err instanceof SignedOutError ||
            (err instanceof ApiError && err.status === 401)
            ? 'signedOut'
            : err instanceof ApiError && err.status === 429
              ? 'busy'
              : 'network',
        );
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
        console.warn('artist report withdraw failed', err);
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
        <ArtistReportSentStub
          name={name}
          photoUrl={photoUrl}
          reason={reported.reason}
        />
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
        body={
          errorKind === 'busy'
            ? copy.error.bodyBusy
            : errorKind === 'signedOut'
              ? copy.error.bodySignedOut
              : copy.error.body
        }
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
    <ArtistReportForm
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

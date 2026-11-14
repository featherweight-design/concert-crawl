'use client';

import { useState } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { evidenceText, whenChipOf } from '../needs-you-rules';
import type { ArtistCandidate } from '../needs-you-api';
import type { PanelProps } from './panel-props';
import { AnswerButtons, Chip, ChipRow, Prose, Section } from './panel-parts';

const PANEL = ADMIN_COPY.needsYou.panel;

const CandidateCard = ({
  candidate,
  selected,
  onSelect,
}: {
  candidate: ArtistCandidate;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    data-testid="artist-candidate"
    data-candidate-id={candidate.id}
    onClick={onSelect}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: 12,
      textAlign: 'left',
      cursor: 'pointer',
      borderRadius: 14,
      color: 'var(--fg)',
      // The picked candidate wears the gradient ring (the board's lead card).
      ...(selected
        ? {
            border: '1.5px solid transparent',
            background:
              'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent)) border-box',
          }
        : {
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
          }),
    }}
  >
    {candidate.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- a Spotify image in an admin panel, not a layout image
      <img
        src={candidate.imageUrl}
        alt=""
        width={44}
        height={44}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    ) : (
      <span
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          flexShrink: 0,
          background: 'var(--surface-2, var(--border))',
        }}
      />
    )}
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
        {candidate.name}
      </span>
      {(candidate.genres.length > 0 || candidate.current) && (
        <span
          style={{ display: 'block', fontSize: 12, color: 'var(--fg-muted)' }}
        >
          {[
            ...candidate.genres.slice(0, 3),
            candidate.current ? PANEL.artist.currentPhoto : null,
          ]
            .filter((part) => part)
            .join(' · ')}
        </span>
      )}
    </span>
    {candidate.playsDenver && (
      <Chip kind="success" dot>
        {PANEL.artist.playsDenver}
      </Chip>
    )}
    {candidate.current && (
      <Chip kind="neutral" dot>
        {PANEL.artist.current}
      </Chip>
    )}
  </button>
);

/** `02/artist-wrong-artist-report-or-unsure-match`. */
export const ArtistPanel = ({ row, today, busy, onAnswer }: PanelProps) => {
  const facts = row.artistFacts;
  const candidates = facts?.candidates ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  // The best candidate stands until another is picked: the one that is not
  // already the photo's match first, else the first.
  const first = candidates.find((cand) => !cand.current) ?? candidates[0];
  const selected =
    candidates.find((cand) => cand.id === picked) ?? first ?? null;
  const chip = whenChipOf(row.fanDate, today);
  const when = [chip?.text.split(' · ')[0], facts?.nextShowVenue]
    .filter((part) => part)
    .join(' · ');
  const photoReports = facts?.reportReasons.includes('wrong_photo') ?? false;
  const matchStatus = evidenceText(
    'Match status',
    row.evidence.find((line) => line.label === 'Match status')?.value ?? '',
  );
  const happened = [
    row.reportCount
      ? photoReports
        ? PANEL.artist.reportedPhoto(row.reportCount)
        : PANEL.artist.reportedOther(row.reportCount)
      : null,
    row.evidence.some((line) => line.label === 'Match status')
      ? `${matchStatus}.`
      : null,
  ].filter((part) => part !== null);

  return (
    <>
      <ChipRow>
        {when && (
          <Chip kind={chip?.soon ? 'accent' : 'neutral'} dot>
            {when}
          </Chip>
        )}
        {row.reportCount ? (
          <Chip kind="neutral">
            {PANEL.artist.reportsChip(row.reportCount)}
          </Chip>
        ) : null}
      </ChipRow>
      {happened.length > 0 && (
        <Section label={PANEL.whatHappened}>
          <Prose>{happened.join(' ')}</Prose>
        </Section>
      )}
      {candidates.length > 0 && (
        <Section label={PANEL.artist.candidates}>
          <div
            role="radiogroup"
            aria-label={PANEL.artist.candidates}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {candidates.map((cand) => (
              <CandidateCard
                key={cand.id}
                candidate={cand}
                selected={selected?.id === cand.id}
                onSelect={() => setPicked(cand.id)}
              />
            ))}
          </div>
        </Section>
      )}
      <AnswerButtons
        row={row}
        busy={busy}
        note={null}
        // Picking needs a candidate to pick; with none stored, the answer that
        // would send no artist is not offered.
        hide={selected ? undefined : ['pick_the_right_artist']}
        labelOf={(answer) =>
          answer.slug === 'pick_the_right_artist' && selected
            ? selected.playsDenver
              ? PANEL.artist.useDenver(selected.name)
              : PANEL.artist.use(selected.name)
            : answer.slug === 'keep_this_match'
              ? PANEL.artist.keepPhoto
              : answer.label
        }
        paramsOf={(answer) =>
          answer.slug === 'pick_the_right_artist' && selected
            ? { spotifyArtistId: selected.id }
            : undefined
        }
        onAnswer={onAnswer}
      />
    </>
  );
};

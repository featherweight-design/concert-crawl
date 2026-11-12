import type { StatusKind } from '@/components/admin/primitives';
import type {
  AdminArtistRow,
  ArtistCandidate,
  ArtistWrite,
} from './artists-api';

/**
 * The four kinds of To check row the board draws (`06/artists-to-check`).
 * A wrong-artist report outranks the match state, as the API's order does.
 */
export type ToCheckKind = 'reported' | 'unsure' | 'no_match' | 'check';

export const toCheckKind = (row: AdminArtistRow): ToCheckKind => {
  if (row.openReportCount > 0) return 'reported';
  if (row.matchStatus === 'ambiguous') return 'unsure';
  if (row.matchStatus === 'matched' && row.autoMatchedAt !== null)
    return 'check';
  // `unmatched` (not yet searched, or sent back by It's an artist) reads as
  // No match: neither has an artist to show.
  return 'no_match';
};

/** Whether the row belongs in To check at all; a search lists every status. */
export const isToCheck = (row: AdminArtistRow): boolean =>
  row.openReportCount > 0 ||
  row.matchStatus === 'ambiguous' ||
  row.matchStatus === 'unmatched' ||
  row.matchStatus === 'no_match' ||
  (row.matchStatus === 'matched' && row.autoMatchedAt !== null);

export const KIND_TONE: Record<ToCheckKind, StatusKind> = {
  reported: 'warning',
  unsure: 'warning',
  no_match: 'danger',
  check: 'signal',
};

/** "Sun Nov 15": the show's calendar day, written in Denver's calendar. */
export const showDate = (date: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((each) => each.type === type)?.value ?? '';
  return `${part('weekday')} ${part('month')} ${part('day')}`;
};

/** "Lost Lake · Sun Nov 15", or null when the artist has no show left. */
export const showLine = (row: AdminArtistRow): string | null => {
  if (!row.nextShow) return null;
  const date = showDate(row.nextShow.date);
  return row.nextShow.venueName ? `${row.nextShow.venueName} · ${date}` : date;
};

/**
 * The candidate cards a row draws: two at most. A Check row draws only the
 * artist it was matched to. Every other row fills an empty slot with the
 * Search card, as the No match row does.
 */
export type CandidateCard =
  { type: 'artist'; candidate: ArtistCandidate } | { type: 'search' };

const CARD_SLOTS = 2;

export const candidateCards = (
  row: AdminArtistRow,
  kind: ToCheckKind,
): CandidateCard[] => {
  const candidates = row.candidates ?? [];
  // The artist fans see now, from the snapshot or, when the snapshot lacks
  // it, from the row itself.
  const current: ArtistCandidate | null = row.spotifyArtistId
    ? (candidates.find((each) => each.id === row.spotifyArtistId) ?? {
        id: row.spotifyArtistId,
        name: row.name,
        imageUrl: row.photoUrl,
        genres: null,
      })
    : null;
  if (kind === 'check') {
    return current ? [{ type: 'artist', candidate: current }] : [];
  }
  // The current match leads, so a reported row shows what fans see now and
  // is what the primary button keeps by default.
  const ordered = [
    ...(current ? [current] : []),
    ...candidates.filter((each) => each.id !== row.spotifyArtistId),
  ];
  const cards: CandidateCard[] = ordered
    .slice(0, CARD_SLOTS)
    .map((candidate) => ({ type: 'artist', candidate }));
  return cards.length < CARD_SLOTS ? [...cards, { type: 'search' }] : cards;
};

/**
 * What the primary button writes for the selected card. Keeping the current
 * match is Looks right: on a Check row it confirms the automatic pick, and on
 * a reported row the re-save closes the reports as dismissed.
 */
export const primaryWrite = (
  row: AdminArtistRow,
  selected: ArtistCandidate | null,
): ArtistWrite | null => {
  if (!selected) return null;
  if (selected.id === row.spotifyArtistId) {
    return row.autoMatchedAt !== null
      ? { kind: 'confirm', spotifyArtistId: selected.id }
      : { kind: 'keep', spotifyArtistId: selected.id };
  }
  return {
    kind: 'use',
    spotifyArtistId: selected.id,
    photoUrl: selected.imageUrl,
  };
};

/** Selected by default: the current match, else the first candidate. */
export const defaultSelection = (cards: CandidateCard[]): string | null => {
  const first = cards[0];
  return first?.type === 'artist' ? first.candidate.id : null;
};

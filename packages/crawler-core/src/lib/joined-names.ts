// Whether "A & B" is one act or two, decided from evidence and never from the
// shape of the name (#1343). Two real acts joined by "&" kept as one artist
// create a fake entity people can follow, and a real one-act name ("Iron &
// Wine") split in two does the same in reverse, so a guess either way is a bug.
//
// The evidence:
//   whole(N)  an independent source (MusicBrainz) has an artist named exactly N
//   part(P)   P is a known artist: one of ours with an exact Spotify match, or
//             an exact-name artist at MusicBrainz
//
// Then: the whole is known -> WHOLE; else every part is known -> SPLIT; else
// UNRESOLVED, and the caller writes nothing for that event.

export type JoinedRuling = 'whole' | 'split' | 'unresolved';

export interface JoinedEvidence {
  /** An independent source names an artist exactly like this whole string. */
  whole: (name: string) => Promise<boolean | null>;
  /** The name is a known artist. Never given a joined name. */
  part: (name: string) => Promise<boolean | null>;
}

/** The joiners the ladder already treats as co-billing (see CO_BILLING_JOINERS). */
const JOINED = / & | \+ /;

export const joinsNames = (name: string): boolean => JOINED.test(name);

/** The pieces of a joined name, trimmed; a one-piece name has no parts. */
export const partsOf = (name: string): string[] => {
  const parts = name.split(JOINED).map((part) => part.trim());
  return parts.length > 1 && parts.every((part) => part !== '') ? parts : [];
};

export async function rulingOf(
  name: string,
  evidence: JoinedEvidence,
): Promise<JoinedRuling> {
  const parts = partsOf(name);
  if (parts.length === 0) return 'whole';
  // null is "could not ask": a source that was down never counts as "no".
  const whole = await evidence.whole(name);
  if (whole === null) return 'unresolved';
  if (whole) return 'whole';
  for (const part of parts) {
    if ((await evidence.part(part)) !== true) return 'unresolved';
  }
  return 'split';
}

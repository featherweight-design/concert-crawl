import { reportFailure } from '@concert-crawl/logger';
import type { NormalizedEvent } from '../types.js';
import {
  joinsNames,
  partsOf,
  rulingOf,
  type JoinedEvidence,
} from './joined-names.js';

export interface DerivedArtists {
  /**
   * NULL is the ladder reaching NO verdict — only the adjudicator-outage path
   * produces it, and the upsert reads it as "keep what is stored". An empty
   * array is the opposite: a verdict that nobody is billed.
   */
  headliners: string[] | null;
  supportingArtists: string[] | null;
  isConcert: boolean;
  /** True when an LLM call was made — the caller records cost against this. */
  adjudicated: boolean;
  /**
   * True when the adjudicator ruled that the names in the listing are the
   * artists being covered or honored (a cover show, a tribute night), not
   * performers. The bill is empty then, and a caller that rewrites stored bills
   * leaves the row untouched rather than erase what is there.
   */
  coversOtherArtists?: boolean;
  /**
   * Joined names ("A & B") the evidence could not settle as one act or two. The
   * bill is NULL then (nothing is written for the event) and `guess` is what the
   * adjudicator answered, kept only so an admin can read it beside the name.
   */
  unresolvedJoined?: { name: string; guess: string[] }[];
}

export type Adjudicator = (input: {
  title: string;
  description: string | undefined;
  /** The performer field the venue's own listing reported, when it named one. */
  venuePerformers?: readonly string[] | undefined;
}) => Promise<{
  isConcert: boolean;
  headliners: string[];
  supportingArtists: string[];
  coversOtherArtists?: boolean;
}>;

// Words that are never an act, on a bill or off it. Compared case-insensitively
// against a whole name, so "Friends" goes and "Friends of Mine" stays.
const GENERIC_TOKENS = new Set([
  'friends',
  '& friends',
  'and friends',
  'friend',
  'special guest',
  'special guests',
  'guest',
  'guests',
  'more',
  'and more',
  '& more',
  'tba',
  'tbd',
  'tbc',
  'surprise set',
  'surprise guest',
  'surprise guests',
  'dj',
  'djs',
  'support',
  'openers',
  'live band',
]);

// "Telly & Friends" is the act Telly with company; the key drops that tail so
// the two spellings are one act. The name as written is never changed by this.
const nameKey = (name: string): string =>
  name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+(?:&|and|\+)\s+friends$/, '');

// "Karl Denson's Tiny Universe (A Tribute to Jimmy Cliff)": a tribute note in
// parentheses is about one act's set, not its name. It leaves the stored name.
const TRIBUTE_NOTE = /\s*\([^)]*\b(?:tributes?|covers?)\b[^)]*\)/gi;
const withoutTributeNote = (name: string): string =>
  name.replace(TRIBUTE_NOTE, '').trim();

// The acts a combined headliner is made of: "Brothers of Brass & Hot Like Mars"
// and "A / B" both stand for several acts, and an act listed under them is the
// same act listed twice. The whole combined name counts as a member too.
// Only the co-billing joiners the ladder already knows (" & ", " + ") and " / ":
// a comma, "and" or "x" sit inside too many real names to split on.
const COMBINED_JOINERS = / & | \+ | \/ /;
const memberKeys = (name: string): string[] => {
  const whole = nameKey(name);
  return [whole, ...name.split(COMBINED_JOINERS).map(nameKey)].filter(
    (key) => key !== '',
  );
};

/**
 * The deterministic clean-up every bill passes through before it is stored:
 * generic words ("Friends", "Special Guests", "TBA") are never acts, and an act
 * is never listed twice under two roles. Supporting is checked against the
 * headliners AND the members of a combined headliner, ignoring a trailing
 * parenthetical ("LivSings (Beyonce Tribute)" is "LivSings").
 */
export function tidyBill(
  headliners: string[],
  supportingArtists: string[],
): { headliners: string[]; supportingArtists: string[] } {
  const keepName = (name: string): boolean => {
    const key = name.trim().toLowerCase();
    return key !== '' && !GENERIC_TOKENS.has(key);
  };
  headliners = headliners.map(withoutTributeNote);
  supportingArtists = supportingArtists.map(withoutTributeNote);
  const seenHeadliners = new Set<string>();
  const cleanHeadliners: string[] = [];
  for (const name of headliners) {
    if (!keepName(name)) continue;
    const key = nameKey(name);
    if (seenHeadliners.has(key)) continue;
    seenHeadliners.add(key);
    cleanHeadliners.push(name.trim());
  }
  const headlinerMembers = new Set(cleanHeadliners.flatMap(memberKeys));
  const seen = new Set<string>();
  const cleanSupporting: string[] = [];
  for (const name of supportingArtists) {
    if (!keepName(name)) continue;
    const key = nameKey(name);
    if (headlinerMembers.has(key) || seen.has(key)) continue;
    seen.add(key);
    cleanSupporting.push(name.trim());
  }
  return { headliners: cleanHeadliners, supportingArtists: cleanSupporting };
}

// A tribute or cover night is a real show whose billed names are the artists
// being honored. The title says so in plain words, so this is decided here, the
// same way on every crawl, and never left to a model that can answer
// differently run to run (it hid "Tributes to ..." nights as "not a concert",
// and kept the honored acts on their bills). Words, not name shapes (#1343).
const TRIBUTE_TITLE = /\btributes?\b|\bcover (?:show|night)\b/i;

// "A & B" is one act or two, and the model answers that differently run to run
// ("Nas & The Roots" came back whole after coming back split). When the venue's
// own performer field lists every member as its own entry, the venue has said
// they are separate acts: the split is decided by that evidence, not the model.
export function splitListedSeparately(
  headliners: string[],
  venuePerformers: readonly string[],
): string[] {
  const listed = new Set(venuePerformers.map((name) => nameKey(name)));
  return headliners.flatMap((name) => {
    const members = name.split(' & ').map((member) => member.trim());
    if (members.length < 2 || members.some((member) => member === '')) {
      return [name];
    }
    return members.every((member) => listed.has(nameKey(member)))
      ? members
      : [name];
  });
}

/**
 * Settles every joined headliner from evidence. `lone` is the lone flattened
 * name the venue's field reported: whatever the model answered for it, the
 * ruling is what stands (so a model that splits it one run and keeps it whole
 * the next cannot move the answer). Names the evidence cannot settle come back
 * in `unresolved`.
 */
async function applyJoinedRulings(
  headliners: string[],
  lone: string | undefined,
  evidence: JoinedEvidence,
): Promise<{ headliners: string[]; unresolved: string[] }> {
  const unresolved: string[] = [];
  let rest = headliners;
  const out: string[] = [];
  if (lone !== undefined && joinsNames(lone)) {
    const ruling = await rulingOf(lone, evidence);
    const parts = partsOf(lone);
    const keys = new Set([lone, ...parts].map(nameKey));
    rest = rest.filter((name) => !keys.has(nameKey(name)));
    if (ruling === 'whole') out.push(lone);
    else if (ruling === 'split') out.push(...parts);
    else unresolved.push(lone);
  }
  for (const name of rest) {
    if (!joinsNames(name)) {
      out.push(name);
      continue;
    }
    const ruling = await rulingOf(name, evidence);
    if (ruling === 'split') out.push(...partsOf(name));
    else if (ruling === 'whole') out.push(name);
    else unresolved.push(name);
  }
  // One list, no repeats: the model sometimes lists "A & B" beside "A" and "B".
  // Where the evidence ruled the joined name one act, its parts listed on
  // their own are the same bill said twice, and the ruling stands.
  const wholeParts = new Set(
    out
      .filter((name) => joinsNames(name))
      .flatMap(partsOf)
      .map(nameKey),
  );
  const seen = new Set<string>();
  const unique = out.filter((name) => {
    if (!joinsNames(name) && wholeParts.has(nameKey(name))) return false;
    const key = nameKey(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { headliners: unique, unresolved };
}

// "Tape B Presents: Hallow Rocks": a presenter is on the bill only when it is a
// known artist (Tape B is; a radio station that presents the night is not).
// The word is "presents", never the shape of the name.
const PRESENTER = /^(.+?)\s+presents\b/i;

async function withKnownPresenter(
  title: string,
  headliners: string[],
  evidence: JoinedEvidence,
): Promise<string[]> {
  const presenter = PRESENTER.exec(title)?.[1]?.trim();
  if (presenter === undefined || presenter === '' || joinsNames(presenter))
    return headliners;
  const key = nameKey(presenter);
  if (headliners.some((name) => nameKey(name) === key)) return headliners;
  return (await evidence.part(presenter)) === true
    ? [presenter, ...headliners]
    : headliners;
}

// Only when the title AS A WHOLE is a tribute or cover night. The word inside
// a parenthesis is one act's note on a real bill ("Rio Rosa, LivSings (Beyonce
// Tribute)"), which leaves the bill alone.
export function isTributeTitle(title: string): boolean {
  return TRIBUTE_TITLE.test(title.replace(/\([^)]*\)/g, ' '));
}

// Words that mark a title as describing the EVENT rather than naming an act.
// Deliberately conservative: a false positive costs one LLM call, but a false
// negative leaves a title in the artists projection.
const EVENT_WORDS = [
  'presents',
  'benefit',
  'festival',
  'bash',
  'party',
  'night',
  'showcase',
  'tribute',
  'karaoke',
  'bingo',
  'trivia',
  'open mic',
  'dj set',
  'brunch',
  'market',
];

// A single observed performer that joins names with one of these may be two
// acts a structured source flattened into one string ("Clipse & J.I.D",
// "Galdive & rum.gold": AEG's headlinersText, a JSON-LD performer, a Ticketure
// act) or one act whose own name has the joiner ("Iron & Wine", "Earth, Wind &
// Fire"). Neither a separator split nor a trusting pass-through gets both
// right, so the adjudicator rules. Never added to `canonicalizeArtist`'s
// SEPARATORS: that is a dedup key and must not move.
const CO_BILLING_JOINERS = [' & ', ' + '] as const;

export function joinsSeveralNames(observed: string): boolean {
  return CO_BILLING_JOINERS.some((joiner) => observed.includes(joiner));
}

// Only a LONE observed name can be a flattened billing: a source that already
// reported several headliners has split the bill itself, and is trusted. The
// one place both the ladder and the verdict-reuse gate read, so they cannot
// disagree.
function isFlattenedBilling(observed: string[]): boolean {
  const [only] = observed;
  return observed.length === 1 && only !== undefined && joinsSeveralNames(only);
}

export function isSuspiciousObservation(
  observed: string,
  title: string,
): boolean {
  // A performer field that merely echoes the title carries no information — it
  // is the shape every title-as-artist bug takes. Anything else is the venue
  // stating a name it did not simply copy from its own headline, so it is
  // trusted even when it happens to contain an event word ("Halloween Party
  // Orchestra" is a band).
  if (observed.trim().toLowerCase() !== title.trim().toLowerCase())
    return false;

  const lowered = observed.toLowerCase();
  if (observed.includes(':')) return true;
  return EVENT_WORDS.some((word) => lowered.includes(word));
}

/**
 * True when the ladder would fall through to the adjudicator — no usable
 * observation, so only the LLM can answer. Callers cache verdicts on this:
 * reusing one when the extraction DOES name somebody would ignore a source
 * that newly started emitting a performer field, and keep projecting the older
 * LLM answer forever. Exported so the reuse gate cannot drift from step 1.
 */
export function wouldAdjudicate(event: {
  title: string;
  observedPerformers?: string[];
  isConcert?: boolean;
}): boolean {
  // A tribute or cover night is settled by its title alone, no call needed.
  if (isTributeTitle(event.title)) return false;
  if (event.isConcert === false) return false;
  const observed = (event.observedPerformers ?? []).filter(
    (name) => name.trim().length > 0,
  );
  const headliner = observed[0];
  if (headliner === undefined) return true;
  return (
    isSuspiciousObservation(headliner, event.title) ||
    isFlattenedBilling(observed)
  );
}

/**
 * Folds observed openers into a headline bill the adjudicator produced.
 *
 * The adjudicator reads only title + description, so an extractor that found
 * openers in a field it never sees (Ticketure's `supportingActs`, which sits
 * outside the description it never populates) holds the only record of them.
 * Taking a verdict wholesale would delete that.
 *
 * The verdict leads: it answers the question actually asked. An observed name
 * the adjudicator promoted to the headline bill is dropped rather than listed
 * twice under two roles. Exported because the crawl's verdict-reuse branch
 * merges the same way — its cache key is (title, description), which cannot
 * see an opener change, so reuse must re-merge against the current crawl.
 */
export function mergeObservedSupporting(
  headliners: string[],
  verdictSupporting: string[],
  observedSupporting: string[] | undefined,
): string[] {
  const headlinerKeys = new Set(
    headliners.map((name) => name.trim().toLowerCase()),
  );
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const name of [...verdictSupporting, ...(observedSupporting ?? [])]) {
    const key = name.trim().toLowerCase();
    if (key === '' || headlinerKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    merged.push(name.trim());
  }
  return merged;
}

export async function deriveArtists(
  event: Pick<NormalizedEvent, 'title' | 'description'> & {
    // Typed optional even though `NormalizedEvent` declares it required: the
    // same hazard `rawTitle` has in crawl.ts. A path that forgets to report
    // observations must escalate, not throw and take the whole run to
    // `failed`.
    observedPerformers?: string[];
    observedSupportingArtists?: string[];
    // Only the LLM path and Ticketure emit this. `undefined` means "nobody
    // ruled", which is most of the catalogue and must not read as a negative.
    isConcert?: boolean;
  },
  // Null when the site's robots.txt closes it to AI crawlers: the title and
  // description are its page text, so step 2 is skipped and the event keeps
  // whatever bill is stored, exactly as an adjudicator outage would.
  adjudicate: Adjudicator | null,
  // Evidence for joined names and presenters. The artist repair passes it; the
  // live crawl does not, and keeps the answer it always had.
  evidence?: JoinedEvidence,
): Promise<DerivedArtists> {
  // Step -1 — a tribute or cover night: a concert, never hidden, nobody billed.
  // Outranks an extractor's "not a concert" and any observed bill, which here
  // are the honored acts. An empty bill (not NULL) is "nobody billed".
  if (isTributeTitle(event.title)) {
    return {
      headliners: [],
      supportingArtists: [],
      isConcert: true,
      coversOtherArtists: true,
      adjudicated: false,
    };
  }

  // Step 0 — an extractor that already read the page and said "not a concert"
  // outranks every step below it. Re-adjudicating would spend a call to
  // second-guess a verdict made with more context than a title, and echoing
  // the observed performer would put a bingo night in the artists projection.
  if (event.isConcert === false) {
    return {
      headliners: [],
      supportingArtists: [],
      isConcert: false,
      adjudicated: false,
    };
  }

  const nonEmpty = (names: string[] | undefined): string[] =>
    (names ?? []).filter((name) => name.trim().length > 0);

  const observed = nonEmpty(event.observedPerformers);
  const headliner = observed[0];

  // Step 1 — the source named somebody, and it does not merely echo the title.
  // This is the venue's own structured field; an LLM re-reading the page title
  // is strictly downstream of it, and re-deriving here would make each event's
  // artist nondeterministic across nightly crawls.
  const observedBill = (): DerivedArtists => {
    const tidy = tidyBill(observed, nonEmpty(event.observedSupportingArtists));
    return {
      // A source that named only generic words ("Friends", "TBA") has still
      // named somebody; emptying a concert's bill here would store nobody, so the
      // observed headliners stand as they always did.
      headliners: tidy.headliners.length > 0 ? tidy.headliners : observed,
      supportingArtists: tidy.supportingArtists,
      isConcert: true,
      adjudicated: false,
    };
  };
  // A lone observed name that joins several is escalated (see
  // CO_BILLING_JOINERS), but its observed bill stays the answer when no verdict
  // can be had, exactly as it was before the escalation existed. A bill the
  // extractor already split into several headliners is trusted as it is.
  const joined = isFlattenedBilling(observed);
  if (
    headliner !== undefined &&
    !isSuspiciousObservation(headliner, event.title) &&
    !joined
  ) {
    // The whole observed headline bill, not just its first element — a
    // co-headline set (#1203) is a real reading of the page and demoting its
    // second act to an opener would lose it.
    return observedBill();
  }

  // Step 2 — no signal, or the signal is the title wearing a performer's hat.
  if (adjudicate === null) {
    if (joined) return observedBill();
    return {
      headliners: null,
      supportingArtists: null,
      isConcert: true,
      adjudicated: false,
    };
  }
  // What the venue's own field said, so a name it reported cannot vanish from
  // the verdict unseen. Not sent when it only echoes the title.
  const venuePerformers = observed.filter(
    (name) => name.trim().toLowerCase() !== event.title.trim().toLowerCase(),
  );
  try {
    const verdict = await adjudicate({
      title: event.title,
      description: event.description,
      venuePerformers,
    });
    // A "cover" verdict on a title that does not say tribute or cover, while
    // the venue itself printed performers ("X & Y play R.E.M.'s Document"):
    // the printed performers are the bill, the covered work is not.
    if (verdict.coversOtherArtists === true && venuePerformers.length > 0) {
      return { ...observedBill(), isConcert: verdict.isConcert };
    }
    // A cover or tribute night: the names in the listing are the artists being
    // honored, so nobody is billed. The observed bill (the same names) must not
    // stand in for it, and a caller that rewrites stored bills skips the row.
    if (verdict.coversOtherArtists === true) {
      return {
        headliners: [],
        supportingArtists: [],
        isConcert: verdict.isConcert,
        adjudicated: true,
        coversOtherArtists: true,
      };
    }
    // The venue named somebody, and the adjudicator reads only the title and
    // description. A verdict that bills nobody for a concert has not told us
    // who the venue's own performer field should have been, so the observed
    // bill stands. (A "not a concert" ruling is still honoured: that is a
    // classification, not a missing name.)
    if (joined && verdict.isConcert && verdict.headliners.length === 0) {
      return observedBill();
    }
    let headliners = splitListedSeparately(verdict.headliners, venuePerformers);
    if (evidence !== undefined) {
      const ruled = await applyJoinedRulings(
        headliners,
        joined ? observed[0] : undefined,
        evidence,
      );
      if (ruled.unresolved.length > 0) {
        return {
          headliners: null,
          supportingArtists: null,
          isConcert: verdict.isConcert,
          adjudicated: true,
          unresolvedJoined: ruled.unresolved.map((name) => ({
            name,
            guess: verdict.headliners,
          })),
        };
      }
      headliners = await withKnownPresenter(
        event.title,
        ruled.headliners,
        evidence,
      );
    }
    return {
      ...tidyBill(
        headliners,
        mergeObservedSupporting(
          headliners,
          verdict.supportingArtists,
          nonEmpty(event.observedSupportingArtists),
        ),
      ),
      isConcert: verdict.isConcert,
      adjudicated: true,
    };
  } catch (err) {
    // Step 3 — an adjudicator outage must not become a wrong answer, and must
    // not become a WRITE either. Returning an empty set here would read as a
    // verdict of "nobody is billed" and overwrite a correct stored bill,
    // de-projecting its artists until a later crawl happened to succeed. NULL
    // is the no-verdict signal the upsert preserves the stored columns on.
    // `isConcert` stays true so a transient Haiku failure never hides a real
    // show from the calendar. The next crawl retries.
    reportFailure({
      event: 'derive-artists.adjudicator_failed',
      severity: 'warn',
      title: event.title,
      error: err instanceof Error ? err.message : String(err),
    });
    if (joined) return observedBill();
    return {
      headliners: null,
      supportingArtists: null,
      isConcert: true,
      adjudicated: false,
    };
  }
}

// genre-pair.jsx — two genres in ONE chip.
//
// The ask: "Masego doesn't fit one genre, can we show two?"
//
// ── What was already true ──────────────────────────────────────────
// The data already carries two (`genres: ["funk","soul"]`), and the API filters
// with a Postgres array overlap across the whole array (`apps/api/src/routes/
// events.ts:297-310`) — so Masego ALREADY comes back under both funk and soul.
// The row chip was never the search index, and adding a second chip wouldn't
// have made him more findable. (R3.3: this cited a `hasGenre` / `.some()` helper
// in `filter-system.jsx`, which is mock code — the conclusion held, the citation
// pointed at a symbol that does not exist in the repo.)
//
// ── The defect that IS real ────────────────────────────────────────
// R3.3, corrected by eng: the defect is broader than R3 described, and the
// original framing described a filter the product doesn't offer.
//
// The Vibe filter's options are 16 BUCKET labels, not raw genres. The API
// expands the picked bucket into its sub-genre set server-side and queries with
// array overlap. So under a bucket filter NO genre on the row ever equals the
// filter label: Masego is ["funk","soul"], both of which live in the JAZZ
// bucket, and there is no "soul" option to pick. The row renders genres[0] and
// comes back labelled FUNK under a jazz filter.
//
// So the reorder can never confirm a match for ANYONE by string equality. It
// has to be membership.
//
// ── The call: one chip, two genres, filter-aware order ─────────────
//   FUNK/SOUL   — one object, ONE budget slot, both genres visible.
//   SOUL/FUNK   — under an active bucket filter, the first genre that is a
//                 MEMBER of the picked bucket leads.
//
// ── Scope of the reorder, stated plainly ───────────────────────────
// The reorder is a NO-OP whenever the primary genre is already a member of the
// picked bucket — which includes Masego, the act the request was about: funk and
// soul are both in the jazz bucket, so nothing moves.
//
// That isn't a shortfall, and it's the reason the PAIR is the actual fix. Under
// a jazz filter, FUNK/SOUL confirms the match on its own: both genres are
// jazz-bucket members, so the row is already saying "this is why you're seeing
// me". Buckets are wide, so this is the common case.
// The reorder earns its place on CROSS-BUCKET acts — hip-hop/soul under a jazz
// filter would otherwise render HIP-HOP and look like a mis-hit. There the lead
// is doing work no pair can do.
// So: the pair confirms the match; the reorder stops the pair from confirming
// the WRONG thing. Worth being explicit with eng, because "matched genre leads"
// oversells a line of code that most rows will never exercise.
//
// Why not two chips: Rule 2's budget is two, dropping to one when a support
// line is present. Two genre chips spend the entire budget on one fact, so a
// Browse row loses `Following` outright and a row with supports can show only
// half its genre. And two adjacent neutral chips is tag soup — precisely the
// drift Rule 2 exists to stop. A pair costs ~34px; a second chip costs a slot.
//
// Cap is two. A third genre never renders — the pair is an identity ("a
// funk/soul act"), not a tag list, and three is a list.
//
// ── Measured degradation: the META LINE owns it, not the chip ──────
// R3.1. The first cut had the chip measure itself and collapse. It couldn't
// work, for a reason worth recording: MetaRow wraps every child in its own
// content-sized span, so a chip looking at `parentElement` sees a box that
// never overflows — and by the time MetaRow's fit pass has taken the chip out
// of flow, the container isn't overflowing either. The chip can't see the
// pressure that is about to delete it.
//
// So the decision moves to the component that already owns "what fits":
// `MetaRowX` measures, and if the set overflows it collapses the pair FIRST,
// re-measures, and only then starts dropping whole chips. One extra step in an
// existing pass, no second measuring system — and `paired` lives in MetaRowX,
// not the row, so there is no parent round-trip in the middle of a measure.
//
// R3.2 hazard, recorded because it cost a session: toggling a chip between
// in-flow and absolute changes the meta line's own HEIGHT, so a ResizeObserver
// on that box re-fires on its own mutation. The observer is width-guarded for
// exactly that reason. Same lesson eng flagged for the tour clause.
//
// This is the one place the system degrades *within* a unit rather than
// dropping it whole. Deliberate, and called out because "drop whole units" is
// load-bearing: the unit is the chip, and the chip survives — what degrades is
// its contents, the same way line 3 shortens the date before it drops the
// venue.
//
// It's width, not a breakpoint: a pair sharing the line with a Following chip
// gives up its second genre earlier than a pair that has the line to itself.
// Measured, so nobody has to maintain a table of which combination fits where.
//
// ── The seam this needs, which is NOT free ─────────────────────────
// Membership requires knowing the bucket→sub-genre map on the client. Today the
// taxonomy lives in the API (apps/api/src/lib/genre-buckets.ts) and the web app
// only ever sees the bare `filterVibe` string, so eng has to either lift the map
// into a shared package or have the API return which sub-genre matched.
// Flagging, not deciding — design has no preference, but this line of intent is
// not a one-line change in cost.
//
// `bucketMembers` is that seam, injected. When it's absent the chip falls back
// to primary-genre order — no reorder, never a wrong reorder.
//
// Exports: GenrePairChip, orderGenres, VIBE_BUCKETS (mock taxonomy)

// Mock stand-in for genre-buckets.ts — enough buckets to demo the reorder.
// NOT a source of truth; eng owns the real map.
const VIBE_BUCKETS = {
  jazz: ["jazz", "funk", "soul", "r&b", "fusion"],
  indie: ["indie", "folk", "singer-songwriter", "indie-rock", "psych"],
  electronic: ["electronic", "house", "techno", "bass", "idm"],
  loud: ["punk", "metal", "hardcore", "post-rock"],
  "hip-hop": ["hip-hop", "rap", "trap"],
};

// The genre that MATCHED leads, then the rest, capped at two.
// Membership, not equality — the filter passes a bucket label, and no genre on
// the row is ever equal to it.
function orderGenres(genres, activeGenre, bucketMembers) {
  const g = (genres || []).filter(Boolean);
  if (!g.length) return [];
  const members = bucketMembers || (activeGenre ? VIBE_BUCKETS[activeGenre] : null);
  if (members && members.length) {
    const lead = g.find((x) => members.includes(x));
    if (lead) return [lead, ...g.filter((x) => x !== lead)].slice(0, 2);
  }
  return g.slice(0, 2);
}

// `paired` is owned by MetaRowX. The chip renders what it's told and does no
// measuring of its own — see the header note.
function GenrePairChip({ genres, activeGenre, bucketMembers, paired = true }) {
  const g = orderGenres(genres, activeGenre, bucketMembers);
  if (!g.length) return null;
  const both = paired && g.length > 1;
  return (
    <RowMetaChip tone="neutral" srText={g.length > 1 && !both ? ` and ${g[1]}` : undefined}>
      {g[0]}{both && <><span aria-hidden="true" style={{ opacity: 0.45, padding: "0 1px" }}>/</span>{g[1]}</>}
    </RowMetaChip>
  );
}

Object.assign(window, { GenrePairChip, orderGenres, VIBE_BUCKETS });

// oas-shared.jsx — Onboarding · artist search escape hatch · shared atoms
//
// Scope is ONE control: "Search for someone specific", the dashed button under
// the suggestion grid on onboarding step 7 of 8 (nf-cold-start.jsx
// FollowStepArtists). Nothing about the grid, the tiles, the CTA rail or the
// step copy is reopened here.
//
// Token-only (CLAUDE.md §2). --signal = CTA + selection. --accent stays
// reserved for brand presence and Watching; a selected artist never uses it.

const { NFArt, Mono, NFPrimary, NFGhost, GenreChip, ArtistPick, PickGrid, NFDots,
  GlyphCheck, GlyphPlus, GlyphSearch, GlyphChevron, GlyphLock,
  Screen, ScreenShell, Sheet, Scrim, NFNote, NotePaper,
  NF_ARTISTS, nfLocked } = window;

// ── The index ──────────────────────────────────────────────────
// Search here is the SAME index the shipped /search route queries: artists are
// a projection off event billing strings, so an artist row exists only because
// a crawl found them on a Denver bill (nf-shared.jsx, NFFollow §four states).
// Two consequences the mocks have to honour:
//   · every result is followable BY CONSTRUCTION — there is no "can't follow" row
//   · "played Denver before, nothing upcoming" is real and common, and is the
//     clearest case for following. It carries a meta line, not a disabled state.
const OAS_EXTRA = [
  { name: "Manchester Orchestra", genres: ["indie rock"], next: null, followers: 310 },
  { name: "Mandy, Indiana", genres: ["electronic", "post-punk"], next: "Hi-Dive · Oct 24", followers: 29 },
  { name: "Man Man", genres: ["art rock"], next: null, followers: 41 },
];
const OAS_INDEX = [...NF_ARTISTS, ...OAS_EXTRA];

function oasQuery(q) {
  const s = (q || "").trim().toLowerCase();
  if (!s) return [];
  return OAS_INDEX.filter(a => a.name.toLowerCase().includes(s));
}

// The step's live selection. Four picked on the grid before search opens —
// the same four FollowStepArtists ships with, so the merge is legible.
const OAS_PICKED = ["Amyl and The Sniffers", "Wednesday", "The Beths", "Mannequin Pussy"];

// ── Copy ───────────────────────────────────────────────────────
// Voice per CLAUDE.md §5: playful + clear. Placeholder for the copy-writer,
// same caveat as the native-following handoff — it sizes the layout and proves
// the state machine.
const OAS_COPY = {
  trigger:      "Search for someone specific",
  fieldPlace:   "Artist name",
  restHead:     "Who are you after?",
  restBody:     "Anyone who's played Denver is in here — even if they've got nothing on the books yet.",
  searching:    "Looking…",
  noneHead:     "Nobody by that name.",
  noneBody:     "We only know artists who've played Denver. Check the spelling, or head back — you can follow anyone from search later.",
  noneAction:   "Back to suggestions",
  errHead:      "That list didn't load.",
  errBody:      "Ours, not yours. Try it again — or skip, nothing here is required.",
  errStatus:    "Signal lost",
  returnStrip:  "Finishing setup",
};

// ── Search field ───────────────────────────────────────────────
// Matches SearchBarSM's geometry from search-mobile.jsx (44 min-height,
// radius 11, --surface-1 on --border-strong) so the field a user meets inside
// the tour is the same object they'll meet on /search afterwards.
function OASField({ query = "", state = "typed", onBack, dense = false, autoW }) {
  const empty = !query;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: autoW ? undefined : "100%" }}>
      {onBack !== false && (
        <button aria-label="Back to suggestions" style={{ all: "unset", cursor: "pointer", width: 44, height: 44, marginLeft: -10, flexShrink: 0,
          borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
          <GlyphChevron size={17} dir="left"/>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, minHeight: dense ? 42 : 46, padding: "0 13px",
        borderRadius: 11, background: "var(--surface-1)",
        border: `1px solid ${state === "rest" ? "var(--signal)" : "var(--border-strong)"}`,
        boxShadow: state === "rest" ? "0 0 0 3px color-mix(in oklab, var(--signal) 18%, transparent)" : "none" }}>
        <span style={{ color: empty ? "var(--fg-subtle)" : "var(--fg-muted)", flexShrink: 0 }}><GlyphSearch size={15}/></span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: empty ? 500 : 600,
          color: empty ? "var(--fg-subtle)" : "var(--fg)", letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {empty ? OAS_COPY.fieldPlace : query}
          {state === "rest" && <span style={{ display: "inline-block", width: 1.5, height: 17, marginLeft: 1, verticalAlign: "-3px", background: "var(--signal)" }}/>}
        </span>
        {!empty && <span aria-label="Clear" style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 22, display: "flex", alignItems: "center",
          justifyContent: "center", background: "var(--surface-2)", color: "var(--fg-muted)", fontSize: 13, lineHeight: 1, cursor: "pointer" }}>×</span>}
      </div>
    </div>
  );
}

// ── Result row ─────────────────────────────────────────────────
// Deliberately NOT the /search artist row (which carries a Follow BUTTON).
// Inside the tour nothing is written until the step commits, so a result has
// to speak the grid's language: the whole row is the checkbox, exactly like
// the tile is. This is the same grammar BulkFollowSheet already uses, so the
// gesture is learned once and works in three places.
function OASRow({ artist, selected = false, locked = false, dense = false }) {
  return (
    <div role="checkbox" aria-checked={selected} tabIndex={0} style={{
      display: "flex", alignItems: "center", gap: 12, padding: dense ? "9px 16px" : "11px 16px",
      borderTop: "1px solid var(--border)", cursor: "pointer",
      background: selected ? "var(--surface-1)" : "transparent" }}>
      <NFArt name={artist.name} size={dense ? 40 : 46} radius={8}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist.name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em",
          textTransform: "uppercase", color: artist.next ? "var(--signal)" : "var(--fg-subtle)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {artist.next || "No dates announced"}
        </div>
      </div>
      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? "var(--signal)" : "transparent",
        border: `1.5px solid ${selected ? "var(--signal)" : "var(--border-strong)"}`,
        color: selected ? "var(--fg-on-accent)" : "var(--fg-subtle)" }}>
        {selected ? <GlyphCheck size={13} w={2.6}/> : locked ? <GlyphLock size={12}/> : <GlyphPlus size={12} w={2.2}/>}
      </div>
    </div>
  );
}

function OASSkeletonRow({ i = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: "1px solid var(--border)", opacity: 1 - i * 0.22 }}>
      <div style={{ width: 46, height: 46, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ height: 11, width: `${62 - i * 13}%`, borderRadius: 4, background: "var(--surface-2)" }}/>
        <div style={{ height: 8, width: `${40 - i * 8}%`, borderRadius: 4, background: "var(--surface-1)" }}/>
      </div>
      <div style={{ width: 26, height: 26, borderRadius: 8, border: "1.5px solid var(--border)", flexShrink: 0 }}/>
    </div>
  );
}

// ── Picked strip ───────────────────────────────────────────────
// The single thing the live control gets most wrong: the selection survives in
// sessionStorage and NOTHING on screen says so. Inside search, the picks stay
// visible as a strip — so leaving the grid never looks like losing it, and a
// row tapped in search visibly joins the same set.
function OASPickedStrip({ names = OAS_PICKED, pad = "10px 16px" }) {
  if (!names.length) return null;
  return (
    <div style={{ padding: pad, display: "flex", alignItems: "center", gap: 9, borderTop: "1px solid var(--border)", background: "var(--surface-1)" }}>
      <Mono size={9} color="var(--signal)" style={{ flexShrink: 0 }}>Picked · {names.length}</Mono>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center" }}>
        {names.slice(0, 6).map((n, i) => (
          <div key={n} style={{ marginLeft: i ? -8 : 0, borderRadius: 8, border: "1.5px solid var(--surface-1)", flexShrink: 0, lineHeight: 0 }}>
            <NFArt name={n} size={26} radius={7}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rest / none / error bodies ─────────────────────────────────
function OASMessage({ head, body, status, statusTone = "accent", action, secondary, compact = false }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: compact ? "24px 26px" : "34px 30px", gap: 0 }}>
      {status && <Mono size={10} ls="0.18em" color={statusTone === "accent" ? "var(--accent)" : "var(--fg-subtle)"}>{status}</Mono>}
      <div style={{ fontSize: compact ? 20 : 23, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--fg)", marginTop: status ? 11 : 0, textWrap: "balance" }}>{head}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-muted)", marginTop: 9, maxWidth: 320, textWrap: "pretty" }}>{body}</div>
      {(action || secondary) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20, width: "100%", maxWidth: 260 }}>
          {action}{secondary}
        </div>
      )}
    </div>
  );
}

// ── Step chrome ────────────────────────────────────────────────
// The step 7 shell, lifted from FollowStepArtists so every direction here is
// drawn on the real thing. Two corrections carried in (both live defects, both
// verified against nf-cold-start.jsx / nf-desktop.jsx):
//   1. the eyebrow says "Step 5 of 6" while NFDots renders 8 — the dots are
//      right, the string was never updated. It reads "Step 7 of 8" here.
//   2. FollowStepDesktop passes NFDots total={6} index={4} — same miscount.
function OASStepChrome({ narrow = false, children, rail, skip = true, dots = true }) {
  return (
    <Screen>
      {dots && (
        <div style={{ padding: narrow ? "54px 16px 0" : "58px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <NFDots total={8} index={6}/>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
            {skip ? "Skip" : ""}
          </span>
        </div>
      )}
      {children}
      {rail}
    </Screen>
  );
}

function OASStepHead({ narrow = false }) {
  return (
    <div style={{ padding: narrow ? "20px 16px 12px" : "24px 20px 12px", flexShrink: 0 }}>
      <Mono color="var(--signal)" size={10}>Step 7 of 8 · playing denver</Mono>
      <h1 style={{ margin: "9px 0 0", fontSize: narrow ? 24 : 27, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.08, color: "var(--fg)" }}>
        Know any of these?
      </h1>
      <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.45, color: "var(--fg-muted)", textWrap: "pretty" }}>
        Punk, indie rock and shoegaze acts with Denver dates on the books. Tap to add — you can pick as many as you like.
      </p>
    </div>
  );
}

// The commit rail. Unchanged from the shipped step except that it is now
// RENDERED DURING SEARCH and its count is live — that is the whole argument
// for direction A.
function OASRail({ narrow = false, n = 4, tier = "premium" }) {
  const locked = nfLocked(tier);
  return (
    <div style={{ padding: narrow ? "12px 16px 26px" : "12px 20px 30px", borderTop: "1px solid var(--border)",
      background: "var(--bg-elevated)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
      {locked
        ? <><NFPrimary><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><GlyphLock size={13}/>Follow {n} {n === 1 ? "artist" : "artists"} with Premium</span></NFPrimary>
            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)", textWrap: "pretty" }}>Your picks are held while you upgrade — nothing gets lost.</div></>
        : <><NFPrimary>{n ? `Follow ${n} ${n === 1 ? "artist" : "artists"} →` : "Continue without following →"}</NFPrimary>
            <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--fg-subtle)" }}>{n ? "Unfollow any of them any time." : "You can follow anyone from search later."}</div></>}
    </div>
  );
}

// ── Desktop card shell ─────────────────────────────────────────
// Matches FollowStepDesktop (760 card, radius 18, --bg-elevated) with the two
// dot/eyebrow corrections applied.
function OASDeskCard({ children, footer, w = 760 }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 30, overflow: "hidden", position: "relative" }}>
      <div style={{ width: w, maxHeight: "100%", borderRadius: 18, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
        display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 26px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <NFDots total={8} index={6}/>
          <Mono size={10.5} color="var(--fg-subtle)" ls="0.12em">Skip</Mono>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

function OASDeskRail({ n = 4, label }) {
  return (
    <div style={{ padding: "16px 26px 22px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 20, flexShrink: 0 }}>
      <div style={{ fontSize: 12.5, color: "var(--fg-subtle)" }}>{label || `${n} selected · unfollow any of them any time.`}</div>
      <NFPrimary full={false}>Follow {n} artists →</NFPrimary>
    </div>
  );
}

Object.assign(window, {
  OAS_INDEX, OAS_EXTRA, OAS_PICKED, OAS_COPY, oasQuery,
  OASField, OASRow, OASSkeletonRow, OASPickedStrip, OASMessage,
  OASStepChrome, OASStepHead, OASRail, OASDeskCard, OASDeskRail,
});

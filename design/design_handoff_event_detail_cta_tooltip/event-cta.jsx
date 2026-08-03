// event-cta.jsx — Event Detail "commit block": Going + Watching + the CCTip.
//
// Problem being fixed (live UI, Aug 2026):
//   Going shipped as a full-width stub, Watching got consolidated to a bare
//   eye square that landed BELOW it, and the support copy got pushed into a
//   "?" button that sits BETWEEN the two CTAs. Result: three loose objects
//   stacked down the page in decreasing emphasis, and the tooltip trigger
//   reads like a third action.
//
// Fix, in three parts:
//   1. One bordered block owns the pair. Going and Watching are siblings on a
//      single row — never stacked, never orphaned.
//   2. The explainer trigger leaves the CTA stack entirely. It attaches to the
//      support copy (mobile) / block eyebrow (desktop), where it reads as
//      metadata, not as an action.
//   3. Watching keeps enough weight to look like a peer: same height, same
//      border weight as Going. Icon-only at 320, icon + label on desktop.
//
// Three directions for review (canvas section 1); C is the recommendation.
//   A · Split bar        one 52px bar, Going + eye cap divided by a rule
//   B · Stacked labelled Going, then a full-width labelled Watch button
//   C · Two-up  ★        Going flexes + 52 eye square, one row  ← recommended
//
// Exports: CommitBlock, WatchCap, WatchTextButton, CommitSupport,
//          EventTitleBlock, EventDetailTop, CTA_DIRECTIONS

const ECTA_UI = "Inter, system-ui, sans-serif";
const ECTA_MONO = "'JetBrains Mono', ui-monospace, monospace";

const CTA_DIRECTIONS = [
  { key: "A", label: "Split bar", note: "Going + eye share one bordered bar, divided by a rule. Tightest object count; the eye can read as part of Going." },
  { key: "B", label: "Stacked, labelled", note: "Going, then a full-width labelled Watch. Highest Watching clarity; two full-width buttons compete for the same slot." },
  { key: "C", label: "Two-up", note: "Going flexes, 52 eye square beside it. Peer weight, one row, works at 320. Recommended." },
];

// ── Support line + tip ──────────────────────────────────────────────
// The mono line stays VISIBLE on both breakpoints — the tooltip is depth,
// not the only place the copy lives. Voice shifts with commit state.
function CommitSupport({ going, watching, surface = "mobile", tipOpen = false, sheetHost }) {
  const committed = going === "going";
  const line = committed
    ? (watching ? "In your history after the show · watching the price." : "We'll add this to your history.")
    : (surface === "desktop"
      ? "Going saves the night · Watch tracks the price."
      : "Going saves the night · Watch tracks price.");
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 2, marginLeft: -4 }}>
      <span style={{
        flex: 1, minWidth: 0, paddingTop: 5,
        fontFamily: ECTA_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.03em",
        lineHeight: 1.45, color: "var(--fg-subtle)", marginLeft: 4, textWrap: "pretty",
      }}>{line}</span>
      <CCTip tip="going-vs-watch" surface={surface} size="sm"
        placement={surface === "desktop" ? "top" : "top"} align="end"
        defaultOpen={tipOpen} sheetHost={sheetHost}/>
    </div>
  );
}

// ── Watching affordances ────────────────────────────────────────────
// Direction A's eye cap: no border of its own, divided from Going by a rule.
function WatchCap({ watching, onChange, h = 52 }) {
  return (
    <button type="button"
      onClick={() => onChange && onChange(!watching)}
      aria-label={watching ? "Stop watching this show" : "Watch this show"}
      aria-pressed={watching}
      style={{
        all: "unset", cursor: "pointer", width: h, height: h, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderLeft: "1.5px solid var(--border-strong)",
        background: watching ? "color-mix(in oklch, var(--accent) 16%, transparent)" : "transparent",
        color: watching ? "var(--accent)" : "var(--fg-muted)",
        transition: "background 160ms, color 160ms",
      }}>
      <EyeIcon size={20} filled={watching}/>
    </button>
  );
}

// Desktop / wide-mobile: icon + label, auto width, clearly secondary to Going.
function WatchTextButton({ watching, onChange, h = 52, fullWidth = false }) {
  return (
    <button type="button"
      onClick={() => onChange && onChange(!watching)}
      aria-pressed={watching}
      style={{
        all: "unset", cursor: "pointer", boxSizing: "border-box",
        display: fullWidth ? "flex" : "inline-flex", width: fullWidth ? "100%" : "auto",
        alignItems: "center", justifyContent: "center", gap: 9,
        height: h, padding: "0 18px", borderRadius: 10, flexShrink: 0,
        border: `1.5px solid ${watching ? "var(--accent)" : "var(--border-strong)"}`,
        background: watching ? "color-mix(in oklch, var(--accent) 16%, var(--surface-1))" : "var(--surface-1)",
        color: watching ? "var(--accent)" : "var(--fg)",
        fontFamily: ECTA_UI, fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
        transition: "background 160ms, border-color 160ms, color 160ms",
      }}>
      <EyeIcon size={18} filled={watching}/>
      {watching ? "Watching" : "Watch"}
    </button>
  );
}

// ── The block ───────────────────────────────────────────────────────
function CommitBlock({
  show, direction = "C", surface = "mobile",
  going = "default", watching = false, onGoing, onWatch,
  tipOpen = false, sheetHost, showEyebrow,
}) {
  const desktop = surface === "desktop";
  const eyebrow = showEyebrow != null ? showEyebrow : desktop;
  const h = desktop ? 52 : 50;

  let row;
  if (direction === "A") {
    row = (
      <div style={{
        display: "flex", alignItems: "stretch", height: h,
        borderRadius: 10, overflow: "hidden",
        border: "1.5px solid var(--border-strong)",
        background: "var(--surface-1)",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GoingButton show={show} state={going} size="lg" onChange={onGoing} fullWidth bare radius={0}/>
        </div>
        <WatchCap watching={watching} onChange={onWatch} h={h - 3}/>
      </div>
    );
  } else if (direction === "B") {
    row = (
      <div style={{ display: "flex", flexDirection: desktop ? "row" : "column", gap: 9 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GoingButton show={show} state={going} size="lg" onChange={onGoing} fullWidth/>
        </div>
        <WatchTextButton watching={watching} onChange={onWatch} h={h - 6} fullWidth={!desktop}/>
      </div>
    );
  } else {
    row = (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GoingButton show={show} state={going} size="lg" onChange={onGoing} fullWidth/>
        </div>
        {desktop
          ? <WatchTextButton watching={watching} onChange={onWatch} h={h}/>
          : <WatchingEye watching={watching} onChange={onWatch} size="lg"/>}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 11,
      padding: desktop ? 16 : 14,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      fontFamily: ECTA_UI,
    }}>
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -2, marginBottom: -2 }}>
          <span style={{
            flex: 1, fontFamily: ECTA_MONO, fontSize: 9.5, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-subtle)",
          }}>Your move</span>
          <CCTip tip="going-vs-watch" surface={surface} size="sm" placement="bottom" align="end" defaultOpen={tipOpen}/>
        </div>
      )}
      {row}
      {!eyebrow && (
        <CommitSupport going={going} watching={watching} surface={surface} tipOpen={tipOpen} sheetHost={sheetHost}/>
      )}
      {eyebrow && (
        <span style={{
          fontFamily: ECTA_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.03em",
          color: "var(--fg-subtle)",
        }}>
          {going === "going"
            ? (watching ? "In your history after the show · watching the price." : "We'll add this to your history.")
            : "Going saves the night · Watch tracks the price."}
        </span>
      )}
    </div>
  );
}

// ── Context: the title block above it (matches the live screenshots) ──
function EventTitleBlock({ show, surface = "mobile" }) {
  const desktop = surface === "desktop";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: desktop ? 10 : 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(show.tags || ["world", "folk"]).map((t) => (
          <span key={t} style={{
            fontFamily: ECTA_MONO, fontSize: 10, fontWeight: 600, letterSpacing: "0.04em",
            color: "var(--fg-muted)", background: "var(--surface-2)",
            border: "1px solid var(--border)", borderRadius: 5, padding: "3px 7px",
          }}>{t}</span>
        ))}
      </div>
      <h1 style={{
        margin: 0, fontFamily: ECTA_UI, fontWeight: 900,
        fontSize: desktop ? 40 : 30, lineHeight: 1.05, letterSpacing: "-0.03em",
        color: "var(--fg)", textWrap: "balance",
      }}>{show.artist}</h1>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: ECTA_MONO, fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em",
          textTransform: "lowercase", color: "var(--fg-subtle)",
        }}>with</span>
        <span style={{ fontFamily: ECTA_UI, fontSize: desktop ? 16 : 14.5, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>
          {show.support || "Strainer"}
        </span>
      </div>
      <div style={{
        fontFamily: ECTA_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        color: "var(--fg-subtle)", marginTop: 2,
      }}>{show.venue} · {show.dateLabel}{show.showTime ? ` · ${show.showTime}` : ""}</div>
    </div>
  );
}

// Full top-of-page slice: identity band, title, commit block, then the real
// primary CTA underneath so the hierarchy is reviewable in one artboard.
function EventDetailTop({
  show, direction = "C", surface = "mobile", going = "default", watching = false,
  tipOpen = false, sheetHost, onGoing, onWatch, bandHeight,
}) {
  const desktop = surface === "desktop";
  const [g, setG] = React.useState(going);
  const [w, setW] = React.useState(watching);
  React.useEffect(() => setG(going), [going]);
  React.useEffect(() => setW(watching), [watching]);
  const band = bandHeight != null ? bandHeight : (desktop ? 180 : 128);
  return (
    <div style={{ background: "var(--bg)", minHeight: "100%" }}>
      <div style={{ height: band, position: "relative", overflow: "hidden" }}>
        <IdentityArt name={show.artist} kind="artist" scale="hero" showInitials={false} grain={0.06}/>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, var(--bg) 100%)" }}/>
      </div>
      <div style={{
        padding: desktop ? "0 40px 32px" : "0 14px 24px",
        marginTop: desktop ? -28 : -20,
        maxWidth: desktop ? 760 : "none",
        display: "flex", flexDirection: "column", gap: desktop ? 20 : 16,
      }}>
        <EventTitleBlock show={show} surface={surface}/>
        <CommitBlock show={show} direction={direction} surface={surface}
          going={g} watching={w} onGoing={(v) => { setG(v); onGoing && onGoing(v); }}
          onWatch={(v) => { setW(v); onWatch && onWatch(v); }}
          tipOpen={tipOpen} sheetHost={sheetHost}/>
        <a href="#tickets" onClick={(e) => e.preventDefault()} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: desktop ? 52 : 48, borderRadius: 10, textDecoration: "none",
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: ECTA_UI, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
        }}>Get Tickets ↗</a>
      </div>
    </div>
  );
}

Object.assign(window, {
  CommitBlock, WatchCap, WatchTextButton, CommitSupport,
  EventTitleBlock, EventDetailTop, CTA_DIRECTIONS,
});

// event-cta-v2.jsx — Event Detail commit block, R2.
//
// R1 solved the wrong composition. It treated the problem as "Going + eye + a
// tooltip trigger" because that's all the screenshots showed. The live UI is
// two sibling blocks:
//
//   EventDetailCtaBlock   Going only
//   WatchZone             the eye, an alerts hint ("we'll ping you on price
//                         drops"), and a watcher-count social proof
//
// Both the hint and the count were invisible in the screenshots — the hint
// hides once you're watching, the count is empty at zero watchers — so R1's
// CommitBlock had a slot for the eye and nothing else. Adopting it would have
// silently deleted two shipping elements. A/B/C were judged without them.
//
// ── What changes the answer ─────────────────────────────────────────
//
// The hint and the count are not two more peers. They are one line: they never
// both need weight, and they substitute for each other by state.
//
//   not watching, 0 others   "Watch it — we'll ping you if the price drops."
//   not watching, N others   "142 watching. We'll ping you if the price drops."
//   watching,     0 others   "You're watching this one."
//   watching,     N others   "You + 141 others watching."
//
// So the composition is three objects, not four: Going, the eye, and ONE status
// line that belongs to the eye. And once the eye owns a line of text, putting
// the eye on Going's row orphans that text under a two-up — which is what makes
// R1's Direction C the weaker answer now.
//
// ── Directions ──────────────────────────────────────────────────────
//   D · Watch strip  ★   Going full-width; below it a strip where the eye leads
//                        its own status line. The WHOLE strip toggles watching,
//                        so the target is ~300×52 instead of a 52px square, and
//                        the copy next to it says what tapping does.
//   E · Two-up + line    R1's C carried forward with the status line added
//                        full-width beneath. Shows the orphaning directly.
//   F · Count on the eye Eye square with the watcher count as a badge; the
//                        alerts hint drops to the tooltip. Most compact,
//                        loses the hint from the page.
//
// ── Entitlement ─────────────────────────────────────────────────────
// Going is gated behind Concert History. Free and logged-out users can tap it
// and get an upgrade sheet. The locked treatment is an invitation, not a wall:
// same size, same position, same label, outlined instead of filled, with a lock
// mark and one honest line beneath. Watching stays free in every state, so the
// watch strip is never touched by entitlement.
//
// Exports: CommitBlockV2, GoingCTA, WatchStrip, WatchEyeSquare, WatchStatusLine,
//          watchStatus, EventDetailTopV2, CTA_DIRECTIONS_V2, GOING_STATES

const E2_UI = "Inter, system-ui, sans-serif";
const E2_MONO = "'JetBrains Mono', ui-monospace, monospace";

const CTA_DIRECTIONS_V2 = [
  { key: "D", label: "Watch strip", note: "Going full-width; the eye leads its own status line below. Whole strip is the toggle — ~300×52 target instead of a 52px square, with copy saying what it does. Recommended." },
  { key: "E", label: "Two-up + line", note: "R1's Direction C plus the status line beneath. The line reads as belonging to neither control — this is the orphaning the new elements expose." },
  { key: "F", label: "Count on the eye", note: "Eye square with the watcher count as a badge; alerts hint moves into the tooltip. Tightest, but the hint leaves the page entirely." },
];

// Superset of the shipped GoingButton's `state`. The four it already knows
// (default / going / past-yes / past-no) delegate to it — including their copy,
// which is read from going-cta.jsx, never retyped. Only locked / pending /
// error are authored here, because GoingButton has no equivalent.
const GOING_STATES = [
  { key: "default", label: "Not going yet" },
  { key: "locked", label: "Locked (Free / logged-out)" },
  { key: "pending", label: "Saving…" },
  { key: "going", label: "Going" },
  { key: "error", label: "Save failed" },
  { key: "past-yes", label: "Past — you went" },
  { key: "past-no", label: "Past — didn't make it" },
];

// The exact default-state label GoingButton renders. Locked reuses it verbatim
// so the two can't drift. The exclamation is load-bearing per the shipped
// GOING_COPY.button.default — the prototype JSX is the known-wrong source.
const GOING_LABEL = "I'm going!";

// ── Icons ───────────────────────────────────────────────────────────
function E2Lock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2.6" y="6" width="8.8" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.7 6V4.4a2.3 2.3 0 014.6 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function E2Check({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.6 7.4L5.7 10.4L11.4 3.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function E2Alert({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2.6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="7" cy="10.4" r="0.95" fill="currentColor"/></svg>;
}
function E2Spinner({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ animation: "e2spin 720ms linear infinite" }}>
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.7" opacity="0.28"/>
      <path d="M8 1.8a6.2 6.2 0 016.2 6.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

// ── Going CTA ───────────────────────────────────────────────────────
// Geometry matches GoingButton exactly so the two are interchangeable in a row.
function GoingCTA({ show, state = "default", onChange, onUpgrade, onRetry, h = 52, fullWidth = true }) {
  // Everything GoingButton already models stays GoingButton's — copy included.
  if (state === "default" || state === "going" || state === "past-yes" || state === "past-no") {
    return <GoingButton show={show} state={state} size="lg" onChange={onChange} fullWidth={fullWidth}/>;
  }
  const base = {
    all: "unset", boxSizing: "border-box", cursor: "pointer",
    display: fullWidth ? "flex" : "inline-flex", width: fullWidth ? "100%" : "auto",
    alignItems: "center", justifyContent: "center", gap: 9,
    height: h, borderRadius: 10, padding: "0 18px",
    fontFamily: E2_UI, fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.01em",
    transition: "background 160ms, border-color 160ms, color 160ms",
  };

  if (state === "locked") {
    return (
      <button type="button" onClick={onUpgrade} aria-label={`${GOING_LABEL} Requires Concert History.`} style={{
        ...base,
        border: "1.5px solid color-mix(in oklch, var(--accent) 55%, transparent)",
        background: "color-mix(in oklch, var(--accent) 8%, transparent)",
        color: "var(--accent)",
      }}>
        <E2Lock/>{GOING_LABEL}
      </button>
    );
  }
  if (state === "pending") {
    return (
      <span role="status" aria-live="polite" style={{
        ...base, cursor: "default",
        border: "1.5px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--fg-muted)",
      }}>
        <E2Spinner/>Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <button type="button" onClick={onRetry} style={{
        ...base,
        border: "1.5px solid color-mix(in oklch, var(--danger) 60%, transparent)",
        background: "color-mix(in oklch, var(--danger) 10%, transparent)",
        color: "var(--danger)",
      }}>
        <E2Alert/>Didn't save. Tap to retry
      </button>
    );
  }
  return null;
}

// ── Watch status: the hint line (row 1 of the strip) ────────────────
// R2.1: the watcher count left this line. It was never a number — it's an
// avatar stack with named handles and a roster (see watcher-roster.jsx), which
// is too much object for a shared line. Row 1 is now purely the toggle's own
// label; row 2 is the crawl.
function watchStatus(watching, count = 0) {
  if (watching) return { text: "You're watching this one.", kind: "on" };
  return { text: "Watch to get pinged on price drops and sold-outs.", kind: "hint" };
}

function WatchStatusLine({ watching, count, size = 11 }) {
  const st = watchStatus(watching, count);
  return (
    <span style={{
      fontFamily: E2_MONO, fontSize: size, fontWeight: 600, letterSpacing: "0.03em",
      lineHeight: 1.45, color: watching ? "var(--accent)" : "var(--fg-subtle)",
      textWrap: "pretty",
    }}>{st.text}</span>
  );
}

// ── Direction D's watch strip ───────────────────────────────────────
// Two rows in one bordered object:
//   row 1  the toggle — eye + hint. Whole row is the button.
//   row 2  the crawl — avatars, names, and an "All N" that opens the roster
//          in an overlay. A SIBLING button, never nested inside the toggle.
// Row 2 is absent unless the crawl has two nameable people in it, which is why
// R1 never saw it. Watchers can be present and the row still hidden.
function WatchStrip({ watching, count, people, anon = 0, onChange, onOpenRoster, h = 52, nameLimit = 2, compact = false }) {
  const st = watchStatus(watching);
  const total = wr_total(people, anon, watching);
  // Threshold lives in wr_showCrawl — two named humans. See watcher-roster.jsx.
  const showCrawl = wr_showCrawl(people, anon, watching);
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      borderRadius: 10, overflow: "hidden",
      border: `1.5px solid ${watching ? "color-mix(in oklch, var(--accent) 50%, transparent)" : "var(--border)"}`,
      background: watching ? "color-mix(in oklch, var(--accent) 10%, transparent)" : "var(--surface-2)",
      transition: "background 160ms, border-color 160ms",
    }}>
      <button type="button"
        onClick={() => onChange && onChange(!watching)}
        aria-pressed={watching}
        aria-label={watching ? "Stop watching this show" : "Watch this show"}
        style={{
          all: "unset", boxSizing: "border-box", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12, width: "100%",
          minHeight: h, padding: "8px 14px 8px 10px",
        }}>
        <span style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: watching ? "var(--accent)" : "var(--fg-muted)",
          background: watching ? "color-mix(in oklch, var(--accent) 16%, transparent)" : "transparent",
        }}>
          <EyeIcon size={20} filled={watching}/>
        </span>
        <span style={{
          minWidth: 0, textAlign: "left",
          fontFamily: E2_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
          lineHeight: 1.45, color: watching ? "var(--accent)" : "var(--fg-subtle)", textWrap: "pretty",
        }}>{st.text}</span>
      </button>
      {showCrawl && (
        <div style={{
          padding: "9px 10px 9px 12px",
          borderTop: `1px solid ${watching ? "color-mix(in oklch, var(--accent) 28%, transparent)" : "var(--border)"}`,
          background: "color-mix(in oklab, var(--bg) 34%, transparent)",
        }}>
          <WatcherCrawlLine people={people} anon={anon} watching={watching}
            nameLimit={nameLimit} compact={compact} onOpen={onOpenRoster}/>
        </div>
      )}
    </div>
  );
}

// Direction E / F's square. F carries the count as a badge.
function WatchEyeSquare({ watching, count, onChange, badge = false, h = 52 }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button type="button"
        onClick={() => onChange && onChange(!watching)}
        aria-pressed={watching}
        aria-label={watching ? `Stop watching. ${count || 0} people watching` : `Watch this show. ${count || 0} people watching`}
        style={{
          all: "unset", boxSizing: "border-box", cursor: "pointer",
          width: h, height: h, borderRadius: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${watching ? "var(--accent)" : "var(--border-strong)"}`,
          background: watching ? "color-mix(in oklch, var(--accent) 14%, var(--surface-1))" : "var(--surface-1)",
          color: watching ? "var(--accent)" : "var(--fg-muted)",
          transition: "background 160ms, border-color 160ms, color 160ms",
        }}>
        <EyeIcon size={21} filled={watching}/>
      </button>
      {badge && count > 0 && (
        <span aria-hidden="true" style={{
          position: "absolute", top: -6, right: -8, minWidth: 20, height: 20, padding: "0 5px",
          borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--surface-3)", border: "1px solid var(--border-strong)",
          color: "var(--fg)", fontFamily: E2_MONO, fontSize: 10, fontWeight: 700,
        }}>{count}</span>
      )}
    </span>
  );
}

// ── The block ───────────────────────────────────────────────────────
function CommitBlockV2({
  show, direction = "D", surface = "mobile",
  going = "default", watching = false, watcherCount = 0,
  people, anon = 0, nameLimit,
  onGoing, onWatch, onUpgrade, onRetry,
  tipOpen = false, rosterOpen = false, sheetHost,
}) {
  const desktop = surface === "desktop";
  const h = desktop ? 52 : 50;
  const locked = going === "locked";
  const isPast = going === "past-yes" || going === "past-no";
  const [roster, setRoster] = React.useState(rosterOpen);
  React.useEffect(() => setRoster(rosterOpen), [rosterOpen]);
  const crowd = people || [];
  const total = wr_total(crowd, anon, watching);
  const showCrawl = wr_showCrawl(crowd, anon, watching);
  const limit = nameLimit != null ? nameLimit : (desktop ? 3 : 2);

  const goingEl = (
    <GoingCTA show={show} state={going} h={h} onChange={onGoing} onUpgrade={onUpgrade} onRetry={onRetry}/>
  );

  let body;
  if (direction === "E") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{goingEl}</div>
          <WatchEyeSquare watching={watching} count={total} onChange={onWatch} h={h}/>
        </div>
        <div style={{ paddingLeft: 2 }}><WatchStatusLine watching={watching} count={total}/></div>
        {showCrawl && (
          <WatcherCrawlLine people={crowd} anon={anon} watching={watching}
            nameLimit={limit} onOpen={() => setRoster(true)}/>
        )}
      </div>
    );
  } else if (direction === "F") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{goingEl}</div>
          <WatchEyeSquare watching={watching} count={total} onChange={onWatch} badge h={h}/>
        </div>
        {showCrawl && (
          <WatcherCrawlLine people={crowd} anon={anon} watching={watching}
            nameLimit={limit} onOpen={() => setRoster(true)}/>
        )}
      </div>
    );
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {goingEl}
        <WatchStrip watching={watching} people={crowd} anon={anon}
          onChange={onWatch} onOpenRoster={() => setRoster(true)}
          h={h} nameLimit={limit} compact={!desktop}/>
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
      fontFamily: E2_UI,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -2, marginBottom: -3 }}>
        <span style={{
          flex: 1, fontFamily: E2_MONO, fontSize: 9.5, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-subtle)",
        }}>{isPast ? "That night" : "Your move"}</span>
        <CCTip tip="going-vs-watch" surface={surface} size="sm" placement="bottom" align="end"
          defaultOpen={tipOpen} sheetHost={sheetHost}/>
      </div>
      {body}
      {locked && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: -2, marginLeft: -4 }}>
          <span style={{
            fontFamily: E2_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.03em",
            color: "var(--fg-subtle)", marginLeft: 4,
          }}>Going is part of Concert History.</span>
          <CCTip tip="concert-history" surface={surface} size="sm" placement="top" align="start"
            sheetHost={sheetHost}/>
        </div>
      )}
      {going === "error" && (
        <span role="alert" style={{
          fontFamily: E2_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.03em",
          color: "var(--danger)",
        }}>We couldn't reach the server. Your watch is safe.</span>
      )}
      {roster && (
        desktop
          ? <div style={{ position: "relative" }}>
              <CCOverlay id="roster-pop" mode="popover" title="The crawl on this show"
                placement="top" align="start" width={320} onClose={() => setRoster(false)}>
                <WatcherRoster people={crowd} anon={anon} watching={watching}/>
              </CCOverlay>
            </div>
          : <CCOverlayHost host={sheetHost}>
              <CCOverlay id="roster-sheet" mode="sheet" title="The crawl on this show"
                onClose={() => setRoster(false)}>
                <WatcherRoster people={crowd} anon={anon} watching={watching}/>
              </CCOverlay>
            </CCOverlayHost>
      )}
    </div>
  );
}

// ── Page slice ──────────────────────────────────────────────────────
function EventDetailTopV2({
  show, direction = "D", surface = "mobile", going = "default", watching = false,
  watcherCount = 0, people, anon = 0, tipOpen = false, rosterOpen = false, sheetHost, bandHeight,
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
        <CommitBlockV2 show={show} direction={direction} surface={surface}
          going={g} watching={w} people={people} anon={anon}
          onGoing={(v) => setG(v)} onWatch={(v) => setW(v)}
          tipOpen={tipOpen} rosterOpen={rosterOpen} sheetHost={sheetHost}/>
        <a href="#tickets" onClick={(e) => e.preventDefault()} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: desktop ? 52 : 48, borderRadius: 10, textDecoration: "none",
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: E2_UI, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
        }}>Get Tickets ↗</a>
      </div>
    </div>
  );
}

Object.assign(window, {
  CommitBlockV2, GoingCTA, WatchStrip, WatchEyeSquare, WatchStatusLine, watchStatus,
  EventDetailTopV2, CTA_DIRECTIONS_V2, GOING_STATES, GOING_LABEL,
});

// watcher-roster.jsx — "the crawl on this show".
//
// The watcher count is not a count. It's an avatar stack, named handles, and a
// roster behind a "see all N" — a social object with its own weight, which the
// R2 status line under-modelled as a bare number.
//
// Two problems it creates, both answered here:
//
//  1. It can't live on one line with the alerts hint. So the watch strip grows
//     a second row: the toggle owns row 1, the crawl owns row 2. Two hit
//     targets, no nesting, one bordered object.
//
//  2. "See all" currently expands an inline list and shoves the rest of the
//     page down — on a show with 13 watchers that's ~700px of push. The roster
//     moves into CCOverlay: bottom sheet on mobile, anchored popover on
//     desktop. Nothing below it moves, and it's the same shell CCTip uses.
//
// Exports: AvatarStack, WatcherWord, CrawlRow, WatcherRoster, WatcherCrawlLine,
//          rosterSummary, WATCHERS

const WR_UI = "Inter, system-ui, sans-serif";
const WR_MONO = "'JetBrains Mono', ui-monospace, monospace";

// Deterministic per-handle tone from the token palette. No raw hex — the four
// stops are the same tokens every other surface uses. The disc itself is
// UMAvatar from user-menu.jsx: this pass added a `tone` prop there rather than
// authoring a fourth avatar treatment (the R2.1 review's catch, and the same
// rule as retiring InfoTooltip — a second component rendering the same chrome
// is a refactor, not a feature).
const WR_STOPS = ["var(--signal)", "var(--accent)", "var(--warning)", "var(--success)"];
function wr_hue(handle) {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return WR_STOPS[h % WR_STOPS.length];
}

// WATCHERS is the OTHER people — the viewer is never seed data. They're
// injected by wr_crowd() when (and only when) they're watching, which is the
// one place membership is decided. The R2.1 review caught the same show
// reporting 12 and 13 because a `you`-flagged seed row was filtered out of the
// name list AND the total; with the viewer modelled explicitly there's one count.
const WATCHERS = [
  { handle: "sc_setlist_bassbin6" },
  { handle: "sc_lastcall_bassbin7" },
  { handle: "sc_bassbin_houselig8" },
  { handle: "sc_floorfill_housel5" },
  { handle: "sc_houselights_las10" },
  { handle: "sc_soundcheck_soun11" },
  { handle: "sc_encore_encore9" },
];
const WATCHERS_ANON = 5;
const VIEWER = { handle: "hugh", you: true };

// The crowd as displayed: you first when you're in it, then everyone else.
// This is the ONLY definition of membership — names, avatars and the total all
// derive from it, so they cannot disagree.
function wr_crowd(people, watching) {
  const others = people || [];
  return watching ? [VIEWER, ...others] : others;
}
function wr_total(people, anon, watching) {
  return wr_crowd(people, watching).length + (anon || 0);
}

function Avatar({ handle, size = 26, ring = true }) {
  return <UMAvatar initial={handle[0].toUpperCase()} size={size} tone={wr_hue(handle)}
    ring={ring ? "var(--surface-1)" : null}/>;
}

function AvatarStack({ people, extra = 0, size = 26, max = 3 }) {
  const shown = people.slice(0, max);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      {shown.map((p, i) => (
        <span key={p.handle} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: max - i, display: "inline-flex" }}>
          <Avatar handle={p.handle} size={size}/>
        </span>
      ))}
      {extra > 0 && (
        <span style={{ marginLeft: -size * 0.32, display: "inline-flex" }}>
          <UMAvatar initial={`+${extra}`} size={size} muted ring="var(--surface-1)"/>
        </span>
      )}
    </span>
  );
}

// The sentence. Truncates by NAME COUNT, never by ellipsis — a clipped handle
// is worse than one fewer handle, and the "+ N more" tail must survive because
// the count is the whole point of the line.
//
// R2.1 review: a hardcoded nameLimit guessed per breakpoint was letting CSS
// ellipsis be the real fallback on 25 of 26 instances. The limit is now
// MEASURED, exactly like the event row's MetaRow — render, compare scrollWidth
// to clientWidth, drop a name, repeat until it fits.
function rosterSummary(people, anon, watching, nameLimit) {
  const list = wr_crowd(people, watching);
  const named = list.map((p) => (p.you ? "you" : p.handle));
  const total = wr_total(people, anon, watching);
  const show = named.slice(0, Math.max(0, nameLimit));
  const rest = total - show.length;
  let text;
  if (show.length === 0) text = `${total} watching`;
  else if (rest <= 0) text = show.length === 1 ? show[0] : `${show.slice(0, -1).join(", ")} & ${show[show.length - 1]}`;
  else text = `${show.join(", ")} + ${rest} more`;
  return { text, total, watching };
}

function WatcherWord({ people, anon, watching, nameLimit = 3, size = 12 }) {
  const ref = React.useRef(null);
  const max = wr_crowd(people, watching).length;
  const start = Math.min(nameLimit, max);
  const [fit, setFit] = React.useState(start);
  const [suffix, setSuffix] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);

  React.useLayoutEffect(() => { setFit(start); setSuffix(true); setHidden(false); }, [start, people, anon, watching]);
  // Degradation ladder. Order matters: names outrank the "in the crawl" suffix,
  // so the suffix goes BEFORE the last handle — an earlier version exhausted
  // names first and spent 72px of decoration to bin a 111px handle, which is
  // how 320 ended up showing a bare count.
  //   3 names → 2 → 1 → drop suffix → 0 names ("12 watching") → hide
  // At the last rung the "All N" chip (or its chevron) still carries the count,
  // so nothing is lost. The count is never what gets cut.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || hidden) return;
    if (el.scrollWidth <= el.clientWidth + 0.5) return;
    if (fit > 1) setFit((f) => f - 1);
    else if (suffix) setSuffix(false);
    else if (fit > 0) setFit(0);
    else setHidden(true);
  });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { setFit(start); setSuffix(true); setHidden(false); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [start]);

  const s = rosterSummary(people, anon, watching, fit);
  return (
    <span ref={ref} style={{
      minWidth: 0, flex: 1, fontFamily: WR_UI, fontSize: size, lineHeight: 1.4,
      color: "var(--fg-muted)", overflow: "hidden", whiteSpace: "nowrap",
      visibility: hidden ? "hidden" : "visible",
    }}>
      {!hidden && <strong style={{ color: "var(--fg)", fontWeight: 700 }}>{s.text}</strong>}
      {!hidden && suffix && <span style={{ color: "var(--fg-subtle)" }}> in the crawl</span>}
    </span>
  );
}

// Row 2 of the watch strip: avatars + sentence + the roster trigger.
// A separate button from the toggle — never nested inside it.
//
// COMPACT (≤360) drops the avatar stack and shrinks the trigger to a chevron.
// Measured at 320: the row is 237px, and a stack (52) + a numeric "All 12"
// chip (58) leave 113px — less than one bare handle (111) plus any tail, so
// names could never render and the sentence always bottomed out to a count
// that merely restated the chip. Faces are redundant here (the roster shows
// them); the names are the payload, so at 320 the names win. That frees 202px,
// which fits "sc_setlist_bassbin6 + 11 more" (166) with room.
function WatcherCrawlLine({ people = WATCHERS, anon = WATCHERS_ANON, watching, nameLimit = 3, onOpen, compact = false }) {
  const list = wr_crowd(people, watching);
  const total = wr_total(people, anon, watching);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 8 : 9, minWidth: 0 }}>
      {!compact && <AvatarStack people={list} extra={Math.max(0, total - Math.min(list.length, 3))} size={26} max={3}/>}
      <span style={{ flex: 1, minWidth: 0, display: "flex" }}>
        <WatcherWord people={people} anon={anon} watching={watching} nameLimit={nameLimit} size={compact ? 11.5 : 12}/>
      </span>
      <button type="button" onClick={onOpen} aria-label={`See all ${total} ${total === 1 ? "watcher" : "watchers"}`} style={{
        all: "unset", boxSizing: "border-box", cursor: "pointer", position: "relative", flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
        height: 26, width: compact ? 26 : "auto", padding: compact ? 0 : "0 9px",
        borderRadius: 999, border: "1px solid var(--border-strong)", background: "var(--surface-2)",
        color: "var(--fg)", fontFamily: WR_MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em",
      }}>
        {compact
          ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.2 2.2L8.4 6l-4.2 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : `All ${total}`}
        <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%,-50%)" }}/>
      </button>
    </div>
  );
}

function CrawlRow({ person }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0" }}>
      <Avatar handle={person.handle} size={30} ring={false}/>
      <span style={{ minWidth: 0, fontFamily: WR_UI, fontSize: 13.5, fontWeight: 700, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {person.handle}
      </span>
      {person.you && (
        <span style={{
          fontFamily: WR_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--accent)", flexShrink: 0,
          border: "1px solid color-mix(in oklch, var(--accent) 45%, transparent)",
          borderRadius: 4, padding: "1px 5px",
        }}>You</span>
      )}
    </div>
  );
}

// Overlay content. The shell (sheet vs popover, close, trap) is CCOverlay's.
function WatcherRoster({ people = WATCHERS, anon = WATCHERS_ANON, watching }) {
  const list = wr_crowd(people, watching);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {list.map((p) => <CrawlRow key={p.handle} person={p}/>)}
      {anon > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0 2px", marginTop: 5, borderTop: "1px solid var(--border)" }}>
          <span aria-hidden="true" style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "1.5px dashed var(--border-strong)", color: "var(--fg-subtle)",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor" }}/>
          </span>
          <span style={{ fontFamily: WR_UI, fontSize: 12.5, color: "var(--fg-subtle)" }}>
            {anon} more watching, no handle yet
          </span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  AvatarStack, Avatar, WatcherWord, CrawlRow, WatcherRoster, WatcherCrawlLine,
  rosterSummary, wr_crowd, wr_total, WATCHERS, WATCHERS_ANON, VIEWER,
});
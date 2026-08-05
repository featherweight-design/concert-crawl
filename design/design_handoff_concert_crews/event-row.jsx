// event-row.jsx — ONE event row, three surface configurations.
//
// Replaces: the Browse/Venue row and `WatchingItem` (design_handoff_watching).
// Those drifted into two dialects of the same object — same show, different
// price rendering, different truncation, different action, different chips.
//
// ── The contract ────────────────────────────────────────────────────
//
//  ┌────┬──────────────────────────────┬──────────┬────┐
//  │art │ line 1  artist               │  price   │ ⨯  │
//  │    │ line 2  with support · act   │  delta   │    │
//  │    │ line 3  when · where         │          │    │
//  │    │ line 4  meta (budget)        │          │    │
//  └────┴──────────────────────────────┴──────────┴────┘
//     ↑              ↑                       ↑       ↑
//   fixed        flexes, truncates      right-aligned  fixed
//                                        fixed min    gutter
//
//  LINE 2 is the support billing ("with hellocentral · Jaguar Stevens"). It
//  only exists where discovery matters — Browse and Venue. Watching drops it:
//  you saved the headliner, and the price is the point.
//
//  LINE 3 never repeats what the context already says. The surface declares
//  what it carries; the row drops it. Date is NEVER truncated — venue is.
//    Browse (date group headers)  → "7:00 PM · Mission Ballroom"
//    Watching (Tonight/This week) → "Sat, Oct 3 · 7:00 PM · Mission Ballroom"
//    Venue page (venue is page)   → "Sat, Oct 3 · 7:00 PM"
//
//  LINE 4 has a budget of TWO — dropping to ONE when a support line is
//  present, so a row never exceeds four lines. Each surface declares a
//  priority order; everything past the budget is dropped, not wrapped.
//  Nothing gets a slot by default — it has to displace something.
//    Browse    ["following", "genre"]
//    Watching  ["freshness", "provenance"]
//    Venue     ["following", "genre"]
//
//  RIGHT COLUMN is two slots:
//    price stack   — identical rendering everywhere. `from $` only when the
//                    amount is a floor. Delta only where a saved price exists.
//    action gutter — 36px, present ONLY on surfaces that have an action.
//                    Browse/Venue collapse it: reserving 36px of an empty box
//                    at 320 was costing the title column a third of its width,
//                    and no user ever sees two surfaces side by side. Price
//                    edges align WITHIN a surface, which is what actually reads.
//
//  NARROW (≤360) shrinks art 56→44, gap 14→10, title 15.5→14.5, meta 11.5→11,
//  price min 78→56. Without it the fixed columns eat 212 of 292px and every
//  line truncates at once.
//
//  LINE 3 CLIPS AT THE COLUMN EDGE. Everything on it except the venue is
//  flexShrink:0, so on the tightest geometry (watching + narrow + carded, where
//  the card inset and the 36px gutter leave the title column ≈100px) the fixed
//  date/time pair is wider than the column and the venue's ellipsis can't give
//  back enough. overflow:hidden makes it clip instead of painting over the
//  price stack — which would be the inverse of the bug this row exists to fix.
//
//  WATCHING STATE is not a row object. On Watching every row is watched, so
//  showing it is noise. On Browse it's a corner tick on the identity art —
//  no width, no slot, no fifth pill.
//
// Exports: EventRow, EventRowList, SURFACES, RowMetaChip, PriceStack, ROW_SPEC

const ER_UI = "Inter, system-ui, sans-serif";
const ER_MONO = "'JetBrains Mono', ui-monospace, monospace";
// Screen-reader-only text. Used wherever R1 reached for a native title=,
// which the house rules forbid and which is invisible to touch anyway.
const SR_ONLY = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

const SURFACES = {
  browse:   { key: "browse",   label: "Browse",   carries: ["date"],  supports: true,  meta: ["following", "genre"],      action: null },
  watching: { key: "watching", label: "Watching", carries: [],        supports: false, meta: ["freshness", "provenance"], action: "remove" },
  venue:    { key: "venue",    label: "Venue",    carries: ["venue"], supports: true,  meta: ["following", "genre"],      action: null },
  // ── Concert Crews (#1226) — TWO CONFIG ENTRIES, NO COMPONENT CHANGE ──
  // "Adding a fourth surface is a config entry, not a component." Crew presence
  // does not get a fifth pill: it takes PRIORITY over `following` — inside a
  // crew, a friend going outranks an artist you follow — but `following` stays
  // in the list behind it. With a budget of 2, a show with crew presence renders
  // crew + genre; a show without it falls back to following + genre exactly as
  // Browse does. Displaced, never removed.
  crewLens: { key: "crewLens", label: "Browse · crew lens", carries: ["date"], supports: true, meta: ["crew", "following", "genre"], action: null },
  crew:     { key: "crew",     label: "Crew home",          carries: ["date"], supports: true, meta: ["crew", "following", "genre"], action: null },
};

// ── Atoms ───────────────────────────────────────────────────────────
function ErX({ size = 11 }) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
function ErArrow({ dir = "down", size = 9 }) {
  return <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ transform: dir === "up" ? "rotate(180deg)" : "none" }}><path d="M5 1v8M5 9L1.8 5.8M5 9l3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// One meta chip grammar for every kind. Tone is the ONLY thing that varies —
// no per-feature shapes, no per-feature sizes.
// R2: `tone` is the only variable, and there are no native title= tooltips —
// house rule. Where a chip's text doesn't carry the whole meaning, the extra
// context goes in `srText` (screen-reader only), never a hover-only tooltip.
function RowMetaChip({ tone = "neutral", icon, children, srText }) {
  const c = {
    neutral: { fg: "var(--fg-muted)", bd: "var(--border)", bg: "var(--surface-2)" },
    warn:    { fg: "var(--warning)",  bd: "color-mix(in oklch, var(--warning) 42%, transparent)", bg: "color-mix(in oklch, var(--warning) 10%, transparent)" },
    signal:  { fg: "var(--signal)",   bd: "color-mix(in oklch, var(--signal) 42%, transparent)",  bg: "color-mix(in oklch, var(--signal) 9%, transparent)" },
    strong:  { fg: "var(--fg)",       bd: "var(--border-strong)", bg: "var(--surface-3)" },
  }[tone];
  return (
    <span title={undefined} style={{
      display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
      padding: icon ? "2px 7px 2px 5px" : "2px 7px", borderRadius: 5,
      background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
      fontFamily: ER_MONO, fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.5,
      whiteSpace: "nowrap",
    }}>{icon}{children}{srText && <span style={SR_ONLY}>{srText}</span>}</span>
  );
}

// Provenance vocabulary. Keyed to production's `source_category` pgEnum
// (migration 0040) so the row can't invent a fourth dialect for the thing this
// whole pass exists to de-drift. Labels are the ones admin already renders
// (AdminEntry.tsx / adminEntry.trustPill) — a price reads the same in review
// and on the row.
//
//   primary    crawled from the venue's own page. NOT a submission, so it has
//              no source_category and no chip — the absence IS the signal.
//   boxoffice  face value, from the venue. The most authoritative submission.
//   standard   general community submission. Admin calls this "Community".
//   resale     secondary market. Not face value.
//
// Widest label is BOX OFFICE at ~81px (9.5px mono, 0.08em tracking, 16px of
// padding + border) against a 106px meta column on the tightest geometry —
// it fits with headroom, and the chip is nowrap so the space never breaks.
const PROVENANCE = {
  boxoffice: { label: "Box office", tone: "strong", sr: " price — face value from the venue" },
  standard:  { label: "Community",  tone: "signal", sr: " price — submitted by a fan" },
  resale:    { label: "Resale",     tone: "warn",   sr: " price — secondary market, not face value" },
};

// Builds the meta line from the surface's priority order, then hard-slices to
// the budget (2, or 1 when a support line is eating a row line).
function buildMeta(show, surface, budget = 2) {
  const { SpotifyLogo } = window;
  const out = [];
  for (const kind of SURFACES[surface].meta) {
    if (kind === "following" && show.following) {
      out.push(<RowMetaChip key="f" tone="strong" icon={SpotifyLogo ? <SpotifyLogo size={11} radius={2}/> : null}>Following</RowMetaChip>);
    } else if (kind === "crew" && show.crewGoing) {
      // Count, never names — Browse is a scanning surface and names truncate to
      // nonsense at 320. Names are event detail's job (crew-social-rail.jsx).
      out.push(<RowMetaChip key="c" tone="signal" srText={show.crewGoingSr}>{show.crewGoing} going</RowMetaChip>);
    } else if (kind === "genre" && show.genres && show.genres[0]) {
      out.push(<RowMetaChip key="g" tone="neutral">{show.genres[0]}</RowMetaChip>);
    } else if (kind === "freshness" && show.price && r_isStale(show.price.observedAt)) {
      out.push(<RowMetaChip key="s" tone="warn">Stale · {r_relTime(show.price.observedAt)}</RowMetaChip>);
    } else if (kind === "provenance" && show.price && PROVENANCE[show.price.source]) {
      const pv = PROVENANCE[show.price.source];
      out.push(<RowMetaChip key="p" tone={pv.tone} srText={pv.sr}>{pv.label}</RowMetaChip>);
    }
    if (out.length === budget) break;
  }
  return out.slice(0, budget);
}

// ── Price stack — identical on every surface ────────────────────────
// The only cross-surface difference is whether a delta exists to render, and
// that's data (show.saved), not styling.
// R2: sold-out is an explicit EXEMPTION from Rule 2 (the meta budget) — it
// short-circuits the price slot, so it spends no chip budget and suppresses
// both price and delta. Stated here and in the README so it isn't mistaken for
// a chip that happens to win the budget.
function PriceStack({ show, showDelta, size = 16 }) {
  if (show.status === "soldout") {
    return <RowMetaChip tone="warn">Sold out</RowMetaChip>;
  }
  if (show.status === "presale") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
        <span style={{ fontFamily: ER_UI, fontSize: size, fontWeight: 800, color: "var(--fg-subtle)" }}>—</span>
        <span style={{ fontFamily: ER_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>presale</span>
      </div>
    );
  }
  if (!show.price) {
    return <span style={{ fontFamily: ER_MONO, fontSize: 11, letterSpacing: "0.04em", color: "var(--fg-subtle)" }}>tba</span>;
  }
  const d = showDelta && show.saved ? r_delta(show.saved.price, show.price.amount) : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap" }}>
        {show.price.isFloor && (
          <span style={{ fontFamily: ER_MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>from</span>
        )}
        <span style={{
          fontFamily: ER_UI, fontSize: size, fontWeight: 800, letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
          color: d && d.cls === "drop" ? "var(--success)" : "var(--fg)",
        }}>{r_usd(show.price.amount)}</span>
      </span>
      {d && d.cls !== "flat" && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontFamily: ER_MONO, fontSize: 11, fontWeight: 700,
          color: d.cls === "drop" ? "var(--success)" : "var(--fg-muted)",
        }}><ErArrow dir={d.cls === "drop" ? "down" : "up"}/>{d.text}
          <span style={SR_ONLY}>{d.cls === "drop" ? " down" : " up"} from ${show.saved.price} when you saved</span>
        </span>
      )}
      {d && d.cls === "flat" && (
        <span style={{ fontFamily: ER_MONO, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", color: "var(--fg-subtle)" }}>flat</span>
      )}
    </div>
  );
}

// Meta row — renders the budget, then DROPS whole chips that don't fit.
// Overflow-hidden alone sliced chips mid-glyph, which reads as a bug rather
// than a rule. Chips past the fit are kept mounted but taken out of flow so
// the measure pass stays stable.
// LOOP GUARD (re-applied — see README R4). This effect had no dependency array
// upstream, so it re-ran on every render while the ResizeObserver below reset
// the ladder to 0. Dormant when rows sit in a plain block column; a main-thread
// lock the moment they sit in a grid track whose width answers to its content.
// Bounded here so escalation runs at most three times per (row, geometry).
function MetaRow({ children, gap = 5 }) {
  const ref = React.useRef(null);
  const lastW = React.useRef(-1);
  const [fit, setFit] = React.useState(children.length);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      // Only a REAL width change re-measures; without this the observer fires
      // on the reflow the measure pass itself caused.
      if (Math.abs(avail - lastW.current) <= 1 && lastW.current >= 0) return;
      lastW.current = avail;
      let used = 0, n = 0;
      const kids = Array.from(el.children);
      for (let i = 0; i < kids.length; i++) {
        const w = kids[i].getBoundingClientRect().width;
        used += w + (i ? gap : 0);
        if (used <= avail + 0.5) n++; else break;
      }
      setFit((prev) => (prev === n ? prev : n));
    };
    lastW.current = -1;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children.length, gap]);
  return (
    <div ref={ref} style={{ display: "flex", gap, alignItems: "center", marginTop: 2, minWidth: 0, position: "relative" }}>
      {children.map((c, i) => (
        <span key={c.key || i} style={i < fit ? { display: "inline-flex" } : {
          position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none",
        }} aria-hidden={i >= fit ? "true" : undefined}>{c}</span>
      ))}
    </div>
  );
}

// Line 3 — when · where. MEASURED, like MetaRow above and WatcherWord in the
// CTA handoff. R2's first attempt just added overflow:hidden, which turned an
// overlap bug into a truncation bug on the one thing the contract says never
// truncates: the venue is the only shrinkable child, so once it collapsed to
// zero there was nothing left to give and the surplus pushed the TIME past the
// clip edge (and left a dangling "·" behind it).
//
// Degradation ladder, in order:
//   0  full date · time · venue     venue ellipsises under pressure
//   1  short date · time · venue    "Sat, Aug 15" → "Aug 15"
//   2  short date · time            venue AND its separator drop as ONE unit
//   3  short date                   time drops — in a saved list the date
//                                   outranks it. Guarantees the line always
//                                   fits at any width; measured, level 3 does
//                                   not fire at any shipping geometry.
// Date and time never truncate — the date only ever changes format, and units
// leave whole.
//
// The level is derived from MEASUREMENT, not the caller's `narrow` flag.
// Watching at 390 was clipping precisely because the caller didn't pass narrow.
//
// `gap` carries the separator spacing: flex items get their leading/trailing
// white-space trimmed, so literal " · " strings collapse to a bare glyph.
function WhenWhere({ show, showsDate, showsVenue, size }) {
  const ref = React.useRef(null);
  const lastW = React.useRef(-1);
  const [level, setLevel] = React.useState(0);

  React.useLayoutEffect(() => { setLevel(0); }, [show.id, showsDate, showsVenue, size]);
  // LOOP GUARD (re-applied — see README R4). Same defect as MetaRow: unbounded,
  // this re-ran every render while the observer below reset the ladder, and the
  // two traded renders forever. The dep array is the whole fix — escalation now
  // runs at most three times per (row, geometry).
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth + 0.5 && level < 3) setLevel((l) => l + 1);
  }, [level, show.id, showsDate, showsVenue, size]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    lastW.current = el.clientWidth;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // Only a REAL width change restarts the ladder. Without this guard the
      // observer fires on the reflow the ladder itself caused.
      if (Math.abs(w - lastW.current) > 1) { lastW.current = w; setLevel(0); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dateText = level >= 1 ? show.dateLabel.replace(/^[A-Za-z]{3},\s*/, "") : show.dateLabel;
  const withVenue = showsVenue && level < 2;
  const withTime = level < 3;
  const sep = <span aria-hidden="true" style={{ opacity: 0.4, flexShrink: 0 }}>·</span>;

  return (
    <div ref={ref} style={{
      display: "flex", alignItems: "baseline", minWidth: 0, overflow: "hidden", gap: 5,
      fontFamily: ER_MONO, fontSize: size, color: "var(--fg-muted)", letterSpacing: "0.02em",
      whiteSpace: "nowrap",
    }}>
      {showsDate && <span style={{ flexShrink: 0 }}>{dateText}</span>}
      {showsDate && withTime && sep}
      {withTime && <span style={{ flexShrink: 0 }}>{show.showTime}</span>}
      {/* the separator belongs to the venue unit — they drop together */}
      {withVenue && (<>{sep}<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{show.venue}</span></>)}
    </div>
  );
}

// ── The row ─────────────────────────────────────────────────────────
// R2: the row is no longer click-only-on-a-div. The artist name is a real
// anchor — keyboard reachable, right-clickable, and it doesn't nest an
// interactive inside another interactive the way a row-level role="button"
// would (the Watching ⨯ lives in the same row). In production, give the anchor
// a stretched-link ::after so the whole row is clickable; that needs a real
// stylesheet, so the mock leaves it to eng rather than faking it inline.
function EventRow({ show, surface = "browse", density = "cozy", carded, narrow = false, onRemove, href }) {
  const cfg = SURFACES[surface];
  const base = { compact: { art: 44, py: 10, gap: 12, title: 14, meta: 11, price: 15 },
                 cozy:    { art: 56, py: 13, gap: 14, title: 15.5, meta: 11.5, price: 16.5 },
                 roomy:   { art: 64, py: 17, gap: 16, title: 17, meta: 12, price: 18 } }[density];
  const s = narrow ? { ...base, art: Math.min(base.art, 44), gap: 10, title: Math.min(base.title, 14.5), meta: 11 } : base;
  // 56 at narrow, not 62: measured, the level-2 floor ("Aug 15 · 8:00 PM") is
  // 103px against a 100px column on watching + narrow + carded. Six px back
  // here clears it — fix the budget, not the clip. Price content at narrow is
  // "tba" or "$68", so nothing is lost.
  const priceMin = narrow ? 56 : 78;
  const gutter = cfg.action ? 36 : 0;
  const isCarded = carded != null ? carded : surface === "watching";

  // Line 3 — drop what the surface already carries. Date is flexShrink:0.
  const showsDate = !cfg.carries.includes("date");
  const showsVenue = !cfg.carries.includes("venue");
  const supports = cfg.supports && show.supports && show.supports.length ? show.supports : null;
  const metaChips = buildMeta(show, surface, supports ? 1 : 2);
  const watchTick = surface !== "watching" && show.watching;

  // Sold-out dims the ARTWORK, not the row. R1 put opacity on the whole row,
  // which quietly pushed --fg-muted text under AA. State is carried by the
  // Sold out chip in the price slot instead — never by contrast alone.
  const soldOut = show.status === "soldout";

  return (
    <div data-screen-label={`row-${show.id}`} style={{
      display: "grid", gridTemplateColumns: `${s.art}px minmax(0,1fr) auto${gutter ? ` ${gutter}px` : ""}`,
      gap: s.gap, alignItems: "center",
      padding: isCarded ? `${s.py}px ${gutter ? 8 : 12}px ${s.py}px ${narrow ? 10 : 14}px` : `${s.py}px 0`,
      background: isCarded ? "var(--surface-1)" : "transparent",
      border: isCarded ? "1px solid var(--border)" : "none",
      borderRadius: isCarded ? 12 : 0,
      fontFamily: ER_UI,
    }}>
      {/* Identity art — carries the watching tick so it costs no row width */}
      <div style={{ position: "relative", width: s.art, height: s.art, flexShrink: 0 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", opacity: soldOut ? 0.55 : 1 }}>
          <IdentityArt name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}/>
        </div>
        {watchTick && (
          <span role="img" aria-label="You're watching this show" style={{
            position: "absolute", top: -3, right: -3, width: 12, height: 12, borderRadius: 999,
            background: "var(--accent)", border: "2px solid var(--bg)",
          }}/>
        )}
      </div>

      {/* Title block */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{
          fontWeight: 700, fontSize: s.title, letterSpacing: "-0.01em", color: "var(--fg)",
          lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          <a href={href || `#show-${show.id}`} onClick={(e) => e.preventDefault()} style={{
            color: "inherit", textDecoration: "none",
          }}>{show.artist}</a>
        </div>
        {/* support billing — discovery surfaces only */}
        {supports && (
          <div style={{
            display: "flex", alignItems: "baseline", minWidth: 0, gap: 4,
            fontFamily: ER_MONO, fontSize: s.meta, letterSpacing: "0.01em", color: "var(--fg-subtle)",
          }}>
            <span style={{ flexShrink: 0 }}>with</span>
            <span style={{
              minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: "var(--fg-muted)", fontWeight: 700,
            }}>{supports.join(" · ")}</span>
          </div>
        )}
        {/* when · where — measured ladder; see WhenWhere */}
        <WhenWhere show={show} showsDate={showsDate} showsVenue={showsVenue} size={s.meta}/>
        {metaChips.length > 0 && <MetaRow>{metaChips}</MetaRow>}
      </div>

      {/* Price — right-aligned, same rendering everywhere */}
      <div style={{ justifySelf: "end", display: "flex", alignItems: "center", minWidth: priceMin, justifyContent: "flex-end" }}>
        <PriceStack show={show} showDelta={surface === "watching"} size={s.price}/>
      </div>

      {/* Action gutter — only on surfaces that have an action */}
      {gutter > 0 && (
      <div style={{ width: gutter, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {cfg.action === "remove" && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove && onRemove(show.id); }}
            aria-label={`Stop watching ${show.artist}`}
            style={{
              all: "unset", boxSizing: "border-box", cursor: "pointer", position: "relative",
              width: 28, height: 28, borderRadius: 7, color: "var(--fg-subtle)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
            <ErX/>
            <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%,-50%)" }}/>
          </button>
        )}
      </div>
      )}
    </div>
  );
}

// ── List with the surface's own grouping ────────────────────────────
// R2: the "window" grouping is gone. Watching keeps its OWN existing group
// headers (Tonight / This week / month names) from design_handoff_watching —
// this list only ever groups by date, or not at all.
function EventRowList({ shows, surface = "browse", density = "cozy", narrow = false, groupBy, headerTip = false, tipOpen = false, sheetHost }) {
  const data = shows || R_SHOWS;
  const [removed, setRemoved] = React.useState([]);
  const live = data.filter((s) => !removed.includes(s.id));
  const groups = {};
  for (const s of live) {
    const k = groupBy === "date" ? s.dateLabel : "";
    (groups[k] = groups[k] || []).push(s);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: surface === "watching" ? 8 : 0, fontFamily: ER_UI }}>
      {headerTip && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
          <span style={{ fontFamily: ER_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
            {surface === "watching" ? "Watching" : "All Denver shows"}
          </span>
          <CCTip tip="watching-on-browse" surface={sheetHost ? "mobile" : "desktop"} size="sm" placement="bottom" align="start" defaultOpen={tipOpen} sheetHost={sheetHost}/>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
        </div>
      )}
      {Object.entries(groups).map(([k, rows]) => (
        <div key={k || "all"} style={{ display: "flex", flexDirection: "column", gap: surface === "watching" ? 8 : 0 }}>
          {k && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingTop: 12, paddingBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--fg)" }}>{k}</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
            </div>
          )}
          {rows.map((s, i) => (
            <div key={s.id} style={{ borderTop: !k && i > 0 && surface !== "watching" ? "1px solid var(--border)" : "none" }}>
              <EventRow show={s} surface={surface} density={density} narrow={narrow} onRemove={(id) => setRemoved((r) => [...r, id])}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Spec table ──────────────────────────────────────────────────────
const ROW_SPEC = [
  ["art", "56 · 44 at ≤360", "Carries the Watching tick on Browse + Venue — costs no row width. Dims on sold-out; the row's text never does."],
  ["line 1", "artist · 15.5/700 · line-height 1.35", "A real anchor. Truncates first; 1.35 so accents and descenders don't clip."],
  ["line 2", "with {supports} · mono · optional", "Discovery surfaces only. Watching drops it — you saved the headliner."],
  ["line 3", "when · where · measured ladder", "Surface drops what it already carries. Then: venue ellipsises → date drops its weekday → venue and its separator drop as one unit. Date and time never truncate."],
  ["line 4", "budget 2 — 1 with supports", "Measured, and whole chips are DROPPED when they don't fit. Never sliced, never wrapped."],
  ["price", "min-width 78 · 56 at ≤360", "Identical rendering everywhere. `from` only when the amount is a floor. Delta on Watching only."],
  ["gutter", "36 · collapsed when no action", "Browse/Venue reclaim it. Price edges align within a surface — nobody sees two surfaces at once."],
  ["touch", "44 × 44 on the ⨯", "Padded past the 28px paint box."],
];

Object.assign(window, { EventRow, EventRowList, MetaRow, WhenWhere, SURFACES, RowMetaChip, PriceStack, ROW_SPEC, buildMeta });
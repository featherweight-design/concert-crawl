// row-overflow.jsx — the answer to the fifth-line problem. R2 (Aug 14).
//
// A fork of `event-row.jsx` with every change marked `▲`. Nothing in the slot
// contract, Rule 1, Rule 2 or the meta budget moves. Meant to be diffed.
//
// ── The call: there is no fifth line. ───────────────────────────────
//
//   fallback title → NOT ON THE ROW. Full stop, no conditions.
//        It's an artifact of crawl order, not content: the pre-extraction event
//        title, kept on rows processed before supporting-artist extraction
//        shipped, and frequently a restatement of line 1 + line 2 ("Shwayze" +
//        "with Claire Wright" = "Shwayze with Claire Wright"). The crawler
//        already falls the title through into `artist` when it can't resolve
//        one ("BASS BINGO"), so line 1 is ALWAYS the artist and the fallback
//        title has nothing left to add. 16.2 of the 20.7 points close here.
//        It keeps a home on event detail ("listed as …") — not built here.
//
//   tour name → LINE 1's SLACK. Measured, whole-unit, never its own line.
//        `DWLLRS · One of Those Nights Tour` on one line box. It renders only if
//        it fits ENTIRELY after the artist has taken all the width it needs —
//        the artist never truncates to make room for a tour name, and the tour
//        name is never sliced. Same grammar as the meta budget: it earns space
//        that's already there or it doesn't render.
//        Discovery surfaces only. Watching drops it, for the same reason it
//        drops the support billing.
//        Rule 1 corollary — on an ARTIST page the artist line is the page's own
//        title, so the tour name is promoted INTO the title slot and the
//        redundant artist name drops.
//
//   status pill → THE PRICE SLOT. State already has a home there.
//        `soldout` short-circuits the price stack (Rule 2's stated exemption).
//        `cancelled` and `postponed` take the same door: chip instead of price,
//        no chip budget spent, no line.
//        Precedence: cancelled > postponed > soldout > presale > price.
//        This also fixes a live bug — production checks soldout first, so a
//        cancelled-and-sold-out show reads "Sold out".
//
// ── ▲ R2 · the cancelled treatment: three signals, one per channel ──
//  Production strikes the TITLE and leaves the date; the R1 draft here struck
//  the date and left the title. Adopting both would give a cancelled row four
//  simultaneous signals. The ruling:
//     chip      — states it in words (the price slot)
//     dim art   — peripheral, and parity with sold-out
//     ONE strike — on line 3's date · time
//     title     — NOT struck
//  A strike voids a claim that became false. The artist's name didn't become
//  false; the show happening at that date and place did. And line 1 is the
//  wrong host for it three times over: struck link text at 15.5px reads as
//  deleted rather than cancelled; it collides with the ellipsis and the tour
//  clause; and on the artist surface the title slot holds the TOUR NAME, so the
//  production rule would strike "Dreamstate Tour" while the artist is invisible.
//
// ── ▲ R2 · row height is a constant of GEOMETRY, not of content ─────
//  R1 claimed two heights. That was wrong: MetaRow already returns nothing when
//  a row has no chips, so line 4 collapses and Browse heights already vary —
//  worst on exactly the fallback-title population, which has no Spotify match,
//  no following chip and no genre.
//  Collapsing line 4 stays correct (an empty chip line is a hole). What changes
//  is that the ROW reserves its height: ROW_MIN per surface × density × narrow,
//  with the existing alignItems:center distributing the slack, so a sparse row
//  is optically centred instead of sitting above a gap.
//  Result: ONE height per geometry — one constant per outcome for virtualised
//  sizing, and no row content can ever move it again. Cost is ~20–27px of air
//  on the sparsest rows. It does not weaken the case against a fifth line: a
//  fifth line raises the constant for 100% of rows to serve 8%.
//
// Exports: EventRowX, EventRowListX, OVF_SURFACES, TitleLine, PriceStackX, ROW_MIN, OVF_SPEC

const OX_UI = "Inter, system-ui, sans-serif";
const OX_MONO = "'JetBrains Mono', ui-monospace, monospace";
const OX_SR = {
  position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
  overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0,
};

// ▲ `tour` is a per-surface declaration, like `supports`.
const OVF_SURFACES = {
  browse:   { key: "browse",   label: "Browse",   carries: ["date"],   supports: true,  tour: true,  meta: ["following", "genre"],      action: null },
  watching: { key: "watching", label: "Watching", carries: [],         supports: false, tour: false, meta: ["freshness", "provenance"], action: "remove" },
  venue:    { key: "venue",    label: "Venue",    carries: ["venue"],  supports: true,  tour: true,  meta: ["following", "genre"],      action: null },
  // ▲ artist page carries the artist — the tour name takes the title slot, and
  // `following` is redundant on a page about one artist.
  artist:   { key: "artist",   label: "Artist",   carries: ["artist"], supports: true,  tour: true,  meta: ["genre"],                   action: null },
  related:  { key: "related",  label: "Related",  carries: [],         supports: false, tour: true,  meta: ["genre"],                   action: null },
};

// ▲ The row-height constant. Keyed by how many content lines the SURFACE can
// ever show (4 where a support line exists, 3 where it doesn't) — not by what
// this particular row happens to carry. Eng: derive these from type metrics in
// the real stack rather than copying the numbers; the probe in Row Overflow.html
// asserts the outcome (exactly one distinct height per list).
const ROW_MIN = {
  compact: { wide: { 4: 101, 3: 85 },  narrow: { 4: 101, 3: 85 } },
  cozy:    { wide: { 4: 110, 3: 92 },  narrow: { 4: 108, 3: 91 } },
  roomy:   { wide: { 4: 121, 3: 103 }, narrow: { 4: 116, 3: 99 } },
};

// ▲ buildMeta reads the ORIGINAL SURFACES table, which doesn't know about the
// two new surfaces. Same priority walk, reading OVF_SURFACES instead.
// ▲ R3: the genre slot renders a PAIR chip (see genre-pair.jsx) — one object,
// one budget slot, two genres, matched genre first. The budget itself is
// unchanged; a second genre never buys a second slot.
function buildMetaX(show, surface, budget = 2, activeGenre, bucketMembers) {
  const { SpotifyLogo } = window;
  const out = [];
  for (const kind of OVF_SURFACES[surface].meta) {
    if (kind === "following" && show.following) {
      out.push(<RowMetaChip key="f" tone="strong" icon={SpotifyLogo ? <SpotifyLogo size={11} radius={2}/> : null}>Following</RowMetaChip>);
    } else if (kind === "genre" && show.genres && show.genres[0]) {
      out.push(<GenrePairChip key="g" genres={show.genres} activeGenre={activeGenre} bucketMembers={bucketMembers}/>);
    } else if (kind === "freshness" && show.price && r_isStale(show.price.observedAt)) {
      out.push(<RowMetaChip key="s" tone="warn">Stale · {r_relTime(show.price.observedAt)}</RowMetaChip>);
    } else if (kind === "provenance" && show.price && show.price.source !== "primary") {
      const resale = show.price.source === "resale";
      out.push(<RowMetaChip key="p" tone={resale ? "warn" : "signal"}
        srText={resale ? "Resale price from the secondary market, not face value" : "Community price, submitted by a fan"}>{resale ? "Resale" : "Community"}</RowMetaChip>);
    }
    if (out.length === budget) break;
  }
  return out.slice(0, budget);
}

// ── Line 1 ─────────────────────────────────────────────────────────
// ▲ Measured on the same pattern as WhenWhere and MetaRow: render the tour
// clause, and if the TITLE is being clipped as a result, drop the clause whole.
// The check is on the title's own overflow, which is what guarantees "the artist
// never truncates to make room for a tour name" with no width table.
// ▲ R2: the ResizeObserver watches the ROW's title column, not the element whose
// content the fit flag changes — observing the measured node re-fires on its own
// mutation and can loop.
function TitleLine({ show, size, allowTour, promoteTour, href, cancelled }) {
  const ref = React.useRef(null);
  const boxRef = React.useRef(null);
  const [fits, setFits] = React.useState(true);

  const titleText = promoteTour && show.tourName ? show.tourName : show.artist;
  const clause = allowTour && show.tourName && !promoteTour ? show.tourName : null;

  React.useLayoutEffect(() => { setFits(true); }, [show.id, size, clause, titleText]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !clause || !fits) return;
    if (el.scrollWidth > el.clientWidth + 0.5) setFits(false);
  });
  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setFits(true));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
      <div ref={ref} style={{
        minWidth: 0, fontWeight: 700, fontSize: size, letterSpacing: "-0.01em", color: "var(--fg)",
        lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {/* ▲ deliberately NOT struck on cancelled — see the header note. The
            anchor's own text-decoration:none is link styling, not a ruling. */}
        <a href={href || `#show-${show.id}`} onClick={(e) => e.preventDefault()} style={{ color: "inherit", textDecoration: "none" }}>{titleText}</a>
        {promoteTour && show.tourName && <span style={OX_SR}> — {show.artist}</span>}
      </div>
      {clause && fits && (
        <span style={{
          flexShrink: 0, fontFamily: OX_MONO, fontSize: size - 4, fontWeight: 500,
          letterSpacing: "0.01em", color: "var(--fg-subtle)", whiteSpace: "nowrap", lineHeight: 1.35,
        }}><span aria-hidden="true" style={{ opacity: 0.5, marginRight: 6 }}>·</span>{clause}</span>
      )}
    </div>
  );
}

// ── Price slot ─────────────────────────────────────────────────────
// ▲ Two more statuses through the door sold-out already uses. No line, no chip
// budget. Precedence explicit, and cancelled ahead of soldout — production has
// it the other way round, so a cancelled sold-out show currently reads
// "Sold out".
function PriceStackX({ show, showDelta, size = 16 }) {
  // ▲ R3.3 copy pass: these REPLACE the visible label for screen readers, they
  // don't append to it — every shipped row a11y string works that way
  // (EVENT_ROW_COPY.a11y.following, .stalePrice), so the replacing form has to
  // carry the status word itself. No leading em-dash. Ship as a11y.cancelled /
  // a11y.postponed; `srText` here is the prototype's name for `srLabel`.
  if (show.status === "cancelled") {
    return <RowMetaChip tone="warn" srText="This show has been cancelled">Cancelled</RowMetaChip>;
  }
  if (show.status === "postponed") {
    return <RowMetaChip tone="strong" srText="Postponed, new date not announced yet">Postponed</RowMetaChip>;
  }
  return <PriceStack show={show} showDelta={showDelta} size={size}/>;
}

// ── Line 3 ─────────────────────────────────────────────────────────
// ▲ Identical to WhenWhere, plus `strike`: the row's ONE cancelled strike. The
// venue is left alone — it's still where the show would have been, and striking
// a whole line reads as disabled.
function WhenWhereX({ show, showsDate, showsVenue, size, strike }) {
  const ref = React.useRef(null);
  const boxRef = React.useRef(null);
  const [level, setLevel] = React.useState(0);
  React.useLayoutEffect(() => { setLevel(0); }, [show.id, showsDate, showsVenue, size]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.scrollWidth > el.clientWidth + 0.5 && level < 3) setLevel((l) => l + 1);
  });
  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLevel(0));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const dateText = level >= 1 ? show.dateLabel.replace(/^[A-Za-z]{3},\s*/, "") : show.dateLabel;
  const withVenue = showsVenue && level < 2;
  const withTime = level < 3;
  const sep = <span aria-hidden="true" style={{ opacity: 0.4, flexShrink: 0 }}>·</span>;
  const st = strike ? { textDecoration: "line-through", textDecorationThickness: "1px", opacity: 0.8 } : null;

  return (
    <div ref={boxRef} style={{ minWidth: 0 }}>
      <div ref={ref} style={{
        display: "flex", alignItems: "baseline", minWidth: 0, overflow: "hidden", gap: 5,
        fontFamily: OX_MONO, fontSize: size, color: "var(--fg-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap",
      }}>
        {showsDate && <span style={{ flexShrink: 0, ...st }}>{dateText}</span>}
        {showsDate && withTime && <span style={{ flexShrink: 0, ...st }}>{sep}</span>}
        {withTime && <span style={{ flexShrink: 0, ...st }}>{show.showTime}</span>}
        {withVenue && (<>{sep}<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{show.venue}</span></>)}
      </div>
    </div>
  );
}

function OxX({ size = 11 }) {
  return <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

// ▲ R3.1 · MetaRow, plus one step — and it owns the pair's collapse itself.
//
// This component has now broken twice in the same way, so the constraint is
// written out rather than implied.
//
// The pass is inherently multi-render: you cannot know whether a collapsed pair
// fits without rendering it collapsed and measuring. So it MUST be a state
// machine that provably terminates, not an effect that re-measures whenever
// React happens to re-render.
//
//   R3.2 failure — `paired` lived in the parent, so each step made a round trip
//     and the effect's early return left `fit` stale; nothing settled.
//   R3.3 failure — the effect had no dependency array and wrote state on every
//     render, while the ResizeObserver re-armed both pieces of state. A width
//     read sitting on the collapse boundary oscillated forever and locked the
//     main thread. No exception, no console error — just a dead page.
//
// What terminates — TWO ceilings, because one wasn't enough:
//   · a per-MOUNT budget the observer cannot reset. The per-width episode cap
//     below is reset on every genuinely new width, so on its own it bounds
//     nothing across repeated observer fire; with ~90 instances on a page that
//     is a slow lockup waiting for the right jitter. Every state write in this
//     component goes through `spend()`, which decrements the mount budget and
//     refuses once it's gone. Worst case the row keeps the last good answer.
//   · the observer never writes state synchronously — it coalesces to one
//     animation frame, so a burst of notifications costs one re-open, not one
//     per notification.
//
// Beyond that, the machine is SOLVED PER WIDTH and step-capped.
//   · `solved` records the width the current answer belongs to, plus how many
//     writes that width has cost. A new width restarts at step 0; a width we've
//     already spent MAX_STEPS on is left alone, permanently.
//   · every state write increments the step counter, so a given width can cost
//     at most three writes no matter what the measurements say.
//   · the ResizeObserver only re-opens the question when the width actually
//     moves (>1px). Height churn is this box's OWN doing — the whole reason the
//     collapse exists is that it changes the row's height — and reacting to it
//     is the loop.
// Eng: whatever the real implementation looks like, keep those two properties.
// A measure/collapse pass without a step cap is a page-killer, not a glitch.
const META_MAX_STEPS = 3;   // writes allowed per width episode
const META_MAX_TOTAL = 12;  // writes allowed per MOUNT, ever — the observer
                            // cannot reset this, and that is the point

function MetaRowX({ children, gap = 5 }) {
  const ref = React.useRef(null);
  const solved = React.useRef({ w: -1, step: 0 });
  const budget = React.useRef(META_MAX_TOTAL);
  const raf = React.useRef(0);
  const [state, setState] = React.useState({ paired: true, fit: children.length });

  const kids = children.map((c) => (c && c.key === "g" && !state.paired ? React.cloneElement(c, { paired: false }) : c));

  // Every state write goes through here, so the per-mount ceiling is not
  // bypassable by any caller — including the observer.
  const spend = (next) => {
    if (budget.current <= 0) return false;
    budget.current--;
    solved.current.step++;
    setState(next);
    return true;
  };

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || budget.current <= 0) return;
    const avail = el.clientWidth;
    if (!avail) return;

    if (Math.abs(avail - solved.current.w) > 1) {
      solved.current = { w: avail, step: 0 };
      if (!state.paired || state.fit !== children.length) {
        spend({ paired: true, fit: children.length });
        return;
      }
    }
    if (solved.current.step >= META_MAX_STEPS) return;

    const nodes = Array.from(el.children);
    let total = 0, used = 0, n = 0, counting = true;
    for (let i = 0; i < nodes.length; i++) {
      const w = nodes[i].getBoundingClientRect().width + (i ? gap : 0);
      total += w;
      if (counting) {
        used += w;
        if (used <= avail + 0.5) n++; else counting = false;
      }
    }

    const hasPair = children.some((c) => c && c.key === "g");
    // Collapse the pair before dropping any chip; only then settle the fit.
    if (total > avail + 0.5 && state.paired && hasPair) {
      spend((s) => ({ ...s, paired: false }));
      return;
    }
    if (n !== state.fit) spend((s) => ({ ...s, fit: n }));
  });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // Never write state inside the observer callback — coalesce to a frame, so
      // a burst of resize notifications costs one re-open, not one each.
      if (raf.current) return;
      raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        const w = el.clientWidth;
        if (!w || Math.abs(w - solved.current.w) <= 1) return; // height churn is ours
        if (budget.current <= 0) return;
        solved.current = { w: -1, step: 0 };   // a genuinely new width, fresh episode
        spend({ paired: true, fit: children.length });
      });
    });
    ro.observe(el);
    return () => { ro.disconnect(); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [children.length]);

  return (
    <div ref={ref} style={{ display: "flex", gap, alignItems: "center", marginTop: 2, minWidth: 0, position: "relative" }}>
      {kids.map((c, i) => (
        <span key={c.key || i} style={i < state.fit ? { display: "inline-flex" } : {
          position: "absolute", left: 0, top: 0, visibility: "hidden", pointerEvents: "none",
        }} aria-hidden={i >= state.fit ? "true" : undefined}>{c}</span>
      ))}
    </div>
  );
}

// ── The row ────────────────────────────────────────────────────────
function EventRowX({ show, surface = "browse", density = "cozy", carded, narrow = false, onRemove, href, fixedHeight = true, activeGenre, bucketMembers }) {
  const cfg = OVF_SURFACES[surface];
  const base = { compact: { art: 44, py: 10, gap: 12, title: 14, meta: 11, price: 15 },
                 cozy:    { art: 56, py: 13, gap: 14, title: 15.5, meta: 11.5, price: 16.5 },
                 roomy:   { art: 64, py: 17, gap: 16, title: 17, meta: 12, price: 18 } }[density];
  const s = narrow ? { ...base, art: Math.min(base.art, 44), gap: 10, title: Math.min(base.title, 14.5), meta: 11 } : base;
  const priceMin = narrow ? 56 : 78;
  const gutter = cfg.action ? 36 : 0;
  const isCarded = carded != null ? carded : surface === "watching";

  const showsDate = !cfg.carries.includes("date");
  const showsVenue = !cfg.carries.includes("venue");
  const supports = cfg.supports && show.supports && show.supports.length ? show.supports : null;
  const metaChips = buildMetaX(show, surface, supports ? 1 : 2, activeGenre, bucketMembers);
  const watchTick = surface !== "watching" && show.watching;
  // ▲ R3.3 · eng ruling: strike and dim are general-purpose "something's wrong
  // with this show" cues, not per-state encodings. Strike covers cancelled AND
  // postponed; dim covers cancelled, postponed AND sold out. The CHIP is what
  // says which problem it is — so the two cues are deliberately not split
  // further. (This supersedes R2's "postponed keeps its date live".)
  const struck = show.status === "cancelled" || show.status === "postponed";
  const dimArt = struck || show.status === "soldout";
  // ▲ one height per geometry — see the header note. `fixedHeight={false}`
  // exists only so the canvas can show the collapsing-line-4 behaviour it
  // replaces; production always ships it on.
  const minHeight = fixedHeight ? ROW_MIN[density][narrow ? "narrow" : "wide"][cfg.supports ? 4 : 3] : undefined;

  return (
    <div data-screen-label={`row-${show.id}`} style={{
      display: "grid", gridTemplateColumns: `${s.art}px minmax(0,1fr) auto${gutter ? ` ${gutter}px` : ""}`,
      gap: s.gap, alignItems: "center", minHeight,
      padding: isCarded ? `${s.py}px ${gutter ? 8 : 12}px ${s.py}px ${narrow ? 10 : 14}px` : `${s.py}px 0`,
      background: isCarded ? "var(--surface-1)" : "transparent",
      border: isCarded ? "1px solid var(--border)" : "none",
      borderRadius: isCarded ? 12 : 0, fontFamily: OX_UI,
    }}>
      <div style={{ position: "relative", width: s.art, height: s.art, flexShrink: 0 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", opacity: dimArt ? 0.55 : 1 }}>
          <IdentityArt name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}/>
        </div>
        {watchTick && (
          <span role="img" aria-label="You're watching this show" style={{
            position: "absolute", top: -3, right: -3, width: 12, height: 12, borderRadius: 999,
            background: "var(--accent)", border: "2px solid var(--bg)",
          }}/>
        )}
      </div>

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <TitleLine show={show} size={s.title} href={href} cancelled={struck}
          allowTour={cfg.tour} promoteTour={cfg.carries.includes("artist")}/>
        {supports && (
          <div style={{
            display: "flex", alignItems: "baseline", minWidth: 0, gap: 4,
            fontFamily: OX_MONO, fontSize: s.meta, letterSpacing: "0.01em", color: "var(--fg-subtle)",
          }}>
            <span style={{ flexShrink: 0 }}>with</span>
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--fg-muted)", fontWeight: 700 }}>{supports.join(" · ")}</span>
          </div>
        )}
        <WhenWhereX show={show} showsDate={showsDate} showsVenue={showsVenue} size={s.meta} strike={struck}/>
        {metaChips.length > 0 && <MetaRowX>{metaChips}</MetaRowX>}
      </div>

      <div style={{ justifySelf: "end", display: "flex", alignItems: "center", minWidth: priceMin, justifyContent: "flex-end" }}>
        <PriceStackX show={show} showDelta={surface === "watching"} size={s.price}/>
      </div>

      {gutter > 0 && (
      <div style={{ width: gutter, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove && onRemove(show.id); }}
          aria-label={`Stop watching ${show.artist}`}
          style={{
            all: "unset", boxSizing: "border-box", cursor: "pointer", position: "relative",
            width: 28, height: 28, borderRadius: 7, color: "var(--fg-subtle)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
          <OxX/>
          <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%,-50%)" }}/>
        </button>
      </div>
      )}
    </div>
  );
}

function EventRowListX({ shows, surface = "browse", density = "cozy", narrow = false, groupBy, fixedHeight = true, activeGenre }) {
  const data = shows || window.O_MIXED;
  const [removed, setRemoved] = React.useState([]);
  const live = data.filter((s) => !removed.includes(s.id));
  const groups = {};
  for (const s of live) {
    const k = groupBy === "date" ? s.dateLabel : "";
    (groups[k] = groups[k] || []).push(s);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: surface === "watching" ? 8 : 0, fontFamily: OX_UI }}>
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
              <EventRowX show={s} surface={surface} density={density} narrow={narrow} fixedHeight={fixedHeight}
                activeGenre={activeGenre} onRemove={(id) => setRemoved((r) => [...r, id])}/>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const OVF_SPEC = [
  ["tour name", "line 1 clause · mono · title−4 · fg-subtle",
   "Measured, whole-unit. Renders only if the title fits in full first; otherwise dropped. Never wraps, never slices, never gets its own line. Discovery surfaces only."],
  ["", "artist page → promoted to the title slot",
   "Rule 1: the page already says the artist, so the tour name becomes line 1 at title weight and the artist name drops (kept for screen readers)."],
  ["fallback title", "never on the row",
   "No conditions. The crawler already falls the title through into `artist`, so line 1 is always the artist and the fallback string adds nothing. Its home is event detail (“listed as …”)."],
  ["status", "price slot · chip · no budget spent",
   "cancelled > postponed > soldout > presale > price. Same door sold-out already uses. Cancelled ahead of soldout fixes a live bug — a cancelled sold-out show currently reads “Sold out”."],
  ["cancelled", "chip + dim art + ONE strike on date · time",
   "Three signals, one per channel. The title is NOT struck: a strike voids a claim that became false, and the artist's name didn't. Row text contrast is untouched — dimming stays on artwork."],
  ["postponed", "same strike, same dim — different chip",
   "R3.3: strike and dim are general “something's wrong with this show” cues, not per-state encodings. Strike = cancelled + postponed; dim = those two + sold out. The chip says which problem it is."],
  ["genre", "one chip, two genres · FUNK/SOUL",
   "A pair, not a second chip — it costs one budget slot, not two. Under an active Vibe filter the genre that is a MEMBER of the picked bucket leads (never string equality — the filter passes a bucket label). Collapses to the leading genre under width pressure. Cap two."],
  ["height", "ROW_MIN · one constant per geometry",
   "Line 4 still collapses when a row has no chips, but the ROW reserves its height and alignItems:center distributes the slack. One height per surface × density × narrow — no row content can move it."],
];

Object.assign(window, { EventRowX, EventRowListX, buildMetaX, MetaRowX, OVF_SURFACES, TitleLine, PriceStackX, WhenWhereX, ROW_MIN, OVF_SPEC });

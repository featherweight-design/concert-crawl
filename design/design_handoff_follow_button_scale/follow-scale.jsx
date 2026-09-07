// follow-scale.jsx — the revised Follow affordance (R3 · scale + weight pass)
//
// WHAT CHANGED, AND WHY
// R2 shipped ONE object at three sizes (sm 36 · md 44 · full 48), all in the
// same --signal fill. On a 390 screen that put a saturated cyan slab beside
// every artist name — three of them on a 3-act bill, plus a full-width one
// under it. The button stopped reading as an action and started reading as
// the page's subject. The fix is two moves, not one:
//
//   1 · SCALE — two notches down at row level. 36 → 28 visual height.
//   2 · WEIGHT — rows go quiet (outline). The filled --signal pill is now
//       reserved for the artist page's single primary CTA. One filled Follow
//       per screen, maximum.
//
// TAP TARGET IS UNCHANGED. Every quiet button carries an invisible 44px hit
// area via an absolutely-positioned overlay, so the pill shrinks and the
// target doesn't (WCAG 2.5.8 / iOS HIG). The row's own tap target is a
// separate thing and still works.
//
// Tokens only (CLAUDE.md §2). --signal = the follow action. --accent stays
// reserved for Watching a show.

const FS_SIZES = {
  // key      visual h   label   glyph  pad          radius
  badge:    { h: 26, fs: 0,    gl: 12, pad: 0,        r: 999 }, // icon-only, on art
  row:      { h: 28, fs: 12,   gl: 11, pad: "0 10px", r: 8   }, // bill · search · sticky
  rowWide:  { h: 32, fs: 12.5, gl: 11, pad: "0 12px", r: 8   }, // desktop rows
  primary:  { h: 44, fs: 14.5, gl: 14, pad: "0 18px", r: 10  }, // artist page ONLY
};

// The old numbers, kept only so the before/after can render them honestly.
const FS_SIZES_R2 = {
  badge:   { h: 30, fs: 0,  gl: 13, pad: 0,        r: 999 },
  row:     { h: 36, fs: 12.5, gl: 12, pad: "0 12px", r: 10 },
  rowWide: { h: 44, fs: 13.5, gl: 13, pad: "0 14px", r: 10 },
  primary: { h: 48, fs: 15, gl: 13, pad: "0 18px", r: 10 },
};

function fsLocked(tier) { return tier === "free" || tier === "supporter"; }

// ── The button ──────────────────────────────────────────────────
// `tone` is the new axis and the load-bearing part of this pass:
//   quiet   outline, --fg text          → every row, every shelf, sticky bar
//   loud    --signal fill               → artist page hero CTA, and nowhere else
// `state` is unchanged from R2: idle · following · locked · pending.
function CCFollow({
  state = "idle", size = "row", tone = "quiet", iconOnly = false, full = false,
  source, legacy = false, hit = 44, label: labelOverride, onClick,
}) {
  const table = legacy ? FS_SIZES_R2 : FS_SIZES;
  const s = table[size] || table.row;
  const icon = iconOnly || size === "badge";
  const base = {
    all: "unset", boxSizing: "border-box", cursor: "pointer", position: "relative",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: icon ? 0 : 6,
    height: s.h, minHeight: s.h, width: full ? "100%" : undefined,
    minWidth: icon ? s.h : undefined, padding: icon ? 0 : s.pad, borderRadius: s.r,
    fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: s.fs, letterSpacing: "-0.01em",
    whiteSpace: "nowrap", flexShrink: 0,
  };
  const loud = tone === "loud" || legacy;
  const skins = {
    idle: loud
      ? { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)", fontWeight: 800 }
      : { background: "transparent", color: "var(--fg)", border: "1px solid var(--border-strong)" },
    following: loud
      ? { background: "color-mix(in oklab, var(--signal) 14%, transparent)", color: "var(--signal)", border: "1px solid var(--signal)", fontWeight: 800 }
      : { background: "transparent", color: "var(--signal)", border: "1px solid color-mix(in oklab, var(--signal) 55%, transparent)" },
    locked: { background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border-strong)" },
    pending: loud
      ? { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)", opacity: 0.72, fontWeight: 800 }
      : { background: "transparent", color: "var(--fg-muted)", border: "1px solid var(--border-strong)" },
  };
  const label = labelOverride && state !== "pending" ? labelOverride
    : { idle: "Follow", following: "Following", locked: "Follow", pending: "Following…" }[state];
  // `pending` reads as committing, not offering: it takes the check and the
  // pressed state alongside its "Following…" label, so the glyph, the label and
  // the announced state agree.
  const on = state === "following" || state === "pending";
  const glyph = on ? <GlyphCheck size={s.gl} w={2.2}/>
              : state === "locked" ? <GlyphLock size={s.gl}/>
              : <GlyphPlus size={s.gl} w={2.2}/>;
  // Invisible hit expansion — the pill shrank, the target didn't. Symmetric on
  // both axes: a fixed horizontal inset left the icon-only 28px square at 40px
  // wide, missing the target this overlay exists to guarantee. A labelled pill
  // is already wider than `hit`, so there the horizontal growth is only ever
  // the button's own margin.
  const grow = Math.max(0, (hit - s.h) / 2);
  return (
    <button onClick={onClick} aria-pressed={state === "locked" ? undefined : on}
      aria-label={icon ? label : undefined} style={{ ...base, ...skins[state] }}>
      {grow > 0 && <span aria-hidden="true" style={{ position: "absolute", inset: -grow }}/>}
      {glyph}
      {!icon && <span>{label}</span>}
      {!icon && source === "spotify" && state === "following" && <SpotifySlot size={9}/>}
    </button>
  );
}

// ── Badge on art — unchanged in kind, two notches smaller ───────
function CCFollowBadge({ state = "idle", legacy = false }) {
  const d = legacy ? 30 : 26;
  const on = state === "following";
  return (
    <button aria-label={on ? "Following" : "Follow"} aria-pressed={on} style={{
      all: "unset", cursor: "pointer", position: "relative", width: d, height: d, borderRadius: 999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: on ? "var(--signal)" : "var(--scrim)", color: on ? "var(--fg-on-accent)" : "var(--fg)",
      border: `1px solid ${on ? "var(--signal)" : "rgba(255,255,255,0.28)"}`,
      backdropFilter: "blur(6px)",
    }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: -(44 - d) / 2 }}/>
      {state === "locked" ? <GlyphLock size={12}/> : on ? <GlyphCheck size={12} w={2.4}/> : <GlyphPlus size={12} w={2.4}/>}
    </button>
  );
}

// ── Glyphs (verbatim from nf-shared.jsx) ────────────────────────
function GlyphPlus({ size = 13, c = "currentColor", w = 2 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke={c} strokeWidth={w} strokeLinecap="round"/></svg>;
}
function GlyphCheck({ size = 13, c = "currentColor", w = 2 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 7.5l3.2 3.3L12 3.5" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function GlyphLock({ size = 12, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 12 14" fill="none"><rect x="1.2" y="6" width="9.6" height="7" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3.6 6V4.2a2.4 2.4 0 014.8 0V6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function GlyphChevron({ size = 14, c = "currentColor", dir = "right" }) {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${rot}deg)` }}><path d="M6 3.5L10.5 8 6 12.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function GlyphSearch({ size = 14, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke={c} strokeWidth="1.5"/><path d="M10.8 10.8L14.5 14.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function SpotifySlot({ size = 12 }) {
  return <span title="official Spotify asset drops in here" style={{ width: size, height: size, borderRadius: size, flexShrink: 0, display: "inline-block", border: "1px dashed var(--fg-subtle)", opacity: 0.85 }}/>;
}

// ── Type atoms ──────────────────────────────────────────────────
function Mono({ children, color = "var(--fg-subtle)", size = 10, weight = 700, ls = "0.14em", style }) {
  return <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size, fontWeight: weight, letterSpacing: ls, textTransform: "uppercase", color, ...style }}>{children}</div>;
}

function FSArt({ name = "Artist", size = 48, radius, circle = false }) {
  const s = size >= 120 ? "hero" : size >= 56 ? "tile" : "micro";
  return (
    <div aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: circle ? "50%" : (radius != null ? radius : Math.round(size * 0.16)), overflow: "hidden" }}>
      <window.IdentityArt name={name} kind="artist" scale={s} showInitials={s === "hero"}/>
    </div>
  );
}

Object.assign(window, {
  FS_SIZES, FS_SIZES_R2, fsLocked, CCFollow, CCFollowBadge, FSArt, Mono,
  GlyphPlus, GlyphCheck, GlyphLock, GlyphChevron, GlyphSearch, SpotifySlot,
});

// nf-shared.jsx — Native Artist Following · shared atoms
// Token-only (CLAUDE.md §2). --signal = CTA/status. --accent = brand presence
// + Watching a show; Following an artist NEVER uses --accent (that collision
// was settled in design_handoff_spotify_sync R1 §6).

// ── Cluster Path mark ──────────────────────────────────────────
// Verbatim copy of CCMark in browse-home.jsx (source of truth, CLAUDE.md §1).
function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

function NFWordmark({ size = 17 }) {
  return (
    <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: size, color: "var(--fg)", letterSpacing: "-0.02em" }}>
      concert<span style={{ color: "var(--accent)" }}>crawl.</span>
    </span>
  );
}

// ── Identity art ───────────────────────────────────────────────
// Thin wrapper over the SHIPPED <IdentityArt/> (identity-art.jsx, Phase 7.5)
// so every surface here renders the real generative art, not a stand-in.
// Scale follows the shipped ramp: hero ≥120 · tile ≥56 · micro below.
function nfHue(name) {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0) * 7, 0);
  return [280, 200, 340, 160, 30, 220, 310, 180, 50, 260][h % 10];
}
function NFArt({ name = "Artist", size = 48, radius, circle = false, scale, style }) {
  const px = (style && style.height) || size;
  const s = scale || (px >= 120 ? "hero" : px >= 56 ? "tile" : "micro");
  const r = circle ? "50%" : (radius != null ? radius : Math.round(size * 0.16));
  return (
    <div aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: r, overflow: "hidden", ...style }}>
      <window.IdentityArt name={name} kind="artist" scale={s} showInitials={s === "hero"}/>
    </div>
  );
}

// ── Type atoms ─────────────────────────────────────────────────
function Mono({ children, color = "var(--fg-subtle)", size = 10, weight = 700, ls = "0.14em", style }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size, fontWeight: weight,
      letterSpacing: ls, textTransform: "uppercase", color, ...style }}>{children}</div>
  );
}

// ── Buttons ────────────────────────────────────────────────────
function NFPrimary({ children, full = true, dense = false, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer", textAlign: "center",
      width: full ? "100%" : undefined, minHeight: dense ? 40 : 46,
      padding: dense ? "10px 16px" : "13px 20px", borderRadius: 10,
      background: "var(--signal)", color: "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: dense ? 13 : 14.5, letterSpacing: "-0.01em",
      ...style,
    }}>{children}</button>
  );
}
function NFGhost({ children, full = true, dense = false, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer", textAlign: "center",
      width: full ? "100%" : undefined, minHeight: dense ? 40 : 46,
      padding: dense ? "10px 16px" : "13px 20px", borderRadius: 10,
      border: "1px solid var(--border-strong)", color: "var(--fg)", background: "transparent",
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: dense ? 13 : 14, letterSpacing: "-0.01em",
      ...style,
    }}>{children}</button>
  );
}

// ── Glyphs ─────────────────────────────────────────────────────
function GlyphPlus({ size = 13, c = "currentColor", w = 2 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke={c} strokeWidth={w} strokeLinecap="round"/></svg>;
}
function GlyphCheck({ size = 13, c = "currentColor", w = 2 }) {
  return <svg width={size} height={size} viewBox="0 0 14 14" fill="none"><path d="M2 7.5l3.2 3.3L12 3.5" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function GlyphLock({ size = 12, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 12 14" fill="none"><rect x="1.2" y="6" width="9.6" height="7" rx="2" stroke={c} strokeWidth="1.5"/><path d="M3.6 6V4.2a2.4 2.4 0 014.8 0V6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function GlyphBell({ size = 14, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M4 7a4 4 0 118 0c0 3 1.2 4.2 1.2 4.2H2.8S4 10 4 7z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><path d="M6.4 13.2a1.7 1.7 0 003.2 0" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function GlyphEye({ size = 14, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 18 14" fill="none"><path d="M1 7s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><circle cx="9" cy="7" r="2.1" stroke={c} strokeWidth="1.4"/></svg>;
}
function GlyphSearch({ size = 14, c = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke={c} strokeWidth="1.5"/><path d="M10.8 10.8L14.5 14.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function GlyphChevron({ size = 14, c = "currentColor", dir = "right" }) {
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${rot}deg)` }}><path d="M6 3.5L10.5 8 6 12.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// ── Spotify logo placeholder (never a recreated mark) ──────────
// Same contract as spotify-shared.jsx: a neutral slot the official asset
// drops into at integration, always paired with the word "Spotify".
function SpotifySlot({ size = 12 }) {
  return (
    <span title="official Spotify asset drops in here" style={{
      width: size, height: size, borderRadius: size, flexShrink: 0, display: "inline-block",
      border: "1px dashed var(--fg-subtle)", opacity: 0.85,
    }}/>
  );
}
function SourceMark({ source }) {
  if (source !== "spotify") return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--fg-subtle)",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
      <SpotifySlot size={9}/>Spotify
    </span>
  );
}

// ── NFFollow — the one follow affordance ───────────────────────
// EXTENDS the shipped FollowButton in artist-surface.jsx rather than replacing
// it: same Inter 800 / radius 10 / 44–48px geometry, same glyphs, and the same
// two skins for idle and following. `following` is a --signal-tinted button,
// NOT a mono chip — that mismatch (different font, height and weight sitting
// beside Follow) was the R1 defect. It adds two states the shipped button
// doesn't have: locked and pending.
//
//   idle        --signal fill
//   following   color-mix(--signal 14%) + --signal border/text  [shipped]
//   locked      shipped signed-out skin + lock. Never disabled; opens paywall.
//   pending     label swap only, no size change
//
// FOUR states, not five. R2 drew an `unavailable` state for an artist with no
// Denver shows; eng's audit killed it, correctly. Artists aren't a table we
// author — they're a projection off event billing strings, so an artist row
// only exists because a crawl found them on a bill. A zero-show artist can't
// exist, can't appear in search (results are filtered to artists with a
// visible event), and has no page (the detail endpoint 404s). The state that
// IS real and common is "played Denver before, nothing upcoming" — and that
// artist is followable. See NoDatesLine: a meta line, not a button state.
const NF_FOLLOW_SIZES = {
  sm:   { h: 36, pad: "0 12px", fs: 12.5, g: 6, gl: 12 },
  md:   { h: 44, pad: "0 14px", fs: 13.5, g: 7, gl: 13 },
  full: { h: 48, pad: "0 18px", fs: 15, g: 7, gl: 13 },
};

// One gate, everywhere. Supporter sits behind the same paywall as Free per
// packages/entitlements — R2 leaked a live Follow button to Supporter on six
// surfaces by testing `tier === "free"` inline. Never test the tier string
// directly; call this.
function nfLocked(tier) { return tier === "free" || tier === "supporter"; }

function NFFollow({ state = "idle", size = "md", iconOnly = false, full = false, source, onClick }) {
  const s = NF_FOLLOW_SIZES[size] || NF_FOLLOW_SIZES.md;
  // useId, not a counter: a bill can put four of these on one screen, and a
  // colliding id would aim every gate sentence at one node.
  const gateId = `nfgate${React.useId().replace(/:/g, "")}`;
  const base = {
    all: "unset", boxSizing: "border-box", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: s.g,
    height: s.h, minHeight: s.h, width: full ? "100%" : undefined,
    minWidth: iconOnly ? s.h : undefined, padding: iconOnly ? 0 : s.pad, borderRadius: 10,
    fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: s.fs, letterSpacing: "-0.01em",
    whiteSpace: "nowrap", flexShrink: 0,
  };
  const skins = {
    idle:      { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)" },
    following: { background: "color-mix(in oklab, var(--signal) 14%, transparent)", color: "var(--signal)", border: "1px solid var(--signal)" },
    locked:    { background: "transparent", color: "var(--fg)", border: "1px solid var(--border-strong)" },
    pending:   { background: "var(--signal)", color: "var(--fg-on-accent)", border: "1px solid var(--signal)", opacity: 0.72 },
  };
  const label = { idle: "Follow", following: "Following", locked: "Follow", pending: "Following…" }[state];
  const glyph = state === "following" ? <GlyphCheck size={s.gl} w={2.4}/>
              : state === "locked" ? <GlyphLock size={s.gl}/>
              : <GlyphPlus size={s.gl} w={2.4}/>;
  // locked keeps idle's label ("Follow"), so the accessible name alone promises
  // a follow that won't happen. The gate sentence carries "this opens the
  // paywall" — the a11y half of "locked is never inert".
  const locked = state === "locked";
  return (
    <>
      <button onClick={onClick} aria-pressed={locked ? undefined : state === "following"}
        aria-label={iconOnly ? label : undefined}
        aria-describedby={locked ? gateId : undefined} style={{ ...base, ...skins[state] }}>
        {glyph}
        {!iconOnly && <span>{label}</span>}
        {!iconOnly && source === "spotify" && state === "following" && <SpotifySlot size={10}/>}
      </button>
      {/* Visually hidden, NOT `hidden`: the hidden attribute drops a node from
          the a11y tree, so a describedby pointed at it announces nothing. */}
      {locked && (
        <span id={gateId} style={{ position: "absolute", width: 1, height: 1, padding: 0,
          margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          Following artists is a Premium feature. Opens upgrade options.
        </span>
      )}
    </>
  );
}

// ── NoDatesLine — "followable, nothing on the books" ───────────
// The replacement for R2's dead `unavailable` state. An artist with past
// Denver shows and no upcoming date is real, searchable, has a working page,
// and is the CLEAREST case for following: you follow them precisely because
// there is nothing to watch yet. So the button stays a normal live Follow and
// the absence is carried by a muted meta line — the same treatment My shows ▸
// Artists already uses for its "nothing on the books" group.
function NoDatesLine({ size = "row" }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size === "page" ? 10 : 9.5,
      fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>
      No dates announced
    </span>
  );
}

// ── FollowingTag — read-only "you follow them" attribution ─────
// NOT a button and never sits next to one — it lives in the row meta line,
// so it takes RowMetaChip's grammar from the shipped event-row system rather
// than inventing a third chip shape.
function FollowingTag({ source, compact = false }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px",
      borderRadius: 5, border: "1px solid var(--border)", background: "var(--surface-2)",
      fontFamily: "Inter, system-ui", fontSize: compact ? 10.5 : 11, fontWeight: 600,
      color: "var(--fg-muted)", whiteSpace: "nowrap", lineHeight: 1.5 }}>
      <GlyphCheck size={compact ? 9 : 10} w={2.4}/>Following{source === "spotify" && <SpotifySlot size={9}/>}
    </span>
  );
}

// ── Chips ──────────────────────────────────────────────────────
function GenreChip({ children, active = false, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer", minHeight: 36,
      display: "inline-flex", alignItems: "center", gap: 6, padding: "0 13px", borderRadius: 999,
      border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
      background: active ? "var(--signal)" : "transparent",
      color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
      fontFamily: "Inter, system-ui", fontWeight: active ? 800 : 600, fontSize: 13, letterSpacing: "-0.01em",
    }}>{active && <GlyphCheck size={11} w={2.4}/>}{children}</button>
  );
}
function MetaChip({ children, tone = "neutral" }) {
  const c = tone === "signal" ? "var(--signal)" : tone === "warning" ? "var(--warning)" : "var(--fg-subtle)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4,
      border: `1px solid ${tone === "neutral" ? "var(--border)" : c}`, color: c,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
  );
}

// ── Chrome ─────────────────────────────────────────────────────
function NFAppBar({ title, back, action }) {
  if (title) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "58px 16px 12px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
      {back !== false && (
        <div style={{ width: 44, height: 44, marginLeft: -10, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
          <GlyphChevron size={17} dir="left"/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 19, color: "var(--fg)", letterSpacing: "-0.02em" }}>{title}</div>
      {action}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "62px 16px 10px", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CCMark size={28}/><NFWordmark/></div>
      <div style={{ width: 36, height: 36, borderRadius: 18, border: "1.5px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>
        <GlyphSearch size={16}/>
      </div>
    </div>
  );
}

// Mobile tabs — browse · search · watching · me (CLAUDE.md §4a).
function NFTabBar({ active = 0 }) {
  const tabs = [
    { label: "browse", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { label: "search", icon: <GlyphSearch size={18}/> },
    { label: "watching", icon: <GlyphEye size={18}/> },
    { label: "me", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 16.5c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ];
  return (
    <div style={{ height: 52, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center",
      justifyContent: "space-around", background: "var(--bg-elevated)", flexShrink: 0, paddingBottom: 2 }}>
      {tabs.map((t, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: i === active ? "var(--signal)" : "var(--fg-subtle)" }}>
          {t.icon}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: i === active ? 700 : 500, letterSpacing: "0.04em" }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function NFTabs({ tabs, active = 0, count }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }}>
      {tabs.map((t, i) => (
        <div key={t} style={{ padding: "12px 4px 10px", marginRight: 14, display: "flex", alignItems: "center", gap: 6,
          borderBottom: `2px solid ${i === active ? "var(--signal)" : "transparent"}`, marginBottom: -1 }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: i === active ? 800 : 600, fontSize: 14,
            color: i === active ? "var(--fg)" : "var(--fg-subtle)", letterSpacing: "-0.01em" }}>{t}</span>
          {i === active && count != null && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)" }}>{count}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Sheets / overlays ──────────────────────────────────────────
function Scrim() {
  return <div style={{ position: "absolute", inset: 0, background: "var(--scrim)", backdropFilter: "blur(1.5px)" }}/>;
}
function Sheet({ children, height, pad = 20 }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height,
      background: "var(--bg-elevated)", borderTop: "1px solid var(--border-strong)",
      borderRadius: "20px 20px 0 0", padding: pad, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
      <div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--border-strong)", margin: "-6px auto 2px" }}/>
      {children}
    </div>
  );
}
function ScreenShell({ children, pad = 16, gap = 12, scroll = true }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: scroll ? "auto" : "hidden", padding: pad,
      display: "flex", flexDirection: "column", gap }}>{children}</div>
  );
}
function Screen({ children }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>{children}</div>
  );
}

// ── Canvas-only annotation ─────────────────────────────────────
function NFNote({ title, items = [], tone = "a11y" }) {
  const c = tone === "a11y" ? "#2E7D5B" : tone === "warn" ? "#8A5A00" : "#3A5A8A";
  const kicker = tone === "a11y" ? "A11Y" : tone === "warn" ? "FLAG FOR ENG" : "NOTE";
  return (
    <div style={{ width: "100%", background: "#FBFAF6", border: `1px solid ${c}33`, borderLeft: `3px solid ${c}`,
      borderRadius: 8, padding: "14px 15px", fontFamily: "Inter, system-ui" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: c, textTransform: "uppercase" }}>{kicker}</div>
      {title && <div style={{ fontSize: 13.5, fontWeight: 800, color: "#26241E", marginTop: 6, letterSpacing: "-0.01em" }}>{title}</div>}
      <ul style={{ margin: "9px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((it, i) => <li key={i} style={{ fontSize: 12, lineHeight: 1.45, color: "#4A463C", textWrap: "pretty" }}>{it}</li>)}
      </ul>
    </div>
  );
}
function NotePaper({ children }) {
  return <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 4, height: "100%", overflowY: "auto" }}>{children}</div>;
}

// ── Sample data ────────────────────────────────────────────────
const NF_ARTISTS = [
  { name: "Sleep Token", genres: ["metal", "prog"], next: "Fillmore Auditorium · Sep 12", followers: 412 },
  { name: "Amyl and The Sniffers", genres: ["punk", "garage"], next: "Gothic Theatre · Aug 29", followers: 188 },
  { name: "Wednesday", genres: ["shoegaze", "country"], next: "Bluebird Theater · Sep 3", followers: 96 },
  { name: "Militarie Gun", genres: ["punk", "post-hardcore"], next: "Larimer Lounge · Oct 1", followers: 74 },
  { name: "The Beths", genres: ["indie rock"], next: "Ogden Theatre · Nov 8", followers: 233 },
  { name: "Geese", genres: ["indie rock", "art rock"], next: "Marquis Theater · Sep 21", followers: 61 },
  { name: "Jessica Pratt", genres: ["folk"], next: null, followers: 44 },
  { name: "Turnstile", genres: ["hardcore"], next: "Mission Ballroom · Oct 17", followers: 507 },
  { name: "MJ Lenderman", genres: ["americana", "indie rock"], next: "Gothic Theatre · Sep 30", followers: 129 },
  { name: "Been Stellar", genres: ["post-punk"], next: null, followers: 38 },
  { name: "Nourished by Time", genres: ["r&b", "electronic"], next: "Larimer Lounge · Aug 22", followers: 52 },
  { name: "Mannequin Pussy", genres: ["punk", "indie rock"], next: "Bluebird Theater · Oct 9", followers: 141 },
];
const NF_GENRES = ["punk", "indie rock", "metal", "shoegaze", "americana", "hip-hop", "electronic", "jazz", "hardcore", "post-punk", "r&b", "folk"];

Object.assign(window, {
  CCMark, NFWordmark, NFArt, nfHue, Mono, NFPrimary, NFGhost,
  GlyphPlus, GlyphCheck, GlyphLock, GlyphBell, GlyphEye, GlyphSearch, GlyphChevron,
  SpotifySlot, SourceMark, NFFollow, NF_FOLLOW_SIZES, nfLocked, NoDatesLine, FollowingTag, GenreChip, MetaChip,
  NFAppBar, NFTabBar, NFTabs, Scrim, Sheet, Screen, ScreenShell,
  NFNote, NotePaper, NF_ARTISTS, NF_GENRES,
});

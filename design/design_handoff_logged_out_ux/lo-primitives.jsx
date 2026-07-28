// lo-primitives.jsx — #794 Logged-out App UX · shared primitives
// Every color is a token (var(--*)). Frames are token-only too, so an artboard
// reskins wholesale when the ThemeProvider changes.
//
// CCMark below is an inline copy of `CCMark` from browse-home.jsx (the source of
// truth per CLAUDE.md §1). Do not restyle it — sizes only.

function CCMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// Canonical lockup — see AppBar in browse-home.jsx
function Lockup({ mark = 26, size = 17 }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <CCMark size={mark} />
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: size, letterSpacing: "-0.02em", color: "var(--fg)", whiteSpace: "nowrap" }}>
        concert<span style={{ color: "var(--accent)" }}>crawl.</span>
      </span>
    </span>
  );
}

const LO_MONO = "'JetBrains Mono', ui-monospace, monospace";
const LO_UI = "Inter, system-ui, sans-serif";

function Mono({ children, size = 10, color = "var(--fg-subtle)", ls = "0.14em", weight = 700, style }) {
  return (
    <span style={{ fontFamily: LO_MONO, fontSize: size, fontWeight: weight, letterSpacing: ls, textTransform: "uppercase", color, ...style }}>
      {children}
    </span>
  );
}

// ── Icons — the shipping set (lucide-equivalent inline SVG) ───────────────
// Watching is an EYE. There is no heart in this application.
function IconBrowse({ s = 18 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {[4.5, 9, 13.5].map((y) => (
        <line key={y} x1="2" y1={y} x2="16" y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ))}
    </svg>
  );
}
function IconVenues({ s = 18 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 1.5C6.515 1.5 4.5 3.515 4.5 6c0 3.375 4.5 10.5 4.5 10.5S13.5 9.375 13.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconEye({ s = 18, filled = false }) {
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M1 9C1 9 4 3 9 3s8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
function IconPerson({ s = 18 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch({ s = 15 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconChevron({ s = 11, dir = "right" }) {
  const d = { right: "M4 2l4 4-4 4", down: "M2 4l4 4 4-4", left: "M8 2L4 6l4 4" }[dir];
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconArrow({ s = 13 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6h8M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck({ s = 13 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.4L4.6 9 10 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── The anonymous account disc ────────────────────────────────────────────
// Signed-out counterpart to the avatar. Resolved, not loading: a real filled
// disc so the slot reads as *different*, never as broken or pending.
function AnonDisc({ size = 36, ring = false }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      color: "var(--fg-muted)",
      display: "flex", alignItems: "center", justifyContent: "center",
      outline: ring ? "2px solid color-mix(in oklch, var(--signal) 50%, transparent)" : "none",
      outlineOffset: 2,
    }}>
      <IconPerson s={Math.round(size * 0.5)} />
    </span>
  );
}

function InitialDisc({ size = 36, letter = "H", tone = "signal", ring = false }) {
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`,
      color: `var(--${tone})`,
      fontFamily: LO_UI, fontWeight: 800, fontSize: Math.round(size * 0.4),
      display: "flex", alignItems: "center", justifyContent: "center",
      outline: ring ? `2px solid color-mix(in oklch, var(--${tone}) 50%, transparent)` : "none",
      outlineOffset: 2,
    }}>{letter}</span>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
function Btn({ kind = "primary", children, size = "md", full = false, focus = false, style }) {
  const pad = size === "sm" ? "9px 13px" : size === "lg" ? "15px 20px" : "12px 16px";
  const fs = size === "sm" ? 13 : size === "lg" ? 15.5 : 14.5;
  const base = {
    all: "unset", boxSizing: "border-box", cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    fontFamily: LO_UI, fontSize: fs, fontWeight: 800, letterSpacing: "-0.01em",
    padding: pad, borderRadius: 12, minHeight: 44,
    width: full ? "100%" : "auto", textAlign: "center",
    outline: focus ? "2px solid var(--focus)" : "none", outlineOffset: 2,
  };
  const kinds = {
    primary: { background: "var(--signal)", color: "var(--fg-on-accent)", boxShadow: "0 0 18px color-mix(in oklch, var(--signal) 22%, transparent)" },
    outline: { border: "1px solid var(--border-strong)", color: "var(--fg)" },
    quiet: { color: "var(--fg-muted)", fontWeight: 700 },
    link: { color: "var(--signal)", fontWeight: 700, padding: size === "sm" ? "8px 6px" : "10px 6px", textDecoration: "none", borderBottom: "1px solid color-mix(in oklch, var(--signal) 40%, transparent)", borderRadius: 0, minHeight: 44 },
  };
  return <button type="button" style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

// ── Frames ────────────────────────────────────────────────────────────────
// Token-only phone frame — no fake bezel, so 320px reads as 320px.
function Phone({ width = 390, height = 780, children, chromeTime = "9:41" }) {
  return (
    <div style={{
      width, height, position: "relative", overflow: "hidden",
      background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI,
      borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", background: "var(--bg)" }}>
        <Mono size={9} ls="0.1em" color="var(--fg-subtle)">{chromeTime}</Mono>
        <Mono size={9} ls="0.1em" color="var(--fg-subtle)">{width}px</Mono>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

function Desk({ width = 1200, height = 720, children }) {
  return (
    <div style={{
      width, height, position: "relative", overflow: "hidden",
      background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI,
      display: "flex", flexDirection: "column",
    }}>{children}</div>
  );
}

// Annotation strip — used under artboards to carry the a11y/behavior note.
function Note({ children, tone = "var(--fg-muted)" }) {
  return (
    <div style={{
      borderTop: "1px dashed var(--border-strong)", background: "var(--surface-1)",
      padding: "9px 14px", display: "flex", gap: 8, alignItems: "flex-start",
      fontFamily: LO_MONO, fontSize: 10, lineHeight: 1.5, letterSpacing: "0.02em", color: tone,
    }}>{children}</div>
  );
}

// ── Sheet / modal chrome ──────────────────────────────────────────────────
function Scrim({ children }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--scrim)", display: "flex", alignItems: "flex-end", zIndex: 20 }}>{children}</div>
  );
}
function Sheet({ children }) {
  return (
    <div role="dialog" aria-modal="true" style={{
      width: "100%", background: "var(--bg-elevated)",
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      border: "1px solid var(--border)", borderBottom: "none",
      boxShadow: "0 -16px 48px color-mix(in oklch, var(--bg) 70%, transparent)",
      overflow: "hidden",
    }}>
      <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
      </div>
      {children}
    </div>
  );
}
function Modal({ width = 440, children }) {
  return (
    <div role="dialog" aria-modal="true" style={{
      width, background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      borderRadius: 16, overflow: "hidden",
      boxShadow: "0 24px 64px color-mix(in oklch, var(--bg) 75%, transparent)",
    }}>{children}</div>
  );
}

// ── Sample data ───────────────────────────────────────────────────────────
const LO_SHOWS = [
  { artist: "Slow Joy - I Love You So Much I Could Die", venue: "Marquis", date: "Tonight", time: "6:30 PM", price: null, genre: ["indie", "pop"] },
  { artist: "Geese", venue: "Ogden", date: "Tonight", time: "9:00 PM", price: "$25", genre: ["art rock"] },
  { artist: "Amyl and The Sniffers", venue: "Gothic", date: "Tonight", time: "9:00 PM", price: "$28", genre: ["punk", "garage rock"] },
  { artist: "Wednesday", venue: "Mission", date: "Tomorrow", time: "8:00 PM", price: "$30", genre: ["noise rock", "shoegaze"] },
  { artist: "Mannequin Pussy", venue: "Bluebird", date: "Thu, May 7", time: "8:30 PM", price: "$28", genre: ["punk"] },
  { artist: "Bright Eyes", venue: "Red Rocks", date: "Wed, May 6", time: "7:00 PM", price: "$40–$75", genre: ["indie rock"] },
];

// Row artwork: a cheap 4-band reduction of the artist's REAL identity palette.
// `ia_hashName` + `IA_PALETTES` come from the Phase 7.5 engine (identity-art.jsx),
// so a row tile and that artist's poster share the same colours. Production
// should call <IdentityArt scale="tile"/> here — the full generator emits
// hundreds of SVG nodes per tile, which is fine on one hero poster and fatal on
// a canvas holding ninety list rows. The reduction is a prototype concession
// to render cost, not a different palette.
function Art({ artist, size = 56, radius = 10 }) {
  const pals = window.IA_PALETTES;
  if (!pals || !window.ia_hashName) {
    return <div aria-hidden="true" style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, background: "var(--surface-2)" }} />;
  }
  const h = window.ia_hashName(String(artist), "artist") >>> 0;
  const p = pals[(h >>> 8) % pals.length];
  const rot = (h >>> 16) & 3;
  const bands = [p.primary, p.secondary, p.primary, p.secondary];
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden", position: "relative", background: p.bg }}>
      <svg width="100%" height="100%" viewBox="0 0 48 48" preserveAspectRatio="none">
        <g transform={`rotate(${rot * 18} 24 24)`}>
          {bands.map((c, i) => (
            <rect key={i} x={7 + i * 10} y={-14} width={4 + (i % 2) * 2} height={76} fill={c} opacity={i % 2 ? 0.9 : 0.62} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function GenreChip({ children }) {
  return (
    <span style={{
      fontFamily: LO_MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.02em",
      color: "var(--fg-muted)", background: "var(--surface-2)", borderRadius: 6,
      padding: "4px 8px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

// ── Theme swatches ────────────────────────────────────────────────────────
// Matches the shipped picker (design_handoff_theme_picker → ThemeSwatch):
// MiniMark + dot row + ACTIVE eyebrow, a mini gig-card preview, then the
// theme name with its genre/mode label. Nine themes, one token set.
// The literal hexes here are OTHER themes' tokens rendered as a preview —
// the only correct place for literals in this drop.
const LO_THEMES = [
  { key: "electric", label: "Electric", role: "dark", t: { bg:"#070A1A","surface-1":"#11162E","surface-2":"#171D3A", fg:"#E8F3FF","fg-subtle":"#5A6788","fg-muted":"#9AA8C7", border:"#1F2748","border-strong":"#2C3661", signal:"#7AE6FF", accent:"#FF7BD4" } },
  { key: "jade", label: "Jade", role: "dark", t: { bg:"#06201F","surface-1":"#0E3331","surface-2":"#143E3B", fg:"#E6FFF6","fg-subtle":"#557A6F","fg-muted":"#8FBFB0", border:"#1A4A47","border-strong":"#2A5C57", signal:"#1FFFC2", accent:"#9B5CFF" } },
  { key: "light", label: "Light", role: "light", t: { bg:"#FAFCFF","surface-1":"#F2F5FB","surface-2":"#E8EDF6", fg:"#070A1A","fg-subtle":"#8A93B0","fg-muted":"#4A5374", border:"#DCE3F0","border-strong":"#B8C2D6", signal:"#0080A0", accent:"#E0297A" } },
  { key: "pulse", label: "Pulse", role: "EDM", t: { bg:"#050008","surface-1":"#11041B","surface-2":"#1A0828", fg:"#F4ECFF","fg-subtle":"#5F4D7A","fg-muted":"#A38FBF", border:"#250F38","border-strong":"#3D1A58", signal:"#C8FF2E", accent:"#FF2EC8" } },
  { key: "forge", label: "Forge", role: "Metal", t: { bg:"#060403","surface-1":"#171210","surface-2":"#211915", fg:"#ECDCC4","fg-subtle":"#5C5042","fg-muted":"#9A8775", border:"#26201A","border-strong":"#3D3128", signal:"#C8211A", accent:"#ECDCC4" } },
  { key: "bluenote", label: "Blue Note", role: "Jazz", t: { bg:"#0E0A1F","surface-1":"#1C1538","surface-2":"#251D48", fg:"#EFE6F5","fg-subtle":"#685E82","fg-muted":"#A498BD", border:"#33285E","border-strong":"#4A3A82", signal:"#4DA3FF", accent:"#E83A6E" } },
  { key: "drip", label: "Drip", role: "Hip-Hop", t: { bg:"#000000","surface-1":"#111111","surface-2":"#181818", fg:"#F5F5F5","fg-subtle":"#4D4D4D","fg-muted":"#8A8A8A", border:"#1F1F1F","border-strong":"#383838", signal:"#2EFF6B", accent:"#FF7A1A", "accent-2":"#FF2EC8" } },
  { key: "cedar", label: "Cedar", role: "Indie / Folk", t: { bg:"#10201A","surface-1":"#1B342B","surface-2":"#234035", fg:"#EFEAE0","fg-subtle":"#6B7368","fg-muted":"#A8B0A0", border:"#2D4D40","border-strong":"#3F6256", signal:"#D89A8A", accent:"#C8A04A" } },
  { key: "gloss", label: "Gloss", role: "Pop", t: { bg:"#0F0810","surface-1":"#1E1521","surface-2":"#28192F", fg:"#F8EFF5","fg-subtle":"#6E5577","fg-muted":"#B89DC0", border:"#2B1F33","border-strong":"#4A3358", signal:"#FF5BA1", accent:"#C8D4E0" } },
];

function MiniMark({ t, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect width="48" height="48" rx="10" fill={t["surface-2"]} />
      <circle cx="34" cy="14" r="9" fill={t.accent} opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill={t["accent-2"] || t.accent} opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill={t.signal} />
      {[[14,38],[18,34],[22,30],[26,26],[30,22],[34,18],[14,32]].map(([cx, cy], i) =>
        <circle key={i} cx={cx} cy={cy} r="1.6" fill={t.fg} opacity={0.45 + i * 0.07} />
      )}
    </svg>
  );
}

function LOThemeSwatch({ theme, active = false, dense = false }) {
  const t = theme.t;
  return (
    <button type="button" aria-pressed={active} style={{
      all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%",
      display: "flex", flexDirection: "column", gap: dense ? 6 : 8,
      borderRadius: 12, padding: dense ? 8 : 10, background: t.bg,
      border: active ? `1.5px solid ${t.signal}` : `1px solid ${t["border-strong"]}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <MiniMark t={t} size={dense ? 18 : 20} />
        <span style={{ display: "flex", gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: t.signal }} />
          <span style={{ width: 8, height: 8, borderRadius: 4, background: t.accent }} />
          {t["accent-2"] && <span style={{ width: 8, height: 8, borderRadius: 4, background: t["accent-2"] }} />}
        </span>
        {active && (
          <span style={{ marginLeft: "auto", fontFamily: LO_MONO, fontSize: 7.5, fontWeight: 700, color: t.signal, letterSpacing: "0.14em", textTransform: "uppercase" }}>active</span>
        )}
      </div>
      <div style={{ background: t["surface-1"], border: `1px solid ${t.border}`, borderRadius: 8, padding: dense ? "6px 8px" : "8px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontFamily: LO_UI, fontSize: dense ? 10 : 11, fontWeight: 800, color: t.fg, letterSpacing: "-0.01em" }}>Habstrakt</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontFamily: LO_UI, fontSize: dense ? 12 : 13, fontWeight: 900, color: t.signal, letterSpacing: "-0.02em" }}>$35</span>
          <span style={{ fontFamily: LO_MONO, fontSize: 7.5, fontWeight: 700, color: t["fg-subtle"], letterSpacing: "0.10em", textTransform: "uppercase" }}>GA</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: LO_UI, fontSize: dense ? 11.5 : 12.5, fontWeight: 700, color: t.fg, letterSpacing: "-0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{theme.label}</span>
        <span style={{ marginLeft: "auto", fontFamily: LO_MONO, fontSize: 7.5, fontWeight: 600, color: t["fg-muted"], letterSpacing: "0.10em", textTransform: "uppercase", flexShrink: 0 }}>{theme.role}</span>
      </div>
    </button>
  );
}

function ThemeGrid({ activeKey = "electric", dense = false }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: dense ? 7 : 9 }}>
      {LO_THEMES.map((th) => <LOThemeSwatch key={th.key} theme={th} active={th.key === activeKey} dense={dense} />)}
    </div>
  );
}

// ── The Watch eye affordance ──────────────────────────────────────────────
// LOCKED (#794 §3.10 / inherited #781): signed-out renders IDENTICAL pixels to
// signed-in-not-watching. Full strength. No lock glyph, no dimming.
// The honesty lives entirely in the accessible name + aria-haspopup.
function WatchEye({ state = "rest", artist = "this show", signedOut = false, focus = false, size = 44 }) {
  const on = state === "watching";
  // Default only catches undefined; an empty artist string would render
  // "Watch  — sign up…" with a hole in the accessible name.
  const who = artist || "this show";
  const name = signedOut
    ? `Watch ${who} — sign up to start watching`
    : on ? "Watching, click to stop" : "Watch this show";
  return (
    <button type="button"
      aria-label={name}
      {...(signedOut
        ? { "aria-haspopup": "dialog", "aria-expanded": state === "open" }
        : { "aria-pressed": on })}
      style={{
        all: "unset", boxSizing: "border-box", cursor: "pointer",
        width: size, height: size, minWidth: 44, minHeight: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 12, flexShrink: 0,
        border: `1px solid ${on ? "color-mix(in oklch, var(--signal) 55%, transparent)" : "var(--border-strong)"}`,
        background: on ? "color-mix(in oklch, var(--signal) 16%, transparent)" : "transparent",
        color: on ? "var(--signal)" : "var(--fg-muted)",
        outline: focus ? "2px solid var(--focus)" : "none", outlineOffset: 2,
      }}>
      <IconEye s={18} filled={on} />
    </button>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────
// Matches the shipped browse row: identity art · title · mono meta · genre
// chips, then the Watch eye, then the price. Rows are separated by a hairline
// rule — they are not cards.
function EventRow({ show, signedOut = false, eye = true, eyeState = "rest", dim = false, compact = false, divider = true }) {
  const art = compact ? 48 : 56;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: compact ? 11 : 14, alignItems: "center",
      padding: compact ? "10px 2px" : "12px 4px", opacity: dim ? 0.55 : 1,
      borderBottom: divider ? "1px solid var(--border)" : "none",
    }}>
      <Art artist={show.artist} size={art} radius={10} />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: compact ? 3 : 5 }}>
        <span style={{ fontWeight: 700, fontSize: compact ? 14 : 16, letterSpacing: "-0.015em", color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{show.artist}</span>
        <span style={{ fontFamily: LO_MONO, fontSize: compact ? 10.5 : 12, letterSpacing: "0.02em", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {show.venue} · {show.time}
        </span>
        {show.genre && show.genre.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflow: "hidden" }}>
            {show.genre.slice(0, compact ? 1 : 2).map((g) => <GenreChip key={g}>{g}</GenreChip>)}
          </div>
        )}
      </div>
      {eye ? <WatchEye artist={show.artist} signedOut={signedOut} state={eyeState} size={44} /> : <span />}
      <span style={{ fontFamily: LO_MONO, fontSize: compact ? 11.5 : 13, fontWeight: show.price ? 700 : 500, letterSpacing: "0.02em", color: show.price ? "var(--fg)" : "var(--fg-subtle)", minWidth: compact ? 30 : 38, textAlign: "right" }}>
        {show.price || "tba"}
      </span>
    </div>
  );
}

Object.assign(window, {
  CCMark, Lockup, Mono, LO_MONO, LO_UI,
  IconBrowse, IconVenues, IconEye, IconPerson, IconSearch, IconChevron, IconArrow, IconCheck,
  AnonDisc, InitialDisc, Btn, Phone, Desk, Note, Scrim, Sheet, Modal,
  LO_SHOWS, Art, GenreChip, WatchEye, EventRow,
  LO_THEMES, MiniMark, LOThemeSwatch, ThemeGrid,
});

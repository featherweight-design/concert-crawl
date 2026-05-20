// theme-picker.jsx — 9-theme picker design exploration
// Builds on design_handoff_genre_themes/ — the picker UI for the new theme set.
// Two variations: A (hero strip + grid) and B (pure grid, restrained active).
// Mobile carousels included. ThemeSwitcher (floating dev control) aligned to match.

const { useState } = React;

// ─── Token data (inlined so showcase is self-contained) ──────────────

const TP_THEMES = {
  electric: { label: "Electric", mode: "dark", role: "base", t: {
    bg:"#070A1A", "bg-elevated":"#0E1226", "surface-1":"#11162E", "surface-2":"#171D3A",
    fg:"#E8F3FF", "fg-muted":"#9AA8C7", "fg-subtle":"#5A6788", border:"#1F2748",
    "border-strong":"#2C3661", signal:"#7AE6FF", accent:"#FF7BD4",
  }},
  jade: { label: "Jade", mode: "dark", role: "base", t: {
    bg:"#06201F", "bg-elevated":"#0A2A28", "surface-1":"#0E3331", "surface-2":"#143E3B",
    fg:"#E6FFF6", "fg-muted":"#8FBFB0", "fg-subtle":"#557A6F", border:"#1A4A47",
    "border-strong":"#2A5C57", signal:"#1FFFC2", accent:"#9B5CFF",
  }},
  light: { label: "Light", mode: "light", role: "base", t: {
    bg:"#FAFCFF", "bg-elevated":"#FFFFFF", "surface-1":"#F2F5FB", "surface-2":"#E8EDF6",
    fg:"#070A1A", "fg-muted":"#4A5374", "fg-subtle":"#8A93B0", border:"#DCE3F0",
    "border-strong":"#B8C2D6", signal:"#0080A0", accent:"#E0297A",
  }},
  pulse: { label: "Pulse", mode: "dark", role: "EDM", t: {
    bg:"#050008", "bg-elevated":"#0C0314", "surface-1":"#11041B", "surface-2":"#1A0828",
    fg:"#F4ECFF", "fg-muted":"#A38FBF", "fg-subtle":"#5F4D7A", border:"#250F38",
    "border-strong":"#3D1A58", signal:"#C8FF2E", accent:"#FF2EC8",
  }},
  forge: { label: "Forge", mode: "dark", role: "Metal", t: {
    bg:"#060403", "bg-elevated":"#100C0A", "surface-1":"#171210", "surface-2":"#211915",
    fg:"#ECDCC4", "fg-muted":"#9A8775", "fg-subtle":"#5C5042", border:"#26201A",
    "border-strong":"#3D3128", signal:"#C8211A", accent:"#ECDCC4",
  }},
  bluenote: { label: "Blue Note", mode: "dark", role: "Jazz", t: {
    bg:"#0E0A1F", "bg-elevated":"#150F2A", "surface-1":"#1C1538", "surface-2":"#251D48",
    fg:"#EFE6F5", "fg-muted":"#A498BD", "fg-subtle":"#685E82", border:"#33285E",
    "border-strong":"#4A3A82", signal:"#4DA3FF", accent:"#E83A6E",
  }},
  drip: { label: "Drip", mode: "dark", role: "Hip-Hop", t: {
    bg:"#000000", "bg-elevated":"#0A0A0A", "surface-1":"#111111", "surface-2":"#181818",
    fg:"#F5F5F5", "fg-muted":"#8A8A8A", "fg-subtle":"#4D4D4D", border:"#1F1F1F",
    "border-strong":"#383838", signal:"#2EFF6B", accent:"#FF7A1A", "accent-2":"#FF2EC8",
  }},
  cedar: { label: "Cedar", mode: "dark", role: "Indie / Folk", t: {
    bg:"#10201A", "bg-elevated":"#162A22", "surface-1":"#1B342B", "surface-2":"#234035",
    fg:"#EFEAE0", "fg-muted":"#A8B0A0", "fg-subtle":"#6B7368", border:"#2D4D40",
    "border-strong":"#3F6256", signal:"#D89A8A", accent:"#C8A04A",
  }},
  gloss: { label: "Gloss", mode: "dark", role: "Pop", t: {
    bg:"#0F0810", "bg-elevated":"#170F1A", "surface-1":"#1E1521", "surface-2":"#28192F",
    fg:"#F8EFF5", "fg-muted":"#B89DC0", "fg-subtle":"#6E5577", border:"#2B1F33",
    "border-strong":"#4A3358", signal:"#FF5BA1", accent:"#C8D4E0",
  }},
};

const TP_KEYS = ["electric", "jade", "light", "pulse", "forge", "bluenote", "drip", "cedar", "gloss"];

// ─── Mini-Mark ──────────────────────────────────────────────────────
// A tiny stand-in for CCMark — 7-dot cluster path. Theme-aware via tokens.
function MiniMark({ t, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <rect width="48" height="48" rx="10" fill={t["surface-2"]} />
      <circle cx="34" cy="14" r="9" fill={t.accent} opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill={t["accent-2"] || t.accent} opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill={t.signal} />
      {[[14,38],[18,34],[22,30],[26,26],[30,22],[34,18],[14,32]].map(([cx,cy], i) =>
        <circle key={i} cx={cx} cy={cy} r="1.6" fill={t.fg} opacity={0.45 + i*0.07} />
      )}
    </svg>
  );
}

// ─── Theme swatch ──────────────────────────────────────────────────
// Matches the current ThemePickerInline density:
//   dots row + mini gig card + label. Plus a tiny CCMark in the dots row
//   so the wordmark/brand-presence shift between themes reads at a glance.

function ThemeSwatch({ themeKey, active, variant = "A", onClick }) {
  const theme = TP_THEMES[themeKey];
  const t = theme.t;
  const isLight = theme.mode === "light";
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8,
      boxSizing: "border-box", width: "100%",
      borderRadius: 14, padding: 12, background: t.bg,
      border: active
        ? (variant === "A" ? `2px solid ${t.signal}` : `1.5px solid ${t.signal}`)
        : `1px solid ${t["border-strong"]}`,
      boxShadow: active && variant === "A"
        ? `0 0 0 4px color-mix(in oklch, ${t.signal} 16%, transparent)`
        : "none",
      transition: "transform 120ms ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MiniMark t={t} size={22} />
        <span style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: t.signal }} />
          <span style={{ width: 9, height: 9, borderRadius: 5, background: t.accent }} />
          {t["accent-2"] && <span style={{ width: 9, height: 9, borderRadius: 5, background: t["accent-2"] }} />}
        </span>
        {active && (
          <span style={{
            marginLeft: "auto",
            fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700,
            color: t.signal, letterSpacing: "0.14em", textTransform: "uppercase",
          }}>active</span>
        )}
      </div>
      {/* Mini gig card */}
      <div style={{
        background: t["surface-1"], border: `1px solid ${t.border}`,
        borderRadius: 8, padding: "8px 10px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{ fontFamily: "var(--ui)", fontSize: 11, fontWeight: 800, color: t.fg, letterSpacing: "-0.01em" }}>Habstrakt</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 900, color: t.signal, letterSpacing: "-0.02em" }}>$35</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: t["fg-subtle"], letterSpacing: "0.10em", textTransform: "uppercase" }}>GA</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 13, fontWeight: 700, color: t.fg, letterSpacing: "-0.005em" }}>{theme.label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 600, color: t["fg-muted"], letterSpacing: "0.10em", textTransform: "uppercase", marginLeft: "auto" }}>
          {theme.role === "base" ? theme.mode : theme.role}
        </span>
      </div>
    </button>
  );
}

// ─── Variation A: hero strip + 3×3 grid ─────────────────────────────
// Pulls the active theme to a "currently using" row above the grid.
// Strong active state — what you've picked is unmistakable. The grid below
// shows all 9; the active one has a subdued active outline (no glow) since
// the hero already does the announcing.

function VariationA({ value, onChange }) {
  const active = TP_THEMES[value];
  const t = active.t;
  return (
    <div style={{
      background: "var(--bg, #FFFFFF)",
      border: "1px solid var(--border, #DCE3F0)",
      borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 14,
      "--bg": "#F8F6EE", "--border": "#D8D2BF", "--fg": "#1A1815", "--fg-muted": "#6B6557",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.005em" }}>Theme</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--fg-muted)", letterSpacing: "0.10em", textTransform: "uppercase" }}>9 themes · tap to switch</span>
      </div>

      {/* Hero strip: 'currently using' */}
      <div style={{
        display: "grid", gridTemplateColumns: "180px 1fr", gap: 14,
        background: t.bg, borderRadius: 14, padding: 16,
        border: `1px solid ${t["border-strong"]}`,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <MiniMark t={t} size={32} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: t.signal, letterSpacing: "0.16em", textTransform: "uppercase" }}>currently using</div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 20, fontWeight: 800, color: t.fg, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{active.label}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: t["fg-muted"], letterSpacing: "0.10em", textTransform: "uppercase" }}>{active.role === "base" ? active.mode + " · base" : active.role}</div>
        </div>
        {/* Larger gig card preview */}
        <div style={{
          background: t["surface-1"], border: `1px solid ${t.border}`,
          borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: t.signal, letterSpacing: "0.14em", textTransform: "uppercase" }}>Tonight</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: t["fg-subtle"], letterSpacing: "0.10em", textTransform: "uppercase", marginLeft: "auto" }}>El Rey · 9PM</span>
          </div>
          <div style={{ fontFamily: "var(--ui)", fontSize: 18, fontWeight: 900, color: t.fg, letterSpacing: "-0.02em" }}>Habstrakt</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "var(--ui)", fontSize: 22, fontWeight: 900, color: t.signal, letterSpacing: "-0.02em" }}>$35</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: t["fg-subtle"], letterSpacing: "0.10em", textTransform: "uppercase" }}>GA · 21+</span>
            <span style={{
              marginLeft: "auto",
              padding: "4px 10px", background: t.signal, color: t.bg,
              fontFamily: "var(--ui)", fontSize: 11, fontWeight: 800, borderRadius: 6,
            }}>Watch</span>
          </div>
        </div>
      </div>

      {/* 3×3 grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
      }}>
        {TP_KEYS.map(k => (
          <ThemeSwatch key={k} themeKey={k} active={value === k} variant="A" onClick={() => onChange(k)} />
        ))}
      </div>
    </div>
  );
}

// ─── Variation B: pure grid, restrained active ──────────────────────
// No hero strip. Just the grid, 3×3, with a more confident active state
// (thin 1.5px signal border, no glow, "active" eyebrow in the swatch corner).
// Trusts the swatch density to do the work. Lighter, more typographic.

function VariationB({ value, onChange }) {
  return (
    <div style={{
      background: "#F8F6EE", border: "1px solid #D8D2BF",
      borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 800, color: "#1A1815", letterSpacing: "-0.005em" }}>Theme</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#1A1815", letterSpacing: "0.10em", textTransform: "uppercase", padding: "2px 6px", background: "#EBE3CC", borderRadius: 4 }}>
          {TP_THEMES[value].label}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#6B6557", letterSpacing: "0.10em", textTransform: "uppercase" }}>9 themes</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
      }}>
        {TP_KEYS.map(k => (
          <ThemeSwatch key={k} themeKey={k} active={value === k} variant="B" onClick={() => onChange(k)} />
        ))}
      </div>
    </div>
  );
}

// ─── Mobile: horizontal scroll carousel ─────────────────────────────

function MobilePicker({ value, onChange, variant }) {
  return (
    <div style={{
      background: "#F8F6EE", border: "1px solid #D8D2BF",
      borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10,
      width: 360, boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "var(--ui)", fontSize: 14, fontWeight: 800, color: "#1A1815" }}>Theme</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "#6B6557", letterSpacing: "0.10em", textTransform: "uppercase" }}>swipe →</span>
      </div>
      {variant === "A" && (
        <div style={{
          background: TP_THEMES[value].t.bg,
          borderRadius: 12, padding: 12,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <MiniMark t={TP_THEMES[value].t} size={26} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, fontWeight: 700, color: TP_THEMES[value].t.signal, letterSpacing: "0.14em", textTransform: "uppercase" }}>currently using</span>
            <span style={{ fontFamily: "var(--ui)", fontSize: 16, fontWeight: 800, color: TP_THEMES[value].t.fg, letterSpacing: "-0.02em" }}>{TP_THEMES[value].label}</span>
          </div>
        </div>
      )}
      <div style={{
        display: "flex", gap: 10, overflowX: "auto",
        scrollSnapType: "x mandatory", paddingBottom: 6,
        margin: "0 -14px", padding: "0 14px 6px",
      }}>
        {TP_KEYS.map(k => (
          <div key={k} style={{ flex: "0 0 160px", scrollSnapAlign: "start" }}>
            <ThemeSwatch themeKey={k} active={value === k} variant={variant} onClick={() => onChange(k)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Floating ThemeSwitcher (dev/preview control) ───────────────────
// Currently lives in workshop pages as a small floating toggle. Aligned
// to match the picker: a button shows the active theme; click opens a
// 3×3 popover with the same swatches. Same visual language.

function FloatingSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const active = TP_THEMES[value];
  const t = active.t;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", background: t.bg,
        border: `1px solid ${t["border-strong"]}`, borderRadius: 999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
      }}>
        <MiniMark t={t} size={20} />
        <span style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 700, color: t.fg, letterSpacing: "-0.005em" }}>{active.label}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: t["fg-muted"], letterSpacing: "0.10em" }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 10,
          width: 360, padding: 12, background: "#F8F6EE",
          border: "1px solid #D8D2BF", borderRadius: 14,
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {TP_KEYS.map(k => (
            <ThemeSwatch key={k} themeKey={k} active={value === k} variant="B"
              onClick={() => { onChange(k); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User-menu inline row ─────────────────────────────
// The current user menu shows three tiny inline swatches next to "Theme".
// At 9 themes that's no longer feasible inline. Pattern instead:
//   - Row shows MiniMark + active theme label + chevron.
//   - Tap opens the same popover as FloatingSwitcher (3-col grid of full swatches).
// Same swatch component everywhere; user menu becomes a trigger, not a switcher.

function UserMenuRow({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const active = TP_THEMES[value];
  const t = active.t;
  return (
    <div style={{
      width: 320, background: "#0E1226", borderRadius: 12,
      border: "1px solid #1F2748", padding: "4px 0",
      fontFamily: "var(--ui)", position: "relative",
    }}>
      {/* surrounding menu items for context */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F3FF", letterSpacing: "-0.005em" }}>Submitted prices</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, color: "#7AE6FF", letterSpacing: "0.10em", textTransform: "uppercase" }}>1 live</span>
      </div>
      {/* the theme row — the change */}
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer", width: "100%", boxSizing: "border-box",
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        background: open ? "rgba(122,230,255,0.06)" : "transparent",
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F3FF", letterSpacing: "-0.005em" }}>Theme</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <MiniMark t={t} size={18} />
          <span style={{ fontFamily: "var(--ui)", fontSize: 12, fontWeight: 700, color: "#E8F3FF", letterSpacing: "-0.005em" }}>{active.label}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#9AA8C7" }}>{open ? "▾" : "›"}</span>
        </span>
      </button>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #1F2748" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#E8F3FF", letterSpacing: "-0.005em" }}>Settings</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9, color: "#9AA8C7", letterSpacing: "0.06em" }}>⌘ ,</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 10,
          width: 360, padding: 12, background: "#F8F6EE",
          border: "1px solid #D8D2BF", borderRadius: 14,
          boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8,
        }}>
          {TP_KEYS.map(k => (
            <ThemeSwatch key={k} themeKey={k} active={value === k} variant="B"
              onClick={() => { onChange(k); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Showcase ──────────────────────────────────────────────────────

function ThemePickerShowcase() {
  const [a, setA] = useState("drip");
  const [b, setB] = useState("cedar");
  const [mA, setMA] = useState("pulse");
  const [mB, setMB] = useState("gloss");
  const [sw, setSw] = useState("forge");
  const [um, setUm] = useState("bluenote");

  const sectionLabel = {
    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
    letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink)",
  };
  const sectionNote = {
    fontFamily: "var(--hand)", fontSize: 14, marginTop: 2,
    opacity: 0.75, lineHeight: 1.4, color: "var(--ink)", maxWidth: 760,
  };

  return (
    <div style={{ padding: 28, minHeight: "100vh" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Theme Picker · exploration · May 10, 2026
      </div>
      <div style={{ fontFamily: "var(--hand)", fontWeight: 700, fontSize: 28, marginTop: 4, color: "var(--ink)" }}>
        Two takes on the 9-theme picker.
      </div>
      <div style={{ fontFamily: "var(--hand)", fontSize: 14, marginTop: 4, opacity: 0.78, lineHeight: 1.4, maxWidth: 880, color: "var(--ink)" }}>
        Direction locked: user-pick only · Settings → Appearance is source of truth · flat 3×3 grid (no grouping) · current swatch density retained · horizontal-scroll carousel on mobile · floating ThemeSwitcher matches. Two options below differ on <em>active-state</em> treatment — A announces, B trusts the grid.
      </div>

      {/* Variation A · desktop */}
      <div style={{ marginTop: 28 }}>
        <div style={sectionLabel}>Variation A · "Currently using" hero + grid</div>
        <div style={sectionNote}>
          Pulls the active theme into a hero strip above the grid with a larger gig-card preview. The active swatch in the grid below has a softer outline since the hero already announces it. Best when the picker is a destination (you went to Settings on purpose).
        </div>
        <div style={{ marginTop: 14, maxWidth: 720 }}>
          <VariationA value={a} onChange={setA} />
        </div>
      </div>

      {/* Variation B · desktop */}
      <div style={{ marginTop: 36 }}>
        <div style={sectionLabel}>Variation B · pure grid, restrained active</div>
        <div style={sectionNote}>
          No hero. Active theme name shown as a small pill in the header; the swatch wears a 1.5px signal border + 'active' eyebrow. Lighter, more typographic, scans faster. Best when the picker lives inside a longer settings page and shouldn't dominate.
        </div>
        <div style={{ marginTop: 14, maxWidth: 720 }}>
          <VariationB value={b} onChange={setB} />
        </div>
      </div>

      {/* Mobile · both */}
      <div style={{ marginTop: 36 }}>
        <div style={sectionLabel}>Mobile · horizontal scroll carousel</div>
        <div style={sectionNote}>
          9 swatches at full density don't fit on a phone. Horizontal scroll-snap row keeps each swatch readable (160px fixed width, snap-start). Variation A keeps the hero strip pinned above the row; B pins just a label pill. Swipe to browse, tap to apply.
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>A · with hero</div>
            <MobilePicker value={mA} onChange={setMA} variant="A" />
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>B · pill only</div>
            <MobilePicker value={mB} onChange={setMB} variant="B" />
          </div>
        </div>
      </div>

      {/* User menu row */}
      <div style={{ marginTop: 36 }}>
        <div style={sectionLabel}>User menu · inline theme row</div>
        <div style={sectionNote}>
          Current user menu shows three tiny inline swatches. At 9 themes that doesn't scale. Same popover pattern as the floating switcher: row collapses to <strong>MiniMark + active label + chevron</strong>, tap opens the full 3-col picker popover. Same swatch component, three surfaces (Settings, floating dev switcher, user menu) all unified.
        </div>
        <div style={{ marginTop: 14, padding: "24px", background: "#070A1A", border: "1px solid #1F2748", borderRadius: 14, display: "flex", justifyContent: "flex-end" }}>
          <UserMenuRow value={um} onChange={setUm} />
        </div>
      </div>

      {/* Floating switcher */}
      <div style={{ marginTop: 36 }}>
        <div style={sectionLabel}>Floating ThemeSwitcher · dev / preview control</div>
        <div style={sectionNote}>
          The workshop pages have a floating dev toggle for fast theme cycling. Aligned to the picker: small button shows active theme (MiniMark + label + chevron), opening a 3-col popover with the same swatch component. Visually consistent, but compact since it's overlaid on real content.
        </div>
        <div style={{ marginTop: 14, padding: "40px 20px", background: "#F8F6EE", border: "1px solid #D8D2BF", borderRadius: 14, display: "flex", justifyContent: "flex-end" }}>
          <FloatingSwitcher value={sw} onChange={setSw} />
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ marginTop: 36, padding: "16px 18px", border: "1px solid #1A1815", background: "#FFFCEF", borderRadius: 8, maxWidth: 760 }}>
        <div style={sectionLabel}>Recommendation</div>
        <div style={{ fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.55, color: "var(--ink)", marginTop: 8 }}>
          <strong>Ship Variation B</strong> in Settings. The hero strip in A is satisfying but redundant — the swatch itself already shows a gig card preview at high fidelity, and the act of switching is its own confirmation. B's lighter chrome respects that the user is in a long settings page, not a theme-picker product.
          <br/><br/>
          Use the <strong>Variation A hero treatment as a one-time onboarding moment</strong> — after the user first selects a theme (during the 5-step onboarding's "make it yours" step), show the hero strip as a confirmation card before continuing. Then in steady-state Settings, it's the pure grid.
          <br/><br/>
          Floating switcher uses B's swatches in the popover universally.
        </div>
      </div>

      {/* Open questions */}
      <div style={{ marginTop: 24, padding: "14px 16px", border: "1px dashed #1A1815", borderRadius: 8, maxWidth: 760 }}>
        <div style={sectionLabel}>Engineering notes</div>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
          <li>Existing <code>ThemePickerInline</code> in <code>profile-settings-screens.jsx</code> is already a CSS grid (<code>repeat(auto-fill, minmax(96px, 1fr))</code>) — so it wraps on mobile, but at 9 swatches becomes a tall block. Replace the grid wrapper with a <code>@media (max-width: 480px)</code> swap to horizontal scroll-snap.</li>
          <li>Swatch component itself doesn't change — just absorb the optional MiniMark dot row alignment (MiniMark uses <code>--accent-2</code> with fallback so Drip's third color reads here too).</li>
          <li><code>futureSlots</code> prop can be removed — all 9 slots are filled, the system is closed for now.</li>
          <li>Floating <code>ThemeSwitcher</code> in <code>theme-context.jsx</code> is currently a horizontal flex row of buttons — swap to the popover pattern shown above. Same swatch component as the Settings picker.</li>
        </ul>
      </div>
    </div>
  );
}

Object.assign(window, { TP_THEMES, TP_KEYS, ThemeSwatch, VariationA, VariationB, MobilePicker, FloatingSwitcher, UserMenuRow });

ReactDOM.createRoot(document.getElementById("root")).render(<ThemePickerShowcase />);

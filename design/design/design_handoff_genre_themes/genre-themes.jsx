// Genre Themes — additive theme exploration (May 10, 2026)
// Same 25-token vocabulary as electric/jade/light. Add-on, not replacements.
//
// Slots (per Hugh, 2026-05-10):
//   - EDM / Electronic  →  Pulse        (1 option)
//   - Metal             →  Forge        (1 option)
//   - Jazz              →  Blue Note    (1 option)
//   - Hip-Hop           →  Boombox + Chrome  (2 options, explore)
//   - Indie / Folk      →  Pulp + Cedar      (2 options, explore)

const GENRE_THEMES = {
  pulse: {
    label: "Pulse",
    genre: "Electronic · EDM",
    mode: "dark",
    role: "Festival · ultraviolet & acid lime",
    tokens: {
      "bg":            "#050008",
      "bg-elevated":   "#0C0314",
      "surface-1":     "#11041B",
      "surface-2":     "#1A0828",
      "surface-3":     "#250F38",
      "fg":            "#F4ECFF",
      "fg-muted":      "#A38FBF",
      "fg-subtle":     "#5F4D7A",
      "fg-on-accent":  "#050008",
      "border":        "#250F38",
      "border-strong": "#3D1A58",
      "border-focus":  "#C8FF2E",
      "signal":        "#C8FF2E",   // acid lime — the drop
      "signal-muted":  "#8AB320",
      "accent":        "#FF2EC8",   // ultraviolet magenta — the strobe
      "accent-muted":  "#B82091",
      "success":       "#C8FF2E",
      "warning":       "#FFC93E",
      "danger":        "#FF4A6E",
      "focus":         "#C8FF2E",
      "overlay-hover": "rgba(200,255,46,0.10)",
      "overlay-press": "rgba(200,255,46,0.20)",
      "scrim":         "rgba(5,0,8,0.78)",
      "image-tint":    "rgba(36,8,52,0.22)",
    },
  },
  forge: {
    label: "Forge",
    genre: "Metal",
    mode: "dark",
    role: "Headbanger · blood on bone, no mercy",
    tokens: {
      "bg":            "#060403",
      "bg-elevated":   "#100C0A",
      "surface-1":     "#171210",
      "surface-2":     "#211915",
      "surface-3":     "#2E221C",
      "fg":            "#ECDCC4",   // aged bone, slightly warmer
      "fg-muted":      "#9A8775",
      "fg-subtle":     "#5C5042",
      "fg-on-accent":  "#ECDCC4",
      "border":        "#26201A",
      "border-strong": "#3D3128",
      "border-focus":  "#C8211A",
      "signal":        "#C8211A",   // blood red — primary CTA bleeds
      "signal-muted":  "#8A1812",
      "accent":        "#ECDCC4",   // bone — secondary brand presence runs opposite, raw ivory
      "accent-muted":  "#B8AB95",
      "success":       "#A8B547",   // moss
      "warning":       "#E89238",
      "danger":        "#FF2A1A",
      "focus":         "#C8211A",
      "overlay-hover": "rgba(200,33,26,0.10)",
      "overlay-press": "rgba(200,33,26,0.22)",
      "scrim":         "rgba(6,4,3,0.86)",
      "image-tint":    "rgba(6,4,3,0.34)",
    },
  },
  bluenote: {
    label: "Blue Note",
    genre: "Jazz",
    mode: "dark",
    role: "Bitches Brew · indigo, electric blue, crimson",
    tokens: {
      "bg":            "#0E0A1F",   // deep indigo-black
      "bg-elevated":   "#150F2A",
      "surface-1":     "#1C1538",
      "surface-2":     "#251D48",
      "surface-3":     "#33285E",
      "fg":            "#EFE6F5",
      "fg-muted":      "#A498BD",
      "fg-subtle":     "#685E82",
      "fg-on-accent":  "#0E0A1F",
      "border":        "#33285E",
      "border-strong": "#4A3A82",
      "border-focus":  "#4DA3FF",
      "signal":        "#4DA3FF",   // electric blue — the Miles blue, fused
      "signal-muted":  "#2E6FB5",
      "accent":        "#E83A6E",   // electric crimson — the cover's red wave
      "accent-muted":  "#A82550",
      "success":       "#7AC9B0",
      "warning":       "#E88A48",   // muted ember, replaces brass yellow
      "danger":        "#FF4A6E",
      "focus":         "#4DA3FF",
      "overlay-hover": "rgba(77,163,255,0.08)",
      "overlay-press": "rgba(77,163,255,0.18)",
      "scrim":         "rgba(14,10,31,0.76)",
      "image-tint":    "rgba(14,10,31,0.24)",
    },
  },
  drip: {
    label: "Drip",
    genre: "Hip-Hop",
    mode: "dark",
    role: "Iridescent · acid green, 808 orange, hot magenta",
    tokens: {
      "bg":            "#000000",
      "bg-elevated":   "#0A0A0A",
      "surface-1":     "#111111",
      "surface-2":     "#181818",
      "surface-3":     "#222222",
      "fg":            "#F5F5F5",
      "fg-muted":      "#8A8A8A",
      "fg-subtle":     "#4D4D4D",
      "fg-on-accent":  "#000000",
      "border":        "#1F1F1F",
      "border-strong": "#383838",
      "border-focus":  "#2EFF6B",
      "signal":        "#2EFF6B",   // acid green CTA — holds
      "signal-muted":  "#1FB54A",
      "accent":        "#FF7A1A",   // 808 sub-bass orange — brand presence
      "accent-muted":  "#B85412",
      "accent-2":      "#FF2EC8",   // hot magenta — the third, iridescent drip
      "success":       "#2EFF6B",
      "warning":       "#FF7A1A",
      "danger":        "#FF3E5E",
      "focus":         "#2EFF6B",
      "overlay-hover": "rgba(255,46,200,0.10)",   // magenta wash
      "overlay-press": "rgba(255,46,200,0.22)",
      "scrim":         "rgba(0,0,0,0.82)",
      "image-tint":    "rgba(255,46,200,0.14)",   // photos get a faint pink cast
    },
  },
  chrome: {
    label: "Chrome",
    genre: "Hip-Hop · archived",
    mode: "dark",
    role: "Modern · pure black, chrome, acid green",
    tokens: {
      "bg":            "#000000",
      "bg-elevated":   "#0A0A0A",
      "surface-1":     "#111111",
      "surface-2":     "#181818",
      "surface-3":     "#222222",
      "fg":            "#F5F5F5",
      "fg-muted":      "#8A8A8A",
      "fg-subtle":     "#4D4D4D",
      "fg-on-accent":  "#000000",
      "border":        "#1F1F1F",
      "border-strong": "#383838",
      "border-focus":  "#2EFF6B",
      "signal":        "#2EFF6B",   // acid green — the auto-tune drip
      "signal-muted":  "#1FB54A",
      "accent":        "#C8C8C8",   // chrome — secondary brand presence as polished metal
      "accent-muted":  "#8A8A8A",
      "success":       "#2EFF6B",
      "warning":       "#FFD93E",
      "danger":        "#FF3E5E",
      "focus":         "#2EFF6B",
      "overlay-hover": "rgba(255,255,255,0.05)",
      "overlay-press": "rgba(255,255,255,0.12)",
      "scrim":         "rgba(0,0,0,0.82)",
      "image-tint":    "rgba(0,0,0,0.20)",
    },
  },
  pulp: {
    label: "Pulp",
    genre: "Indie / Folk · archived",
    mode: "light",
    role: "Riso · paper, terracotta & sage",
    tokens: {
      "bg":            "#F4EDDC",   // riso paper
      "bg-elevated":   "#FAF5E8",
      "surface-1":     "#EDE3CC",
      "surface-2":     "#E3D6BC",
      "surface-3":     "#D6C7A8",
      "fg":            "#1F1A14",   // ink
      "fg-muted":      "#5A4F3F",
      "fg-subtle":     "#8A7D6A",
      "fg-on-accent":  "#FAF5E8",
      "border":        "#D6C7A8",
      "border-strong": "#A89A7E",
      "border-focus":  "#2A4A38",
      "signal":        "#2A4A38",   // deep sage — primary CTA
      "signal-muted":  "#4D6B5A",
      "accent":        "#C8543A",   // terracotta
      "accent-muted":  "#8A3826",
      "success":       "#2A4A38",
      "warning":       "#B07820",
      "danger":        "#A8321F",
      "focus":         "#2A4A38",
      "overlay-hover": "rgba(31,26,20,0.04)",
      "overlay-press": "rgba(31,26,20,0.08)",
      "scrim":         "rgba(31,26,20,0.40)",
      "image-tint":    "transparent",
    },
  },
  cedar: {
    label: "Cedar",
    genre: "Indie / Folk",
    mode: "dark",
    role: "Pacific fog · forest & dusty rose",
    tokens: {
      "bg":            "#10201A",   // deep forest
      "bg-elevated":   "#162A22",
      "surface-1":     "#1B342B",
      "surface-2":     "#234035",
      "surface-3":     "#2D4D40",
      "fg":            "#EFEAE0",   // fog
      "fg-muted":      "#A8B0A0",
      "fg-subtle":     "#6B7368",
      "fg-on-accent":  "#10201A",
      "border":        "#2D4D40",
      "border-strong": "#3F6256",
      "border-focus":  "#D89A8A",
      "signal":        "#D89A8A",   // dusty rose
      "signal-muted":  "#A26F62",
      "accent":        "#C8A04A",   // dry grass / cedar bark amber
      "accent-muted":  "#8A6E2E",
      "success":       "#9BC9A8",
      "warning":       "#E8C36E",
      "danger":        "#D8736E",
      "focus":         "#D89A8A",
      "overlay-hover": "rgba(216,154,138,0.08)",
      "overlay-press": "rgba(216,154,138,0.16)",
      "scrim":         "rgba(16,32,26,0.74)",
      "image-tint":    "rgba(16,32,26,0.20)",
    },
  },
  gloss: {
    label: "Gloss",
    genre: "Pop",
    mode: "dark",
    role: "K-pop teaser · bubblegum & chrome",
    tokens: {
      "bg":            "#0F0810",   // gloss black, faintest violet undertone
      "bg-elevated":   "#170F1A",
      "surface-1":     "#1E1521",
      "surface-2":     "#28192F",
      "surface-3":     "#341F3B",
      "fg":            "#F8EFF5",   // pearl with pink cast
      "fg-muted":      "#B89DC0",
      "fg-subtle":     "#6E5577",
      "fg-on-accent":  "#0F0810",
      "border":        "#2B1F33",
      "border-strong": "#4A3358",
      "border-focus":  "#FF5BA1",
      "signal":        "#FF5BA1",   // bubblegum pink — CTAs, the action color
      "signal-muted":  "#B83870",
      "accent":        "#C8D4E0",   // chrome silver — holographic gleam, brand presence
      "accent-muted":  "#8A98A8",
      "success":       "#5BFFCB",   // K-pop mint
      "warning":       "#FFB84A",
      "danger":        "#FF4870",
      "focus":         "#FF5BA1",
      "overlay-hover": "rgba(255,91,161,0.10)",
      "overlay-press": "rgba(255,91,161,0.22)",
      "scrim":         "rgba(15,8,16,0.80)",
      "image-tint":    "rgba(255,91,161,0.10)",
    },
  },
};

const GENRE_KEYS = ["pulse", "forge", "bluenote", "drip", "cedar", "gloss"];
const ARCHIVED_KEYS = ["chrome", "pulp"];

// ============================================================
// ThemeScope — applies tokens to a subtree
// ============================================================
function GTScope({ theme, children, style }) {
  const tokens = GENRE_THEMES[theme].tokens;
  const vars = {};
  for (const [k, v] of Object.entries(tokens)) vars[`--${k}`] = v;
  return (
    <div data-genre-theme={theme} style={{ ...vars, color: "var(--fg)", background: "var(--bg)", ...style }}>
      {children}
    </div>
  );
}

// ============================================================
// CCMark (theme-aware) — verbatim from browse-home.jsx, color via tokens
// ============================================================
function CCMarkThemed({ size = 96 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent-2, var(--accent))" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ============================================================
// Tokenized Browse — same as theming-workshop, kept identical
// ============================================================
function GTBrowse() {
  const events = [
    { act: "Big Thief",         venue: "Bluebird Theater",  time: "8:00p", price: "$35" },
    { act: "Mannequin Pussy",   venue: "Hi-Dive",           time: "9:00p", price: "$22" },
    { act: "Wednesday",         venue: "Gothic",            time: "8:30p", price: "$28" },
    { act: "Geese",             venue: "Mission Ballroom",  time: "8:00p", price: "$45" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            <CCMarkThemed size={28} />
          </div>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            concert<span style={{ color: "var(--accent)" }}>crawl</span><span style={{ color: "var(--accent-2, var(--accent))" }}>.</span>
          </span>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 16, border: "1px solid var(--border-strong)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)",
          fontFamily: "var(--mono)", fontSize: 12,
        }}>⌕</div>
      </div>

      <div style={{ padding: "14px 18px 10px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Denver · this week
        </div>
        <div style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 26, color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 4 }}>
          What's on?
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 18px 12px", flexWrap: "wrap" }}>
        <GTChip active>this week</GTChip>
        <GTChip>any venue</GTChip>
        <GTChip>any price</GTChip>
        <GTChip>+ filter</GTChip>
      </div>

      <div style={{ padding: "4px 18px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13, color: "var(--accent)", letterSpacing: "0.06em" }}>TONIGHT</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>Sat · Apr 25</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.slice(0, 2).map((e, i) => <GTRow key={i} {...e} featured={i === 0} />)}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13, color: "var(--fg)", letterSpacing: "0.06em" }}>TOMORROW</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>Sun · Apr 26</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.slice(2).map((e, i) => <GTRow key={i} {...e} />)}
        </div>
      </div>

      <div style={{
        height: 52, borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        background: "var(--bg-elevated)",
      }}>
        {[
          { l: "browse", active: true },
          { l: "search" }, { l: "saved" }, { l: "me" },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              border: `1.4px solid ${t.active ? "var(--signal)" : "var(--fg-subtle)"}`,
            }} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 9,
              color: t.active ? "var(--signal)" : "var(--fg-subtle)",
              fontWeight: t.active ? 700 : 500,
            }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GTRow({ act, venue, time, price, featured = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: 10,
      background: featured ? "var(--surface-2)" : "var(--surface-1)",
      border: `1px solid ${featured ? "var(--border-strong)" : "var(--border)"}`,
      borderRadius: 6, position: "relative",
    }}>
      {featured && (
        <div style={{
          position: "absolute", top: -1, left: 12, padding: "2px 6px",
          background: "var(--accent)", color: "var(--fg-on-accent)",
          fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.08em",
          textTransform: "uppercase", fontWeight: 700, transform: "translateY(-50%)",
          borderRadius: 3, whiteSpace: "nowrap",
        }}>★ pick</div>
      )}
      <div style={{
        width: 48, height: 48, borderRadius: 4, flexShrink: 0,
        background: `linear-gradient(135deg, var(--surface-3) 0%, var(--surface-2) 100%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--mono)", fontSize: 8, color: "var(--fg-subtle)", letterSpacing: "0.05em",
        }}>img</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--ui)", fontWeight: 700, fontSize: 14, color: "var(--fg)", letterSpacing: "-0.01em" }}>
          {act}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>{venue}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-subtle)" }}>·</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>{time}</span>
        </div>
      </div>
      <div style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 14, color: "var(--signal)" }}>{price}</div>
    </div>
  );
}

function GTChip({ children, active = false }) {
  return (
    <span style={{
      padding: "5px 10px", borderRadius: 999,
      fontFamily: "var(--ui)", fontWeight: 600, fontSize: 11,
      background: active ? "var(--signal)" : "transparent",
      color: active ? "var(--fg-on-accent)" : "var(--fg-muted)",
      border: `1px solid ${active ? "var(--signal)" : "var(--border-strong)"}`,
      letterSpacing: "-0.005em",
    }}>{children}</span>
  );
}

// ============================================================
// Theme card — frame + label header
// ============================================================
function GTCard({ themeKey, height = 580 }) {
  const t = GENRE_THEMES[themeKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13 }}>{t.label}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.6 }}>{t.mode}</span>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.55, textAlign: "right" }}>{t.genre}</span>
      </div>
      <GTScope theme={themeKey} style={{
        borderRadius: 12, overflow: "hidden",
        border: "1px solid var(--ink)",
        height,
        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
      }}>
        <GTBrowse />
      </GTScope>
      <div style={{ fontFamily: "var(--hand)", fontSize: 13, opacity: 0.72, lineHeight: 1.35 }}>{t.role}</div>
    </div>
  );
}

// ============================================================
// Token table (compact — 7 columns scroll horizontally if needed)
// ============================================================
function GTTokenTable({ themeKeys }) {
  const groups = [
    { title: "Surfaces",  keys: ["bg", "bg-elevated", "surface-1", "surface-2", "surface-3"] },
    { title: "Text & icons", keys: ["fg", "fg-muted", "fg-subtle", "fg-on-accent"] },
    { title: "Borders",   keys: ["border", "border-strong", "border-focus"] },
    { title: "Brand",     keys: ["signal", "signal-muted", "accent", "accent-muted"] },
    { title: "States",    keys: ["success", "warning", "danger"] },
    { title: "Misc",      keys: ["focus", "overlay-hover", "overlay-press", "scrim", "image-tint"] },
  ];
  const colCount = themeKeys.length;
  const gridTemplate = `160px repeat(${colCount}, minmax(140px, 1fr))`;
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--paper)", overflowX: "auto" }}>
      <div style={{ minWidth: 160 + colCount * 140 }}>
        <div style={{ display: "grid", gridTemplateColumns: gridTemplate, borderBottom: "1px solid var(--ink)" }}>
          <div style={{ padding: "10px 12px", borderRight: "1px solid var(--ink)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>token</div>
          {themeKeys.map((k, i) => (
            <div key={k} style={{
              padding: "10px 12px",
              borderRight: i < themeKeys.length - 1 ? "1px solid var(--ink)" : "none",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 12 }}>{GENRE_THEMES[k].label}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 8, opacity: 0.6 }}>
                {GENRE_THEMES[k].mode}
              </span>
            </div>
          ))}
        </div>
        {groups.map((g, gi) => (
          <React.Fragment key={g.title}>
            <div style={{
              padding: "8px 12px", background: "var(--paper)",
              borderBottom: "1px solid var(--ink)",
              fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", opacity: 0.7,
            }}>{g.title}</div>
            {g.keys.map((tk, ti) => (
              <div key={tk} style={{
                display: "grid", gridTemplateColumns: gridTemplate,
                borderBottom: ti === g.keys.length - 1 && gi === groups.length - 1 ? "none" : "1px solid var(--ink)",
              }}>
                <div style={{
                  padding: "8px 12px", borderRight: "1px solid var(--ink)",
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink)",
                  display: "flex", alignItems: "center",
                }}>{tk}</div>
                {themeKeys.map((k, i) => (
                  <GTTokenCell key={k} theme={k} token={tk} last={i === themeKeys.length - 1} />
                ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function GTTokenCell({ theme, token, last }) {
  const v = GENRE_THEMES[theme].tokens[token];
  const isTransparent = v === "transparent" || v.startsWith("rgba");
  return (
    <div style={{
      padding: "6px 10px", borderRight: last ? "none" : "1px solid var(--ink)",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <div style={{
        width: 20, height: 20, flexShrink: 0,
        background: isTransparent
          ? `repeating-linear-gradient(45deg, #ddd 0 4px, #fff 4px 8px)`
          : v,
        border: "1px solid var(--ink)", borderRadius: 3,
        position: "relative", overflow: "hidden",
      }}>
        {isTransparent && (
          <div style={{ position: "absolute", inset: 0, background: v }} />
        )}
      </div>
      <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink)", opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {v.length > 16 ? v.slice(0, 14) + "…" : v}
      </span>
    </div>
  );
}

// ============================================================
// Comparison strip — 2-up A/B compare for Hip-Hop & Indie options
// ============================================================
function GTCompareStrip({ title, themeKeys, note }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {title}
      </div>
      {note && (
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7, maxWidth: 760 }}>
          {note}
        </div>
      )}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {themeKeys.map(k => <GTCard key={k} themeKey={k} />)}
      </div>
    </div>
  );
}

// ============================================================
// MAIN LAYOUT
// ============================================================
function GenreThemes() {
  return (
    <div style={{ background: "var(--paper)", padding: 28, minHeight: "100vh" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Genre Themes · approved · May 10, 2026
      </div>
      <div style={{ fontFamily: "var(--hand)", fontWeight: 700, fontSize: 28, marginTop: 4 }}>
        Six themes, ready to ship.
      </div>
      <div style={{ fontFamily: "var(--hand)", fontSize: 14, marginTop: 4, opacity: 0.78, lineHeight: 1.4, maxWidth: 840 }}>
        Pulse · Forge · Blue Note · Drip · Cedar · Gloss. Same 24-token vocabulary as electric/jade/light, plus one optional <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>accent-2</code> token (Drip-only). See <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>README.md</code> + <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>theme-context-additions.jsx</code> for the engineering merge.
      </div>

      {/* Section 1 · the 6 winners */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          The six · approved
        </div>
        <div style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          {GENRE_KEYS.map(k => <GTCard key={k} themeKey={k} />)}
        </div>
      </div>

      {/* Section 2 · Full token table for winners */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Token table · the six
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          24 semantic tokens shared with existing themes, plus <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>accent-2</code> on Drip only.
        </div>
        <div style={{ marginTop: 14 }}>
          <GTTokenTable themeKeys={GENRE_KEYS} />
        </div>
      </div>

      {/* Section 3 · Engineering integration */}
      <div style={{ marginTop: 36, padding: "16px 18px", border: "1px solid var(--ink)", background: "#FFFCEF" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          For engineering · integration
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>
          <li>Merge the 5 entries in <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>theme-context-additions.jsx</code> into <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>CC_THEMES</code> in <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>theme-context.jsx</code>.</li>
          <li>Append the new keys to <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>CC_THEME_KEYS</code>: <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>["electric", "jade", "light", "pulse", "forge", "bluenote", "drip", "cedar"]</code>.</li>
          <li>Two small fallback edits in <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>browse-home.jsx</code> let Drip's third color show up: the wordmark <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>.</code> span and CCMark inner halo both swap to <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>var(--accent-2, var(--accent))</code>. Other themes are unaffected.</li>
          <li>No new components, no new dependencies. Every existing screen reskins automatically.</li>
        </ul>
      </div>

      {/* Section 4 · Archived alternates */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Archived alternates
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          Kept in the file for reference. Not shipping.
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {ARCHIVED_KEYS.map(k => <GTCard key={k} themeKey={k} />)}
        </div>
      </div>
    </div>
  );
}

window.GenreThemes = GenreThemes;

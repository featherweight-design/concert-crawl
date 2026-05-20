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
    role: "Heavy · oxide on black, bone text",
    tokens: {
      "bg":            "#0A0908",
      "bg-elevated":   "#121110",
      "surface-1":     "#181715",
      "surface-2":     "#1F1D1A",
      "surface-3":     "#2A2723",
      "fg":            "#E8DFCE",   // bone
      "fg-muted":      "#9B9080",
      "fg-subtle":     "#5C544A",
      "fg-on-accent":  "#0A0908",
      "border":        "#26221E",
      "border-strong": "#3A342E",
      "border-focus":  "#D14A2A",
      "signal":        "#E8DFCE",   // bone — primary CTA reads as raw ivory
      "signal-muted":  "#A89F8E",
      "accent":        "#D14A2A",   // oxide / rust
      "accent-muted":  "#8A2F1B",
      "success":       "#A8B547",   // moss
      "warning":       "#E8A53A",
      "danger":        "#C8392E",
      "focus":         "#D14A2A",
      "overlay-hover": "rgba(232,223,206,0.05)",
      "overlay-press": "rgba(232,223,206,0.12)",
      "scrim":         "rgba(10,9,8,0.82)",
      "image-tint":    "rgba(10,9,8,0.30)",
    },
  },
  bluenote: {
    label: "Blue Note",
    genre: "Jazz",
    mode: "dark",
    role: "Smoky · midnight, brass, cream",
    tokens: {
      "bg":            "#0E1622",
      "bg-elevated":   "#141E2D",
      "surface-1":     "#1A2638",
      "surface-2":     "#202F44",
      "surface-3":     "#293A53",
      "fg":            "#F2E8D2",   // candle cream
      "fg-muted":      "#A89F88",
      "fg-subtle":     "#6B6553",
      "fg-on-accent":  "#0E1622",
      "border":        "#293A53",
      "border-strong": "#3A4D6B",
      "border-focus":  "#D4A84A",
      "signal":        "#D4A84A",   // brass
      "signal-muted":  "#947638",
      "accent":        "#C8483A",   // velvet red — the sax case interior
      "accent-muted":  "#8A2F26",
      "success":       "#7AB58C",
      "warning":       "#D4A84A",
      "danger":        "#C8483A",
      "focus":         "#D4A84A",
      "overlay-hover": "rgba(212,168,74,0.08)",
      "overlay-press": "rgba(212,168,74,0.16)",
      "scrim":         "rgba(14,22,34,0.74)",
      "image-tint":    "rgba(14,22,34,0.22)",
    },
  },
  boombox: {
    label: "Boombox",
    genre: "Hip-Hop · option A",
    mode: "dark",
    role: "Golden era · charcoal & rope gold",
    tokens: {
      "bg":            "#1A1815",
      "bg-elevated":   "#22201C",
      "surface-1":     "#2A2722",
      "surface-2":     "#332F29",
      "surface-3":     "#403B33",
      "fg":            "#F2E8D5",
      "fg-muted":      "#A89C82",
      "fg-subtle":     "#6B6451",
      "fg-on-accent":  "#1A1815",
      "border":        "#403B33",
      "border-strong": "#5C5446",
      "border-focus":  "#E8B547",
      "signal":        "#E8B547",   // 14k rope chain
      "signal-muted":  "#9E7A2E",
      "accent":        "#C8392E",   // brick red — the spray-paint
      "accent-muted":  "#8A261F",
      "success":       "#A8B547",
      "warning":       "#E8B547",
      "danger":        "#C8392E",
      "focus":         "#E8B547",
      "overlay-hover": "rgba(232,181,71,0.08)",
      "overlay-press": "rgba(232,181,71,0.16)",
      "scrim":         "rgba(26,24,21,0.78)",
      "image-tint":    "rgba(26,24,21,0.24)",
    },
  },
  chrome: {
    label: "Chrome",
    genre: "Hip-Hop · option B",
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
    genre: "Indie / Folk · option A",
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
    genre: "Indie / Folk · option B",
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
};

const GENRE_KEYS = Object.keys(GENRE_THEMES);
const HIPHOP_KEYS = ["boombox", "chrome"];
const INDIE_KEYS = ["pulp", "cedar"];

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
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
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
            concert<span style={{ color: "var(--accent)" }}>crawl</span><span style={{ color: "var(--accent)" }}>.</span>
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
          borderRadius: 3,
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
        Genre Themes · exploration · May 10, 2026
      </div>
      <div style={{ fontFamily: "var(--hand)", fontWeight: 700, fontSize: 28, marginTop: 4 }}>
        Five genre slots, seven tries.
      </div>
      <div style={{ fontFamily: "var(--hand)", fontSize: 14, marginTop: 4, opacity: 0.78, lineHeight: 1.4, maxWidth: 840 }}>
        Same 25-token vocabulary as electric / jade / light — these stack on top, they don't replace anything.
        EDM, Metal, Jazz get one option each. Hip-Hop and Indie / Folk each get two takes so we can pick.
      </div>

      {/* Section 1 · the three locked slots */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Locked slots · one option each
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          EDM → Pulse · Metal → Forge · Jazz → Blue Note. One take each — these felt unambiguous.
        </div>
        <div style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}>
          <GTCard themeKey="pulse" />
          <GTCard themeKey="forge" />
          <GTCard themeKey="bluenote" />
        </div>
      </div>

      {/* Section 2 · Hip-Hop options */}
      <GTCompareStrip
        title="Hip-Hop · pick one"
        note="Boombox leans into the golden-era warmth — charcoal, rope-chain gold, brick red accent. Chrome goes the opposite direction: pure black, polished metal, acid green drip. Both are dark."
        themeKeys={HIPHOP_KEYS}
      />

      {/* Section 3 · Indie / Folk options */}
      <GTCompareStrip
        title="Indie / Folk · pick one"
        note="Pulp is the only light theme in the set — riso-printed paper cream with terracotta + sage. Cedar is its dark mirror: deep forest with dusty rose signal and dry-grass amber accent."
        themeKeys={INDIE_KEYS}
      />

      {/* Section 4 · Full token table */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Token table · all 7 themes
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          Every theme implements the same 24 semantic tokens, so screens reskin with zero new vocabulary.
        </div>
        <div style={{ marginTop: 14 }}>
          <GTTokenTable themeKeys={GENRE_KEYS} />
        </div>
      </div>

      {/* Section 5 · Open questions */}
      <div style={{ marginTop: 36, padding: "16px 18px", border: "1px dashed var(--ink)", background: "rgba(255,255,255,0.4)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Open questions
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
          <li>Should genre themes be <em>user-pick</em> (Settings → Appearance) or <em>auto-apply</em> based on the genre of the event currently in focus? The latter is louder and more fun; the former is calmer and respects user choice.</li>
          <li>If we ship all 7, that's 10 total themes. Worth a "themes" submenu vs. one long list in settings.</li>
          <li>The <em>Pulp</em> palette in particular shifts the brand color — terracotta accent reads almost orange, not pink. Want me to lock <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>--accent</code> to a pink-leaning hue across all themes, or let each theme own its accent fully?</li>
          <li>For Hip-Hop / Indie pick-one: any reason to keep both? E.g. ship Boombox as "Hip-Hop" and Chrome as a separate "Minimal" / "Night" theme that isn't genre-tied.</li>
        </ul>
      </div>
    </div>
  );
}

window.GenreThemes = GenreThemes;

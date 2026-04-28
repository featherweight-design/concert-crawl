// Theming Workshop — token table + browse view across electric / jade / light
// Goal: prove the three-theme system holds up by rebuilding browse with ONLY tokens.

// ============================================================
// TOKEN SETS — Rich (~35 tokens, semantic)
// ============================================================
//
// Naming convention:
//   bg-*       page-level backgrounds (canvas, app shell)
//   surface-*  raised material (cards, sheets, popovers) — 1/2/3 = elevation
//   fg-*       text & icons on top of bg/surface
//   border-*   dividers, outlines, separators
//   accent-*   the brand accent (the "pink" in electric, "violet" in jade, "pink" in light)
//   signal-*   the secondary brand color (the "cyan" in electric, "mint" in jade)
//   state-*    success / warning / danger
//   focus      a11y focus ring color
//   overlay-*  scrims, hover/press washes
//   image-tint very-low-opacity color applied behind imagery in dark themes

const THEMES = {
  electric: {
    label: "Electric",
    mode: "dark",
    role: "Default · signature",
    tokens: {
      // Surfaces
      "bg":            "#070A1A",
      "bg-elevated":   "#0E1226",
      "surface-1":     "#11162E",
      "surface-2":     "#171D3A",
      "surface-3":     "#1F2748",
      // Text & icons
      "fg":            "#E8F3FF",
      "fg-muted":      "#9AA8C7",
      "fg-subtle":     "#5A6788",
      "fg-on-accent":  "#070A1A",
      // Borders
      "border":        "#1F2748",
      "border-strong": "#2C3661",
      "border-focus":  "#7AE6FF",
      // Brand
      "signal":        "#7AE6FF",   // cyan — the trail
      "signal-muted":  "#3FA3C2",
      "accent":        "#FF7BD4",   // pink — the halo
      "accent-muted":  "#B8559A",
      // States
      "success":       "#7BFFB0",
      "warning":       "#FFD27A",
      "danger":        "#FF7A8A",
      // Misc
      "focus":         "#7AE6FF",
      "overlay-hover": "rgba(122,230,255,0.08)",
      "overlay-press": "rgba(122,230,255,0.16)",
      "scrim":         "rgba(7,10,26,0.72)",
      "image-tint":    "rgba(7,10,26,0.20)",
    }
  },
  jade: {
    label: "Jade",
    mode: "dark",
    role: "Alternate · calmer",
    tokens: {
      "bg":            "#06201F",
      "bg-elevated":   "#0A2A28",
      "surface-1":     "#0E3331",
      "surface-2":     "#143E3B",
      "surface-3":     "#1A4A47",
      "fg":            "#E6FFF6",
      "fg-muted":      "#8FBFB0",
      "fg-subtle":     "#557A6F",
      "fg-on-accent":  "#06201F",
      "border":        "#1A4A47",
      "border-strong": "#2A5C57",
      "border-focus":  "#1FFFC2",
      "signal":        "#1FFFC2",
      "signal-muted":  "#15B58A",
      "accent":        "#9B5CFF",
      "accent-muted":  "#6F44B5",
      "success":       "#1FFFC2",
      "warning":       "#FFD27A",
      "danger":        "#FF7A8A",
      "focus":         "#1FFFC2",
      "overlay-hover": "rgba(31,255,194,0.08)",
      "overlay-press": "rgba(31,255,194,0.16)",
      "scrim":         "rgba(6,32,31,0.72)",
      "image-tint":    "rgba(6,32,31,0.20)",
    }
  },
  light: {
    label: "Light · Inverted Electric",
    mode: "light",
    role: "Daytime · system-pref default",
    tokens: {
      // Inverted electric: white-ish bg, near-black text, electric pink as accent, cyan ink as signal
      "bg":            "#FAFCFF",
      "bg-elevated":   "#FFFFFF",
      "surface-1":     "#F2F5FB",
      "surface-2":     "#E8EDF6",
      "surface-3":     "#DCE3F0",
      "fg":            "#070A1A",
      "fg-muted":      "#4A5374",
      "fg-subtle":     "#8A93B0",
      "fg-on-accent":  "#FFFFFF",
      "border":        "#DCE3F0",
      "border-strong": "#B8C2D6",
      "border-focus":  "#0080A0",     // deeper cyan — readable on white
      "signal":        "#0080A0",     // cyan, deepened so it works on white
      "signal-muted":  "#4DABC2",
      "accent":        "#E0297A",     // pink, deepened
      "accent-muted":  "#B0205F",
      "success":       "#1F8A4F",
      "warning":       "#B86E00",
      "danger":        "#C42940",
      "focus":         "#0080A0",
      "overlay-hover": "rgba(7,10,26,0.04)",
      "overlay-press": "rgba(7,10,26,0.08)",
      "scrim":         "rgba(7,10,26,0.40)",
      "image-tint":    "transparent",  // light theme leaves photos alone
    }
  },
};

const THEME_KEYS = Object.keys(THEMES);

// ============================================================
// THEME SCOPE — applies tokens to a subtree via inline CSS vars
// ============================================================
function ThemeScope({ theme, children, style }) {
  const tokens = THEMES[theme].tokens;
  const vars = {};
  for (const [k, v] of Object.entries(tokens)) vars[`--${k}`] = v;
  return (
    <div data-theme={theme} style={{ ...vars, color: "var(--fg)", background: "var(--bg)", ...style }}>
      {children}
    </div>
  );
}

// ============================================================
// ICON — the cluster path, theme-aware (uses --signal + --accent)
// ============================================================
function ClusterPathThemed({ size = 96, mode = "dark" }) {
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
// THE TOKENIZED BROWSE VIEW
// Same content as screens-browse, but every color goes through tokens.
// ============================================================
function TokenizedBrowse() {
  const events = [
    { act: "Big Thief",         venue: "Bluebird Theater",  time: "8:00p", price: "$35" },
    { act: "Mannequin Pussy",   venue: "Hi-Dive",           time: "9:00p", price: "$22" },
    { act: "Wednesday",         venue: "Gothic",            time: "8:30p", price: "$28" },
    { act: "Geese",             venue: "Mission Ballroom",  time: "8:00p", price: "$45" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
      {/* App bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
            <ClusterPathThemed size={28} />
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

      {/* Header */}
      <div style={{ padding: "14px 18px 10px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Denver · this week
        </div>
        <div style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 26, color: "var(--fg)", letterSpacing: "-0.02em", marginTop: 4 }}>
          What's on?
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "0 18px 12px", flexWrap: "wrap" }}>
        <Chip active>this week</Chip>
        <Chip>any venue</Chip>
        <Chip>any price</Chip>
        <Chip>+ filter</Chip>
      </div>

      {/* Day group */}
      <div style={{ padding: "4px 18px", flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13, color: "var(--accent)", letterSpacing: "0.06em" }}>TONIGHT</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>Sat · Apr 25</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.slice(0, 2).map((e, i) => <EventRow key={i} {...e} featured={i === 0} />)}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16, marginBottom: 8 }}>
          <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13, color: "var(--fg)", letterSpacing: "0.06em" }}>TOMORROW</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--fg-muted)" }}>Sun · Apr 26</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.slice(2).map((e, i) => <EventRow key={i} {...e} />)}
        </div>
      </div>

      {/* Tab bar */}
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

function EventRow({ act, venue, time, price, featured = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: 10,
      background: featured ? "var(--surface-2)" : "var(--surface-1)",
      border: `1px solid ${featured ? "var(--border-strong)" : "var(--border)"}`,
      borderRadius: 6,
      position: "relative",
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
      {/* Image placeholder w/ theme tint overlay */}
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

function Chip({ children, active = false }) {
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
// TOKEN TABLE — visual swatch grid, all three themes, side by side
// ============================================================
function TokenTable() {
  const groups = [
    { title: "Surfaces",  keys: ["bg", "bg-elevated", "surface-1", "surface-2", "surface-3"] },
    { title: "Text & icons", keys: ["fg", "fg-muted", "fg-subtle", "fg-on-accent"] },
    { title: "Borders",   keys: ["border", "border-strong", "border-focus"] },
    { title: "Brand",     keys: ["signal", "signal-muted", "accent", "accent-muted"] },
    { title: "States",    keys: ["success", "warning", "danger"] },
    { title: "Misc",      keys: ["focus", "overlay-hover", "overlay-press", "scrim", "image-tint"] },
  ];
  return (
    <div style={{ border: "1px solid var(--ink)", background: "var(--paper)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px repeat(3, 1fr)", borderBottom: "1px solid var(--ink)" }}>
        <div style={{ padding: "10px 12px", borderRight: "1px solid var(--ink)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>token</div>
        {THEME_KEYS.map((k, i) => (
          <div key={k} style={{
            padding: "10px 12px",
            borderRight: i < 2 ? "1px solid var(--ink)" : "none",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13 }}>{THEMES[k].label}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.6 }}>
              {THEMES[k].mode} · {THEMES[k].role}
            </span>
          </div>
        ))}
      </div>
      {groups.map((g, gi) => (
        <React.Fragment key={g.title}>
          <div style={{
            gridColumn: "1 / -1", padding: "8px 12px", background: "var(--paper)",
            borderBottom: "1px solid var(--ink)",
            fontFamily: "var(--mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", opacity: 0.7,
          }}>{g.title}</div>
          {g.keys.map((tk, ti) => (
            <div key={tk} style={{
              display: "grid", gridTemplateColumns: "180px repeat(3, 1fr)",
              borderBottom: ti === g.keys.length - 1 && gi === groups.length - 1 ? "none" : "1px solid var(--ink)",
            }}>
              <div style={{
                padding: "8px 12px", borderRight: "1px solid var(--ink)",
                fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink)",
                display: "flex", alignItems: "center",
              }}>{tk}</div>
              {THEME_KEYS.map((k, i) => (
                <TokenCell key={k} theme={k} token={tk} last={i === 2} />
              ))}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function TokenCell({ theme, token, last }) {
  const v = THEMES[theme].tokens[token];
  const isTransparent = v === "transparent" || v.startsWith("rgba");
  return (
    <div style={{
      padding: "6px 12px", borderRight: last ? "none" : "1px solid var(--ink)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 22, height: 22, flexShrink: 0,
        background: isTransparent
          ? `repeating-linear-gradient(45deg, #ddd 0 4px, #fff 4px 8px), ${v}`
          : v,
        backgroundBlendMode: isTransparent ? "normal" : "normal",
        border: "1px solid var(--ink)", borderRadius: 3,
        position: "relative", overflow: "hidden",
      }}>
        {isTransparent && (
          <div style={{ position: "absolute", inset: 0, background: v }} />
        )}
      </div>
      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink)", opacity: 0.85 }}>
        {v.length > 18 ? v.slice(0, 16) + "…" : v}
      </span>
    </div>
  );
}

// ============================================================
// MAIN LAYOUT
// ============================================================
function ThemingWorkshop() {
  const [tweaks, setTweak] = useTweaks({
    activeTheme: "electric",
    showAllThemes: true,
  });

  return (
    <div style={{ background: "var(--paper)", padding: 28, minHeight: "100vh" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Theming workshop · Round 1
      </div>
      <div style={{ fontFamily: "var(--hand)", fontWeight: 700, fontSize: 28, marginTop: 4 }}>
        Three themes, one token system.
      </div>
      <div style={{ fontFamily: "var(--hand)", fontSize: 14, marginTop: 4, opacity: 0.78, lineHeight: 1.4, maxWidth: 820 }}>
        Electric (signature, dark), Jade (alternate, dark), Light (inverted electric · system-pref default with override).
        ~35 semantic tokens. Browse view rebuilt on tokens only — same component, three skins.
      </div>

      {/* Section 1 · Browse view in 3 themes side by side */}
      <div style={{ marginTop: 26 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Browse view · all three themes
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          Same component, three token sets. Halo on the featured row, signal on price + active tab, accent on "TONIGHT" + the brand mark.
        </div>
        <div style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: tweaks.showAllThemes ? "repeat(3, 1fr)" : "1fr",
          gap: 14,
        }}>
          {(tweaks.showAllThemes ? THEME_KEYS : [tweaks.activeTheme]).map(k => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between",
              }}>
                <div>
                  <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13 }}>{THEMES[k].label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, marginLeft: 6, opacity: 0.6 }}>
                    {THEMES[k].mode}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, opacity: 0.55 }}>{THEMES[k].role}</span>
              </div>
              <ThemeScope theme={k} style={{
                borderRadius: 12, overflow: "hidden",
                border: "1px solid var(--ink)",
                height: 580,
                boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              }}>
                <TokenizedBrowse />
              </ThemeScope>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2 · Token table */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Token table · 35 semantic tokens
        </div>
        <div style={{ fontFamily: "var(--hand)", fontSize: 13, marginTop: 2, opacity: 0.7 }}>
          The full token surface. Author components against these names — never against hex values.
        </div>
        <div style={{ marginTop: 14 }}>
          <TokenTable />
        </div>
      </div>

      {/* Section 3 · System architecture notes */}
      <div style={{ marginTop: 36 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Architecture · how it ships
        </div>
        <div style={{
          marginTop: 14,
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14,
        }}>
          <ArchCard
            title="1 · Source of truth"
            body="Tokens live in a single TS module exporting THEMES = { electric, jade, light }. Each theme is a flat map of token → CSS color. The names are semantic, never named after hue."
          />
          <ArchCard
            title="2 · Application"
            body="On mount, write the active theme's tokens to :root as CSS variables. data-theme attribute on <html> for any descendant style overrides. Components only ever reference var(--token)."
          />
          <ArchCard
            title="3 · User control"
            body="System pref drives default (prefers-color-scheme). Settings → Appearance lets users override to Electric / Jade / Light. Choice persists to localStorage and (later) profile."
          />
        </div>
      </div>

      {/* Section 4 · Open questions */}
      <div style={{ marginTop: 36, padding: "16px 18px", border: "1px dashed var(--ink)", background: "rgba(255,255,255,0.4)" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Open questions for later
        </div>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, fontFamily: "var(--ui)", fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
          <li>Imagery treatment: confirmed subtle <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>image-tint</code> overlay for dark themes (~20% bg color over photos), untouched in light.</li>
          <li>Brand mark on light: trail uses <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>--signal</code> (deepened cyan), halo uses <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>--accent</code> (deepened pink). Mark stays recognizable across themes.</li>
          <li>Charts/data viz: needs a separate <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>--chart-1..n</code> token series — defer until we have a data screen.</li>
          <li>High-contrast / a11y mode: a 4th theme variant for users with low vision. Costs little once tokenized; ship after launch.</li>
        </ul>
      </div>

      {/* Render Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Theming" />
        <TweakRadio
          label="Layout"
          value={tweaks.showAllThemes ? "all" : "single"}
          options={[{ value: "all", label: "All 3" }, { value: "single", label: "Focus 1" }]}
          onChange={v => setTweak("showAllThemes", v === "all")}
        />
        {!tweaks.showAllThemes && (
          <TweakSelect
            label="Active theme"
            value={tweaks.activeTheme}
            options={THEME_KEYS.map(k => ({ value: k, label: THEMES[k].label }))}
            onChange={v => setTweak("activeTheme", v)}
          />
        )}
      </TweaksPanel>
    </div>
  );
}

function ArchCard({ title, body }) {
  return (
    <div style={{ padding: 14, border: "1px solid var(--ink)", background: "var(--paper)" }}>
      <div style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 13, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontFamily: "var(--ui)", fontSize: 12, marginTop: 6, lineHeight: 1.5, color: "var(--ink)", opacity: 0.82 }}>
        {body}
      </div>
    </div>
  );
}

window.ThemingWorkshop = ThemingWorkshop;

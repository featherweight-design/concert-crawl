// theme-context.jsx — shared theme system for Concert Crawl
// Provides:
//   - THEMES: the 3 token sets (electric, jade, light)
//   - <ThemeProvider theme={...}>: writes tokens as CSS vars on its wrapper div
//   - <ThemeSwitcher value onChange>: floating control to toggle
//
// Existing screens read tokens via var(--bg) etc., so they don't need to change.
// We just wrap their root in ThemeProvider and they reskin automatically.

const CC_THEMES = {
  electric: {
    label: "Electric",
    mode: "dark",
    tokens: {
      "bg":            "#070A1A",
      "bg-elevated":   "#0E1226",
      "surface-1":     "#11162E",
      "surface-2":     "#171D3A",
      "surface-3":     "#1F2748",
      "fg":            "#E8F3FF",
      "fg-muted":      "#9AA8C7",
      "fg-subtle":     "#5A6788",
      "fg-on-accent":  "#070A1A",
      "border":        "#1F2748",
      "border-strong": "#2C3661",
      "border-focus":  "#7AE6FF",
      "signal":        "#7AE6FF",
      "signal-muted":  "#3FA3C2",
      "accent":        "#FF7BD4",
      "accent-muted":  "#B8559A",
      "success":       "#7BFFB0",
      "warning":       "#FFD27A",
      "danger":        "#FF7A8A",
      "focus":         "#7AE6FF",
      "overlay-hover": "rgba(122,230,255,0.08)",
      "overlay-press": "rgba(122,230,255,0.16)",
      "scrim":         "rgba(7,10,26,0.72)",
      "image-tint":    "rgba(7,10,26,0.20)",
    },
  },
  jade: {
    label: "Jade",
    mode: "dark",
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
    },
  },
  light: {
    label: "Light",
    mode: "light",
    tokens: {
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
      "border-focus":  "#0080A0",
      "signal":        "#0080A0",
      "signal-muted":  "#4DABC2",
      "accent":        "#E0297A",
      "accent-muted":  "#B0205F",
      "success":       "#1F8A4F",
      "warning":       "#B86E00",
      "danger":        "#C42940",
      "focus":         "#0080A0",
      "overlay-hover": "rgba(7,10,26,0.04)",
      "overlay-press": "rgba(7,10,26,0.08)",
      "scrim":         "rgba(7,10,26,0.40)",
      "image-tint":    "transparent",
    },
  },
};

const CC_THEME_KEYS = ["electric", "jade", "light"];

function ccTokenVars(themeKey) {
  const t = CC_THEMES[themeKey].tokens;
  const v = {};
  for (const [k, val] of Object.entries(t)) v[`--${k}`] = val;
  return v;
}

// ThemeProvider: wraps children in a div that carries the CSS vars.
// Pass-through children render against var(--*) tokens.
function ThemeProvider({ theme = "electric", style, children }) {
  return (
    <div data-cc-theme={theme} style={{ ...ccTokenVars(theme), ...style }}>
      {children}
    </div>
  );
}

// useThemeState: small hook for top-level theme state with localStorage persistence.
function useThemeState(initial = "electric", storageKey = "cc-theme") {
  const [theme, setTheme] = React.useState(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v && CC_THEMES[v]) return v;
    } catch (e) {}
    return initial;
  });
  React.useEffect(() => {
    try { localStorage.setItem(storageKey, theme); } catch (e) {}
  }, [theme, storageKey]);
  return [theme, setTheme];
}

// ThemeSwitcher: floating segmented control, top-right by default.
// Renders OUTSIDE the theme-themed surface so it's always visible.
function ThemeSwitcher({ value, onChange, position = "top-right" }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const positions = {
    "top-right":    { top: 16, right: 16 },
    "top-left":     { top: 16, left: 16 },
    "bottom-right": { bottom: 16, right: 16 },
    "bottom-left":  { bottom: 16, left: 16 },
  };
  return (
    <div style={{
      position: "fixed", zIndex: 9999, ...positions[position],
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 7px", borderRadius: 999,
        background: "rgba(20, 22, 34, 0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      }}>
        <span style={{
          fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em",
          textTransform: "uppercase", paddingLeft: 6,
        }}>theme</span>
        {CC_THEME_KEYS.map(k => {
          const active = k === value;
          return (
            <button
              key={k}
              onClick={() => onChange(k)}
              style={{
                all: "unset", cursor: "pointer",
                padding: "5px 11px", borderRadius: 999,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                color: active ? "#070A1A" : "rgba(255,255,255,0.85)",
                background: active ? "#7AE6FF" : "transparent",
                transition: "background .12s, color .12s",
              }}>{CC_THEMES[k].label}</button>
          );
        })}
      </div>
    </div>
  );
}

// Convenience: a wrapper that gives you state + switcher in one drop-in.
function ThemedRoot({ children, defaultTheme = "electric", switcherPosition = "top-right" }) {
  const [theme, setTheme] = useThemeState(defaultTheme);
  return (
    <>
      {children(theme)}
      <ThemeSwitcher value={theme} onChange={setTheme} position={switcherPosition} />
    </>
  );
}

window.CC_THEMES = CC_THEMES;
window.CC_THEME_KEYS = CC_THEME_KEYS;
window.ccTokenVars = ccTokenVars;
window.ThemeProvider = ThemeProvider;
window.useThemeState = useThemeState;
window.ThemeSwitcher = ThemeSwitcher;
window.ThemedRoot = ThemedRoot;

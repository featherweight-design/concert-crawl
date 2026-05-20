// admin-theme.jsx — Self-contained theme system for the Concert Crawl admin UI.
// Defines two token sets, light and dark, written as CSS custom properties on a
// wrapper div by <ThemeProvider theme="light" | "dark">. Every primitive in
// admin-primitives.jsx reads tokens via var(--*), so wrapping a tree in
// ThemeProvider reskins it with no other changes.
//
// This is intentionally separate from the consumer-facing theme-context.jsx at
// the project root — the admin surface uses different palettes (operational
// neutrals + signal/danger) and a different naming convention (--signal,
// --bg-elevated, --surface-1, --surface-2, --border, --border-strong, etc.)
// than the consumer themes (electric, jade, light).

const ADMIN_THEMES = {
  light: {
    label: "Light",
    mode: "light",
    tokens: {
      // Surfaces — warm paper neutrals
      "bg":            "#f7f5f0",
      "bg-elevated":   "#ffffff",
      "surface-1":     "#f0ede5",
      "surface-2":     "#e6e2d8",
      "ink":           "#1f1d18",
      "paper":         "#f7f5f0",

      // Foregrounds
      "fg":            "#1f1d18",
      "fg-muted":      "#5e5a52",
      "fg-subtle":     "#8a857a",
      "fg-on-accent":  "#ffffff",

      // Borders
      "border":        "#e2dfd6",
      "border-strong": "#c9c5b8",

      // Hover overlay
      "overlay-hover": "rgba(31,29,24,0.05)",

      // Status palette
      "success":       "#2f7a4d",
      "warning":       "#b87514",
      "danger":        "#b8381a",
      "signal":        "#1d5fbf", // primary action / "live" indicator
      "accent":        "#7a3aa8", // editorial accent

      // Shadows
      "shadow-sm":     "0 1px 2px rgba(31,29,24,0.06)",
      "shadow-md":     "0 4px 12px rgba(31,29,24,0.08)",
      "shadow-lg":     "0 12px 32px rgba(31,29,24,0.16)",
    },
  },

  dark: {
    label: "Dark",
    mode: "dark",
    tokens: {
      // Surfaces — deep neutrals with warm undertone
      "bg":            "#15140f",
      "bg-elevated":   "#1c1a14",
      "surface-1":     "#23211a",
      "surface-2":     "#2c2922",
      "ink":           "#f7f5f0",
      "paper":         "#15140f",

      // Foregrounds
      "fg":            "#eeeae0",
      "fg-muted":      "#9b968a",
      "fg-subtle":     "#6c6759",
      "fg-on-accent":  "#0e0d0a",

      // Borders
      "border":        "#2f2c24",
      "border-strong": "#48443a",

      // Hover overlay
      "overlay-hover": "rgba(238,234,224,0.06)",

      // Status palette — slightly desaturated for dark surfaces
      "success":       "#5fc28a",
      "warning":       "#e2a04a",
      "danger":        "#ea6d50",
      "signal":        "#7ab4ff",
      "accent":        "#c89bf0",

      // Shadows
      "shadow-sm":     "0 1px 2px rgba(0,0,0,0.4)",
      "shadow-md":     "0 4px 14px rgba(0,0,0,0.5)",
      "shadow-lg":     "0 16px 40px rgba(0,0,0,0.6)",
    },
  },
};

function adminTokenVars(themeKey) {
  const theme = ADMIN_THEMES[themeKey] || ADMIN_THEMES.light;
  const out = {};
  for (const [k, v] of Object.entries(theme.tokens)) out[`--${k}`] = v;
  return out;
}

// ThemeProvider — wraps children in a div that carries the CSS vars.
// Children rendered via var(--*) reskin automatically.
function ThemeProvider({ theme = "light", style, children, ...rest }) {
  const key = ADMIN_THEMES[theme] ? theme : "light";
  return (
    <div data-admin-theme={key} style={{ ...adminTokenVars(key), color: "var(--fg)", ...style }} {...rest}>
      {children}
    </div>
  );
}

Object.assign(window, {
  ADMIN_THEMES,
  adminTokenVars,
  ThemeProvider,
});

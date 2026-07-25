// theme-context.jsx — Concert Crawl theme system (ALL 9 THEMES)
// Round-5 merge: base 3 (electric/jade/light) + 6 genre themes shipped May 10
// (pulse, forge, bluenote, drip, cedar, gloss). 9 total.
//
// Identical token vocabulary across every theme. Drip introduces ONE optional
// token (accent-2); everything else leaves it undefined. Consumers that want it
// use the fallback form: var(--accent-2, var(--accent)).
//
// This file is the source of truth for THIS handoff's theme verification — the
// Tweaks panel can flip across all 9 so cross-theme parity is checkable on every
// new surface (picker states, race-loser, takeover, gifted, entitlements matrix).

const CC_THEMES = {
  electric: {
    label: "Electric", mode: "dark",
    tokens: {
      "bg": "#070A1A", "bg-elevated": "#0E1226", "surface-1": "#11162E", "surface-2": "#171D3A", "surface-3": "#1F2748",
      "fg": "#E8F3FF", "fg-muted": "#9AA8C7", "fg-subtle": "#5A6788", "fg-on-accent": "#070A1A",
      "border": "#1F2748", "border-strong": "#2C3661", "border-focus": "#7AE6FF",
      "signal": "#7AE6FF", "signal-muted": "#3FA3C2", "accent": "#FF7BD4", "accent-muted": "#B8559A",
      "success": "#7BFFB0", "warning": "#FFD27A", "danger": "#FF7A8A", "focus": "#7AE6FF",
      "overlay-hover": "rgba(122,230,255,0.08)", "overlay-press": "rgba(122,230,255,0.16)",
      "scrim": "rgba(7,10,26,0.72)", "image-tint": "rgba(7,10,26,0.20)",
    },
  },
  jade: {
    label: "Jade", mode: "dark",
    tokens: {
      "bg": "#06201F", "bg-elevated": "#0A2A28", "surface-1": "#0E3331", "surface-2": "#143E3B", "surface-3": "#1A4A47",
      "fg": "#E6FFF6", "fg-muted": "#8FBFB0", "fg-subtle": "#557A6F", "fg-on-accent": "#06201F",
      "border": "#1A4A47", "border-strong": "#2A5C57", "border-focus": "#1FFFC2",
      "signal": "#1FFFC2", "signal-muted": "#15B58A", "accent": "#9B5CFF", "accent-muted": "#6F44B5",
      "success": "#1FFFC2", "warning": "#FFD27A", "danger": "#FF7A8A", "focus": "#1FFFC2",
      "overlay-hover": "rgba(31,255,194,0.08)", "overlay-press": "rgba(31,255,194,0.16)",
      "scrim": "rgba(6,32,31,0.72)", "image-tint": "rgba(6,32,31,0.20)",
    },
  },
  light: {
    label: "Light", mode: "light",
    tokens: {
      "bg": "#FAFCFF", "bg-elevated": "#FFFFFF", "surface-1": "#F2F5FB", "surface-2": "#E8EDF6", "surface-3": "#DCE3F0",
      "fg": "#070A1A", "fg-muted": "#4A5374", "fg-subtle": "#8A93B0", "fg-on-accent": "#FFFFFF",
      "border": "#DCE3F0", "border-strong": "#B8C2D6", "border-focus": "#0080A0",
      "signal": "#0080A0", "signal-muted": "#4DABC2", "accent": "#E0297A", "accent-muted": "#B0205F",
      "success": "#1F8A4F", "warning": "#B86E00", "danger": "#C42940", "focus": "#0080A0",
      "overlay-hover": "rgba(7,10,26,0.04)", "overlay-press": "rgba(7,10,26,0.08)",
      "scrim": "rgba(7,10,26,0.40)", "image-tint": "transparent",
    },
  },
  pulse: {
    label: "Pulse", mode: "dark",
    tokens: {
      "bg": "#050008", "bg-elevated": "#0C0314", "surface-1": "#11041B", "surface-2": "#1A0828", "surface-3": "#250F38",
      "fg": "#F4ECFF", "fg-muted": "#A38FBF", "fg-subtle": "#5F4D7A", "fg-on-accent": "#050008",
      "border": "#250F38", "border-strong": "#3D1A58", "border-focus": "#C8FF2E",
      "signal": "#C8FF2E", "signal-muted": "#8AB320", "accent": "#FF2EC8", "accent-muted": "#B82091",
      "success": "#C8FF2E", "warning": "#FFC93E", "danger": "#FF4A6E", "focus": "#C8FF2E",
      "overlay-hover": "rgba(200,255,46,0.10)", "overlay-press": "rgba(200,255,46,0.20)",
      "scrim": "rgba(5,0,8,0.78)", "image-tint": "rgba(36,8,52,0.22)",
    },
  },
  forge: {
    label: "Forge", mode: "dark",
    tokens: {
      "bg": "#060403", "bg-elevated": "#100C0A", "surface-1": "#171210", "surface-2": "#211915", "surface-3": "#2E221C",
      "fg": "#ECDCC4", "fg-muted": "#9A8775", "fg-subtle": "#5C5042", "fg-on-accent": "#ECDCC4",
      "border": "#26201A", "border-strong": "#3D3128", "border-focus": "#C8211A",
      "signal": "#C8211A", "signal-muted": "#8A1812", "accent": "#ECDCC4", "accent-muted": "#B8AB95",
      "success": "#A8B547", "warning": "#E89238", "danger": "#FF2A1A", "focus": "#C8211A",
      "overlay-hover": "rgba(200,33,26,0.10)", "overlay-press": "rgba(200,33,26,0.22)",
      "scrim": "rgba(6,4,3,0.86)", "image-tint": "rgba(6,4,3,0.34)",
    },
  },
  bluenote: {
    label: "Blue Note", mode: "dark",
    tokens: {
      "bg": "#0E0A1F", "bg-elevated": "#150F2A", "surface-1": "#1C1538", "surface-2": "#251D48", "surface-3": "#33285E",
      "fg": "#EFE6F5", "fg-muted": "#A498BD", "fg-subtle": "#685E82", "fg-on-accent": "#0E0A1F",
      "border": "#33285E", "border-strong": "#4A3A82", "border-focus": "#4DA3FF",
      "signal": "#4DA3FF", "signal-muted": "#2E6FB5", "accent": "#E83A6E", "accent-muted": "#A82550",
      "success": "#7AC9B0", "warning": "#E88A48", "danger": "#FF4A6E", "focus": "#4DA3FF",
      "overlay-hover": "rgba(77,163,255,0.08)", "overlay-press": "rgba(77,163,255,0.18)",
      "scrim": "rgba(14,10,31,0.76)", "image-tint": "rgba(14,10,31,0.24)",
    },
  },
  drip: {
    label: "Drip", mode: "dark",
    tokens: {
      "bg": "#000000", "bg-elevated": "#0A0A0A", "surface-1": "#111111", "surface-2": "#181818", "surface-3": "#222222",
      "fg": "#F5F5F5", "fg-muted": "#8A8A8A", "fg-subtle": "#4D4D4D", "fg-on-accent": "#000000",
      "border": "#1F1F1F", "border-strong": "#383838", "border-focus": "#2EFF6B",
      "signal": "#2EFF6B", "signal-muted": "#1FB54A", "accent": "#FF7A1A", "accent-muted": "#B85412",
      "accent-2": "#FF2EC8",
      "success": "#2EFF6B", "warning": "#FF7A1A", "danger": "#FF3E5E", "focus": "#2EFF6B",
      "overlay-hover": "rgba(255,46,200,0.10)", "overlay-press": "rgba(255,46,200,0.22)",
      "scrim": "rgba(0,0,0,0.82)", "image-tint": "rgba(255,46,200,0.14)",
    },
  },
  cedar: {
    label: "Cedar", mode: "dark",
    tokens: {
      "bg": "#10201A", "bg-elevated": "#162A22", "surface-1": "#1B342B", "surface-2": "#234035", "surface-3": "#2D4D40",
      "fg": "#EFEAE0", "fg-muted": "#A8B0A0", "fg-subtle": "#6B7368", "fg-on-accent": "#10201A",
      "border": "#2D4D40", "border-strong": "#3F6256", "border-focus": "#D89A8A",
      "signal": "#D89A8A", "signal-muted": "#A26F62", "accent": "#C8A04A", "accent-muted": "#8A6E2E",
      "success": "#9BC9A8", "warning": "#E8C36E", "danger": "#D8736E", "focus": "#D89A8A",
      "overlay-hover": "rgba(216,154,138,0.08)", "overlay-press": "rgba(216,154,138,0.16)",
      "scrim": "rgba(16,32,26,0.74)", "image-tint": "rgba(16,32,26,0.20)",
    },
  },
  gloss: {
    label: "Gloss", mode: "dark",
    tokens: {
      "bg": "#0F0810", "bg-elevated": "#170F1A", "surface-1": "#1E1521", "surface-2": "#28192F", "surface-3": "#341F3B",
      "fg": "#F8EFF5", "fg-muted": "#B89DC0", "fg-subtle": "#6E5577", "fg-on-accent": "#0F0810",
      "border": "#2B1F33", "border-strong": "#4A3358", "border-focus": "#FF5BA1",
      "signal": "#FF5BA1", "signal-muted": "#B83870", "accent": "#C8D4E0", "accent-muted": "#8A98A8",
      "success": "#5BFFCB", "warning": "#FFB84A", "danger": "#FF4870", "focus": "#FF5BA1",
      "overlay-hover": "rgba(255,91,161,0.10)", "overlay-press": "rgba(255,91,161,0.22)",
      "scrim": "rgba(15,8,16,0.80)", "image-tint": "rgba(255,91,161,0.10)",
    },
  },
};

const CC_THEME_KEYS = ["electric", "jade", "light", "pulse", "forge", "bluenote", "drip", "cedar", "gloss"];

function ccTokenVars(themeKey) {
  const t = CC_THEMES[themeKey].tokens;
  const v = {};
  for (const [k, val] of Object.entries(t)) v[`--${k}`] = val;
  return v;
}

function ThemeProvider({ theme = "electric", style, children }) {
  return (
    <div data-cc-theme={theme} style={{ ...ccTokenVars(theme), ...style }}>
      {children}
    </div>
  );
}

function useThemeState(initial = "electric", storageKey = "cc-theme") {
  const [theme, setTheme] = React.useState(() => {
    try { const v = localStorage.getItem(storageKey); if (v && CC_THEMES[v]) return v; } catch (e) {}
    return initial;
  });
  React.useEffect(() => { try { localStorage.setItem(storageKey, theme); } catch (e) {} }, [theme, storageKey]);
  return [theme, setTheme];
}

window.CC_THEMES = CC_THEMES;
window.CC_THEME_KEYS = CC_THEME_KEYS;
window.ccTokenVars = ccTokenVars;
window.ThemeProvider = ThemeProvider;
window.useThemeState = useThemeState;

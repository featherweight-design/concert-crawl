// admin-primitives.jsx — shared primitives for the Concert Crawl admin UI.
// Tokens read via var(--*) — never hardcode hex.
// Exports: AdminIcon, StatusBadge, MonoLabel, AdminTable, StatCard, SectionHead,
//          AdminButton, ProgressBar, Sparkline, Spinner, RelTime, CostText.

const ADMIN_FONT = `Inter, system-ui, -apple-system, sans-serif`;
const ADMIN_MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`;

// ── Icons (Lucide-style 16x16 / 18x18 strokes) ─────────────────────────
function AdminIcon({ name, size = 16, color = "currentColor", strokeWidth = 1.6 }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
                  stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    dashboard:  <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
    venues:     <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
    crawl:      <><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>,
    events:     <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></>,
    prices:     <><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" /></>,
    invites:    <><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></>,
    settings:   <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    inbox:      <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></>,
    bell:       <><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>,
    alert:      <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>,
    alertTri:   <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>,
    shield:     <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M4.93 4.93l14.14 14.14" /></>,
    flag:       <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
    key:        <><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></>,
    check:      <path d="M5 12l5 5L20 6" />,
    x:          <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    chevR:      <path d="M9 6l6 6-6 6" />,
    chevD:      <path d="M6 9l6 6 6-6" />,
    chevL:      <path d="M15 6l-9 6 9 6" />,
    chevsL:     <><path d="M11 6l-6 6 6 6" /><path d="M19 6l-6 6 6 6" /></>,
    chevsR:     <><path d="M13 6l6 6-6 6" /><path d="M5 6l6 6-6 6" /></>,
    plus:       <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    play:       <polygon points="5 3 19 12 5 21 5 3" />,
    pause:      <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
    edit:       <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    copy:       <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></>,
    search:     <><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    filter:     <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    refresh:    <><path d="M21 12a9 9 0 11-3-6.7" /><path d="M21 4v5h-5" /></>,
    external:   <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
    dot:        <circle cx="12" cy="12" r="4" />,
    arrowUp:    <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
    arrowDn:    <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>,
    user:       <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    activity:   <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    db:         <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
    cost:       <><circle cx="12" cy="12" r="10" /><path d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9.5a2.5 2.5 0 000 5H15" /></>,
    moon:       <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
    sun:        <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>,
    layout:     <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></>,
    side:       <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

// ── Mono small-caps label ──────────────────────────────────────────────
function MonoLabel({ children, color = "var(--fg-subtle)", size = 10, style }) {
  return (
    <span style={{
      fontFamily: ADMIN_MONO, fontSize: size, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase", color,
      ...style,
    }}>{children}</span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────
// kind: success | warning | danger | signal | accent | neutral | mono
// variant: solid | soft | outline
function StatusBadge({ kind = "neutral", variant = "soft", children, dot = false, mono = false, style }) {
  const palettes = {
    success: { fg: "var(--success)", bg: "color-mix(in oklab, var(--success) 16%, transparent)", border: "color-mix(in oklab, var(--success) 35%, transparent)" },
    warning: { fg: "var(--warning)", bg: "color-mix(in oklab, var(--warning) 18%, transparent)", border: "color-mix(in oklab, var(--warning) 38%, transparent)" },
    danger:  { fg: "var(--danger)",  bg: "color-mix(in oklab, var(--danger) 16%, transparent)",  border: "color-mix(in oklab, var(--danger) 38%, transparent)" },
    signal:  { fg: "var(--signal)",  bg: "color-mix(in oklab, var(--signal) 14%, transparent)",  border: "color-mix(in oklab, var(--signal) 32%, transparent)" },
    accent:  { fg: "var(--accent)",  bg: "color-mix(in oklab, var(--accent) 16%, transparent)",  border: "color-mix(in oklab, var(--accent) 36%, transparent)" },
    neutral: { fg: "var(--fg-muted)",bg: "var(--surface-2)",                                      border: "var(--border)" },
  };
  const p = palettes[kind] || palettes.neutral;
  const bg = variant === "outline" ? "transparent" : p.bg;
  const border = variant === "outline" ? p.border : "1px solid transparent";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "2px 8px", borderRadius: 999,
      fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
      fontSize: 11, fontWeight: 600, letterSpacing: mono ? "0.04em" : "-0.005em",
      color: p.fg, background: bg,
      border: variant === "outline" ? `1px solid ${p.border}` : `1px solid ${p.border}`,
      whiteSpace: "nowrap", lineHeight: "16px",
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: p.fg, boxShadow: `0 0 0 3px color-mix(in oklab, ${p.fg} 22%, transparent)` }} />}
      {children}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, unit, hint, trend, kind = "neutral", icon, mono = true, footer, onClick }) {
  // trend: { dir: "up"|"down", text: "+12%", good: true|false }
  const trendColor = trend ? (trend.good ? "var(--success)" : "var(--danger)") : null;
  return (
    <div onClick={onClick} style={{
      flex: 1, minWidth: 0,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 12,
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .12s, transform .12s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MonoLabel>{label}</MonoLabel>
        {icon && (
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: kind === "neutral" ? "var(--fg-subtle)" : `var(--${kind})`,
            background: kind === "neutral" ? "var(--surface-1)" : `color-mix(in oklab, var(--${kind}) 12%, transparent)`,
          }}>
            <AdminIcon name={icon} size={14} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
          fontSize: 30, fontWeight: 700, lineHeight: 1,
          color: "var(--fg)", letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}>{value}</span>
        {unit && <span style={{
          fontFamily: ADMIN_MONO, fontSize: 13, fontWeight: 600,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
        }}>{unit}</span>}
        {trend && (
          <span style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3,
            fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 700, color: trendColor,
          }}>
            <AdminIcon name={trend.dir === "up" ? "arrowUp" : "arrowDn"} size={11} />
            {trend.text}
          </span>
        )}
      </div>
      {hint && (
        <div style={{
          fontFamily: ADMIN_FONT, fontSize: 12, color: "var(--fg-muted)",
          lineHeight: 1.4,
        }}>{hint}</div>
      )}
      {footer && <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--border)" }}>{footer}</div>}
    </div>
  );
}

// ── Section head (page title block) ───────────────────────────────────
function SectionHead({ eyebrow, title, subtitle, actions, style }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 24, marginBottom: 24, ...style,
    }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={{ marginBottom: 6 }}><MonoLabel>{eyebrow}</MonoLabel></div>}
        <h1 style={{
          margin: 0, fontFamily: ADMIN_FONT, fontSize: 26, fontWeight: 700,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.1,
        }}>{title}</h1>
        {subtitle && (
          <div style={{ marginTop: 6, fontFamily: ADMIN_FONT, fontSize: 13,
                        color: "var(--fg-muted)", lineHeight: 1.5 }}>{subtitle}</div>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

// ── Admin button ──────────────────────────────────────────────────────
// variant: primary | ghost | outline | danger | success
function AdminButton({ children, variant = "outline", icon, iconRight, size = "md", onClick, disabled, fullWidth, type = "button", style }) {
  const sizes = {
    sm: { h: 28, px: 10, fs: 12, gap: 6 },
    md: { h: 34, px: 14, fs: 13, gap: 8 },
    lg: { h: 40, px: 18, fs: 14, gap: 8 },
  }[size];
  const variants = {
    primary: { bg: "var(--signal)", fg: "var(--fg-on-accent)", border: "var(--signal)" },
    ghost:   { bg: "transparent", fg: "var(--fg)", border: "transparent" },
    outline: { bg: "var(--surface-1)", fg: "var(--fg)", border: "var(--border-strong)" },
    danger:  { bg: "color-mix(in oklab, var(--danger) 14%, transparent)", fg: "var(--danger)", border: "color-mix(in oklab, var(--danger) 40%, transparent)" },
    success: { bg: "color-mix(in oklab, var(--success) 14%, transparent)", fg: "var(--success)", border: "color-mix(in oklab, var(--success) 40%, transparent)" },
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      all: "unset", boxSizing: "border-box",
      cursor: disabled ? "not-allowed" : "pointer",
      display: fullWidth ? "flex" : "inline-flex", alignItems: "center", justifyContent: "center",
      width: fullWidth ? "100%" : "auto",
      gap: sizes.gap, height: sizes.h, padding: `0 ${sizes.px}px`,
      borderRadius: 8, border: `1px solid ${variants.border}`,
      background: variants.bg, color: variants.fg,
      fontFamily: ADMIN_FONT, fontSize: sizes.fs, fontWeight: 600, letterSpacing: "-0.005em",
      opacity: disabled ? 0.45 : 1,
      transition: "background .12s, border-color .12s",
      ...style,
    }}>
      {icon && <AdminIcon name={icon} size={sizes.fs + 1} />}
      <span>{children}</span>
      {iconRight && <AdminIcon name={iconRight} size={sizes.fs + 1} />}
    </button>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────
function ProgressBar({ value = 0, max = 100, kind = "signal", height = 6, showLabel = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{
        flex: 1, height, borderRadius: height,
        background: "var(--surface-2)", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: height,
          background: `var(--${kind})`,
          transition: "width .25s ease",
        }} />
      </div>
      {showLabel && (
        <span style={{ fontFamily: ADMIN_MONO, fontSize: 11, fontWeight: 600,
                       color: "var(--fg-muted)", minWidth: 36, textAlign: "right",
                       fontVariantNumeric: "tabular-nums" }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

// ── Sparkline (minimal SVG) ───────────────────────────────────────────
function Sparkline({ data = [], color = "var(--signal)", width = 120, height = 32, fill = true }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 4) - 2]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} opacity="0.18" />}
      <path d={path} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────
function Spinner({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "ccSpin 0.9s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" fill="none" opacity="0.2" />
      <path d="M21 12a9 9 0 00-9-9" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <style>{`@keyframes ccSpin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ── RelTime ───────────────────────────────────────────────────────────
function RelTime({ value, mono = true, color, stale = false }) {
  // value: short string like "3h ago", "2d ago" — caller pre-formats; we just style.
  return (
    <span style={{
      fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
      fontSize: 12, fontWeight: 500,
      color: color || (stale ? "var(--fg-subtle)" : "var(--fg-muted)"),
      letterSpacing: mono ? "0.02em" : 0,
      fontVariantNumeric: "tabular-nums",
    }}>{value}</span>
  );
}

// ── CostText ──────────────────────────────────────────────────────────
function CostText({ value, size = 13, dim = false, weight = 500 }) {
  const zero = value === 0 || value == null;
  return (
    <span style={{
      fontFamily: ADMIN_MONO, fontSize: size, fontWeight: weight,
      color: zero || dim ? "var(--fg-subtle)" : "var(--fg)",
      fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em",
    }}>
      {zero ? "$0.00" : `$${Number(value).toFixed(value < 1 ? 4 : 2)}`}
    </span>
  );
}

// ── Admin table primitives ────────────────────────────────────────────
function AdminTable({ children, dense = false, style }) {
  return (
    <div style={{
      width: "100%", overflowX: "auto",
      border: "1px solid var(--border)", borderRadius: 12,
      background: "var(--bg-elevated)",
      ...style,
    }}>
      <table style={{
        width: "100%", borderCollapse: "separate", borderSpacing: 0,
        fontFamily: ADMIN_FONT, fontSize: 13,
      }}>
        {children}
      </table>
    </div>
  );
}
function THead({ children }) {
  return <thead style={{ background: "var(--surface-1)" }}>{children}</thead>;
}
function TR({ children, onClick, active, muted, style }) {
  return (
    <tr onClick={onClick} style={{
      cursor: onClick ? "pointer" : "default",
      background: active ? "var(--surface-2)" : "transparent",
      opacity: muted ? 0.55 : 1,
      ...style,
    }}>{children}</tr>
  );
}
function TH({ children, align = "left", width, mono = true, style }) {
  return (
    <th style={{
      textAlign: align, padding: "10px 14px",
      borderBottom: "1px solid var(--border)",
      fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--fg-subtle)",
      width, whiteSpace: "nowrap",
      ...style,
    }}>{children}</th>
  );
}
function TD({ children, align = "left", mono = false, color, width, style }) {
  return (
    <td style={{
      textAlign: align, padding: "12px 14px",
      borderBottom: "1px solid var(--border)",
      fontFamily: mono ? ADMIN_MONO : ADMIN_FONT,
      fontSize: 13, fontWeight: 500,
      color: color || "var(--fg)",
      verticalAlign: "middle", width,
      ...style,
    }}>{children}</td>
  );
}

// ── Card / Panel ──────────────────────────────────────────────────────
function Panel({ title, action, children, padding = 18, style }) {
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {typeof title === "string" ? (
              <span style={{
                fontFamily: ADMIN_FONT, fontSize: 14, fontWeight: 700,
                color: "var(--fg)", letterSpacing: "-0.01em",
              }}>{title}</span>
            ) : title}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding }}>{children}</div>
    </div>
  );
}

// ── Cluster Path mark (mini, for sidebar) ─────────────────────────────
function CCMarkAdmin({ size = 22 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96">
      <rect width="96" height="96" fill="var(--bg)" rx="20" />
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

// ── Wordmark ──────────────────────────────────────────────────────────
function CCWordmarkAdmin({ size = 15, declaration = "ADMIN" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1 }}>
      <span style={{
        fontFamily: ADMIN_FONT, fontWeight: 800, fontSize: size,
        letterSpacing: "-0.02em", color: "var(--fg)",
      }}>
        concert<span style={{ color: "var(--accent)" }}>crawl.</span>
      </span>
      {declaration && (
        <span style={{
          fontFamily: ADMIN_MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em",
          color: "var(--signal)", textTransform: "uppercase",
        }}>{declaration}</span>
      )}
    </div>
  );
}

// ── Kbd ───────────────────────────────────────────────────────────────
function Kbd({ children }) {
  return (
    <span style={{
      fontFamily: ADMIN_MONO, fontSize: 10, fontWeight: 600,
      padding: "2px 6px", borderRadius: 4,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-1)", color: "var(--fg-muted)",
      letterSpacing: "0.04em",
    }}>{children}</span>
  );
}

Object.assign(window, {
  ADMIN_FONT, ADMIN_MONO,
  AdminIcon, MonoLabel, StatusBadge, StatCard, SectionHead, AdminButton,
  ProgressBar, Sparkline, Spinner, RelTime, CostText,
  AdminTable, THead, TR, TH, TD, Panel,
  CCMarkAdmin, CCWordmarkAdmin, Kbd,
});

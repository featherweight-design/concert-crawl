// spotify-shared.jsx — shared atoms for the Spotify Sync connect chapter
//
// BRAND / IP:
//   We do NOT redraw Spotify's trademarked logo. `SpotifyLogo` is a neutral,
//   clearly-marked PLACEHOLDER slot — the official Spotify logo asset (from their
//   brand-guideline pack, with their exact green) drops in here at integration.
//   It is always paired with the plain word "Spotify".
//
// COLOR:
//   Spotify green is pulled back to near-zero. It is NOT an app accent. Our own
//   palette carries the flow: var(--signal) for primary actions/status, and the
//   follow signal uses var(--accent). The --spotify-green token is retained only
//   for the official logo asset (which owns the green) — screens don't paint with it.
//
// Exports (window):
//   SpotifyLogo, SpotifyMark(alias), SpotifyLockup, ConnectButton, GreenButton(alias),
//   SignalButton, GhostButton, HonestyRail, EQGlyph, SyncStat, ArtistChip,
//   A11yNote, SectionNote

// ── Official-logo placeholder slot (NOT the Spotify logo) ────────
function SpotifyLogo({ size = 40, radius }) {
  const r = radius != null ? radius : Math.round(size * 0.28);
  const small = size <= 18;
  // No native title= — hover-only, and inconsistent on touch and screen readers
  // (project convention, see cc-tip.jsx). The placeholder's purpose is
  // documented in the comment above rather than in a tooltip.
  return (
    <div
      aria-label="Spotify"
      style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: "var(--surface-2)", border: `1px ${small ? "solid" : "dashed"} var(--border-strong)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      <svg width={Math.round(size * (small ? 0.62 : 0.52))} height={Math.round(size * (small ? 0.62 : 0.52))} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.4" stroke="var(--fg-subtle)" strokeWidth={small ? 1.8 : 1.5} />
        {!small && <path d="M7.5 10.2c3-1 6-.7 8.6.9M8.2 13c2.3-.7 4.6-.5 6.6.7M9 15.5c1.6-.4 3.2-.3 4.6.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />}
      </svg>
    </div>
  );
}
const SpotifyMark = SpotifyLogo; // back-compat alias

// ── "Spotify" wordmark lockup ────────────────────────────────────
function SpotifyLockup({ size = 15, mark = true, markSize = 22 }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {mark && <SpotifyLogo size={markSize} />}
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: size,
        color: "var(--fg)", letterSpacing: "-0.01em",
      }}>Spotify</span>
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────
// Connect action uses our PRIMARY (signal) — not green — with the logo slot.
function ConnectButton({ children = "Connect with Spotify", full = true, size = "lg", logo = true, style }) {
  const pad = size === "sm" ? "9px 14px" : "14px 18px";
  const fs = size === "sm" ? 13 : 15;
  return (
    <button style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      width: full ? "100%" : undefined,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
      padding: pad, borderRadius: 12, background: "var(--signal)",
      color: "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: fs, letterSpacing: "-0.01em",
      ...style,
    }}>
      {logo && <SpotifyLogo size={size === "sm" ? 16 : 18} radius={5} />}{children}
    </button>
  );
}
const GreenButton = ConnectButton; // back-compat alias (no longer green)

function SignalButton({ children, full = true, size = "lg", tone = "solid", leftIcon, style }) {
  const pad = size === "sm" ? "9px 14px" : "13px 18px";
  const fs = size === "sm" ? 13 : 15;
  const solid = tone === "solid";
  return (
    <button style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      width: full ? "100%" : undefined,
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: pad, borderRadius: 12,
      background: solid ? "var(--signal)" : "transparent",
      color: solid ? "var(--fg-on-accent)" : "var(--signal)",
      border: solid ? "none" : "1.5px solid color-mix(in oklch, var(--signal) 45%, var(--border))",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: fs, letterSpacing: "-0.01em",
      ...style,
    }}>
      {leftIcon}{children}
    </button>
  );
}

function GhostButton({ children, full = true, danger = false, size = "lg", style }) {
  const pad = size === "sm" ? "9px 14px" : "13px 18px";
  const fs = size === "sm" ? 13 : 15;
  return (
    <button style={{
      all: "unset", boxSizing: "border-box", cursor: "pointer",
      width: full ? "100%" : undefined, textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: pad, borderRadius: 12, background: "transparent",
      color: danger ? "var(--danger)" : "var(--fg-muted)",
      border: `1px solid ${danger ? "color-mix(in oklch, var(--danger) 40%, var(--border))" : "var(--border-strong)"}`,
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: fs, letterSpacing: "-0.01em",
      ...style,
    }}>{children}</button>
  );
}

// ── Honesty rail — the "we never see your password" trust list ──
const TRUST_LINES = [
  { k: "pw",   t: "We never see your password.", d: "You log in on Spotify's own page. We just get a yes." },
  { k: "read", t: "Read-only. Your top & followed artists.", d: "No playlists changed, nothing posted, nothing played." },
  { k: "off",  t: "Unlink anytime, one tap.", d: "Disconnect wipes the token and the taste match on the spot." },
];
function TrustIcon({ k }) {
  const c = "var(--signal)";
  if (k === "pw") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3.5" y="8" width="11" height="7" rx="1.6" stroke={c} strokeWidth="1.5"/><path d="M6 8V6a3 3 0 016 0v2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
  if (k === "read") return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1.5 9S4 4 9 4s7.5 5 7.5 5-2.5 5-7.5 5S1.5 9 1.5 9z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.2" stroke={c} strokeWidth="1.5"/></svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7.5 10.5l3-3m-1.2-2.3l1-1a2.8 2.8 0 013.9 3.9l-1 1m-6.4 0l-1 1a2.8 2.8 0 003.9 3.9l1-1" stroke={c} strokeWidth="1.5" strokeLinecap="round"/><path d="M3 3l12 12" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>
  );
}
function HonestyRail({ compact = false, lines = TRUST_LINES }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 13 }}>
      {lines.map(l => (
        <div key={l.k} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "color-mix(in oklch, var(--signal) 12%, transparent)",
            border: "1px solid color-mix(in oklch, var(--signal) 26%, transparent)",
          }}><TrustIcon k={l.k} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
              color: "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.3,
            }}>{l.t}</div>
            {!compact && <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
              color: "var(--fg-muted)", marginTop: 2, lineHeight: 1.35,
            }}>{l.d}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Small EQ glyph (decorative) ────────────────────────────────
function EQGlyph({ size = 18, color = "var(--signal)", bars = 4 }) {
  const heights = [0.5, 1, 0.7, 0.9, 0.6];
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const w = 2.4, gap = (18 - bars * w) / (bars + 1);
        const x = gap + i * (w + gap);
        const h = 4 + heights[i % heights.length] * 10;
        return <rect key={i} x={x} y={16 - h} width={w} height={h} rx={1} fill={color} />;
      })}
    </svg>
  );
}

// ── Sync stat ───────────────────────────────────────────────────
function SyncStat({ value, label, tone = "fg" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
        color: tone === "signal" ? "var(--signal)" : "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
        color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}

// ── Artist chip (imported taste) ────────────────────────────────
function ArtistChip({ name, hue = 280, follow = false }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "5px 10px 5px 5px", borderRadius: 999,
      background: "var(--surface-2)", border: "1px solid var(--border)",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 999, flexShrink: 0,
        background: `linear-gradient(135deg, oklch(0.55 0.16 ${hue}), oklch(0.4 0.12 ${hue + 40}))`,
      }} />
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
        color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
      }}>{name}</span>
      {follow && <EQGlyph size={13} bars={3} color="var(--fg-muted)" />}
    </div>
  );
}

// ── Canvas-only annotation atoms ───────────────────────────────
function A11yNote({ title, items = [], tone = "a11y" }) {
  const c = tone === "a11y" ? "#2E7D5B" : "#8A5A00";
  return (
    <div style={{
      width: 260, background: "#FBFAF6", border: `1px solid ${c}33`,
      borderLeft: `3px solid ${c}`, borderRadius: 10, padding: "12px 14px",
      fontFamily: "Inter, system-ui",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        color: c, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: 5, background: c }} />
        {tone === "a11y" ? "A11Y · " : "NOTE · "}{title}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <li key={i} style={{
            fontSize: 11.5, color: "#3A3A34", lineHeight: 1.4, paddingLeft: 12, position: "relative",
          }}>
            <span style={{ position: "absolute", left: 0, top: 6, width: 4, height: 4, borderRadius: 4, background: `${c}99` }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionNote({ children }) {
  return (
    <div style={{
      maxWidth: 760, fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.5,
      color: "#4A473F", background: "#FBFAF6", border: "1px solid #E3DFD4",
      borderRadius: 10, padding: "12px 16px",
    }}>{children}</div>
  );
}

Object.assign(window, {
  SpotifyLogo, SpotifyMark, SpotifyLockup, ConnectButton, GreenButton,
  SignalButton, GhostButton, HonestyRail, EQGlyph, SyncStat, ArtistChip, A11yNote, SectionNote,
});

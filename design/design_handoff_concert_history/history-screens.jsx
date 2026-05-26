// history-screens.jsx — Concert History (Supporter feature)
//
// Lives as a sibling tab on the Watching page (Watching · History) and as a
// direct link from Profile. Past shows in reverse-chrono buckets:
//   This month → Last month → <Month YYYY> descending
//
// Differences from Watching:
//   - No price column. The night is the keepsake; the live price-tracking
//     is over once the show passed. A small `priceFinal` lives on roomy.
//   - Stub stamp replaces the remove-X on the right — a 28×28 SVG mark
//     that picks its accent + glyph from the artist hash. Same visual
//     vocabulary as the marketing Showtime stub, scaled down to row badge.
//   - Header is a three-fact stat line (X nights · Y venues · top genre),
//     same numbers as the optional PassportCard so the user feels the
//     summary even if they never open the share card.
//   - No remove affordance, no "stop watching" — past attendance isn't
//     editable in v1. The "Did you actually go?" toggle is open for a
//     future pass.
//
// Exports (all attached to window):
//   <HistoryRoute>             — mobile hub
//   <HistoryRouteDesktop>      — desktop topnav + main shell
//   <HistoryItem>              — single past-show row. density compact|cozy|roomy
//   <StubStamp>                — the 28px ticket-stub stamp glyph
//   <HistoryHeader>            — three-fact stat line
//   <HistoryEmpty>             — Supporter, no past shows yet
//   <SaveCalendarRow>          — the export-calendar affordance (Supporter perk)
//   <WatchingHistoryTabs>      — segmented Watching · History tab on Watching page

const { useState, useMemo } = React;

// ── Icons (local to history) ─────────────────────────────────
function HIconCalendar({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M1.5 5.5h11M4.5 1v2.5M9.5 1v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function HIconShare({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8.5M7 1L4 4M7 1l3 3M2.5 8.5v3.5h9V8.5"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function HIconLock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.4" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M4.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
    </svg>
  );
}
function HIconSparkle({ size = 10, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M5 0.5L5.9 4.1L9.5 5L5.9 5.9L5 9.5L4.1 5.9L0.5 5L4.1 4.1Z" fill={color}/>
    </svg>
  );
}

// ── Stub stamp ────────────────────────────────────────────────
// A miniature ticket-stub mark for each history row. Two halves separated
// by a dashed perforation, a centered glyph in the per-show accent color.
// 28×28 default — sized to live in the row's right gutter where Watching
// puts the price column. Lifts the visual DNA of the marketing Showtime
// stub but trades all decoration for a single bold mark.
function StubStamp({ artist, size = 28, glyphKind, accent }) {
  const color = accent || h_accentFor(artist || "");
  const kind  = glyphKind || h_glyphFor(artist || "");
  const stroke = "color-mix(in oklch, " + color + " 60%, transparent)";
  const half = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 28 28" style={{ display: "block" }}>
        {/* left half */}
        <path d="M2 5 Q2 2 5 2 L13 2 L13 26 L5 26 Q2 26 2 23 Z"
          fill="var(--surface-2)" stroke={stroke} strokeWidth="1"/>
        {/* right half */}
        <path d="M15 2 L23 2 Q26 2 26 5 L26 23 Q26 26 23 26 L15 26 Z"
          fill="var(--surface-2)" stroke={stroke} strokeWidth="1"/>
        {/* perforation */}
        <line x1="14" y1="3" x2="14" y2="25"
          stroke={color} strokeWidth="0.9" strokeDasharray="1.4 1.6" opacity="0.85"/>
        {/* centered glyph — drawn straight into the SVG so it's pixel-centered */}
        {kind === "star" && (
          <polygon
            transform="translate(14 14) scale(0.42) translate(-12 -12)"
            points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
            fill={color}/>
        )}
        {kind === "diamond" && (
          <polygon
            transform="translate(14 14) scale(0.45) translate(-12 -12)"
            points="12,2 22,12 12,22 2,12"
            fill={color}/>
        )}
        {kind === "ring" && (
          <circle cx="14" cy="14" r="4.2" stroke={color} strokeWidth="1.8" fill="none"/>
        )}
        {kind === "triangle" && (
          <polygon
            transform="translate(14 14) scale(0.42) translate(-12 -12)"
            points="12,3 21,19 3,19"
            fill={color}/>
        )}
      </svg>
    </div>
  );
}

// ── Single history row ───────────────────────────────────────
// Mirrors WatchingItem's grid but the right column is a stub stamp and an
// optional small final-price line under it (roomy only). Title block keeps
// the artist + meta two-line treatment so the surfaces feel like siblings.
function HistoryItem({ show, density = "cozy" }) {
  const sizes = {
    compact: { art: 40, padY: 10, padL: 14, padR: 14, gap: 12, title: 13,   meta: 11,   stub: 24 },
    cozy:    { art: 56, padY: 14, padL: 14, padR: 16, gap: 14, title: 14.5, meta: 11.5, stub: 28 },
    roomy:   { art: 64, padY: 18, padL: 18, padR: 20, gap: 16, title: 16,   meta: 12,   stub: 32 },
  }[density];

  const venueDate = `${show.venue} · ${show.dateLabel}${show.showTime ? ` · ${show.showTime}` : ""}`;

  return (
    <div
      data-screen-label={`history-row-${show.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: `${sizes.art}px 1fr auto`,
        gap: sizes.gap,
        alignItems: "center",
        padding: `${sizes.padY}px ${sizes.padR}px ${sizes.padY}px ${sizes.padL}px`,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        position: "relative",
        fontFamily: "Inter, system-ui",
      }}
    >
      {/* Identity art */}
      <div style={{ width: sizes.art, height: sizes.art, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
        <IdentityArt name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}/>
      </div>

      {/* Title block */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: density === "roomy" ? 4 : 2 }}>
        <div style={{
          fontWeight: 700, fontSize: sizes.title, letterSpacing: "-0.01em",
          color: "var(--fg)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{show.artist}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: sizes.meta,
          color: "var(--fg-muted)", letterSpacing: "0.02em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{venueDate}</div>
        {density === "roomy" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
            color: "var(--fg-subtle)", letterSpacing: "0.02em",
          }}>
            <span>{show.genre}</span>
            {show.priceFinal != null && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>paid ${show.priceFinal}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stub stamp — sits where Watching puts the price column */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <StubStamp artist={show.artist} size={sizes.stub}/>
      </div>
    </div>
  );
}

// ── Stat tile (used in header) ───────────────────────────────
// One number + one label. Mono label, oversized Inter number. Used three
// times in the header bar (nights / venues / top genre).
function StatTile({ value, label, accent }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
    }}>
      <span style={{
        fontFamily: "Inter, system-ui",
        fontSize: 28, fontWeight: 900, letterSpacing: "-0.025em",
        color: accent ? "var(--fg)" : "var(--fg)",
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--fg-subtle)",
      }}>{label}</span>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────
// Three stat tiles in a row: nights / venues / top genre. Mono eyebrow
// above. The three numbers are the same ones that anchor the PassportCard —
// surfacing them here means the keepsake feeling lives in the surface itself,
// not behind a separate share button.
function HistoryHeader({ stats, range = "all-time" }) {
  const nights = stats.nights;
  const venues = stats.venues;
  const top    = stats.topGenre;

  return (
    <div style={{
      padding: "20px 20px 20px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
        }}>Your history · {range}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--accent)",
          border: "1px solid color-mix(in oklch, var(--accent) 45%, transparent)",
          padding: "2px 6px", borderRadius: 3,
        }}>+ Supporter</span>
      </div>
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1px auto 1px 1fr",
        alignItems: "center", gap: 18,
      }}>
        <StatTile value={nights} label={nights === 1 ? "night" : "nights"}/>
        <div style={{ width: 1, height: 36, background: "var(--border)" }}/>
        <StatTile value={venues} label={venues === 1 ? "venue" : "venues"}/>
        <div style={{ width: 1, height: 36, background: "var(--border)" }}/>
        <StatTile
          value={top ? top.name : "—"}
          label={top ? `top genre · ${top.count}` : "top genre"}
        />
      </div>
    </div>
  );
}

// ── Save-to-calendar row ─────────────────────────────────────
// The other Supporter perk. Lives under the bucket list, not in a tab nav —
// it's an action you take *from* your history, not a separate destination.
function SaveCalendarRow({ count }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 16px",
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      cursor: "pointer", transition: "background 120ms",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
    onMouseLeave={e => e.currentTarget.style.background = "var(--surface-1)"}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-2)", color: "var(--signal)", flexShrink: 0,
      }}>
        <HIconCalendar size={16}/>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>
          Export to calendar
        </div>
        <div style={{
          fontSize: 11.5, color: "var(--fg-muted)",
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em", marginTop: 3,
        }}>
          {count} {count === 1 ? "night" : "nights"} · iCal · Google · Apple
        </div>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--signal)",
        border: "1px solid color-mix(in oklch, var(--signal) 50%, transparent)",
        padding: "3px 7px", borderRadius: 3, flexShrink: 0,
      }}>.ics</span>
    </div>
  );
}

// ── Section header (reused from Watching's vocab) ────────────
function HistorySection({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "10px 4px 4px" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)",
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>· {subtitle}</span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

// ── Tabs (Watching · History) ────────────────────────────────
// Segmented control that sits at the top of the Watching page on mobile.
// On desktop the existing TopNav stays, and the tabs become a sub-header
// underneath the page title.
function WatchingHistoryTabs({ active = "history", onChange }) {
  const tabs = [
    { key: "watching", label: "Watching" },
    { key: "history",  label: "History" },
  ];
  return (
    <div style={{
      display: "flex", padding: "12px 20px 12px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      gap: 4,
    }}>
      <div style={{
        display: "flex", padding: 3, gap: 3,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 9,
      }}>
        {tabs.map(t => {
          const a = t.key === active;
          return (
            <button key={t.key}
              onClick={() => onChange && onChange(t.key)}
              style={{
                all: "unset", cursor: "pointer",
                padding: "7px 14px", borderRadius: 6,
                fontFamily: "Inter, system-ui",
                fontWeight: a ? 700 : 500, fontSize: 12.5,
                letterSpacing: "-0.005em",
                color: a ? "var(--fg)" : "var(--fg-muted)",
                background: a ? "var(--surface-3)" : "transparent",
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "background 120ms, color 120ms",
              }}>
              {t.label}
              {t.key === "history" && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: a ? "var(--accent)" : "var(--fg-subtle)",
                }}>
                  <HIconSparkle size={8} color="currentColor"/>+
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  HistoryItem, StubStamp, HistoryHeader, HistorySection, SaveCalendarRow,
  WatchingHistoryTabs, StatTile, HIconCalendar, HIconShare, HIconLock, HIconSparkle,
});

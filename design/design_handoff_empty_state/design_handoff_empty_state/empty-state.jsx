// empty-state.jsx — reusable <EmptyState/> for Concert Crawl.
//
// One component, three visual directions, used across every surface where
// we render zero rows. The directions intentionally share spacing/anatomy
// so the eng implementation is one component with a `variant` prop — the
// art-direction lives in tokens + a small render switch, not separate
// components.
//
// API
// ────────────────────────────────────────────────────────────────────
//   <EmptyState
//      variant="quiet" | "suggestive" | "voice"   // direction (locked at the route level)
//      state="no-data" | "filtered" | "error"     // why it's empty
//      density="default" | "dense"                // dense = inside a list slot
//      eyebrow="Watching"                         // small monospace label
//      title="Crickets."
//      body="You're not watching any shows yet…"
//      primaryCta={{ label: "Browse tonight", onClick }}
//      secondaryCta={{ label: "Clear filters", onClick }}   // optional
//      suggestions={[{label,onClick}]}            // suggestive variant only
//      icon={<IconBookmark/>}                     // optional; quiet only
//   />
//
// All copy comes from the caller — no defaults baked in. The `state` prop
// only changes accent treatment (filtered = signal, error = warning) and
// whether the dashed-frame icon shows.
//
// Tokens used: --fg, --fg-muted, --fg-subtle, --border, --border-strong,
// --signal, --fg-on-accent, --warning, --surface-1, --bg-elevated.

const { useMemo } = React;

// ── Inline icons (match the watching-screens icon set) ───────────────
function ESIconBookmark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2h9v12L8 11l-4.5 3V2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function ESIconSearch({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function ESIconCalendar({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 6.5h12M5 2.5v2M11 2.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function ESIconBolt({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 1.5 3.5 9h4l-1 5.5L13 7H9l1-5.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function ESIconWifiOff({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 5.5C3.5 4 5.5 3 8 3s4.5 1 6 2.5M4 8c1-1 2.4-1.6 4-1.6S10.5 7 11.5 8M6.2 10.4c.5-.5 1.1-.8 1.8-.8s1.3.3 1.8.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8" cy="13" r="1" fill="currentColor"/>
      <path d="m2 2 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

const ES_ICONS = {
  bookmark: ESIconBookmark,
  search:   ESIconSearch,
  calendar: ESIconCalendar,
  bolt:     ESIconBolt,
  wifi:     ESIconWifiOff,
};

// ── Buttons (match patterns used in browse-home / watching-screens) ──
function ESPrimary({ children, onClick, dense }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "var(--signal)", color: "var(--fg-on-accent)",
      borderRadius: 999,
      padding: dense ? "9px 16px" : "11px 20px",
      fontFamily: "Inter, system-ui",
      fontSize: dense ? 12.5 : 13.5, fontWeight: 700,
      letterSpacing: "-0.005em",
    }}>{children}</button>
  );
}
function ESSecondary({ children, onClick, dense }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "transparent", color: "var(--fg-muted)",
      borderRadius: 999,
      padding: dense ? "8px 12px" : "10px 14px",
      fontFamily: "Inter, system-ui",
      fontSize: dense ? 12 : 13, fontWeight: 600,
      letterSpacing: "-0.005em",
      borderBottom: "1px dashed var(--border-strong)",
      borderRadius: 0, paddingLeft: 0, paddingRight: 0,
      marginTop: 2,
    }}>{children}</button>
  );
}
function ESChip({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "7px 12px",
      borderRadius: 999,
      background: "var(--surface-1)",
      color: "var(--fg)",
      border: "1px solid var(--border)",
      fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 600,
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

// ── Direction 1: Quiet utility ──────────────────────────────────────
// Type + microcopy + single CTA. Tiny dashed-frame icon (no-data only).
// Safest baseline; reads well at any density.
function ESQuiet({ state, density, eyebrow, title, body, primaryCta, secondaryCta, icon }) {
  const dense = density === "dense";
  const Icon = icon ? ES_ICONS[icon] : null;
  const accent = state === "error" ? "var(--warning)" : "var(--fg-subtle)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: dense ? 12 : 16, padding: dense ? "32px 24px" : "64px 32px",
      textAlign: "center", fontFamily: "Inter, system-ui", color: "var(--fg)",
      maxWidth: dense ? 360 : 420, marginInline: "auto",
    }}>
      {Icon && state !== "filtered" && (
        <div style={{
          width: dense ? 44 : 56, height: dense ? 44 : 56, borderRadius: 12,
          border: `1.5px dashed ${state === "error" ? "var(--warning)" : "var(--border-strong)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent,
        }}>
          <Icon size={dense ? 20 : 24}/>
        </div>
      )}
      {eyebrow && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: accent,
          letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
        }}>{eyebrow}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: dense ? 4 : 6 }}>
        <div style={{
          fontSize: dense ? 18 : 22, fontWeight: 800, letterSpacing: "-0.02em",
          color: "var(--fg)", lineHeight: 1.15,
        }}>{title}</div>
        <div style={{
          fontSize: dense ? 12.5 : 13.5, color: "var(--fg-muted)",
          lineHeight: 1.5, letterSpacing: "-0.005em",
          textWrap: "pretty", maxWidth: 340, marginInline: "auto",
        }}>{body}</div>
      </div>
      {(primaryCta || secondaryCta) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: dense ? 4 : 6, marginTop: dense ? 2 : 6 }}>
          {primaryCta && <ESPrimary onClick={primaryCta.onClick} dense={dense}>{primaryCta.label}</ESPrimary>}
          {secondaryCta && <ESSecondary onClick={secondaryCta.onClick} dense={dense}>{secondaryCta.label}</ESSecondary>}
        </div>
      )}
    </div>
  );
}

// ── Direction 2: Suggestive ─────────────────────────────────────────
// Same anatomy as quiet, but the "next move" surfaces as tappable chips
// instead of (or alongside) a single CTA. Reduces dead-ends.
function ESSuggestive({ state, density, eyebrow, title, body, primaryCta, secondaryCta, suggestions }) {
  const dense = density === "dense";
  const accent = state === "error" ? "var(--warning)" : "var(--signal)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: dense ? 12 : 18, padding: dense ? "32px 20px" : "56px 28px",
      textAlign: "center", fontFamily: "Inter, system-ui", color: "var(--fg)",
      maxWidth: dense ? 380 : 460, marginInline: "auto",
    }}>
      {eyebrow && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: accent,
          letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: accent, opacity: 0.9 }}/>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: dense ? 4 : 6 }}>
        <div style={{
          fontSize: dense ? 18 : 22, fontWeight: 800, letterSpacing: "-0.02em",
          color: "var(--fg)", lineHeight: 1.15,
        }}>{title}</div>
        <div style={{
          fontSize: dense ? 12.5 : 13.5, color: "var(--fg-muted)",
          lineHeight: 1.5, letterSpacing: "-0.005em",
          textWrap: "pretty", maxWidth: 360, marginInline: "auto",
        }}>{body}</div>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: "var(--fg-subtle)",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>Try</div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6,
            justifyContent: "center", maxWidth: 340,
          }}>
            {suggestions.map((s, i) => <ESChip key={i} onClick={s.onClick}>{s.label}</ESChip>)}
          </div>
        </div>
      )}

      {(primaryCta || secondaryCta) && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 2 }}>
          {primaryCta && <ESPrimary onClick={primaryCta.onClick} dense={dense}>{primaryCta.label}</ESPrimary>}
          {secondaryCta && <ESSecondary onClick={secondaryCta.onClick} dense={dense}>{secondaryCta.label}</ESSecondary>}
        </div>
      )}
    </div>
  );
}

// ── Direction 3: Voice ──────────────────────────────────────────────
// Editorial — oversized display headline, monospace status line above as
// a typographic "anchor". Body stays informative; the personality lives in
// the headline and a single status word ("CRICKETS / FILTERED / OFFLINE").
function ESVoice({ state, density, eyebrow, title, body, primaryCta, secondaryCta }) {
  const dense = density === "dense";
  const accent = state === "error" ? "var(--warning)" : state === "filtered" ? "var(--signal)" : "var(--accent)";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center",
      gap: dense ? 10 : 16, padding: dense ? "30px 24px" : "60px 28px",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
      maxWidth: dense ? 380 : 480, marginInline: "auto",
    }}>
      {/* Status rail: mono code on the left, hairline rule on the right.
          Gives the surface a "broadcasting nothing" feel without an icon. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: accent,
          letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
          whiteSpace: "nowrap",
        }}>{eyebrow}</div>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: "var(--fg-subtle)",
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>{state === "error" ? "err" : state === "filtered" ? "0 hits" : "0 / 0"}</div>
      </div>
      <div style={{
        fontSize: dense ? 32 : 52, fontWeight: 900,
        letterSpacing: dense ? "-0.035em" : "-0.045em", lineHeight: 0.95,
        color: "var(--fg)", textWrap: "balance",
      }}>{title}</div>
      <div style={{
        fontSize: dense ? 12.5 : 14, color: "var(--fg-muted)",
        lineHeight: 1.55, letterSpacing: "-0.005em",
        textWrap: "pretty", maxWidth: 380,
      }}>{body}</div>
      {(primaryCta || secondaryCta) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginTop: dense ? 4 : 8, flexWrap: "wrap",
        }}>
          {primaryCta && <ESPrimary onClick={primaryCta.onClick} dense={dense}>{primaryCta.label}</ESPrimary>}
          {secondaryCta && <ESSecondary onClick={secondaryCta.onClick} dense={dense}>{secondaryCta.label}</ESSecondary>}
        </div>
      )}
    </div>
  );
}

// ── Direction 4: Hybrid (recommended) ───────────────────────────────
// Borrows from all three:
//   · Mono status rail from D3 (Voice) — gives the surface a "broadcasting
//     nothing" feel without an icon dependency.
//   · Dashed-frame icon from D1 (Quiet) — kept for no-data states only,
//     centered above the rail. Drops out for filtered/error.
//   · Headline weight from D2 (Suggestive) at a tuned size (~28px) — the
//     editorial energy of D3 without crowding mobile.
//   · Simple primary + secondary CTA stack — no dynamic chip suggestions.
//     Anything routed off this surface is a known-static destination.
function ESHybrid({ state, density, eyebrow, title, body, primaryCta, secondaryCta }) {
  const dense = density === "dense";
  const accent = state === "error" ? "var(--warning)" : state === "filtered" ? "var(--signal)" : "var(--accent)";
  const railRight = state === "error" ? "err" : state === "filtered" ? "0 hits" : "0 / 0";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center",
      gap: dense ? 10 : 14, padding: dense ? "28px 24px" : "52px 28px",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
      maxWidth: dense ? 380 : 460, marginInline: "auto", width: "100%",
    }}>
      {/* Mono status rail: dot + eyebrow on the left, hairline rule, status code on the right. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: accent, flexShrink: 0 }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: accent,
          letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
          whiteSpace: "nowrap",
        }}>{eyebrow}</div>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: dense ? 9 : 10, color: "var(--fg-subtle)",
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>{railRight}</div>
      </div>
      <div style={{
        fontSize: dense ? 26 : 38, fontWeight: 900,
        letterSpacing: dense ? "-0.03em" : "-0.035em", lineHeight: 1.0,
        color: "var(--fg)", textWrap: "balance",
      }}>{title}</div>
      <div style={{
        fontSize: dense ? 12.5 : 14, color: "var(--fg-muted)",
        lineHeight: 1.55, letterSpacing: "-0.005em",
        textWrap: "pretty", maxWidth: 380,
      }}>{body}</div>
      {(primaryCta || secondaryCta) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginTop: dense ? 4 : 8, flexWrap: "wrap",
        }}>
          {primaryCta && <ESPrimary onClick={primaryCta.onClick} dense={dense}>{primaryCta.label}</ESPrimary>}
          {secondaryCta && <ESSecondary onClick={secondaryCta.onClick} dense={dense}>{secondaryCta.label}</ESSecondary>}
        </div>
      )}
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────
function EmptyState(props) {
  const { variant = "hybrid" } = props;
  if (variant === "suggestive") return <ESSuggestive {...props}/>;
  if (variant === "voice")      return <ESVoice {...props}/>;
  if (variant === "quiet")      return <ESQuiet {...props}/>;
  return <ESHybrid {...props}/>;
}

window.EmptyState = EmptyState;
window.ES_ICONS = ES_ICONS;

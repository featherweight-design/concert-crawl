// supporting-line.jsx — #643 Supporting Artists Title Separator
// ────────────────────────────────────────────────────────────────────────────
// The rendering fix for event titles. Today supporting artists + tour name are
// one run-on string below the headliner. This splits the two concerns and gives
// the openers a real separator treatment.
//
// DATA (eng ships on Event):   supportingArtists: string[]   tourName: string|null
// COPY (Sour Patch voice, ours): lead word ("with"), "+N more", tour-only line.
//   → artist names are DATA and never get our voice; scaffolding IS copy.
//
// Exports:
//   <EventTitleBlock/>  — the composed title block every surface renders
//   <SupportingLine/>   — just the openers line (the atomic separator treatment)
//   supportingA11yLabel() — natural-language list phrasing for screen readers
//
// Every colour is a token (var(--*)); no raw hex. Works across all 9 themes.

// ── Scaffolding copy (Sour Patch voice) ──────────────────────────────────────
// These are the ONLY strings we author. Artist names come from data untouched.
const SUPPORT_COPY = {
  lead:       "with",              // billing lead-word before the openers
  more:       (n) => `+${n} more`, // overflow tail
  tourOnly:   "just the headliner tonight", // openers empty + no tour → optional whisper
};

// ── Separator glyphs available to the billing variant ────────────────────────
// The default "·" matches the app's mono-metadata rhythm but is framed by the
// "with" lead-word so it never reads as venue·time·price metadata.
const SEPARATORS = {
  middot: "·",
  bullet: "•",
  slash:  "/",
  comma:  ",",
};

// ── Natural-language list phrasing for SR (list, not run-on) ─────────────────
// Screen readers get the COMPLETE list regardless of visual truncation.
function supportingA11yLabel({ lead, artists }) {
  if (!artists || artists.length === 0) return "";
  if (artists.length === 1) return `${lead} ${artists[0]}`;
  if (artists.length === 2) return `${lead} ${artists[0]} and ${artists[1]}`;
  const head = artists.slice(0, -1).join(", ");
  const last = artists[artists.length - 1];
  return `${lead} ${head}, and ${last}`;
}

// ── sr-only (visually hidden, still announced) ───────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("sal-styles")) {
  const s = document.createElement("style");
  s.id = "sal-styles";
  s.textContent = `
    .sal-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;
      overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .sal-name{transition:color .12s}
    .sal-name.sal-tap{cursor:pointer}
    .sal-name.sal-tap:hover{color:var(--signal)}
    .sal-chip.sal-tap{cursor:pointer;transition:border-color .12s,color .12s}
    .sal-chip.sal-tap:hover{border-color:var(--signal);color:var(--fg)}
  `;
  document.head.appendChild(s);
}

// ── Size ramp per surface ────────────────────────────────────────────────────
const RAMP = {
  card:   { head: 15, tour: 9,  lead: 10, name: 12,  gap: 2 },
  hero:   { head: 22, tour: 10, lead: 11, name: 13,  gap: 3 },
  detail: { head: 34, tour: 12, lead: 13, name: 16,  gap: 5 },
};

// ─────────────────────────────────────────────────────────────────────────────
// SupportingLine — the openers billing line (atomic separator treatment)
// ─────────────────────────────────────────────────────────────────────────────
function SupportingLine({
  artists = [],
  surface = "card",
  variant = "billing",        // "billing" | "chips"
  separator = "middot",
  lead = SUPPORT_COPY.lead,
  maxInline = null,           // count-based truncation (eng does width-based)
  interactive = false,        // #84 forward-compat — openers become tappable
  dim = false,                // cancelled/postponed → reduced emphasis
  onArtist,
}) {
  if (!artists || artists.length === 0) return null;
  const r = RAMP[surface] || RAMP.card;
  const sep = SEPARATORS[separator] || SEPARATORS.middot;

  // Truncation: show first N, roll the rest into "+N more".
  const limit = maxInline == null ? artists.length : Math.max(1, maxInline);
  const shown = artists.slice(0, limit);
  const hidden = artists.length - shown.length;

  const nameColor = dim ? "var(--fg-subtle)" : "var(--fg-muted)";
  const sepColor  = "var(--fg-subtle)";
  const leadColor = "var(--fg-subtle)";

  const a11y = supportingA11yLabel({ lead, artists });

  // ── Chips variant ──────────────────────────────────────────────────────────
  if (variant === "chips") {
    return (
      <div role="group" aria-label={a11y} style={{
        display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap",
        overflow: "hidden", minWidth: 0,
      }}>
        <span aria-hidden="true" style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: r.lead,
          color: leadColor, letterSpacing: "0.04em", flexShrink: 0,
        }}>{lead}</span>
        {shown.map((name, i) => {
          const tap = interactive;
          const Tag = tap ? "button" : "span";
          return (
            <Tag key={i} aria-hidden="true"
              onClick={tap ? () => onArtist && onArtist(name) : undefined}
              className={"sal-chip" + (tap ? " sal-tap" : "")}
              style={{
                all: tap ? "unset" : undefined,
                display: "inline-flex", alignItems: "center", flexShrink: 0,
                padding: "2px 8px", borderRadius: 999,
                border: "1px solid var(--border-strong)",
                background: "transparent",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: r.name,
                color: nameColor, letterSpacing: "-0.005em", lineHeight: 1.4,
                cursor: tap ? "pointer" : "default", whiteSpace: "nowrap",
              }}>{name}</Tag>
          );
        })}
        {hidden > 0 && (
          <span aria-hidden="true" style={{
            flexShrink: 0, padding: "2px 8px", borderRadius: 999,
            border: "1px dashed var(--border-strong)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: r.name - 1,
            color: "var(--fg-subtle)", letterSpacing: "0.02em", whiteSpace: "nowrap",
          }}>{SUPPORT_COPY.more(hidden)}</span>
        )}
      </div>
    );
  }

  // ── Billing variant (default) ────────────────────────────────────────────
  return (
    <div role="group" aria-label={a11y} style={{
      display: "flex", alignItems: "baseline", minWidth: 0,
      fontFamily: "Inter, system-ui", lineHeight: 1.35,
    }}>
      {/* lead word — mono, quiet, framing the names as a support bill */}
      <span aria-hidden="true" style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: r.lead,
        color: leadColor, letterSpacing: "0.04em", flexShrink: 0,
        marginRight: 6, position: "relative", top: "-0.02em",
      }}>{lead}</span>
      {/* names + separators — truncates as one clipped run */}
      <span aria-hidden="true" style={{
        minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {shown.map((name, i) => {
          const tap = interactive;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{
                  color: sepColor, padding: "0 6px", fontWeight: 400,
                  fontSize: r.name,
                }}>{sep}</span>
              )}
              <span
                onClick={tap ? () => onArtist && onArtist(name) : undefined}
                className={"sal-name" + (tap ? " sal-tap" : "")}
                style={{
                  fontWeight: 600, fontSize: r.name, color: nameColor,
                  letterSpacing: "-0.005em",
                }}>{name}</span>
            </React.Fragment>
          );
        })}
        {hidden > 0 && (
          <>
            <span style={{ color: sepColor, padding: "0 6px", fontSize: r.name }}>{sep}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: r.name - 1.5,
              color: "var(--fg-subtle)", fontWeight: 500, letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}>{SUPPORT_COPY.more(hidden)}</span>
          </>
        )}
      </span>
    </div>
  );
}

// ── Tour eyebrow — the hierarchy call: a mono kicker ABOVE the headliner ─────
// Placing the tour name above the headliner (not below) keeps it out of the
// openers' slot — which is what was causing the run-on mash in the first place.
function TourEyebrow({ tourName, surface = "card", dim = false }) {
  if (!tourName) return null;
  const r = RAMP[surface] || RAMP.card;
  return (
    <div aria-label={`Tour: ${tourName}`} style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: r.tour,
      color: dim ? "var(--fg-subtle)" : "var(--fg-muted)",
      letterSpacing: "0.14em", textTransform: "uppercase",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      marginBottom: surface === "detail" ? 8 : 3,
    }}>{tourName}</div>
  );
}

// ── Tour subtitle — alternate placement (italic line below headliner) ────────
function TourSubtitle({ tourName, surface = "card", dim = false }) {
  if (!tourName) return null;
  const r = RAMP[surface] || RAMP.card;
  return (
    <div aria-label={`Tour: ${tourName}`} style={{
      fontFamily: "Inter, system-ui", fontStyle: "italic", fontWeight: 500,
      fontSize: r.name, color: dim ? "var(--fg-subtle)" : "var(--fg-muted)",
      letterSpacing: "-0.005em", whiteSpace: "nowrap", overflow: "hidden",
      textOverflow: "ellipsis", marginTop: 2,
    }}>{tourName}</div>
  );
}

// ── Status pill (cancelled / postponed) — reused rhythm, token-only ──────────
function StatusPill({ status, surface = "card" }) {
  if (!status) return null;
  const map = {
    cancelled: { label: "CANCELLED", tone: "var(--danger)" },
    postponed: { label: "POSTPONED", tone: "var(--warning)" },
  };
  const s = map[status];
  if (!s) return null;
  const r = RAMP[surface] || RAMP.card;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", flexShrink: 0,
      padding: "2px 7px", borderRadius: 4,
      border: `1px solid ${s.tone}`, color: s.tone, background: "transparent",
      fontFamily: "'JetBrains Mono', monospace", fontSize: r.tour,
      fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      lineHeight: 1,
    }}>{s.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EventTitleBlock — the composed block every surface renders.
// Order (top→bottom): [status? · tour eyebrow] → headliner → openers billing line
// ─────────────────────────────────────────────────────────────────────────────
function EventTitleBlock({
  headliner,
  supportingArtists = [],
  tourName = null,
  surface = "card",
  variant = "billing",
  separator = "middot",
  lead = SUPPORT_COPY.lead,
  tourPlacement = "eyebrow",   // "eyebrow" | "subtitle" | "hidden"
  maxInline = null,
  status = null,               // null | "cancelled" | "postponed"
  interactive = false,
  onArtist,
}) {
  const r = RAMP[surface] || RAMP.card;
  const dim = !!status;
  const hasOpeners = supportingArtists && supportingArtists.length > 0;
  const showEyebrow = tourName && tourPlacement === "eyebrow";
  const showSubtitle = tourName && tourPlacement === "subtitle";

  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: r.gap }}>
      {/* Kicker row: status + tour eyebrow live above the headliner */}
      {(status || showEyebrow) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 1 }}>
          {status && <StatusPill status={status} surface={surface} />}
          {showEyebrow && <TourEyebrow tourName={tourName} surface={surface} dim={dim} />}
        </div>
      )}

      {/* Headliner */}
      <div style={{
        fontFamily: "Inter, system-ui",
        fontWeight: surface === "detail" ? 900 : 800,
        fontSize: r.head, color: dim ? "var(--fg-muted)" : "var(--fg)",
        letterSpacing: surface === "detail" ? "-0.03em" : "-0.02em",
        lineHeight: 1.12, minWidth: 0,
        whiteSpace: surface === "detail" ? "normal" : "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
        textDecoration: status === "cancelled" ? "line-through" : "none",
        textDecorationColor: status === "cancelled" ? "var(--danger)" : undefined,
        textDecorationThickness: status === "cancelled" ? "2px" : undefined,
      }}>{headliner}</div>

      {/* Tour as subtitle (alternate placement) */}
      {showSubtitle && <TourSubtitle tourName={tourName} surface={surface} dim={dim} />}

      {/* Openers billing line */}
      {hasOpeners ? (
        <SupportingLine
          artists={supportingArtists}
          surface={surface}
          variant={variant}
          separator={separator}
          lead={lead}
          maxInline={maxInline}
          interactive={interactive}
          dim={dim}
          onArtist={onArtist}
        />
      ) : (
        // Empty openers + no tour → optionally a quiet whisper. Off by default:
        // most rows should simply be the headliner alone. Left here for the
        // "tour-only" and "solo headliner" edge cases the canvas documents.
        null
      )}
    </div>
  );
}

Object.assign(window, {
  SupportingLine, EventTitleBlock, TourEyebrow, TourSubtitle, StatusPill,
  supportingA11yLabel, SUPPORT_COPY, SEPARATORS,
});

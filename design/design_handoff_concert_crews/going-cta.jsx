// going-cta.jsx — "I'm going!" CTA + Watching nudge + the demo wrappers
// that show them in context.
//
// Why a new component, not a second Watch button:
//   Watch = bookmark. Light, low commitment, no public claim.
//   Going = commitment. The act that promotes a row into History.
//   Those two intents need to look different so the user can't confuse them.
//
// Visual idea — the CTA *is* a ticket stub.
//   Default state is an outlined stub shape with the perforation greyed
//   out: "I'm going". Tapping it fills the stub in the show's per-show
//   accent, snaps a glyph into the center, and the perforation lights up.
//   Once that fill animation lands, the button visually equals the stub
//   stamp that will appear on this row in History — so the user can see
//   what they just minted.
//
// Sizes: `lg` for Event Detail (full-width-ish, 280–320 wide), `md` for
// the event card, `sm` for inline list rows.
//
// Exports (all on window):
//   <GoingButton state size show onChange>     — the CTA itself
//   <GoingNudge show onYes onDismiss/>        — the 7-day "Still going?" prompt
//   <EventDetailCTABlock show going onChange>  — the Watch + Going pair, the
//                                                 way they appear on Event Detail
//   <WatchingRowWithNudge show going onMark/> — Watching row + nudge attached
//   <HistoryStampInline show/>                 — read-only "you went" badge,
//                                                 used on past Event Detail
//   <GoingPostShowState show/>                 — disabled "Went on …" post-state

const { useState: gState } = React;

// ── Tiny icons ───────────────────────────────────────────────
function GIconCheck({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function GIconBookmark({ size = 14, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3.5 2.5h9v11l-4.5-3-4.5 3v-11z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
function GIconX({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function GIconArrow({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 6h6m0 0L6.5 3.5M9 6L6.5 8.5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ── GoingButton ──────────────────────────────────────────────
// The CTA itself, shaped like a ticket stub. Three live states + one
// post-show read-only state.
//
//   state = "default"   → outlined stub, "I'm going" copy
//          "going"      → filled stub in per-show accent, "Going" + ✓
//          "past-yes"   → identical fill but `disabled`; copy "Went on Oct 14"
//          "past-no"    → outlined + muted; copy "Didn't make it" — only
//                         visible if the user dismissed the nudge w/ "no"
//
// size = "sm" | "md" | "lg"  (default: "lg" for Event Detail use)
// `bare` + `radius`: added for the segmented Direction-A bar (see event-cta.jsx).
// `bare` drops the button's own border + shadow so it can live INSIDE a shared
// bordered bar next to the Watch cap. Default behaviour is unchanged.
function GoingButton({ show, state = "default", size = "lg", onChange, fullWidth = false, bare = false, radius }) {
  const sizes = {
    sm: { h: 36, padX: 12, font: 12,   gap: 6,  glyphHole: 28, perfH: 22, radius: 8  },
    md: { h: 44, padX: 16, font: 13.5, gap: 8,  glyphHole: 32, perfH: 28, radius: 9  },
    lg: { h: 52, padX: 20, font: 15,   gap: 10, glyphHole: 38, perfH: 36, radius: 10 },
  }[size];

  const accent = h_accentFor((show && show.artist) || "going");
  const glyph  = h_glyphFor((show && show.artist) || "going");

  const isOn       = state === "going" || state === "past-yes";
  const isPast     = state === "past-yes" || state === "past-no";
  const isDeclined = state === "past-no";

  // Past-state copy
  let label;
  if (state === "default")    label = "I'm going";
  else if (state === "going") label = "Going";
  else if (state === "past-yes") {
    const d = show && show.dateISO
      ? new Date(show.dateISO).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";
    label = `You went · ${d}`;
  }
  else if (state === "past-no") label = "Didn't make it";

  const bg     = isOn ? `color-mix(in oklch, ${accent} 22%, var(--surface-1))` : "var(--surface-1)";
  const border = isOn ? accent : "var(--border-strong)";
  const color  = isOn ? "var(--fg)" : (isDeclined ? "var(--fg-subtle)" : "var(--fg)");

  return (
    <button
      type="button"
      onClick={() => !isPast && onChange && onChange(isOn ? "default" : "going")}
      disabled={isPast}
      aria-pressed={isOn}
      style={{
        all: "unset",
        cursor: isPast ? "default" : "pointer",
        display: fullWidth ? "flex" : "inline-flex",
        alignItems: "stretch",
        width: fullWidth ? "100%" : "auto",
        height: sizes.h, borderRadius: radius != null ? radius : sizes.radius,
        background: bg,
        border: bare ? "none" : `1.5px solid ${border}`,
        color, fontFamily: "Inter, system-ui",
        fontWeight: 700, fontSize: sizes.font, letterSpacing: "-0.01em",
        opacity: isDeclined ? 0.7 : 1,
        boxShadow: isOn && !bare ? `0 8px 24px -10px color-mix(in oklch, ${accent} 70%, transparent)` : "none",
        transition: "background 160ms, border-color 160ms, color 160ms",
      }}
    >
      {/* Left "stub" half — glyph hole */}
      <span style={{
        width: sizes.h, height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        borderRight: `1.5px dashed ${isOn ? `color-mix(in oklch, ${accent} 75%, transparent)` : "var(--border-strong)"}`,
      }}>
        {isOn ? (
          // SVG glyph in accent — the same glyph the row stamp will use
          <svg width={sizes.glyphHole} height={sizes.glyphHole} viewBox="0 0 24 24" style={{ display: "block" }}>
            {glyph === "star" && (
              <polygon transform="translate(12 12) scale(0.7) translate(-12 -12)"
                points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76"
                fill={accent}/>
            )}
            {glyph === "diamond" && (
              <polygon transform="translate(12 12) scale(0.75) translate(-12 -12)" points="12,2 22,12 12,22 2,12" fill={accent}/>
            )}
            {glyph === "ring" && (
              <circle cx="12" cy="12" r="6.6" fill="none" stroke={accent} strokeWidth="2.6"/>
            )}
            {glyph === "triangle" && (
              <polygon transform="translate(12 12) scale(0.7) translate(-12 -12)" points="12,3 21,19 3,19" fill={accent}/>
            )}
          </svg>
        ) : (
          <span style={{
            color: "var(--fg-subtle)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width={sizes.glyphHole - 8} height={sizes.glyphHole - 8} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" fill="none"/>
            </svg>
          </span>
        )}
      </span>

      {/* Right "stub" half — label */}
      <span style={{
        padding: `0 ${sizes.padX}px`, display: "inline-flex", alignItems: "center",
        gap: sizes.gap, whiteSpace: "nowrap",
        flex: fullWidth ? 1 : "0 0 auto",
        justifyContent: fullWidth ? "center" : "flex-start",
      }}>
        {state === "going" && <GIconCheck size={Math.round(sizes.font * 0.95)}/>}
        {label}
      </span>
    </button>
  );
}

// ── Going post-show state, standalone ─────────────────────────
// Used on a past Event Detail page if you didn't mark going — small
// retroactive "I went anyway" affordance, single tap. We don't surface
// it as a modal or prompt; it's a quiet escape hatch.
function GoingPostShowState({ show }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 8,
      border: "1px dashed var(--border-strong)",
      color: "var(--fg-muted)",
      fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 600,
    }}>
      <GIconCheck size={11}/>
      I went, actually
    </button>
  );
}

// ── History stamp inline (read-only, post-show, was Going) ───
// Sits on a past Event Detail page when you DID mark going.
function HistoryStampInline({ show }) {
  const accent = h_accentFor((show && show.artist) || "");
  const d = show && show.dateISO ? new Date(show.dateISO).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 12,
      padding: "10px 14px 10px 10px",
      background: `color-mix(in oklch, ${accent} 12%, var(--surface-1))`,
      border: `1px solid color-mix(in oklch, ${accent} 50%, var(--border))`,
      borderRadius: 10,
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      <StubStamp artist={show && show.artist} size={32}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--fg-muted)",
        }}>In your history</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em" }}>
          You went · {d}
        </span>
      </div>
    </div>
  );
}

// ── Watching nudge ───────────────────────────────────────────
// Inline banner that appears beneath a Watching row when the show is in
// the next 7 days AND `goingMarkedAt == null`. Two primary actions
// ("Yes, going" / "Not me") + a soft dismiss. Render once per show, then
// remember the dismiss in localStorage so we don't ask again.
//
// Tone: helpful, not nagging. Single line, accent-tinted, no exclamation.
function GoingNudge({ show, onYes, onDecline, onDismiss }) {
  const accent = h_accentFor((show && show.artist) || "");
  const days   = h_daysUntil(show.dateISO);
  const when   = days === 0 ? "Tonight." : days === 1 ? "Tomorrow." : `In ${days} days.`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px 10px 14px",
      background: `color-mix(in oklch, ${accent} 10%, var(--surface-1))`,
      border: `1px solid color-mix(in oklch, ${accent} 40%, var(--border))`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10,
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
    }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.005em",
          color: "var(--fg)",
        }}>
          Still going? <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>{when}</span>
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
          color: "var(--fg-subtle)", letterSpacing: "0.02em",
        }}>
          Mark it so it lands in your history.
        </span>
      </div>
      <button onClick={onYes} style={{
        all: "unset", cursor: "pointer",
        padding: "7px 11px", borderRadius: 7,
        background: accent, color: "var(--bg)",
        fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 800,
        letterSpacing: "-0.005em", flexShrink: 0,
        display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        <GIconCheck size={11}/>Yes, going
      </button>
      <button onClick={onDecline} style={{
        all: "unset", cursor: "pointer",
        padding: "7px 9px", borderRadius: 7,
        background: "transparent", color: "var(--fg-muted)",
        fontFamily: "Inter, system-ui", fontSize: 12, fontWeight: 600,
        flexShrink: 0,
      }}>Not me</button>
      <button onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
        style={{
          all: "unset", cursor: "pointer",
          width: 22, height: 22, borderRadius: 5,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-subtle)",
          flexShrink: 0,
        }}>
        <GIconX size={11}/>
      </button>
    </div>
  );
}

// ── Watching eye icon button (mirrors the live mobile UI) ────
// The production app uses an outlined-accent square button with an eye
// icon for the Watch toggle on Browse and Event Detail (mobile). We re-use
// that exact affordance here so Going can carry all the textual weight on
// Event Detail without competing with a second pill of equal prominence.
//
// **Browse stays eye-only — we deliberately do NOT add Going to Browse
// cards.** Browse is for triage; the commitment action lives one tap deeper
// on Event Detail where the user has full context (date, venue, ticket
// source) to commit against.
function WatchingEye({ watching, onChange, size = "lg" }) {
  const sizes = {
    sm: { box: 36, icon: 16, radius: 8  },
    md: { box: 44, icon: 18, radius: 9  },
    lg: { box: 52, icon: 20, radius: 10 },
  }[size];
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(!watching)}
      aria-label={watching ? "Stop watching" : "Watch this show"}
      aria-pressed={watching}
      title={watching ? "Watching · tap to stop" : "Watch this show"}
      style={{
        all: "unset", cursor: "pointer",
        width: sizes.box, height: sizes.box,
        borderRadius: sizes.radius,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: watching
          ? "color-mix(in oklch, var(--accent) 18%, var(--surface-1))"
          : "var(--surface-1)",
        border: `1.5px solid ${watching ? "var(--accent)" : "var(--border-strong)"}`,
        color: watching ? "var(--accent)" : "var(--fg-muted)",
        flexShrink: 0,
        transition: "background 160ms, border-color 160ms, color 160ms",
      }}
    >
      <EyeIcon size={sizes.icon} filled={watching}/>
    </button>
  );
}

function EyeIcon({ size = 20, filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12C4.5 7.2 8 4.8 12 4.8s7.5 2.4 9.5 7.2c-2 4.8-5.5 7.2-9.5 7.2S4.5 16.8 2.5 12z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <circle cx="12" cy="12" r="3.4"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

// ── Watching pill (legacy — kept for desktop browse / list-row contexts) ─
// Outlined `+ Watch this show` → filled `✓ Watching` pill. Still used on
// desktop browse rows where the text affordance has room to breathe.
// **Not used on Event Detail anymore** — see EventDetailCTABlock which
// uses WatchingEye + GoingButton instead.
function WatchingPill({ watching, onChange, size = "lg" }) {
  const sizes = {
    sm: { h: 36, padX: 14, font: 12,   radius: 8,  iconSize: 12 },
    md: { h: 44, padX: 16, font: 13.5, radius: 9,  iconSize: 13 },
    lg: { h: 52, padX: 20, font: 14.5, radius: 10, iconSize: 14 },
  }[size];
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(!watching)}
      aria-pressed={watching}
      style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 8,
        height: sizes.h, padding: `0 ${sizes.padX}px`,
        borderRadius: sizes.radius,
        border: `1.5px solid var(--accent)`,
        background: watching
          ? "color-mix(in oklch, var(--accent) 18%, var(--surface-1))"
          : "transparent",
        color: "var(--accent)",
        fontFamily: "Inter, system-ui",
        fontWeight: 700, fontSize: sizes.font, letterSpacing: "-0.005em",
        whiteSpace: "nowrap",
      }}
    >
      {watching ? <GIconCheck size={sizes.iconSize}/> : <GIconPlus size={sizes.iconSize}/>}
      {watching ? "Watching" : "Watch this show"}
    </button>
  );
}
function GIconPlus({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── Event-detail CTA block ───────────────────────────────────
// **Mobile + desktop both use this same component.** The Going button is
// the headline action (full-width, stub-shaped, primary), the eye icon is
// a small square secondary that toggles Watching. Single row on both
// breakpoints — the parent container's width determines how wide Going
// ends up; the eye is always 52×52.
//
// Below the buttons: a single line of mono supporting copy. Voice shifts
// with commit state ("Going saves the night · Watch tracks the price."
// → "We'll add this to your history.").
//
// Past-show Event Detail uses <HistoryStampInline/> in place of this block
// — see the past-* artboards in the canvas for the swap pattern.
function EventDetailCTABlock({ show, going = "default", watching = false, onGoing, onWatch, variant = "mobile" }) {
  const showCopy = variant === "desktop";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      padding: variant === "desktop" ? 16 : 14,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      fontFamily: "Inter, system-ui",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GoingButton show={show} state={going} size="lg" onChange={onGoing} fullWidth/>
        </div>
        <WatchingEye watching={watching} onChange={onWatch} size="lg"/>
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.04em", color: "var(--fg-subtle)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {going === "going"
          ? "We'll add this to your history."
          : "Going saves the night · Watch tracks price."}
      </span>
    </div>
  );
}

// ── Watching row + nudge attached ───────────────────────────
// A Watching row (the existing surface) with the GoingNudge tucked
// underneath when the show is in the 7-day window. This is how the nudge
// lands in product — not a separate sheet, just part of the row.
function WatchingRowWithNudge({ show, going = "default", onMark, onDismiss }) {
  // We don't depend on the Watching surface code here — simplified row that
  // matches the cozy density and visual rhythm.
  const venueDate = `${show.venue} · ${show.dateLabel}${show.showTime ? ` · ${show.showTime}` : ""}`;
  const inWindow  = h_isInNudgeWindow({ ...show, goingMarkedAt: going === "going" ? "now" : null });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr auto",
        gap: 14, alignItems: "center",
        padding: "14px 16px 14px 14px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontFamily: "Inter, system-ui",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          <IdentityArt name={show.artist} kind="artist" scale="tile" showInitials={false} grain={0.05}/>
        </div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{
            fontWeight: 700, fontSize: 14.5, letterSpacing: "-0.01em", color: "var(--fg)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{show.artist}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5,
            color: "var(--fg-muted)", letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{venueDate}</div>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontSize: 16, fontWeight: 800,
            letterSpacing: "-0.01em", color: "var(--fg)",
            fontVariantNumeric: "tabular-nums",
          }}>${show.currentPrice}</span>
          {going === "going" && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: h_accentFor(show.artist),
              border: `1px solid color-mix(in oklch, ${h_accentFor(show.artist)} 55%, transparent)`,
              padding: "2px 6px", borderRadius: 3,
            }}>Going</span>
          )}
        </div>
      </div>
      {inWindow && going !== "going" && (
        <GoingNudge show={show}
          onYes={() => onMark && onMark(show.id, "going")}
          onDecline={() => onMark && onMark(show.id, "declined")}
          onDismiss={() => onDismiss && onDismiss(show.id)}
        />
      )}
    </div>
  );
}

Object.assign(window, {
  GoingButton, GoingNudge, EventDetailCTABlock, WatchingRowWithNudge,
  HistoryStampInline, GoingPostShowState, WatchingPill, WatchingEye, EyeIcon,
  GIconCheck, GIconBookmark, GIconX, GIconArrow, GIconPlus,
});

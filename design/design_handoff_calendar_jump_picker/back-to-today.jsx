// back-to-today.jsx — #642 · "Back to Today" control (Cal surface)
//
// A small, unobtrusive control that snaps the Browse · Cal view back to the
// current week + selects today, in one tap. It only exists when the user has
// navigated AWAY from today's week (via the ± chevrons or the JumpPicker);
// the moment today is back in view, it's gone.
//
//   trigger   week-level — visible week does NOT contain today  → show
//   action    full reset — jump to today's week AND select today
//   placement inline in the header nav cluster (parity mobile↔desktop),
//             with a floating-pill variant available for comparison
//
// Shared identity with the JumpPicker footer reset: BOTH use the same
// rotate-ccw glyph + "Today" label so a user learns ONE "snap to today"
// affordance that shows up wherever it's relevant (the picker chip lives
// inside the open overlay; this one lives on the closed header — they're
// modally separated, never competing at the same instant).
//
// Every "open for Design" call is a PROP so the canvas + Tweaks can drive it:
//   labelStyle: "iconText" | "iconOnly"     (icon+word vs compact glyph)
//   wording:    "today" | "tonight"          ("Today" vs "Back to tonight")
//   placement:  "inline" | "floating"        (header cluster vs floating pill)
//
// Exports (window): BackToTodayControl, RotateCcwGlyph, b2tWeekHasToday

// ── one-time motion style (reduced-motion-safe) ──────────────
if (typeof document !== "undefined" && !document.getElementById("b2t-styles")) {
  const s = document.createElement("style");
  s.id = "b2t-styles";
  s.textContent = [
    ".b2t{transition:opacity .17s ease, transform .17s cubic-bezier(.2,.7,.3,1)}",
    // inline enters by fading + sliding in from the right (it emerges in the nav cluster)
    ".b2t.inline.b2t-pre{opacity:0;transform:translateX(7px)}",
    ".b2t.inline.b2t-in{opacity:1;transform:none}",
    // floating enters by fading + rising from the bottom
    ".b2t.floating.b2t-pre{opacity:0;transform:translateY(9px)}",
    ".b2t.floating.b2t-in{opacity:1;transform:none}",
    ".b2t-pill{transition:background .12s, border-color .12s, box-shadow .12s}",
    ".b2t-pill:hover{background:var(--overlay-press)!important;border-color:var(--border-focus)!important}",
    ".b2t:focus-visible{outline:none}",
    ".b2t:focus-visible .b2t-pill{outline:2px solid var(--focus);outline-offset:2px}",
    "@media (prefers-reduced-motion: reduce){.b2t{transition:none!important;transform:none!important;opacity:1!important}}",
  ].join("\n");
  document.head.appendChild(s);
}

// ── glyph — rotate-ccw / reset (deliberately NOT a plain ◂, which would
//    collide with the prev-week chevron sitting right next to it) ────────
function RotateCcwGlyph({ size = 13, color = "var(--accent)", w = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ display: "block" }}>
      <polyline points="1 4 1 10 7 10" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// does a 7-day week array (from cjpWeekOf) contain today?
function b2tWeekHasToday(week, todayISO) {
  return Array.isArray(week) && week.some((d) => d.iso === todayISO);
}

// ─────────────────────────────────────────────────────────────
// BackToTodayControl
// ─────────────────────────────────────────────────────────────
function BackToTodayControl({
  labelStyle = "iconText",
  wording = "today",
  placement = "inline",
  todaySpoken = "today",      // spoken date for aria, e.g. "Tuesday, April 28"
  onClick = () => {},
  animateIn = true,
}) {
  const [entered, setEntered] = React.useState(!animateIn);
  React.useEffect(() => {
    if (!animateIn) return;
    const r = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(r);
  }, [animateIn]);

  const text = wording === "tonight" ? "Back to tonight" : "Today";
  const iconOnly = labelStyle === "iconOnly";
  const floating = placement === "floating";

  // visible pill chrome
  const pill = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: iconOnly ? 0 : 6,
    height: 34, boxSizing: "border-box",
    padding: iconOnly ? 0 : "0 12px",
    width: iconOnly ? 34 : "auto",
    borderRadius: 999,
    background: floating ? "var(--bg-elevated)" : "var(--surface-2)",
    border: `1px solid ${floating ? "var(--border-strong)" : "var(--border-strong)"}`,
    boxShadow: floating ? "0 8px 24px rgba(0,0,0,0.34), 0 1px 3px rgba(0,0,0,0.3)" : "none",
    color: "var(--fg)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  // the <button> itself is the ≥44px touch target (transparent); the visible
  // pill sits inside at 34px so it lines up with the 34px week chevrons.
  const hit = {
    all: "unset", boxSizing: "border-box", cursor: "pointer",
    minHeight: 44, minWidth: 44,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };

  const cls = `b2t ${floating ? "floating" : "inline"} ${entered ? "b2t-in" : "b2t-pre"}`;

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-label={`Back to today, ${todaySpoken}`}
      title={`Back to today`}
      style={hit}
    >
      <span className="b2t-pill" style={pill}>
        <RotateCcwGlyph />
        {!iconOnly && <span>{text}</span>}
      </span>
    </button>
  );
}

Object.assign(window, { BackToTodayControl, RotateCcwGlyph, b2tWeekHasToday });

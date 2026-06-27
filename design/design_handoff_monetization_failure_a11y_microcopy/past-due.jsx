// past-due.jsx — #782 past-due top-of-app banner
//
//   <PastDueBanner variant inline/>   warning-toned dunning-window strip
//
// Pattern-matches #780's DayThirteenBanner exactly (lifecycle-takeover.jsx):
// same geometry, same pinned-strip-vs-inline split — only the tone (--warning),
// icon (card-alert vs hourglass), copy, and CTA destination (Stripe portal) change.
//
// Show predicate (brief §1, eng owns the eval in #775):
//   subscription.status = "past_due"
//   AND (past_due_banner_dismissed_at IS NULL
//        OR past_due_banner_dismissed_at < session_started_at)
// → dismissible PER SESSION (recurring active alert during dunning), not the
//   per-trial-expiry single-fire of day-13.
// Suppressed while the user is inside an active payment flow (don't double-stack
// the alert when they're already fixing it).
//
// A11y (annotated in §7): role="region" + aria-label, aria-live="polite"
// (it appears between sessions, not mid-interaction), dismiss has an aria-label.

function PastDueBanner({ variant = "mobile", inline = false }) {
  const wide = variant === "desktop";
  // Local dismiss state so the canvas can demonstrate the "dismissible per
  // session" behavior. Production wires this to the predicate documented in
  // the header (past_due_banner_dismissed_at vs session_started_at).
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  return (
    <div
      role="region"
      aria-label="Payment notice"
      aria-live="polite"
      style={{
        boxSizing: "border-box", width: "100%",
        display: "flex", alignItems: "center", gap: wide ? 14 : 10,
        padding: inline ? (wide ? "11px 16px" : "10px 13px") : (wide ? "10px 20px" : "9px 13px"),
        borderRadius: inline ? 12 : 0,
        background: inline
          ? "color-mix(in oklch, var(--warning) 12%, var(--surface-1))"
          : "color-mix(in oklch, var(--warning) 18%, var(--bg-elevated))",
        border: inline ? "1px solid color-mix(in oklch, var(--warning) 36%, var(--border))" : "none",
        borderBottom: inline
          ? "1px solid color-mix(in oklch, var(--warning) 36%, var(--border))"
          : "1px solid color-mix(in oklch, var(--warning) 34%, var(--border-strong))",
        color: "var(--fg)", fontFamily: "Inter, system-ui",
      }}>
      {/* card-alert glyph */}
      <svg width={wide ? 18 : 16} height={wide ? 18 : 16} viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0, color: "var(--warning)" }}>
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M1.5 6 H14.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M11.4 8.4 V10.2 M11.4 11.6 v0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", rowGap: 0 }}>
        <span style={{ fontWeight: 800, fontSize: wide ? 14 : 13, letterSpacing: "-0.01em", color: "var(--fg)" }}>
          Your card got declined
        </span>
        <span style={{ fontWeight: 500, fontSize: wide ? 13.5 : 12.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
          — give it a refresh?
        </span>
      </div>
      <button style={{
        all: "unset", cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 6,
        padding: wide ? "7px 14px" : "6px 12px", borderRadius: 8,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: wide ? 12.5 : 12, letterSpacing: "-0.005em",
      }}>
        <span style={{ whiteSpace: "nowrap" }}>Update card</span>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 9 L9 3 M4.5 3 H9 V7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button aria-label="Dismiss payment notice" onClick={() => setDismissed(true)} style={{
        all: "unset", cursor: "pointer", flexShrink: 0,
        width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-subtle)",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

Object.assign(window, { PastDueBanner });

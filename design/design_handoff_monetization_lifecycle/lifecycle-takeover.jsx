// lifecycle-takeover.jsx — #780 Trial-ended takeover + Day-13 banner
//
//   <TrialEndedTakeover variant founderKind/>   full-bleed; #781 picker beneath headline
//   <DayThirteenBanner variant inline/>          compact ends-tomorrow nudge
//
// Trial-ended takeover (brief §"Trial-ended takeover"):
//   • Full-bleed, dismissible. Fires next session after trial_ends_at passed.
//   • "Trial's done. Pick a lane." + the LOCKED #781 tier picker (TierStateCard /
//     TierRowMobile from monetization-tier-states.jsx — not a reskin).
//   • Voice: honest about what ended without whining.
//
// Day-13 banner (Design's call on placement): primary = thin strip pinned above
// the app bar; an `inline` variant drops it just under the bar in content flow.

const { MMark, MonoEyebrow, RailHeader } = window;
const { TierStateCard, TierRowMobile, r5VisibleTiers, R5_BY_KEY, getFounderState } = window;

// ── inline mobile accordion picker (manages its own open row) ─
function TakeoverPickerMobile({ founderState, tiers }) {
  const [open, setOpen] = React.useState("premium");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {tiers.map(t => (
        <TierRowMobile
          key={t.key} tier={t} state="free"
          founderState={founderState} urgencyIntensity="medium"
          expanded={open === t.key}
          onToggle={() => setOpen(open === t.key ? null : t.key)}
        />
      ))}
    </div>
  );
}

function TrialEndedTakeover({ variant = "mobile", founderKind = "open-many" }) {
  const wide = variant === "desktop";
  const founderState = getFounderState(founderKind);
  const tiers = r5VisibleTiers(founderState, "free");

  const head = (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? 14 : 12, width: "100%", maxWidth: wide ? 880 : "100%" }}>
      <div style={{ maxWidth: 420 }}>
        <RailHeader tone="muted" eyebrow="Premium trial · done" code="14/14"/>
      </div>
      <div style={{ display: "flex", alignItems: wide ? "flex-end" : "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: wide ? 360 : "auto" }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 52 : 34, letterSpacing: "-0.04em", lineHeight: 1.0, color: "var(--fg)" }}>
            Trial's done. Pick a lane.
          </div>
          <div style={{ fontWeight: 500, fontSize: wide ? 16 : 14, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 560 }}>
            Your 14 days of Premium just wrapped. You're on Free now — browsing and your saved shows stay put; alerts, follows, and history are paused. Pick where you want to be.
          </div>
        </div>
      </div>
    </div>
  );

  const dismiss = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, paddingTop: wide ? 6 : 4 }}>
      <button style={{
        all: "unset", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--fg-subtle)", padding: "8px 10px",
      }}>Keep browsing on Free →</button>
    </div>
  );

  const body = (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--signal) 9%, var(--bg)) 0%, var(--bg) 55%)",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: wide ? "48px 40px" : "70px 18px 26px",
      overflow: "auto", position: "relative",
    }}>
      {/* dismiss X */}
      <button style={{
        all: "unset", cursor: "pointer", position: "absolute", top: wide ? 22 : 56, right: wide ? 26 : 18,
        width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--fg-muted)",
      }}>
        <svg width="15" height="15" viewBox="0 0 16 16"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      </button>

      <div style={{ width: "100%", maxWidth: wide ? 880 : "100%", display: "flex", flexDirection: "column", gap: wide ? 26 : 18, alignItems: "center" }}>
        {head}
        {wide ? (
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 12, alignItems: "stretch" }}>
            {tiers.map(t => <TierStateCard key={t.key} tier={t} state="free" founderState={founderState} urgencyIntensity="medium"/>)}
          </div>
        ) : (
          <TakeoverPickerMobile founderState={founderState} tiers={tiers}/>
        )}
        {dismiss}
      </div>
    </div>
  );

  return body;
}

// ── Day-13 banner ────────────────────────────────────────────
// `inline` = sits in content flow under the app bar (rounded inset card).
// default = full-bleed strip pinned to the very top, above the app bar.
function DayThirteenBanner({ variant = "mobile", inline = false }) {
  const wide = variant === "desktop";
  return (
    <div style={{
      boxSizing: "border-box", width: "100%",
      display: "flex", alignItems: "center", gap: wide ? 14 : 10,
      padding: inline ? (wide ? "11px 16px" : "10px 13px") : (wide ? "10px 20px" : "9px 13px"),
      margin: inline ? (wide ? "0" : "0") : 0,
      borderRadius: inline ? 12 : 0,
      background: inline
        ? "color-mix(in oklch, var(--signal) 10%, var(--surface-1))"
        : "color-mix(in oklch, var(--signal) 16%, var(--bg-elevated))",
      border: inline ? "1px solid color-mix(in oklch, var(--signal) 32%, var(--border))" : "none",
      borderBottom: inline ? "1px solid color-mix(in oklch, var(--signal) 32%, var(--border))" : "1px solid color-mix(in oklch, var(--signal) 30%, var(--border-strong))",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
    }}>
      {/* hourglass */}
      <svg width={wide ? 18 : 16} height={wide ? 18 : 16} viewBox="0 0 16 16" style={{ flexShrink: 0, color: "var(--signal)" }}>
        <path d="M4 2.5 H12 M4 13.5 H12 M4.5 2.5 C4.5 6 11.5 6 11.5 2.5 M4.5 13.5 C4.5 10 11.5 10 11.5 13.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", rowGap: 0 }}>
        <span style={{ fontWeight: 800, fontSize: wide ? 14 : 13, letterSpacing: "-0.01em", color: "var(--fg)" }}>
          Trial ends tomorrow
        </span>
        <span style={{ fontWeight: 500, fontSize: wide ? 13.5 : 12.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>
          — lock it in?
        </span>
      </div>
      <button style={{
        all: "unset", cursor: "pointer", flexShrink: 0,
        padding: wide ? "7px 14px" : "6px 12px", borderRadius: 8,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: wide ? 12.5 : 12, letterSpacing: "-0.005em",
      }}>Go Premium</button>
      <button style={{
        all: "unset", cursor: "pointer", flexShrink: 0,
        width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--fg-subtle)",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

Object.assign(window, { TrialEndedTakeover, DayThirteenBanner, TakeoverPickerMobile });

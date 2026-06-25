// monetization-paywall.jsx — Round 6
// §5.1 Free→Premium mini paywall. Fires when a free/supporter user taps a
// Premium-gated active affordance (the paywall-on-tap cells in the §6 matrix:
// concert history, calendar export, following — Watching is Free now, so it
// no longer routes here). Single upgrade path; this is NOT a signup surface.
//
//   Mobile  → bottom sheet
//   Desktop → centered modal
//   Feature-anchored headline · one-line benefit · "Go Premium" → /settings/plan
//   · "Maybe later" dismisses.
//
// One feature-anchored variant ships as the pattern; eng fans out the anchor
// copy per feature at integration. Pass `anchor` to swap copy.
//
// Exports (window): MiniPaywall, MINI_PAYWALL_ANCHORS

const { RailHeader, SheetChrome, ModalChrome, DragHandle } = window;

// A few anchors eng can pick from per gated feature. Default = price-drop,
// which leans on the now-free Watching action as the setup.
const MINI_PAYWALL_ANCHORS = {
  drops: {
    eyebrow: "Price-drop alerts · Premium",
    headline: "You've watched it. Want to know when the price drops?",
    benefit: "Premium keeps an eye on ticket prices for your saved shows and pings you the moment they fall.",
  },
  history: {
    eyebrow: "Concert history · Premium",
    headline: "Keep every show you've been to.",
    benefit: "Premium logs the gigs you attend into a searchable history that's yours for good.",
  },
  export: {
    eyebrow: "Calendar export · Premium",
    headline: "Put it on your calendar.",
    benefit: "Premium syncs your saved shows to Apple or Google Calendar — or grab the .ics.",
  },
  following: {
    eyebrow: "Following · Premium",
    headline: "Never miss your favorite artists.",
    benefit: "Premium follows the bands you love and tells you the second they announce a show near you.",
  },
};

function FeatureLockMark({ accent = "var(--signal)" }) {
  return (
    <div style={{
      position: "relative", width: 46, height: 46, borderRadius: 13, flexShrink: 0,
      background: "color-mix(in oklch, var(--signal) 14%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--signal) 34%, var(--border))",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="4" y="9" width="12" height="8.5" rx="2" fill="none" stroke={accent} strokeWidth="1.8"/>
        <path d="M6.5 9 V6.6 a3.5 3.5 0 0 1 7 0 V9" fill="none" stroke={accent} strokeWidth="1.8"/>
        <circle cx="10" cy="13.2" r="1.2" fill={accent}/>
      </svg>
    </div>
  );
}

function MiniPaywallBody({ anchor, variant }) {
  const wide = variant === "desktop";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
      <RailHeader tone="signal" eyebrow={anchor.eyebrow} code="$5/mo"/>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <FeatureLockMark/>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 26 : 23, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            {anchor.headline}
          </div>
          <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
            {anchor.benefit}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <button type="button" style={{
          all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
          padding: "13px 16px", borderRadius: 12, background: "var(--signal)", color: "var(--fg-on-accent)",
          fontWeight: 800, fontSize: 14.5,
          boxShadow: "0 0 18px color-mix(in oklch, var(--signal) 25%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          Go Premium
          <svg width="14" height="14" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button type="button" style={{
          all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
          padding: "11px 16px", borderRadius: 12, border: "1px solid var(--border-strong)",
          color: "var(--fg-muted)", fontWeight: 700, fontSize: 13.5,
        }}>Maybe later</button>
      </div>

      <div style={{
        textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>14-day free trial · cancel any time · opens Settings · Plan</div>
    </div>
  );
}

function MiniPaywall({ variant = "mobile", anchor = "drops" }) {
  const a = typeof anchor === "string" ? (MINI_PAYWALL_ANCHORS[anchor] || MINI_PAYWALL_ANCHORS.drops) : anchor;
  if (variant === "desktop") {
    return (
      <ModalChrome width={440}>
        <div style={{ padding: "24px 26px 22px" }}>
          <MiniPaywallBody anchor={a} variant="desktop"/>
        </div>
      </ModalChrome>
    );
  }
  return (
    <SheetChrome height="auto">
      <DragHandle/>
      <div style={{ padding: "4px 16px 22px" }}>
        <MiniPaywallBody anchor={a} variant="mobile"/>
      </div>
    </SheetChrome>
  );
}

Object.assign(window, { MiniPaywall, MINI_PAYWALL_ANCHORS });

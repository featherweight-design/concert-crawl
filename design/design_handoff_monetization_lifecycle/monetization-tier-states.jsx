// monetization-tier-states.jsx — Round 5
// The tier picker in all SIX locked states (logged-out, free, supporter,
// premium, founder, gifted) — mobile + desktop — plus the gifted thank-you
// variant that replaces the whole surface.
//
// Visual language is lifted verbatim from the locked <TierCard> in
// monetization-tiers.jsx (tone shells, current-plan banner, mono rails) so this
// reads as the same picker. What's NEW here:
//   • Six-state vocabulary + correct CTA per (tier × state).
//   • logged-out feature-anchored header + inline "Sign in" (the picker IS the
//     paywall, per brief §5.2).
//   • gifted replaces the surface with a gratitude panel (brief §2) — no cards.
//   • Feature bullets reconciled to the §6 entitlements matrix: Watching /
//     history / calendar export / following are Premium-and-up; Free is
//     core-only; Supporter is badge-only. (See README — reconciliation note.)
//
// Exports (window): R5_TIERS, TierStateCard, TierPicker, GiftedThankYou,
//                   r5VisibleTiers, resolveTierCta

const { TIERS, TierBadge, MonoEyebrow, RailHeader, ScarcityRail,
        DragHandle, SheetChrome, ModalChrome, getFounderState, MMark } = window;

// ── R5 tier data — taglines/prices/CTAs locked from README; feature bullets
//    re-cut to match the §6 entitlements matrix. ───────────────
const R5_TIERS = [
  {
    key: "free", name: "Free", priceText: "$0", priceUnit: "forever",
    tagline: "The whole point. Always free.",
    rationale: "No backend cost to scale, no reason to charge.",
    features: [
      "Browse, search, filter every show",
      "Save shows you're watching",
      "See community-submitted prices",
      "Submit prices yourself",
    ],
  },
  {
    key: "supporter", name: "Supporter", priceText: "$2", priceUnit: "/ month",
    tagline: "Stuff we can run without scaling.",
    rationale: "Existing infrastructure. You're just chipping in.",
    features: [
      "Everything in Free",
      "Supporter badge on your profile",
      "The warm, smug glow of keeping us alive",
    ],
    badgeOnlyNote: "No Premium unlocks — that's the point.",
  },
  {
    key: "premium", name: "Premium", priceText: "$5", priceUnit: "/ month",
    tagline: "Stuff that actually costs us money.",
    rationale: "Notification workers, email at volume, price polling, Spotify API.",
    features: [
      "Everything in Free",
      "Concert history — shows you attended",
      "Calendar export — Apple + Google",
      "Follow artists + new-show alerts",
      "Price-drop alerts + Spotify sync",
      { text: "More coming", future: true },
    ],
  },
  {
    key: "founder", name: "Founder", priceText: "$3", priceUnit: "/ mo · locked forever",
    tagline: "Full Premium. Permanent discount.",
    rationale: "First 100 subscribers. Claimable at public launch.",
    features: [
      "Everything in Premium",
      "$3/mo — never goes up, ever",
      "Founder badge (first 100 only)",
      { text: "More coming", future: true },
    ],
    scarce: true,
  },
];

const R5_BY_KEY = Object.fromEntries(R5_TIERS.map(t => [t.key, t]));

// ── tone shells — verbatim parity with locked TierCard ───────
function tierShell(key) {
  return {
    free: { bg: "var(--surface-1)", border: "1px solid var(--border)", accent: "var(--fg-muted)", shadow: "none" },
    supporter: {
      bg: "color-mix(in oklch, var(--accent) 5%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--accent) 28%, var(--border))",
      accent: "var(--accent)", shadow: "none",
    },
    premium: {
      bg: "color-mix(in oklch, var(--signal) 5%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))",
      accent: "var(--signal)", shadow: "0 0 0 1px color-mix(in oklch, var(--signal) 22%, transparent)",
    },
    founder: {
      bg: "linear-gradient(155deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)) 0%, color-mix(in oklch, var(--signal) 8%, var(--surface-1)) 100%)",
      border: "1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong))",
      accent: "var(--signal)", shadow: "0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)",
    },
  }[key];
}

// ── CTA resolver — the new six-state logic ───────────────────
// Returns { label, tone, disabled }. tone ∈ signal | founder | ghost-accent | ghost | current
function resolveTierCta(tierKey, state) {
  const isCurrent = state === tierKey;
  if (isCurrent) {
    if (tierKey === "free") return { label: "You're on Free", tone: "current", disabled: true };
    if (tierKey === "founder") return { label: "Manage subscription", tone: "current" };
    return { label: "Manage subscription", tone: "current" };
  }
  // tier-specific default action
  const base = {
    free: { label: "Switch to Free", tone: "ghost" },
    supporter: { label: "Become a Supporter", tone: "ghost-accent" },
    premium: { label: "Start 14-day free trial", tone: "signal" },
    founder: { label: "Claim Founder pricing", tone: "founder" },
  }[tierKey];

  if (state === "logged-out") {
    return {
      free: { label: "Sign up free", tone: "ghost" },
      supporter: { label: "Pick Supporter · $2", tone: "ghost-accent" },
      premium: { label: "Pick Premium · $5", tone: "signal" },
      founder: { label: "Claim Founder · $3", tone: "founder" },
    }[tierKey];
  }
  if (state === "free") {
    if (tierKey === "free") return base;
    return base; // upgrade actions
  }
  if (state === "supporter") {
    if (tierKey === "free") return { label: "Downgrade to Free", tone: "ghost" };
    if (tierKey === "premium") return { label: "Upgrade to Premium", tone: "signal" };
    return base;
  }
  if (state === "premium") {
    if (tierKey === "free" || tierKey === "supporter") return { label: `Switch to ${R5_BY_KEY[tierKey].name}`, tone: "ghost" };
    if (tierKey === "founder") return { label: "Switch to Founder · $3", tone: "founder" };
    return base;
  }
  if (state === "founder") {
    if (tierKey === "premium") return { label: "Already yours, via Founder", tone: "ghost", disabled: true };
    if (tierKey === "free" || tierKey === "supporter") return { label: `Switch to ${R5_BY_KEY[tierKey].name}`, tone: "ghost" };
    return base;
  }
  return base;
}

// ── Which tiers render, given window + state ─────────────────
// Founder is hidden once the launch window closes — EXCEPT for a user who IS a
// Founder, who keeps their current-plan card (stamp + Manage subscription) so
// they can see their plan post-window-close.
function r5VisibleTiers(founderState, state) {
  let keys = ["free", "supporter", "premium", "founder"];
  const founderClosed = !founderState || !founderState.open;
  if (founderClosed && state !== "founder") keys = keys.filter(k => k !== "founder");
  return keys.map(k => R5_BY_KEY[k]);
}

// ── Tier card ────────────────────────────────────────────────
function TierStateCard({ tier, state, founderState, urgencyIntensity = "medium", compact = false }) {
  const shell = tierShell(tier.key);
  const isCurrent = state === tier.key;
  const cta = resolveTierCta(tier.key, state);
  const neutralAccent = shell.accent === "var(--fg-muted)";
  const stampColor = neutralAccent ? "var(--border-strong)" : shell.accent;

  return (
    <div style={{
      position: "relative",
      background: shell.bg,
      border: isCurrent ? `2px solid ${stampColor}` : shell.border,
      boxShadow: isCurrent
        ? `inset 0 0 0 1px ${neutralAccent ? "var(--border)" : "color-mix(in oklch, " + shell.accent + " 30%, transparent)"}`
        : shell.shadow,
      borderRadius: 14,
      padding: "14px 14px 12px",
      display: "flex", flexDirection: "column", gap: 10,
      fontFamily: "Inter, system-ui", color: "var(--fg)", overflow: "hidden",
      minWidth: 0,
    }}>
      {/* CURRENT PLAN banner */}
      {isCurrent && (
        <div style={{
          margin: "-14px -14px 0", padding: "7px 14px",
          background: neutralAccent ? "var(--surface-2)" : `color-mix(in oklch, ${shell.accent} 18%, var(--bg-elevated))`,
          borderBottom: `1px solid ${stampColor}`,
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 9.5,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: neutralAccent ? "var(--fg)" : shell.accent,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{tier.key === "founder" ? "Your plan · locked $3/mo" : "Your plan"}</span>
        </div>
      )}

      {/* Founder scarcity rail */}
      {tier.key === "founder" && founderState?.open && (
        <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
      )}

      {/* Header — name / price */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em", color: "var(--fg)" }}>{tier.name}</span>
            {tier.key !== "free" && <TierBadge tier={tier.key} size="sm"/>}
          </div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>{tier.tagline}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontWeight: 900, fontSize: 26, letterSpacing: "-0.04em", lineHeight: 1,
            color: tier.key === "free" ? "var(--fg-muted)" : "var(--fg)",
          }}>{tier.priceText}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4,
          }}>{tier.priceUnit}</div>
        </div>
      </div>

      {/* Rationale rail */}
      {tier.rationale && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)",
          letterSpacing: "0.04em", lineHeight: 1.5, paddingLeft: 9,
          borderLeft: `2px solid ${shell.accent}`, opacity: 0.85,
        }}>{tier.rationale}</div>
      )}

      {/* Features */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        {tier.features.map((f, i) => {
          const text = typeof f === "string" ? f : f.text;
          const isFuture = typeof f === "object" && f.future;
          return (
            <li key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              fontWeight: 500, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em",
              opacity: isFuture ? 0.65 : 1,
            }}>
              {isFuture ? (
                <span style={{ width: 12, flexShrink: 0, marginTop: 1, color: shell.accent, fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", lineHeight: 1.2 }}>★</span>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 4 }}>
                  <path d="M2 6 L5 9 L10 3" fill="none" stroke={shell.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span>{text}</span>
            </li>
          );
        })}
      </ul>

      {/* badge-only honest note (Supporter) */}
      {tier.badgeOnlyNote && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{tier.badgeOnlyNote}</div>
      )}

      {/* CTA */}
      <button
        disabled={cta.disabled}
        style={{
          all: "unset", cursor: cta.disabled ? "default" : "pointer", marginTop: "auto",
          textAlign: "center", padding: "11px 14px", borderRadius: 10,
          fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.005em",
          opacity: cta.disabled ? 0.55 : 1,
          background: cta.tone === "signal" ? "var(--signal)"
                   : cta.tone === "founder" ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))"
                   : cta.tone === "current" ? "var(--surface-2)"
                   : "transparent",
          color: cta.tone === "signal" || cta.tone === "founder" ? "var(--fg-on-accent)"
              : cta.tone === "current" ? "var(--fg)"
              : cta.tone === "ghost-accent" ? "var(--accent)"
              : "var(--fg-muted)",
          border: cta.tone === "current" ? `1px solid ${stampColor}`
                : cta.tone === "ghost-accent" ? "1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))"
                : cta.tone === "ghost" ? "1px solid var(--border)"
                : "1px solid transparent",
          boxShadow: cta.tone === "founder" ? "0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)" : "none",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {cta.tone === "current" && !cta.disabled && (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: stampColor }}>
            <path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span>{cta.label}</span>
      </button>
    </div>
  );
}

// ── Feature-anchored header (logged-out / paywall mode) ──────
// Watching is free for signed-in users (amendment 2026-06-25); for a logged-out
// visitor the heart still routes here (tier-picker-on-tap) because saving needs
// an account. So the anchor frames it as "get in," not "go Premium."
const DEFAULT_ANCHOR = {
  eyebrow: "SAVE A SHOW · SIGN IN",
  headline: "Save the ones you can't miss.",
  sub: "Watching's free — you just need an account. Pick a tier to get started, or sign in if you're already in.",
};

function SignInLink({ size = 12.5 }) {
  return (
    <button style={{
      all: "unset", cursor: "pointer", fontFamily: "Inter, system-ui",
      fontWeight: 600, fontSize: size, color: "var(--fg-muted)", letterSpacing: "-0.005em",
    }}>
      Already have an account?{" "}
      <span style={{ color: "var(--signal)", fontWeight: 700 }}>Sign in →</span>
    </button>
  );
}

// ── The picker surface (state-aware) ─────────────────────────
// state ∈ logged-out | free | supporter | premium | founder | gifted
// variant ∈ mobile | desktop
function TierPicker({
  state = "free", variant = "mobile",
  founderKind = "open-many", urgencyIntensity = "medium",
  featureAnchor = DEFAULT_ANCHOR,
}) {
  if (state === "gifted") return <GiftedThankYou variant={variant}/>;

  const founderState = getFounderState(founderKind);
  const tiers = r5VisibleTiers(founderState, state);
  const loggedOut = state === "logged-out";

  const eyebrow = loggedOut ? featureAnchor.eyebrow : "Upgrade · pick a lane";
  const title = loggedOut ? featureAnchor.headline : "Pick a lane.";
  const sub = loggedOut
    ? featureAnchor.sub
    : "We run on infrastructure, not VC money. Subscriptions cover what costs us money to run. That's it.";

  // ── Desktop: centered panel, row of cards ──────────────────
  if (variant === "desktop") {
    return (
      <ModalChrome width={tiers.length === 4 ? 1000 : 780} height="min(90vh, 900px)">
        <div style={{ padding: "26px 30px 22px", display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
          <RailHeader tone={loggedOut ? "accent" : "signal"} eyebrow={eyebrow} code={`${tiers.length} TIERS`}/>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 320 }}>
              <div style={{ fontWeight: 900, fontSize: 36, letterSpacing: "-0.035em", lineHeight: 1.02, color: "var(--fg)", fontFamily: "Inter, system-ui" }}>{title}</div>
              <div style={{ fontWeight: 500, fontSize: 14.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", maxWidth: 560, lineHeight: 1.45, fontFamily: "Inter, system-ui" }}>{sub}</div>
            </div>
            {loggedOut && <SignInLink size={13.5}/>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 12, alignItems: "stretch" }}>
            {tiers.map(t => (
              <TierStateCard key={t.key} tier={t} state={state} founderState={founderState} urgencyIntensity={urgencyIntensity}/>
            ))}
          </div>
          <div style={{
            textAlign: "center", marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)",
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>Cancel any time · billed monthly · Stripe handles cards</div>
        </div>
      </ModalChrome>
    );
  }

  // ── Mobile: collapsible comparison sheet (tap-to-expand) ───
  return (
    <TierComparisonMobile
      state={state} tiers={tiers} founderState={founderState}
      urgencyIntensity={urgencyIntensity} loggedOut={loggedOut}
      eyebrow={eyebrow} title={title} sub={sub}
    />
  );
}

// ── CTA button (shared by desktop card + mobile accordion) ───
function TierCtaButton({ tier, state }) {
  const shell = tierShell(tier.key);
  const cta = resolveTierCta(tier.key, state);
  const neutralAccent = shell.accent === "var(--fg-muted)";
  const stampColor = neutralAccent ? "var(--border-strong)" : shell.accent;
  return (
    <button
      disabled={cta.disabled}
      style={{
        all: "unset", cursor: cta.disabled ? "default" : "pointer",
        textAlign: "center", padding: "11px 14px", borderRadius: 10, width: "100%",
        boxSizing: "border-box",
        fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.005em",
        opacity: cta.disabled ? 0.55 : 1,
        background: cta.tone === "signal" ? "var(--signal)"
                 : cta.tone === "founder" ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))"
                 : cta.tone === "current" ? "var(--surface-2)"
                 : "transparent",
        color: cta.tone === "signal" || cta.tone === "founder" ? "var(--fg-on-accent)"
            : cta.tone === "current" ? "var(--fg)"
            : cta.tone === "ghost-accent" ? "var(--accent)"
            : "var(--fg-muted)",
        border: cta.tone === "current" ? `1px solid ${stampColor}`
              : cta.tone === "ghost-accent" ? "1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))"
              : cta.tone === "ghost" ? "1px solid var(--border)"
              : "1px solid transparent",
        boxShadow: cta.tone === "founder" ? "0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
      {cta.tone === "current" && !cta.disabled && (
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: stampColor }}>
          <path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      <span>{cta.label}</span>
    </button>
  );
}

// ── Mobile collapsible comparison ────────────────────────────
// Resolves Hugh's "is it squished / do I tap / scroll / modal?" by making the
// picker a stack of collapsed summary rows (price + tagline visible for at-a-
// glance comparison) with ONE row expanded inline. Tap a header to expand it;
// the open one collapses. No nested modal, no truncated cards.
function pickDefaultExpanded(tiers, state) {
  if (tiers.some(t => t.key === state)) return state;     // current plan
  if (tiers.some(t => t.key === "premium")) return "premium"; // recommended
  return tiers[0] ? tiers[0].key : null;
}

function TierComparisonMobile({ state, tiers, founderState, urgencyIntensity, loggedOut, eyebrow, title, sub }) {
  const [open, setOpen] = React.useState(() => pickDefaultExpanded(tiers, state));

  return (
    <SheetChrome height="90%">
      <DragHandle/>
      <div style={{ padding: "0 16px 12px" }}>
        <RailHeader tone={loggedOut ? "accent" : "signal"} eyebrow={eyebrow} code={`${tiers.length} tiers`}/>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 29, letterSpacing: "-0.035em", color: "var(--fg)", lineHeight: 1.06, fontFamily: "Inter, system-ui" }}>{title}</div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.45, fontFamily: "Inter, system-ui" }}>{sub}</div>
          {loggedOut && <div style={{ marginTop: 2 }}><SignInLink/></div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tiers.map(t => (
            <TierRowMobile
              key={t.key} tier={t} state={state}
              founderState={founderState} urgencyIntensity={urgencyIntensity}
              expanded={open === t.key}
              onToggle={() => setOpen(open === t.key ? null : t.key)}
            />
          ))}
        </div>

        <div style={{
          textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase", padding: "6px 0 4px",
        }}>Tap a tier to compare · cancel any time · Stripe handles cards</div>
      </div>
    </SheetChrome>
  );
}

function TierRowMobile({ tier, state, founderState, urgencyIntensity, expanded, onToggle }) {
  const shell = tierShell(tier.key);
  const isCurrent = state === tier.key;
  const neutralAccent = shell.accent === "var(--fg-muted)";
  const stampColor = neutralAccent ? "var(--border-strong)" : shell.accent;
  const recommended = tier.key === "premium" && !isCurrent && state !== "founder";

  return (
    <div style={{
      position: "relative",
      background: shell.bg,
      border: (isCurrent || expanded) ? `2px solid ${stampColor}` : shell.border,
      borderRadius: 14, overflow: "hidden",
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      {/* left accent stripe for paid tiers */}
      {!neutralAccent && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: shell.accent }}/>
      )}

      {/* Collapsed header — always visible, tap to toggle */}
      <button onClick={onToggle} style={{
        all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
        width: "100%", boxSizing: "border-box", padding: "13px 14px",
      }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 900, fontSize: 19, letterSpacing: "-0.02em" }}>{tier.name}</span>
            {tier.key !== "free" && <TierBadge tier={tier.key} size="sm"/>}
            {isCurrent && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 8.5,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: neutralAccent ? "var(--fg-muted)" : shell.accent,
              }}>· Your plan</span>
            )}
            {recommended && (
              <span style={{
                padding: "2px 7px", borderRadius: 4,
                background: "color-mix(in oklch, var(--signal) 14%, transparent)",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 8.5,
                letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--signal)",
              }}>Popular</span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--fg-muted)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tier.tagline}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 21, letterSpacing: "-0.04em", lineHeight: 1, color: tier.key === "free" ? "var(--fg-muted)" : "var(--fg)" }}>{tier.priceText}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 8, color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{tier.priceUnit}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, color: "var(--fg-subtle)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .18s" }}>
          <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
          {tier.key === "founder" && founderState?.open && (
            <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
          )}
          {tier.rationale && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)",
              letterSpacing: "0.04em", lineHeight: 1.5, paddingLeft: 9,
              borderLeft: `2px solid ${shell.accent}`, opacity: 0.85,
            }}>{tier.rationale}</div>
          )}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {tier.features.map((f, i) => {
              const text = typeof f === "string" ? f : f.text;
              const isFuture = typeof f === "object" && f.future;
              return (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontWeight: 500, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em", opacity: isFuture ? 0.65 : 1 }}>
                  {isFuture ? (
                    <span style={{ width: 12, flexShrink: 0, marginTop: 1, color: shell.accent, fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", lineHeight: 1.2 }}>★</span>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 4 }}>
                      <path d="M2 6 L5 9 L10 3" fill="none" stroke={shell.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
          {tier.badgeOnlyNote && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{tier.badgeOnlyNote}</div>
          )}
          <TierCtaButton tier={tier} state={state}/>
        </div>
      )}
    </div>
  );
}

// ── Gifted thank-you — replaces the whole picker (brief §2) ──
function GiftedThankYou({ variant = "mobile" }) {
  const perks = [
    "Concert history — shows you attended",
    "Calendar export — Apple + Google",
    "Follow artists + new-show alerts",
    "Price-drop alerts + Spotify sync",
  ];

  const panel = (
    <div style={{
      display: "flex", flexDirection: "column", gap: 18,
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <RailHeader tone="accent" eyebrow="Lifetime Premium · Beta" code="ON US"/>

      {/* Mark + badge cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          position: "relative", width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            position: "absolute", inset: -6, borderRadius: 22,
            background: "radial-gradient(circle, color-mix(in oklch, var(--accent) 40%, transparent), transparent 70%)",
          }}/>
          <MMark size={56}/>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <TierBadge tier="premium" size="lg"/>
          <span style={{
            padding: "5px 9px", borderRadius: 6,
            background: "var(--surface-2)", border: "1px solid var(--border-strong)",
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10,
            letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-muted)",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)" }}/>
            Beta
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 900, fontSize: variant === "desktop" ? 40 : 32, letterSpacing: "-0.035em", lineHeight: 1.03 }}>
          You're already in.
        </div>
        <div style={{ fontWeight: 500, fontSize: variant === "desktop" ? 15.5 : 14, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 460 }}>
          Lifetime Premium — on us. No tier to pick, no card to add, nothing to manage. You showed up early; that's the whole price.
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: 12.5, color: "var(--accent)", letterSpacing: "0.02em", marginTop: 2 }}>
          —— Seriously. We owe you one.
        </div>
      </div>

      {/* What you've got — not an upsell, a recap */}
      <div style={{
        borderRadius: 14, padding: "16px 16px",
        background: "color-mix(in oklch, var(--signal) 5%, var(--surface-1))",
        border: "1px solid color-mix(in oklch, var(--signal) 30%, var(--border))",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <MonoEyebrow size={10} color="var(--signal)">Everything Premium, switched on</MonoEyebrow>
        <div style={{ display: "grid", gridTemplateColumns: variant === "desktop" ? "1fr 1fr" : "1fr", gap: 8 }}>
          {perks.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, fontSize: 13, color: "var(--fg)" }}>
              <svg width="13" height="13" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
                <path d="M2 6 L5 9 L10 3" fill="none" stroke="var(--signal)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Single non-management affordance — discovery, not billing */}
      <button style={{
        all: "unset", cursor: "pointer", textAlign: "center",
        padding: "12px 16px", borderRadius: 11,
        border: "1px solid var(--border-strong)", color: "var(--fg)",
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        See everything you've got
        <svg width="13" height="13" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div style={{
        textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>No card on file · nothing to cancel · just enjoy it</div>
    </div>
  );

  if (variant === "desktop") {
    return <ModalChrome width={560}><div style={{ padding: "28px 30px 26px" }}>{panel}</div></ModalChrome>;
  }
  return (
    <SheetChrome height="86%">
      <DragHandle/>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 16px 20px" }}>{panel}</div>
    </SheetChrome>
  );
}

Object.assign(window, {
  R5_TIERS, R5_BY_KEY, TierStateCard, TierCtaButton, TierPicker,
  TierComparisonMobile, TierRowMobile, GiftedThankYou,
  r5VisibleTiers, resolveTierCta,
});

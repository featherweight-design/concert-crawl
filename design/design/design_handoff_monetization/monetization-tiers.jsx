// monetization-tiers.jsx — tier comparison surfaces
//
// Exports:
//   <TierCard tier={k} state={...} highlighted compact role onAction/>
//   <TierComparisonMobile/>     full mobile bottom sheet
//   <TierComparisonMatrix/>     desktop comparison matrix (rows x columns)
//   <TierComparisonCarousel/>   variant: horizontal snap-cards
//   <RoleHolderBanner role/>    voluntary-support callout

const { TIERS, ROLES, MMark, TierBadge, RoleBadge, BadgeRow,
        MonoEyebrow, RailHeader, ScarcityRail, TrialBanner,
        DragHandle, SheetChrome, ModalChrome, getFounderState } = window;

// ── helper: should Founder appear? ────────────────────────────
function visibleTiers({ founderState, role, voluntary }) {
  let keys = ["free", "supporter", "premium", "founder"];
  if (!founderState || !founderState.open) keys = keys.filter(k => k !== "founder");
  // Role-holders CAN claim Founder — they get the discount, the badge, and
  // lock-in protection if their role ever lapses. Premium becomes free for them.
  // We hide Free only (no downgrade story for role-holders).
  if (role && role !== "member" && voluntary) keys = keys.filter(k => k !== "free");
  return keys.map(k => TIERS.find(t => t.key === k));
}

// ── current-tier helper ──────────────────────────────────────
function getCurrentTierLabel(userState) {
  switch (userState) {
    case "free":         return "free";
    case "on-trial":     return "premium-trial";
    case "paid-supporter": return "supporter";
    case "paid-premium":   return "premium";
    case "paid-founder":   return "founder";
    case "role-holder":  return "premium-role";
    case "logged-out":   return null;
    default:             return "free";
  }
}

// ── Tier card ────────────────────────────────────────────────
// Compact vertical card. Variants by tier key:
//   free      → outline only, plain
//   supporter → subtle accent stripe, tinted bg
//   premium   → signal border + signal CTA (default upgrade)
//   founder   → signal+accent gradient border, scarcity rail on top
function TierCard({
  tier, founderState, trialPlacement = "on-card",
  currentTier, voluntary = false,
  urgencyIntensity = "medium",
  expanded = false,
  onToggleExpand,
  onOpenDetails,
  onSelect,
}) {
  const isCurrent =
    (tier.key === "premium" && (currentTier === "premium" || currentTier === "premium-trial" || currentTier === "premium-role")) ||
    (tier.key === currentTier);

  // Tone shells per tier ──────────────────────────────────────
  const shell = {
    free: {
      bg: "var(--surface-1)",
      border: "1px solid var(--border)",
      accent: "var(--fg-muted)",
      shadow: "none",
    },
    supporter: {
      bg: "color-mix(in oklch, var(--accent) 5%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--accent) 28%, var(--border))",
      accent: "var(--accent)",
      shadow: "none",
    },
    premium: {
      bg: "color-mix(in oklch, var(--signal) 5%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))",
      accent: "var(--signal)",
      shadow: "0 0 0 1px color-mix(in oklch, var(--signal) 22%, transparent)",
    },
    founder: {
      bg: "linear-gradient(155deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)) 0%, color-mix(in oklch, var(--signal) 8%, var(--surface-1)) 100%)",
      border: "1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong))",
      accent: "var(--signal)",
      shadow: "0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)",
    },
  }[tier.key];

  // ── CTA shape ───────────────────────────────────────────────
  const showTrialOnCard = tier.key === "premium" && trialPlacement !== "banner-only" && !voluntary && !isCurrent;
  let ctaLabel = tier.cta;
  let ctaTone = "neutral";
  if (tier.key === "premium") {
    ctaLabel = showTrialOnCard ? "Start 14-day free trial" : "Go Premium";
    ctaTone = "signal";
  }
  if (tier.key === "founder") {
    ctaLabel = "Claim Founder pricing";
    ctaTone = "founder";
  }
  if (tier.key === "supporter") {
    ctaLabel = voluntary ? "Support Concert Crawl" : "Become a Supporter";
    ctaTone = "ghost-accent";
  }
  if (tier.key === "free") {
    ctaLabel = currentTier === "free" || currentTier === null ? "You're here" : "Downgrade to Free";
    ctaTone = "ghost";
  }
  if (isCurrent) {
    ctaLabel = tier.key === currentTier?.replace("-trial", "").replace("-role", "")
      ? "Current plan"
      : tier.key === "premium" ? "Current plan" : tier.cta;
    if (currentTier === "premium-trial" && tier.key === "premium") ctaLabel = "Trial active · 9 days left";
    if (currentTier === "premium-role" && tier.key === "premium") ctaLabel = "Granted by your role";
    // Neutral current-plan style — the stamp does the announcing.
    ctaTone = "current";
    if (tier.key === "premium" && (currentTier === "premium" || currentTier === "paid-premium")) ctaLabel = "Manage subscription";
    if (tier.key === "supporter" && (currentTier === "supporter" || currentTier === "paid-supporter")) ctaLabel = "Manage subscription";
    if (tier.key === "founder" && (currentTier === "founder" || currentTier === "paid-founder")) ctaLabel = "Manage subscription";
  }

  return (
    <div style={{
      position: "relative",
      background: shell.bg,
      border: isCurrent
        ? `2px solid ${shell.accent === "var(--fg-muted)" ? "var(--border-strong)" : shell.accent}`
        : shell.border,
      boxShadow: isCurrent
        ? `inset 0 0 0 1px ${shell.accent === "var(--fg-muted)" ? "var(--border)" : "color-mix(in oklch, " + shell.accent + " 30%, transparent)"}`
        : shell.shadow,
      borderRadius: 14,
      padding: "14px 14px 12px",
      display: "flex", flexDirection: "column", gap: 10,
      fontFamily: "Inter, system-ui",
      color: "var(--fg)",
      overflow: "hidden",
    }}>
      {/* CURRENT PLAN banner — pushes everything down so it doesn't overlap price */}
      {isCurrent && (
        <div style={{
          margin: "-14px -14px 0",
          padding: "7px 14px",
          background: shell.accent === "var(--fg-muted)"
            ? "var(--surface-2)"
            : `color-mix(in oklch, ${shell.accent} 18%, var(--bg-elevated))`,
          borderBottom: `1px solid ${shell.accent === "var(--fg-muted)" ? "var(--border-strong)" : shell.accent}`,
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 9.5,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: shell.accent === "var(--fg-muted)" ? "var(--fg)" : shell.accent,
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5 L4 7 L8 3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{currentTier === "premium-trial" ? "Trial active · 9 days left" : currentTier === "premium-role" ? "Granted by your role" : "Your plan"}</span>
        </div>
      )}

      {/* Founder scarcity rail (only when tier=founder and window open) */}
      {tier.key === "founder" && founderState?.open && (
        <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
      )}

      {/* Header row — name / price */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "Inter, system-ui",
              fontWeight: 900, fontSize: 22,
              letterSpacing: "-0.02em",
              color: "var(--fg)",
            }}>{tier.name}</span>
            {tier.key !== "free" && <TierBadge tier={tier.key} size="sm"/>}
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
            color: "var(--fg-muted)", letterSpacing: "-0.01em",
          }}>{tier.tagline}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: 26, letterSpacing: "-0.04em",
            color: tier.key === "free" ? "var(--fg-muted)" : "var(--fg)",
            lineHeight: 1,
          }}>{tier.priceText}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, fontSize: 9,
            color: "var(--fg-subtle)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginTop: 4,
          }}>{tier.priceUnit}</div>
        </div>
      </div>

      {/* Rationale line — italicized honesty */}
      {tier.rationale && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "var(--fg-subtle)",
          letterSpacing: "0.04em", lineHeight: 1.5,
          paddingLeft: 9, borderLeft: `2px solid ${shell.accent}`,
          opacity: 0.85,
        }}>{tier.rationale}</div>
      )}

      {/* Features — short list on the card; modal shows details */}
      <ul style={{
        listStyle: "none", padding: 0, margin: 0,
        display: "flex", flexDirection: "column", gap: 5,
      }}>
        {tier.features.map((f, i) => {
          const text = typeof f === "string" ? f : f.text;
          const isFuture = typeof f === "object" ? !!f.future : text.endsWith("\u2605");
          const display = isFuture ? text.replace(/ \u2605$/, "") : text;
          return (
            <li key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13,
              color: "var(--fg)", letterSpacing: "-0.005em",
              opacity: isFuture ? 0.7 : 1,
            }}>
              {isFuture ? (
                <span style={{ width: 12, flexShrink: 0, marginTop: 2, color: shell.accent, fontSize: 12, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", lineHeight: 1 }}>★</span>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 4 }}>
                  <path d="M2 6 L5 9 L10 3" fill="none" stroke={shell.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <span>{display}</span>
            </li>
          );
        })}
      </ul>

      {/* See what's included — opens TierDetailSheet modal */}
      {onOpenDetails && (
        <button
          onClick={onOpenDetails}
          style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 12px", borderRadius: 8,
            background: "color-mix(in oklch, " + shell.accent + " 6%, transparent)",
            border: "1px solid color-mix(in oklch, " + shell.accent + " 24%, var(--border))",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
            color: shell.accent === "var(--fg-muted)" ? "var(--fg-muted)" : shell.accent,
            letterSpacing: "-0.005em",
          }}
        >
          <span>See what's included</span>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* CTA */}
      <button
        onClick={onSelect}
        disabled={tier.key === "free" && (currentTier === "free" || currentTier === null)}
        style={{
          all: "unset", cursor: tier.key === "free" && (currentTier === "free" || currentTier === null) ? "default" : "pointer",
          marginTop: 4,
          textAlign: "center",
          padding: "11px 14px", borderRadius: 10,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          letterSpacing: "-0.005em",
          background: ctaTone === "signal" ? "var(--signal)"
                   : ctaTone === "founder" ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))"
                   : ctaTone === "current" ? "var(--surface-2)"
                   : ctaTone === "ghost-accent" ? "transparent"
                   : "transparent",
          color: ctaTone === "signal" ? "var(--fg-on-accent)"
              : ctaTone === "founder" ? "var(--fg-on-accent)"
              : ctaTone === "current" ? "var(--fg)"
              : ctaTone === "ghost-accent" ? "var(--accent)"
              : "var(--fg-muted)",
          border: ctaTone === "current" ? `1px solid ${shell.accent === "var(--fg-muted)" ? "var(--border-strong)" : shell.accent}`
                : ctaTone === "ghost-accent" ? `1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))`
                : ctaTone === "ghost" ? `1px solid var(--border)`
                : "1px solid transparent",
          boxShadow: ctaTone === "founder" ? "0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)" : "none",
          display: ctaTone === "current" ? "flex" : "block",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {ctaTone === "current" && (
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ color: shell.accent === "var(--fg-muted)" ? "var(--fg-muted)" : shell.accent }}>
            <path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span>{ctaLabel}</span>
      </button>
    </div>
  );
}

// ── Role-holder banner ───────────────────────────────────────
function RoleHolderBanner({ role }) {
  const r = ROLES.find(x => x.key === role);
  if (!r || role === "member") return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: "color-mix(in oklch, var(--signal) 8%, var(--surface-2))",
      border: "1px solid color-mix(in oklch, var(--signal) 30%, var(--border))",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", flexShrink: 0 }}>
        <RoleBadge role={role} size="md"/>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.01em",
        }}>
          You're in already.
        </div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          lineHeight: 1.45,
        }}>
          Your {r.label} role covers all of Premium — no subscription needed.
          If you'd like to chip in anyway, the options below are entirely optional. We'd love that. Either way: thanks.
        </div>
      </div>
    </div>
  );
}

// ── Mobile bottom sheet — full tier comparison ───────────────
function TierComparisonMobile({
  founderKind = "open-many",
  urgencyIntensity = "medium",
  userState = "free",
  role = "member",
  voluntary = false,
  trialPlacement = "on-card",
  initialDetailTier = null,  // open this tier's detail modal on mount (canvas demos)
  showCloseClose = false,
  showOpenAbove = true, // show page-behind through the top
}) {
  const founderState = getFounderState(founderKind);
  const currentTier = getCurrentTierLabel(userState);
  const tiers = visibleTiers({ founderState, role, voluntary });
  const isRoleHolder = role && role !== "member";
  const showRoleBanner = isRoleHolder && voluntary;
  const showTrialBanner = trialPlacement === "banner" || trialPlacement === "both";
  const showCurrentTrial = userState === "on-trial";

  const [detailTier, setDetailTier] = React.useState(initialDetailTier);
  const { TierDetailSheet } = window;

  return (
    <>
    <SheetChrome height="88%">
      <DragHandle/>

      {/* Header rail — fixed */}
      <div style={{ padding: "0 16px 12px" }}>
        <RailHeader
          tone="signal"
          eyebrow={isRoleHolder && voluntary ? "Optional support" : "Upgrade · pick a lane"}
          code={`${tiers.length}/${tiers.length}`}
        />
      </div>

      {/* Scrollable body */}
      <div style={{
        flex: 1, overflow: "auto",
        padding: "0 16px 16px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: 30, letterSpacing: "-0.035em",
            color: "var(--fg)", lineHeight: 1.05,
          }}>
            {isRoleHolder && voluntary ? "Wanna chip in?"
              : userState === "on-trial" ? "Keep going."
              : "Pick a lane."}
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 500,
            fontSize: 14, color: "var(--fg-muted)",
            letterSpacing: "-0.005em", lineHeight: 1.45,
          }}>
            {isRoleHolder && voluntary
              ? "You don't have to. But if it feels like Concert Crawl is worth a couple bucks, here's where."
              : userState === "on-trial"
              ? "Your Premium trial ends in 9 days. Pick how you want to stay."
              : "We run on infrastructure, not VC money. Subscriptions cover what costs us money to run. That's it."}
          </div>
        </div>

        {/* Trial-on-trial reminder */}
        {showCurrentTrial && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10,
            background: "color-mix(in oklch, var(--signal) 10%, var(--surface-1))",
            border: "1px solid color-mix(in oklch, var(--signal) 35%, var(--border))",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)" }}/>
            <MonoEyebrow color="var(--signal)" size={10}>Trial active</MonoEyebrow>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
            <MonoEyebrow size={10}>9 days left</MonoEyebrow>
          </div>
        )}

        {/* Role-holder banner */}
        {showRoleBanner && <RoleHolderBanner role={role}/>}

        {/* Trial banner (when placement = banner / both) */}
        {showTrialBanner && !isRoleHolder && !showCurrentTrial && <TrialBanner/>}

        {/* Tier cards */}
        {tiers.map((t, i) => (
          // Skip Free for role-holders in voluntary mode — they don't need to "downgrade"
          (isRoleHolder && voluntary && t.key === "free") ? null : (
            <TierCard
              key={t.key}
              tier={t}
              founderState={founderState}
              currentTier={currentTier}
              urgencyIntensity={urgencyIntensity}
              voluntary={voluntary}
              trialPlacement={trialPlacement}
              onOpenDetails={() => setDetailTier(t.key)}
            />
          )
        ))}

        {/* Footer microcopy */}
        <div style={{
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5, color: "var(--fg-subtle)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          padding: "8px 0 4px",
        }}>
          Cancel any time · billed monthly · stripe handles cards
        </div>
      </div>
    </SheetChrome>

    {detailTier && (
      <TierDetailSheet
        tierKey={detailTier}
        founderKind={founderKind}
        urgencyIntensity={urgencyIntensity}
        onClose={() => setDetailTier(null)}
      />
    )}
    </>
  );
}

// ── Desktop comparison matrix ───────────────────────────────
// Rows = feature; columns = tiers. Last row = price + CTA.
const MATRIX_FEATURES = [
  { key: "browse",   label: "Browse, search, filter shows",       has: { free: true,  supporter: true, premium: true, founder: true } },
  { key: "watching", label: "Watching list (save shows)",         has: { free: true,  supporter: true, premium: true, founder: true } },
  { key: "submit",   label: "Submit + see community prices",      has: { free: true,  supporter: true, premium: true, founder: true } },
  { key: "history",  label: "Concert history",                    has: { free: false, supporter: true, premium: true, founder: true } },
  { key: "export",   label: "Calendar export (Apple + Google)",   has: { free: false, supporter: true, premium: true, founder: true } },
  { key: "follow",   label: "Follow artists",                     has: { free: false, supporter: false, premium: true, founder: true } },
  { key: "alerts",   label: "New-show alerts (push + email)",     has: { free: false, supporter: false, premium: true, founder: true } },
  { key: "drops",    label: "Price-drop alerts",                  has: { free: false, supporter: false, premium: true, founder: true } },
  { key: "badge",    label: "Profile badge",                      has: { free: false, supporter: "Supporter", premium: "Premium", founder: "Founder" } },
  { key: "lock",     label: "Locked price · never goes up",       has: { free: false, supporter: false, premium: false, founder: true } },
  { key: "future",   label: "Future Premium features",            has: { free: false, supporter: false, premium: "more-coming", founder: "more-coming" }, aspirational: true },
];

function TierComparisonMatrix({
  founderKind = "open-many",
  urgencyIntensity = "medium",
  userState = "free",
  role = "member",
  voluntary = false,
  trialPlacement = "on-card",
}) {
  const founderState = getFounderState(founderKind);
  const tiers = visibleTiers({ founderState, role, voluntary });
  const currentTier = getCurrentTierLabel(userState);
  const isRoleHolder = role && role !== "member";
  const showTrialBanner = trialPlacement === "banner" || trialPlacement === "both";

  const accentFor = (k) => k === "premium" ? "var(--signal)"
                         : k === "founder" ? "color-mix(in oklch, var(--accent) 50%, var(--signal))"
                         : k === "supporter" ? "var(--accent)"
                         : "var(--fg-muted)";

  const colCount = tiers.length;
  const gridTemplate = `minmax(220px, 1.4fr) repeat(${colCount}, minmax(140px, 1fr))`;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 18,
      padding: "30px 32px 28px",
      background: "var(--bg-elevated)",
      color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      height: "100%",
      overflow: "auto",
    }}>
      {/* Header rail */}
      <RailHeader
        tone="signal"
        eyebrow={isRoleHolder && voluntary ? "Optional support" : "Upgrade · pick a lane"}
        code={`${tiers.length} TIERS`}
      />

      {/* Title block */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 360 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900,
            fontSize: 40, letterSpacing: "-0.035em",
            lineHeight: 1.02,
          }}>
            {isRoleHolder && voluntary ? "Wanna chip in?" : "Pick a lane."}
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 500,
            fontSize: 15, color: "var(--fg-muted)",
            letterSpacing: "-0.005em", maxWidth: 580, lineHeight: 1.45,
          }}>
            {isRoleHolder && voluntary
              ? "Your role already covers Premium. If Concert Crawl feels worth a couple bucks anyway, here's where."
              : "We run on infrastructure, not VC money. Subscriptions cover what costs us money to run. That's it."}
          </div>
        </div>
        {showTrialBanner && !isRoleHolder && (
          <div style={{ width: 280, flexShrink: 0 }}>
            <TrialBanner/>
          </div>
        )}
      </div>

      {/* Role banner */}
      {isRoleHolder && voluntary && <RoleHolderBanner role={role}/>}

      {/* Matrix */}
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, gap: 0 }}>
        {/* Column headers */}
        <div/>
        {tiers.map(t => (
          <div key={t.key} style={{
            padding: "16px 14px 14px",
            background: t.key === "premium" ? "color-mix(in oklch, var(--signal) 8%, var(--surface-1))"
                      : t.key === "founder" ? "linear-gradient(180deg, color-mix(in oklch, var(--accent) 12%, var(--surface-1)), color-mix(in oklch, var(--signal) 8%, var(--surface-1)))"
                      : "var(--surface-1)",
            borderTopLeftRadius: 14, borderTopRightRadius: 14,
            borderTop: `1px solid ${t.key === "premium" || t.key === "founder" ? accentFor(t.key) : "var(--border-strong)"}`,
            borderLeft: `1px solid ${t.key === "premium" || t.key === "founder" ? accentFor(t.key) : "var(--border-strong)"}`,
            borderRight: `1px solid ${t.key === "premium" || t.key === "founder" ? accentFor(t.key) : "var(--border-strong)"}`,
            position: "relative",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {t.key === "founder" && founderState.open && (
              <div style={{ position: "absolute", top: -10, left: 12 }}>
                <MonoEyebrow color="var(--accent)" size={9} letterSpacing="0.18em" style={{
                  background: "var(--bg-elevated)", padding: "2px 8px",
                  border: "1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))",
                  borderRadius: 4,
                }}>First 100</MonoEyebrow>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>{t.name}</span>
              {t.key !== "free" && <TierBadge tier={t.key} size="sm"/>}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.04em" }}>{t.priceText}</span>
              <MonoEyebrow size={9}>{t.priceUnit}</MonoEyebrow>
            </div>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
              color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.4,
              minHeight: 32,
            }}>{t.tagline}</div>
            {t.key === "founder" && founderState.open && (
              <div style={{ marginTop: 2 }}>
                <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
              </div>
            )}
          </div>
        ))}

        {/* Feature rows */}
        {MATRIX_FEATURES.map((row, ri) => {
          const lastRow = ri === MATRIX_FEATURES.length - 1;
          return (
            <React.Fragment key={row.key}>
              <div style={{
                padding: "12px 0 12px 4px",
                borderBottom: lastRow ? "none" : "1px solid var(--border)",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13.5,
                color: "var(--fg-muted)", letterSpacing: "-0.005em",
                display: "flex", alignItems: "center",
              }}>{row.label}</div>
              {tiers.map(t => {
                const v = row.has[t.key];
                const accent = accentFor(t.key);
                const isFutureRow = row.aspirational;
                return (
                  <div key={t.key} style={{
                    padding: "12px 14px",
                    borderBottom: lastRow ? "none" : "1px solid var(--border)",
                    borderLeft: `1px solid ${t.key === "premium" || t.key === "founder" ? accent : "var(--border-strong)"}`,
                    borderRight: `1px solid ${t.key === "premium" || t.key === "founder" ? accent : "var(--border-strong)"}`,
                    background: isFutureRow
                      ? (t.key === "premium" || t.key === "founder"
                          ? "color-mix(in oklch, var(--surface-2) 60%, transparent)"
                          : "transparent")
                      : t.key === "premium" ? "color-mix(in oklch, var(--signal) 3%, var(--bg-elevated))"
                      : t.key === "founder" ? "color-mix(in oklch, var(--accent) 4%, var(--bg-elevated))"
                      : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "flex-start",
                    fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
                  }}>
                    {v === true && (
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M3 8 L7 12 L13 4" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {v === false && (
                      <span style={{ color: "var(--fg-subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>—</span>
                    )}
                    {v === "more-coming" && (
                      <span style={{
                        color: "var(--fg-muted)", opacity: 0.65,
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10,
                        letterSpacing: "0.16em", textTransform: "uppercase",
                        display: "inline-flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ fontSize: 11 }}>★</span>
                        <span>more coming</span>
                      </span>
                    )}
                    {typeof v === "string" && v !== "more-coming" && (
                      <span style={{ color: accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>{v}</span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* CTA row */}
        <div/>
        {tiers.map(t => {
          const isPremiumCTA = t.key === "premium";
          const isFounderCTA = t.key === "founder";
          const isSupporterCTA = t.key === "supporter";
          let cta = t.cta;
          let tone = "ghost";
          if (isPremiumCTA) { cta = trialPlacement === "banner-only" ? "Go Premium" : "Start free trial"; tone = "signal"; }
          if (isFounderCTA) { cta = "Claim Founder"; tone = "founder"; }
          if (isSupporterCTA) { cta = voluntary ? "Support" : "Become a Supporter"; tone = "ghost-accent"; }
          if (t.key === "free") { cta = currentTier === "free" || currentTier === null ? "You're here" : "Downgrade"; tone = "ghost"; }
          // role-holder overrides
          if (isRoleHolder && t.key === "premium") cta = "Granted by role";
          if (userState === "premium" || userState === "paid-premium") {
            if (t.key === "premium") cta = "Current plan";
          }
          if (userState === "on-trial" && t.key === "premium") cta = "Trial · 9 days left";
          const accent = accentFor(t.key);
          return (
            <div key={t.key} style={{
              padding: "16px 14px 18px",
              background: t.key === "premium" ? "color-mix(in oklch, var(--signal) 6%, var(--surface-1))"
                        : t.key === "founder" ? "linear-gradient(0deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)), color-mix(in oklch, var(--signal) 6%, var(--surface-1)))"
                        : "var(--surface-1)",
              borderLeft: `1px solid ${t.key === "premium" || t.key === "founder" ? accent : "var(--border-strong)"}`,
              borderRight: `1px solid ${t.key === "premium" || t.key === "founder" ? accent : "var(--border-strong)"}`,
              borderBottom: `1px solid ${t.key === "premium" || t.key === "founder" ? accent : "var(--border-strong)"}`,
              borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
            }}>
              <button style={{
                all: "unset", cursor: "pointer",
                display: "block", width: "100%",
                textAlign: "center", padding: "12px 14px",
                borderRadius: 10,
                fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
                background: tone === "signal" ? "var(--signal)"
                         : tone === "founder" ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))"
                         : "transparent",
                color: tone === "signal" || tone === "founder" ? "var(--fg-on-accent)"
                    : tone === "ghost-accent" ? "var(--accent)"
                    : "var(--fg-muted)",
                border: tone === "ghost-accent" ? `1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))`
                      : tone === "ghost" ? `1px solid var(--border)`
                      : "1px solid transparent",
                boxShadow: tone === "founder" ? "0 0 18px color-mix(in oklch, var(--accent) 30%, transparent)" : "none",
              }}>{cta}</button>
            </div>
          );
        })}
      </div>

      {/* Footer microcopy */}
      <div style={{
        textAlign: "center", marginTop: 4,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, color: "var(--fg-subtle)",
        letterSpacing: "0.14em", textTransform: "uppercase",
      }}>
        Cancel any time · billed monthly · Stripe handles cards
      </div>
    </div>
  );
}

Object.assign(window, {
  TierCard, TierComparisonMobile, TierComparisonMatrix,
  RoleHolderBanner, MATRIX_FEATURES, visibleTiers, getCurrentTierLabel,
});

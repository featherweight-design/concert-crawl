// lifecycle-plan-cards.jsx — #780 Plan card lifecycle variants
//
// Extends the locked Plan card from monetization-settings.jsx (same shell:
// radial-gradient bg, accent border, eyebrow row, headline, body, mono punchline,
// CTA row). What's NEW here is the lifecycle state machine + a couple of small
// rails the original card didn't need (trial countdown, winding-down rail).
//
//   <LifecyclePlanCard user variant/>   variant ∈ "desktop" | "mobile"
//   getLifecycleContent(user)            → the resolved copy/treatment object
//
// user shape (lifecycle-only fields on top of the original tier/role):
//   tier        : "free" | "supporter" | "premium" | "founder"
//   lifecycle   : "active" | "trial" | "cancel-grace" | "post-cancel-grace" | "post-trial-expired"
//   trialPhase  : "early" | "ends-tomorrow" | "ends-today"   (lifecycle="trial")
//   trialDay    : number 1..14                                (display only)
//   periodEnd   : "Jul 15"                                    (renewal / grace end)
//   decayed     : bool   — post-cancel-grace, context eyebrow has aged out (>~30d)
//
// Decisions (Design's call, per brief §"Open for Design to call"):
//   • Cancel-grace Resubscribe = one-tap restore (auto-renew back on, no checkout).
//   • Post-cancel-grace come-back eyebrow persists ~30 days, then `decayed` → plain Free.

const { TierBadge, MonoEyebrow } = window;

// ── small inline status rail (trial countdown / winding-down) ─
function CardStatusRail({ tone = "signal", icon, label, sub }) {
  const c = tone === "warning" ? "var(--warning)"
          : tone === "muted" ? "var(--fg-muted)"
          : tone === "accent" ? "var(--accent)"
          : "var(--signal)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 12px", borderRadius: 10,
      background: `color-mix(in oklch, ${c} 9%, var(--surface-1))`,
      border: `1px solid color-mix(in oklch, ${c} 30%, var(--border))`,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 7, background: c, boxShadow: `0 0 8px ${c}`, flexShrink: 0 }}/>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5, color: "var(--fg)", letterSpacing: "-0.005em" }}>{label}</div>
        {sub && <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">{sub}</MonoEyebrow>}
      </div>
    </div>
  );
}

// ── content resolver ─────────────────────────────────────────
function getLifecycleContent(user) {
  const { tier = "premium", role = "member", lifecycle = "active",
          trialPhase = "early", trialDay = 6, periodEnd = "Jul 15", decayed = false } = user || {};

  // ── TRIAL ──────────────────────────────────────────────────
  if (lifecycle === "trial") {
    if (trialPhase === "ends-today") {
      return {
        tier: "premium", chip: "TRIAL", emphasis: true, emphasisTone: "signal", accent: "var(--signal)",
        eyebrowRest: "TRIAL ENDS TODAY · LOCK IT IN",
        headline: "Last day on Premium.",
        body: "Your trial ends today. After that you're on Free and the alerts, follows, and price drops go quiet. Lock it in and they don't.",
        punchline: "—— It's $5/mo. Cancel any time, lose nothing.",
        statusRail: { tone: "signal", label: "Trial ends today", sub: "NO CARD ON FILE YET" },
        ctas: [
          { label: "Go Premium · $5/mo", kind: "primary", glow: true },
          { label: "Let it end", kind: "ghost" },
        ],
      };
    }
    if (trialPhase === "ends-tomorrow") {
      return {
        tier: "premium", chip: "TRIAL", emphasis: true, emphasisTone: "signal", accent: "var(--signal)",
        eyebrowRest: "TRIAL ENDS TOMORROW · LOCK IT IN",
        headline: "One day left on Premium.",
        body: `Tomorrow the trial wraps and you drop to Free — alerts, follows, and price drops switch off. Keep them on for $5/mo.`,
        punchline: "—— No card yet. Add one and nothing changes.",
        statusRail: { tone: "signal", label: "Trial ends tomorrow", sub: `DAY 13 OF 14 · ENDS ${periodEnd.toUpperCase()}` },
        ctas: [
          { label: "Go Premium · $5/mo", kind: "primary", glow: true },
          { label: "Not now", kind: "ghost" },
        ],
      };
    }
    // early — day 1–12
    return {
      tier: "premium", chip: "TRIAL", accent: "var(--signal)",
      eyebrowRest: `DAY ${trialDay} OF 14 · NO CARD YET`,
      headline: "Trying Premium.",
      body: `${14 - trialDay} days left to see what sticks. No card on file — we'll nudge you before it ends. Cancel and you lose nothing.`,
      punchline: "—— No surprise charges. Promise.",
      ctas: [
        { label: "Lock in Premium", kind: "primary" },
        { label: "End trial early", kind: "ghost" },
      ],
    };
  }

  // ── CANCEL-GRACE ───────────────────────────────────────────
  if (lifecycle === "cancel-grace") {
    return {
      tier: "premium", chip: "WINDING DOWN", accent: "var(--signal)", winding: true,
      eyebrowRest: `PREMIUM UNTIL ${periodEnd.toUpperCase()} · WON'T RENEW`,
      headline: `Premium until ${periodEnd}.`,
      body: `You canceled — no hard feelings. You keep everything Premium until ${periodEnd}, then you roll to Free. You won't be charged again.`,
      punchline: "—— Changed your mind? One tap puts it right back.",
      statusRail: { tone: "muted", label: `Auto-renew off · access ends ${periodEnd}`, sub: "NOTHING ELSE WILL BE CHARGED" },
      ctas: [
        { label: "Resubscribe", kind: "primary", glow: true },
        { label: "Manage subscription", kind: "ghost" },
      ],
    };
  }

  // ── POST-CANCEL-GRACE FREE ─────────────────────────────────
  if (lifecycle === "post-cancel-grace") {
    if (decayed) {
      return {
        tier: null, accent: "var(--fg-muted)",
        eyebrowRest: "ON THE HOUSE",
        headline: "Free. The whole point.",
        body: "Browse, search, save shows, submit prices — all included. Premium's here whenever you want the alerts and history back.",
        punchline: "—— No card, no commitment, no FOMO emails.",
        ctas: [ { label: "See the tiers", kind: "primary" } ],
      };
    }
    return {
      tier: null, chip: `WAS PREMIUM · ${periodEnd.toUpperCase()}`, accent: "var(--accent)",
      eyebrowRest: "BACK ON FREE",
      headline: "You're on Free now.",
      body: `Premium wrapped on ${periodEnd}. Browsing, saved shows, and submitting prices are still yours — always. The alerts, follows, and history are napping.`,
      punchline: "—— Door's open. Your follows are safe for 90 days.",
      ctas: [
        { label: "Go Premium again", kind: "primary" },
        { label: "See all plans", kind: "ghost" },
      ],
    };
  }

  // ── POST-TRIAL-EXPIRED FREE ────────────────────────────────
  if (lifecycle === "post-trial-expired") {
    return {
      tier: null, chip: `TRIAL ENDED · ${periodEnd.toUpperCase()}`, accent: "var(--signal)",
      eyebrowRest: "BACK ON FREE",
      headline: "Your trial ended.",
      body: "The 14 days are up and you're on Free. Save shows, browse, submit prices — all still here. Want the alerts, follows, and history back?",
      punchline: "—— No charge happened. Upgrade whenever you like.",
      ctas: [
        { label: "Upgrade to Premium", kind: "primary", glow: true },
        { label: "See all plans", kind: "ghost" },
      ],
    };
  }

  // ── ACTIVE (paid) ──────────────────────────────────────────
  if (tier === "supporter") {
    return {
      tier: "supporter", accent: "var(--accent)",
      eyebrowRest: `$2 / MONTH · RENEWS ${periodEnd.toUpperCase()}`,
      headline: "$2 a month. Thanks.",
      body: "Concert history, calendar export, and the Supporter badge are switched on. You're chipping in for the stuff we run on existing infrastructure.",
      punchline: "—— Want the alerts too? Premium's a tap away.",
      ctas: [ { label: "Manage subscription", kind: "primary" } ],
    };
  }
  if (tier === "founder") {
    return {
      tier: "founder", accent: "var(--accent)", founder: true,
      eyebrowRest: `LOCKED $3 / MONTH · RENEWS ${periodEnd.toUpperCase()}`,
      headline: "Founder. Locked in.",
      body: "$3 a month, never goes up. You showed up at the start — even when we charge new users double.",
      punchline: "—— We don't forget that.",
      ctas: [ { label: "Manage subscription", kind: "primary" } ],
    };
  }
  // active premium (default)
  return {
    tier: "premium", accent: "var(--signal)",
    eyebrowRest: `$5 / MONTH · RENEWS ${periodEnd.toUpperCase()}`,
    headline: "Premium. You're in.",
    body: "Follows, alerts, price drops — the stuff that actually costs us money to run. All yours.",
    punchline: "—— More coming. Quietly.",
    ctas: [ { label: "Manage subscription", kind: "primary" } ],
  };
}

// ── CTA button (matches the locked plan-card button styling) ─
function planCtaStyle(cta, accent, founder) {
  const primary = cta.kind === "primary";
  const danger = cta.kind === "danger-ghost";
  return {
    all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box",
    padding: "11px 16px", borderRadius: 10,
    background: primary
      ? (founder ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))" : accent)
      : "transparent",
    color: primary ? "var(--fg-on-accent)" : danger ? "var(--danger)" : "var(--fg-muted)",
    border: primary ? "none"
          : danger ? "1px solid color-mix(in oklch, var(--danger) 45%, var(--border-strong))"
          : "1px solid var(--border-strong)",
    fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5, letterSpacing: "-0.005em",
    boxShadow: primary && cta.glow
      ? `0 0 22px color-mix(in oklch, ${founder ? "var(--accent)" : accent} 32%, transparent)` : "none",
  };
}

// ── Card (desktop + mobile share one renderer) ───────────────
function LifecyclePlanCard({ user, variant = "desktop" }) {
  const c = getLifecycleContent(user || {});
  const wide = variant === "desktop";
  const accent = c.accent;

  const emphasisBorder = c.emphasis
    ? `1px solid color-mix(in oklch, ${accent} 70%, var(--border-strong))`
    : `1px solid color-mix(in oklch, ${accent} ${wide ? 45 : 40}%, var(--border-strong))`;

  const FreeChip = ({ sm }) => (
    <span style={{
      padding: sm ? "3px 8px" : "4px 9px", borderRadius: sm ? 4 : 5,
      background: "var(--surface-2)", border: "1px solid var(--border-strong)",
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: sm ? 9 : 10,
      letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-muted)",
    }}>Free</span>
  );

  return (
    <div style={{
      position: "relative", borderRadius: 14,
      padding: wide ? "20px 22px 22px" : "16px 16px 18px",
      background: `radial-gradient(circle at 100% 0%, color-mix(in oklch, ${accent} 14%, transparent) 0%, transparent ${wide ? 55 : 60}%), var(--bg-elevated)`,
      border: emphasisBorder,
      boxShadow: c.emphasis
        ? `0 0 0 1px color-mix(in oklch, ${accent} 22%, transparent), 0 24px 60px -42px color-mix(in oklch, ${accent} 55%, transparent)`
        : c.founder
        ? "0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent), 0 30px 60px -40px color-mix(in oklch, var(--accent) 40%, transparent)"
        : "none",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: wide ? 14 : 11,
      maxWidth: wide ? 620 : "none", overflow: "hidden",
    }}>
      {/* emphasis top rail */}
      {c.emphasis && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, background: accent, boxShadow: `0 0 14px ${accent}` }}/>
      )}

      {/* eyebrow row */}
      <div style={{ display: "flex", alignItems: "center", gap: wide ? 10 : 8, flexWrap: "wrap" }}>
        {c.tier ? <TierBadge tier={c.tier} size={wide ? "md" : "sm"}/> : <FreeChip sm={!wide}/>}
        {c.chip && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: wide ? "4px 8px" : "3px 7px", borderRadius: wide ? 5 : 4,
            background: c.winding ? "var(--surface-2)" : `color-mix(in oklch, ${accent} 14%, transparent)`,
            border: `1px solid color-mix(in oklch, ${accent} ${c.winding ? 30 : 40}%, var(--border))`,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: wide ? 9 : 8.5,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: c.winding ? "var(--fg-muted)" : accent,
          }}>{c.chip}</span>
        )}
        <MonoEyebrow size={wide ? 10 : 9} color="var(--fg-subtle)" letterSpacing="0.14em">{c.eyebrowRest}</MonoEyebrow>
      </div>

      <div style={{ fontWeight: 900, fontSize: wide ? 30 : 22, letterSpacing: wide ? "-0.03em" : "-0.025em", lineHeight: 1.05 }}>
        {c.headline}
      </div>
      <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: wide ? 1.5 : 1.45, maxWidth: wide ? 520 : "none" }}>
        {c.body}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: wide ? 12.5 : 11.5, color: accent, letterSpacing: "0.02em" }}>
        {c.punchline}
      </div>

      {c.statusRail && (
        <div style={{ marginTop: 2 }}>
          <CardStatusRail {...c.statusRail}/>
        </div>
      )}

      {/* CTAs — desktop inline row, mobile stacks up to 2 */}
      <div style={{
        display: "flex", gap: 10, marginTop: wide ? 6 : 6,
        flexDirection: wide ? "row" : "column", flexWrap: "wrap",
      }}>
        {c.ctas.map((cta, i) => (
          <button key={i} style={{
            ...planCtaStyle(cta, accent, c.founder),
            ...(wide ? {} : { width: "100%" }),
          }}>{cta.label}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { LifecyclePlanCard, getLifecycleContent, CardStatusRail });

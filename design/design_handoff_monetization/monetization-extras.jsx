// monetization-extras.jsx
// 1. <TierDetailSheet tier onClose/> — modal that opens when you tap a tier
//    card, showing all features with one-line descriptions.
// 2. <TrialEndedSurface variant/> — full takeover when the 14-day trial wraps.

const { TIERS, MMark, TierBadge, MonoEyebrow, RailHeader,
        ScarcityRail, DragHandle, SheetChrome, ModalChrome,
        getFounderState } = window;
const { MATRIX_FEATURES, visibleTiers } = window;

// ============================================================
// TIER DETAIL SHEET (mobile)
// Slides up over the tier picker. Shows the selected tier in full —
// big price stamp, rationale rail, all features with descriptions, CTA.
// ============================================================
function TierDetailSheet({ tierKey = "premium", founderKind = "open-many", urgencyIntensity = "medium", onClose }) {
  const tier = TIERS.find(t => t.key === tierKey);
  if (!tier) return null;
  const founderState = getFounderState(founderKind);
  const accent = tier.key === "premium" ? "var(--signal)"
              : tier.key === "founder" ? "var(--accent)"
              : tier.key === "supporter" ? "var(--accent)"
              : "var(--fg-muted)";

  const ctaLabel = tier.key === "premium" ? "Start 14-day free trial"
                : tier.key === "founder" ? "Claim Founder pricing"
                : tier.key === "supporter" ? "Become a Supporter"
                : "You're here";
  const ctaTone = tier.key === "founder" ? "founder"
               : tier.key === "premium" ? "signal"
               : tier.key === "supporter" ? "ghost-accent"
               : "ghost";

  return (
    <SheetChrome height="94%">
      <DragHandle/>

      {/* Header */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button onClick={onClose} style={{
          all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 8px", borderRadius: 8,
          color: "var(--fg-muted)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All plans
        </button>
        <RailHeader tone={tier.key === "founder" ? "warning" : "signal"} eyebrow={`${tier.name} details`} code={tier.priceText}/>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Big tier card top */}
        <div style={{
          position: "relative",
          background: tier.key === "founder"
            ? "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--accent) 20%, transparent), transparent 60%), linear-gradient(155deg, color-mix(in oklch, var(--accent) 10%, var(--surface-1)), color-mix(in oklch, var(--signal) 8%, var(--surface-1)))"
            : tier.key === "premium"
            ? "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--signal) 18%, transparent), transparent 60%), var(--surface-1)"
            : tier.key === "supporter"
            ? "color-mix(in oklch, var(--accent) 6%, var(--surface-1))"
            : "var(--surface-1)",
          border: `1px solid color-mix(in oklch, ${accent} 40%, var(--border-strong))`,
          borderRadius: 14, padding: "18px 18px",
          display: "flex", flexDirection: "column", gap: 12,
          fontFamily: "Inter, system-ui", color: "var(--fg)",
          overflow: "hidden",
        }}>
          {tier.key === "founder" && founderState?.open && (
            <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1 }}>{tier.name}</span>
                {tier.key !== "free" && <TierBadge tier={tier.key} size="md"/>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)", letterSpacing: "-0.015em", lineHeight: 1.3 }}>{tier.tagline}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>$</span>
                <span style={{ fontWeight: 900, fontSize: 42, letterSpacing: "-0.05em", lineHeight: 0.95 }}>{tier.price}</span>
              </div>
              <MonoEyebrow size={9} style={{ marginTop: 4 }}>{tier.priceUnit}</MonoEyebrow>
            </div>
          </div>
          {/* Rationale */}
          <div style={{
            padding: "10px 12px", borderRadius: 8,
            background: "color-mix(in oklch, " + accent + " 8%, transparent)",
            border: "1px solid color-mix(in oklch, " + accent + " 22%, transparent)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--fg-muted)", letterSpacing: "0.02em", lineHeight: 1.5,
          }}>{tier.rationale}</div>
        </div>

        {/* INCLUDED — full feature list with descriptions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <MonoEyebrow size={10}>Included</MonoEyebrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tier.features.map((f, i) => {
              const text = typeof f === "string" ? f : f.text;
              const desc = typeof f === "object" ? f.desc : null;
              const isFuture = typeof f === "object" ? !!f.future : text.endsWith("\u2605");
              const display = isFuture ? text.replace(/ \u2605$/, "") : text;
              return (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  opacity: isFuture ? 0.7 : 1,
                }}>
                  <div style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                    background: "color-mix(in oklch, " + accent + " 12%, var(--surface-1))",
                    border: "1px solid color-mix(in oklch, " + accent + " 30%, transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: accent,
                  }}>
                    {isFuture ? (
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 12 }}>★</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg)", letterSpacing: "-0.005em" }}>{display}</div>
                    {desc && (
                      <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)", letterSpacing: "-0.002em", lineHeight: 1.45 }}>{desc}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ padding: "10px 16px 16px", borderTop: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={{
          all: "unset", cursor: "pointer", display: "block", width: "100%",
          textAlign: "center", padding: "13px 16px", borderRadius: 12,
          background: ctaTone === "signal" ? "var(--signal)"
                   : ctaTone === "founder" ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 70%, var(--signal)))"
                   : ctaTone === "ghost-accent" ? "transparent"
                   : "transparent",
          color: ctaTone === "signal" || ctaTone === "founder" ? "var(--fg-on-accent)"
              : ctaTone === "ghost-accent" ? "var(--accent)"
              : "var(--fg-muted)",
          border: ctaTone === "ghost-accent" ? `1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))`
                : ctaTone === "ghost" ? `1px solid var(--border)`
                : "1px solid transparent",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
          boxShadow: ctaTone === "founder" ? "0 0 24px color-mix(in oklch, var(--accent) 35%, transparent)"
                  : ctaTone === "signal" ? "0 0 18px color-mix(in oklch, var(--signal) 25%, transparent)" : "none",
        }}>{ctaLabel}</button>
        <div style={{
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: "var(--fg-subtle)",
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>Cancel any time · Stripe handles cards</div>
      </div>
    </SheetChrome>
  );
}

// ============================================================
// TRIAL-ENDED takeover
// ============================================================
// State: the 14-day Premium trial wrapped. The user has been quietly
// downgraded to Free; this surface gives them a clean off-ramp choice.
// Layout: hero "Trial wrapped" + 3 tightly-scoped CTAs (founder /
// supporter / premium) + small "stay on Free" off-ramp. Founder leads
// when window's open — it's the best deal, not the upsell.

function TrialEndedSurface({
  variant = "mobile",     // "mobile" or "desktop"
  founderKind = "open-many",
  urgencyIntensity = "medium",
}) {
  const founderState = getFounderState(founderKind);
  const founderOpen = founderState.open;
  const premium = TIERS.find(t => t.key === "premium");
  const supporter = TIERS.find(t => t.key === "supporter");
  const founder = TIERS.find(t => t.key === "founder");

  const hero = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: variant === "mobile" ? "8px 16px 0" : "16px 28px 0" }}>
      <RailHeader tone="muted" eyebrow="Premium trial · wrapped" code="14/14"/>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: variant === "mobile" ? 30 : 40,
          letterSpacing: "-0.035em", lineHeight: 1.05, color: "var(--fg)",
        }}>That's the 14 days.</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 500,
          fontSize: variant === "mobile" ? 14 : 15.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.45,
          maxWidth: 460,
        }}>
          Hope it pulled its weight. You're back on Free now — alerts, follows, and history are paused. Three ways to keep going (or not). No pressure, no hard sell.
        </div>
      </div>

      {/* What you used during the trial — small data rail to anchor value */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1, marginTop: 6, borderRadius: 10, overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--border)",
      }}>
        {[
          { n: "14", l: "Artists followed" },
          { n: "62", l: "Alerts received" },
          { n: "3",  l: "Shows saved" },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: "10px 12px",
            background: "var(--surface-1)",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", color: "var(--signal)", lineHeight: 1 }}>{stat.n}</div>
            <MonoEyebrow size={8.5} letterSpacing="0.12em">{stat.l}</MonoEyebrow>
          </div>
        ))}
      </div>
    </div>
  );

  const options = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: variant === "mobile" ? "16px 16px 4px" : "20px 28px 4px" }}>
      {/* Option 1 — Founder (only if window's still open) — best deal, leads */}
      {founderOpen && (
        <TrialEndedCard
          tier={founder}
          accent="var(--accent)"
          founder={true}
          primary={true}
          founderState={founderState}
          urgencyIntensity={urgencyIntensity}
          ctaLabel={`Claim Founder · $${founder.price}/mo locked`}
          eyebrow="Best deal · window still open"
          bullet={`All of Premium, $${premium.price - founder.price}/mo less than the regular price. Forever.`}
        />
      )}

      {/* Option 2 — Supporter (cheaper than Premium, same visual weight) */}
      <TrialEndedCard
        tier={supporter}
        accent="var(--accent)"
        ctaLabel={`Become a Supporter · $${supporter.price}/mo`}
        eyebrow="Lighter · history + calendar export"
        bullet="No alerts, follows, or price drops. Still chips in."
      />

      {/* Option 3 — Premium (an option, not pushed) */}
      <TrialEndedCard
        tier={premium}
        accent="var(--signal)"
        ctaLabel={`Subscribe to Premium · $${premium.price}/mo`}
        eyebrow="Same as your trial"
        bullet="Follows, alerts, and price drops stay on."
      />

      {/* Off-ramp — Stay on Free */}
      <button style={{
        all: "unset", cursor: "pointer", textAlign: "center",
        padding: "12px 14px", marginTop: 4, borderRadius: 10,
        border: "1px solid var(--border)",
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
        color: "var(--fg-muted)",
      }}>Stay on Free · we're cool with that</button>

      <div style={{
        textAlign: "center", marginTop: 4,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5, color: "var(--fg-subtle)",
        letterSpacing: "0.14em", textTransform: "uppercase",
      }}>No charges happened · cancel never · thanks for trying it</div>
    </div>
  );

  if (variant === "mobile") {
    // Full-takeover bottom sheet, taller than the picker (no draggy collapse).
    return (
      <SheetChrome height="93%">
        <DragHandle/>
        {hero}
        <div style={{ flex: 1, overflow: "auto" }}>
          {options}
        </div>
      </SheetChrome>
    );
  }
  // Desktop centered modal — slightly wider than payment to fit 2-col options
  return (
    <ModalChrome width={620}>
      {hero}
      <div style={{ flex: 1, overflow: "auto" }}>
        {options}
      </div>
    </ModalChrome>
  );
}

function TrialEndedCard({ tier, accent, primary = false, founder = false, founderState, urgencyIntensity, ctaLabel, eyebrow, bullet }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 12,
      padding: "13px 14px",
      background: founder
        ? "linear-gradient(135deg, color-mix(in oklch, var(--accent) 12%, var(--surface-1)) 0%, color-mix(in oklch, var(--signal) 10%, var(--surface-1)) 100%)"
        : primary
        ? "color-mix(in oklch, var(--signal) 7%, var(--surface-1))"
        : "var(--surface-1)",
      border: `1px solid ${primary || founder ? "color-mix(in oklch, " + accent + " 45%, var(--border-strong))" : "var(--border)"}`,
      boxShadow: founder ? "0 0 0 1px color-mix(in oklch, var(--accent) 18%, transparent)" : "none",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {founder && founderState?.open && (
        <ScarcityRail state={founderState} intensity={urgencyIntensity || "medium"}/>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MonoEyebrow color={accent} size={9.5} letterSpacing="0.16em">{eyebrow}</MonoEyebrow>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 18,
              letterSpacing: "-0.02em", color: "var(--fg)",
            }}>{tier.name}</span>
            <TierBadge tier={tier.key} size="sm"/>
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>{bullet}</div>
        </div>
      </div>
      <button style={{
        all: "unset", cursor: "pointer", textAlign: "center",
        padding: "11px 14px", borderRadius: 10,
        background: founder
          ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 70%, var(--signal)))"
          : primary ? "var(--signal)" : "transparent",
        color: primary || founder ? "var(--fg-on-accent)" : accent,
        border: !primary && !founder ? `1px solid color-mix(in oklch, ${accent} 40%, var(--border-strong))` : "1px solid transparent",
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13.5,
        letterSpacing: "-0.005em",
        boxShadow: founder ? "0 0 22px color-mix(in oklch, var(--accent) 35%, transparent)"
                : primary ? "0 0 16px color-mix(in oklch, var(--signal) 25%, transparent)" : "none",
      }}>{ctaLabel}</button>
    </div>
  );
}

Object.assign(window, {
  TierDetailSheet, TrialEndedSurface, TrialEndedCard,
});

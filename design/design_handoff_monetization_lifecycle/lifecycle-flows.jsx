// lifecycle-flows.jsx — #780 Cancel / Downgrade / Upgrade confirmation surfaces
//
//   <CancelFlow variant periodEnd/>
//   <DowngradeFlow variant periodEnd credit/>     Premium → Supporter
//   <UpgradeFlow variant prorated/>               Supporter → Premium
//
// All single-screen confirmation surfaces (brief). Mobile = bottom sheet,
// desktop = centered modal. They pattern-match the <MiniPaywall> shape:
// RailHeader → headline → disclosure card(s) → button stack → mono fine print.
//
// Design's calls (brief §"Open for Design to call"):
//   • Cancel retention nudge leads with PRICE (Supporter $2) + a small
//     what-switches-off line; one-tap routes into the downgrade flow.
//   • Downgrade data-handling = a quiet one-liner that EXPANDS into a
//     "Here's what changes" list (best of both — calm default, full detail on tap).

const { TierBadge, MonoEyebrow, RailHeader, SheetChrome, ModalChrome, DragHandle } = window;

// ── shared surface wrapper ───────────────────────────────────
function FlowSurface({ variant, width = 440, children }) {
  if (variant === "desktop") {
    return <ModalChrome width={width}><div style={{ padding: "24px 26px 22px" }}>{children}</div></ModalChrome>;
  }
  return (
    <SheetChrome height="auto">
      <DragHandle/>
      <div style={{ padding: "4px 16px 22px" }}>{children}</div>
    </SheetChrome>
  );
}

function FlowButton({ label, kind = "primary", accent = "var(--signal)", glow, sub, onClick }) {
  const primary = kind === "primary";
  const danger = kind === "danger";
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center", boxSizing: "border-box", width: "100%",
      padding: "13px 16px", borderRadius: 12,
      background: primary ? accent : "transparent",
      color: primary ? "var(--fg-on-accent)" : danger ? "var(--danger)" : "var(--fg-muted)",
      border: primary ? "none"
            : danger ? "1px solid color-mix(in oklch, var(--danger) 45%, var(--border-strong))"
            : "1px solid var(--border-strong)",
      fontFamily: "Inter, system-ui", fontWeight: primary ? 800 : 700, fontSize: 14.5,
      boxShadow: primary && glow ? `0 0 18px color-mix(in oklch, ${accent} 28%, transparent)` : "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      <span>{label}</span>
      {sub && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}>{sub}</span>}
    </button>
  );
}

function FinePrint({ children }) {
  return (
    <div style={{
      textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: "var(--fg-subtle)", letterSpacing: "0.12em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

// a labeled disclosure card (date breakdown / proration math)
function InfoCard({ tone = "neutral", children }) {
  const c = tone === "signal" ? "var(--signal)" : tone === "accent" ? "var(--accent)" : "var(--border-strong)";
  return (
    <div style={{
      padding: "13px 14px", borderRadius: 12,
      background: tone === "neutral" ? "var(--surface-1)" : `color-mix(in oklch, ${c} 7%, var(--surface-1))`,
      border: `1px solid ${tone === "neutral" ? "var(--border)" : `color-mix(in oklch, ${c} 30%, var(--border))`}`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>{children}</div>
  );
}

function MathRow({ label, value, strong }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: strong ? 700 : 500, fontSize: 13, color: strong ? "var(--fg)" : "var(--fg-muted)", letterSpacing: "-0.005em" }}>{label}</span>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: strong ? 900 : 700, fontSize: strong ? 16 : 13.5, letterSpacing: "-0.02em", color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CANCEL FLOW
// ════════════════════════════════════════════════════════════
// `tier` drives two shapes:
//   • Premium / Founder  → full flow: date breakdown (+ 90-day data safety) +
//     price-led retention nudge with the Switch-to-Supporter off-ramp.
//   • Supporter          → thinner flow: confirmation + date breakdown only.
//     There's no cheaper paid tier to step down to and Supporter is badge-only
//     per the §6 matrix, so no down-sell nudge and no 90-day data note.
//
// CTA hierarchy follows the brief: "Cancel subscription" is the clear primary
// confirm; "Never mind" is the ghost back-out. Retention lives in the nudge
// card above — not by burying the cancel button (keeps it honest, no dark
// pattern). See README decisions log.
function CancelFlow({ variant = "mobile", tier = "premium", periodEnd = "Jul 15" }) {
  const wide = variant === "desktop";
  const isPremiumUp = tier === "premium" || tier === "founder";
  const tierName = tier === "founder" ? "Founder" : tier === "supporter" ? "Supporter" : "Premium";
  return (
    <FlowSurface variant={variant} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
        <RailHeader tone="muted" eyebrow={`Cancel · ${tierName}`} code={periodEnd.toUpperCase()}/>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 28 : 24, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Stepping back?</div>
          <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
            No guilt trip. Here's exactly what happens if you cancel.
          </div>
        </div>

        {/* date breakdown */}
        <InfoCard tone="neutral">
          <MathRow label={`You keep ${tierName} until`} value={periodEnd} strong/>
          <div style={{ height: 1, background: "var(--border)" }}/>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
            {isPremiumUp
              ? <>You won't be charged again. On {periodEnd} you roll to Free — and your history, follows, and alerts stay safe for 90 days in case you come back.</>
              : <>You won't be charged again. On {periodEnd} you roll to Free and the Supporter badge comes off. Everything you actually use — saved shows, browsing, prices — was always free and stays put.</>}
          </div>
        </InfoCard>

        {/* retention nudge — Premium/Founder only (nothing cheaper for Supporter) */}
        {isPremiumUp && (
          <div style={{
            padding: "14px 14px", borderRadius: 12,
            background: "color-mix(in oklch, var(--accent) 7%, var(--surface-1))",
            border: "1px solid color-mix(in oklch, var(--accent) 32%, var(--border))",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MonoEyebrow size={9.5} color="var(--accent)" letterSpacing="0.16em">Before you go</MonoEyebrow>
              <TierBadge tier="supporter" size="sm"/>
            </div>
            <div style={{ fontWeight: 700, fontSize: wide ? 16.5 : 15, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              If it's the {tier === "founder" ? "$3" : "$5"} — Supporter's $2.
            </div>
            <div style={{ fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
              Supporter keeps you chipping in for less. You'd switch off alerts, follows, and price drops — and your history, follows, and alerts stay safe for 90 days either way.
            </div>
            <button style={{
              all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%", textAlign: "center",
              padding: "11px 14px", borderRadius: 10, marginTop: 2,
              background: "transparent", color: "var(--accent)",
              border: "1px solid color-mix(in oklch, var(--accent) 50%, var(--border-strong))",
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              Switch to Supporter instead
              <svg width="13" height="13" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}

        {/* confirm + back-out — brief hierarchy: Cancel = primary, ghost back-out */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <FlowButton label="Cancel subscription" kind="primary" accent="var(--danger)"/>
          <FlowButton label={`Never mind — keep ${tierName}`} kind="ghost"/>
        </div>
        <FinePrint>No refunds · access continues to {periodEnd} · cancel anytime</FinePrint>
      </div>
    </FlowSurface>
  );
}

// ════════════════════════════════════════════════════════════
// DOWNGRADE — Premium → Supporter
// ════════════════════════════════════════════════════════════
function ChangesDisclosure() {
  const [open, setOpen] = React.useState(false);
  const stays = ["Concert history — every show you've logged", "Calendar export — Apple + Google", "Supporter badge on your profile"];
  const off = ["Following artists", "New-show alerts", "Price-drop alerts", "Spotify sync"];
  return (
    <div style={{
      borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-1)", overflow: "hidden",
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer", boxSizing: "border-box", width: "100%",
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
      }}>
        <svg width="15" height="15" viewBox="0 0 16 16" style={{ flexShrink: 0, color: "var(--fg-muted)" }}>
          <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 5.2 V8.4 M8 10.6 H8.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em" }}>
          Your history, follows, and alerts stay safe for 90 days.
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, color: "var(--fg-subtle)", transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }}>
          <path d="M3 5 L7 9 L11 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: "2px 14px 14px", display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ height: 1, background: "var(--border)" }}/>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MonoEyebrow size={9} color="var(--accent)" letterSpacing="0.16em">Stays on</MonoEyebrow>
            {stays.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 3 }}><path d="M2 6 L5 9 L10 3" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.16em">Switches off · safe 90 days</MonoEyebrow>
            {off.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg-muted)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, marginTop: 3 }}><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="var(--fg-subtle)" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 11.5, color: "var(--fg-subtle)", lineHeight: 1.5, fontStyle: "italic" }}>
            Re-upgrade within 90 days and it all comes back exactly where you left it. After that it's cleared.
          </div>
        </div>
      )}
    </div>
  );
}

function DowngradeFlow({ variant = "mobile", credit = "2.50" }) {
  const wide = variant === "desktop";
  return (
    <FlowSurface variant={variant} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
        <RailHeader tone="accent" eyebrow="Switch · Premium → Supporter" code="$2/MO"/>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: wide ? 28 : 24, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Switching to Supporter</div>
            <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
              Lighter plan, same gratitude. Here's the money and what moves.
            </div>
          </div>
        </div>

        {/* proration */}
        <InfoCard tone="accent">
          <MonoEyebrow size={9.5} color="var(--accent)" letterSpacing="0.16em">The math</MonoEyebrow>
          <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.5, color: "var(--fg)" }}>
            Supporter's active the moment you confirm. The <strong>${credit}</strong> from your unused Premium days lands as account credit on your next bill.
          </div>
          <div style={{ height: 1, background: "color-mix(in oklch, var(--accent) 22%, var(--border))" }}/>
          <MathRow label="Supporter, from today" value="$2.00/mo"/>
          <MathRow label="Credit toward next bill" value={`+$${credit}`} strong/>
        </InfoCard>

        {/* data handling — quiet one-liner that expands */}
        <ChangesDisclosure/>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <FlowButton label="Switch to Supporter" kind="primary" accent="var(--accent)" glow/>
          <FlowButton label="Never mind" kind="ghost"/>
        </div>
        <FinePrint>Effective immediately · credit via Stripe · cancel anytime</FinePrint>
      </div>
    </FlowSurface>
  );
}

// ════════════════════════════════════════════════════════════
// UPGRADE — Supporter → Premium
// ════════════════════════════════════════════════════════════
function UpgradeFlow({ variant = "mobile", prorated = "3.25" }) {
  const wide = variant === "desktop";
  const unlocks = ["Follow artists", "New-show alerts", "Price-drop alerts", "Spotify sync"];
  return (
    <FlowSurface variant={variant} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
        <RailHeader tone="signal" eyebrow="Upgrade · Supporter → Premium" code="$5/MO"/>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontWeight: 900, fontSize: wide ? 28 : 24, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Going Premium</div>
          <div style={{ fontWeight: 500, fontSize: wide ? 14.5 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5 }}>
            The stuff that costs us money to run — switched on the second you confirm.
          </div>
        </div>

        {/* proration */}
        <InfoCard tone="signal">
          <MonoEyebrow size={9.5} color="var(--signal)" letterSpacing="0.16em">The math</MonoEyebrow>
          <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.5, color: "var(--fg)" }}>
            Premium unlocks now. <strong>${prorated}</strong> covers the rest of this billing cycle; after that it's the usual $5/mo.
          </div>
          <div style={{ height: 1, background: "color-mix(in oklch, var(--signal) 22%, var(--border))" }}/>
          <MathRow label="Charged today (prorated)" value={`$${prorated}`} strong/>
          <MathRow label="Then monthly" value="$5.00/mo"/>
        </InfoCard>

        {/* what unlocks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 2px" }}>
          <MonoEyebrow size={9.5} letterSpacing="0.16em">Unlocks right away</MonoEyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {unlocks.map((u, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5, color: "var(--fg)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}><path d="M2 6 L5 9 L10 3" fill="none" stroke="var(--signal)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>{u}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <FlowButton label="Unlock Premium" sub={`$${prorated} today, then $5/mo`} kind="primary" accent="var(--signal)" glow/>
          <FlowButton label="Not yet" kind="ghost"/>
        </div>
        <FinePrint>Effective immediately · prorated via Stripe · cancel anytime</FinePrint>
      </div>
    </FlowSurface>
  );
}

Object.assign(window, { CancelFlow, DowngradeFlow, UpgradeFlow, ChangesDisclosure, FlowSurface, FlowButton });

// monetization-founder-gifted.jsx — Round 5
//   <FounderRaceLoser variant/>      — §3.2 honest "just missed it" takeover
//   <FounderClaimTakeover variant seatNumber/> — §3.3 post-claim seat reveal
//   <GiftedPlanCardDesktop user/> / <GiftedPlanCardMobile/> — §4 plan card
//
// Full-bleed surfaces: they fill their frame (phone screen / desktop content),
// not a sheet over a dimmed page. Token-only; no confetti (brief §3.3).

const { TierBadge, MonoEyebrow, RailHeader, MMark } = window;

// ── Seat meter — a full or near-full progress bar with a count ─
function SeatMeter({ claimed, total, tone = "accent", big = false }) {
  const pct = Math.min(100, (claimed / total) * 100);
  const c = tone === "accent" ? "var(--accent)" : "var(--signal)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <MonoEyebrow color={c} size={big ? 12 : 10} letterSpacing="0.16em">{claimed} / {total} claimed</MonoEyebrow>
        <MonoEyebrow color="var(--fg-muted)" size={big ? 12 : 10} letterSpacing="0.16em">
          {total - claimed === 0 ? "0 left" : `${total - claimed} left`}
        </MonoEyebrow>
      </div>
      <div style={{ height: big ? 6 : 4, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 6,
          background: pct >= 100 ? "linear-gradient(90deg, var(--signal), var(--accent))" : c,
          boxShadow: pct >= 100 ? "0 0 12px color-mix(in oklch, var(--accent) 50%, transparent)" : "none",
        }}/>
      </div>
    </div>
  );
}

// ── §3.2 — claim race, the loser ─────────────────────────────
function FounderRaceLoser({ variant = "mobile" }) {
  const wide = variant === "desktop";
  const body = (
    <div style={{
      width: "100%", maxWidth: wide ? 480 : "100%",
      display: "flex", flexDirection: "column", gap: wide ? 22 : 18,
      fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <RailHeader tone="muted" eyebrow="Founder · the window just closed" code="100/100"/>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: wide ? 52 : 38, letterSpacing: "-0.04em", lineHeight: 1.0 }}>
          Founder filled up.
        </div>
        <div style={{ fontWeight: 700, fontSize: wide ? 20 : 17, letterSpacing: "-0.02em", color: "var(--accent)", lineHeight: 1.2 }}>
          You were seconds away.
        </div>
        <div style={{ fontWeight: 500, fontSize: wide ? 15 : 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 440, marginTop: 2 }}>
          Someone grabbed seat 100 while you were reaching for yours. That's how a hundred goes. Your card wasn't touched — nothing was charged.
        </div>
      </div>

      {/* full seat meter */}
      <div style={{
        padding: "16px 16px", borderRadius: 14,
        background: "var(--surface-1)", border: "1px solid var(--border)",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <SeatMeter claimed={100} total={100} tone="accent" big={wide}/>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--success)" }}/>
          <MonoEyebrow size={10} color="var(--fg-muted)">Card untouched · $0.00 charged</MonoEyebrow>
        </div>
      </div>

      {/* CTA stack — Premium at regular price, no consolation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={{
          all: "unset", cursor: "pointer", textAlign: "center",
          padding: "14px 16px", borderRadius: 12, background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
          boxShadow: "0 0 20px color-mix(in oklch, var(--signal) 28%, transparent)",
        }}>Go Premium · $5/mo</button>
        <button style={{
          all: "unset", cursor: "pointer", textAlign: "center",
          padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border-strong)",
          color: "var(--fg-muted)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
        }}>Back to plans</button>
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)",
        letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.6, textAlign: wide ? "left" : "center",
      }}>
        No consolation pricing. Same Premium, regular price — we don't do fake discounts.
      </div>
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      display: "flex", alignItems: wide ? "center" : "flex-start", justifyContent: "center",
      padding: wide ? "40px" : "78px 20px 28px", overflow: "auto",
    }}>
      {body}
    </div>
  );
}

// ── §3.3 — claim race, the winner ────────────────────────────
function FounderClaimTakeover({ variant = "mobile", seatNumber = 37, total = 100 }) {
  const wide = variant === "desktop";
  const body = (
    <div style={{
      width: "100%", maxWidth: wide ? 520 : "100%",
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      gap: wide ? 22 : 18, fontFamily: "Inter, system-ui", color: "var(--fg)",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <RailHeader tone="signal" eyebrow="Founder · claimed" code={`${seatNumber}/${total}`}/>
      </div>

      {/* Mark with halo */}
      <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          position: "absolute", inset: -14, borderRadius: 30,
          background: "radial-gradient(circle, color-mix(in oklch, var(--accent) 45%, transparent), transparent 72%)",
        }}/>
        <MMark size={72}/>
      </div>

      {/* Seat number reveal */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <MonoEyebrow size={11} color="var(--fg-muted)" letterSpacing="0.22em">Your seat</MonoEyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontWeight: 900, fontSize: wide ? 104 : 80, letterSpacing: "-0.05em", lineHeight: 0.9,
            color: "var(--accent)",
            textShadow: "0 0 40px color-mix(in oklch, var(--accent) 35%, transparent)",
          }}>#{seatNumber}</span>
          <span style={{ fontWeight: 700, fontSize: wide ? 24 : 20, color: "var(--fg-muted)", letterSpacing: "-0.02em" }}>of {total}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: wide ? 44 : 34, letterSpacing: "-0.04em", lineHeight: 1.0 }}>
          Founder. Locked in.
        </div>
        <div style={{ fontWeight: 500, fontSize: wide ? 15.5 : 14, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 420 }}>
          You got in before the rest. $3 a month for as long as you're here — even when everyone else is paying double.
        </div>
      </div>

      {/* locked price stamp + badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "9px 14px", borderRadius: 999,
          background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 16%, var(--surface-1)), color-mix(in oklch, var(--signal) 14%, var(--surface-1)))",
          border: "1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))",
        }}>
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em", color: "var(--fg)" }}>$3<span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)" }}>/mo</span></span>
          <span style={{ width: 1, height: 16, background: "var(--border-strong)" }}/>
          <MonoEyebrow size={9.5} color="var(--accent)" letterSpacing="0.16em">Locked forever</MonoEyebrow>
        </div>
        <TierBadge tier="founder" size="lg"/>
      </div>

      {/* single CTA */}
      <button style={{
        all: "unset", cursor: "pointer", textAlign: "center", width: wide ? 320 : "100%", maxWidth: 360,
        padding: "15px 16px", borderRadius: 12,
        background: "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))",
        color: "var(--fg-on-accent)", fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15.5,
        boxShadow: "0 0 26px color-mix(in oklch, var(--accent) 35%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        Take me in.
        <svg width="15" height="15" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.16em">Routing you to Settings · Plan</MonoEyebrow>
    </div>
  );

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--accent) 12%, var(--bg)) 0%, var(--bg) 55%)",
      color: "var(--fg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: wide ? "40px" : "70px 20px 28px", overflow: "auto",
    }}>
      {body}
    </div>
  );
}

// ── §4 — Gifted Plan card (settings) ─────────────────────────
// Gratitude voice. No "Manage subscription", no "Cancel any time".
function GiftedEyebrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <TierBadge tier="premium" size="md"/>
      <span style={{
        padding: "4px 9px", borderRadius: 6,
        background: "var(--surface-2)", border: "1px solid var(--border-strong)",
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10,
        letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-muted)",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)" }}/>
        Beta
      </span>
      <MonoEyebrow size={10} color="var(--fg-subtle)" letterSpacing="0.14em">Lifetime · on us</MonoEyebrow>
    </div>
  );
}

function GiftedPlanCardDesktop() {
  return (
    <div style={{
      position: "relative", borderRadius: 14, padding: "20px 22px 22px",
      background: "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--signal) 14%, transparent) 0%, transparent 55%), var(--bg-elevated)",
      border: "1px solid color-mix(in oklch, var(--signal) 45%, var(--border-strong))",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 14, maxWidth: 620,
    }}>
      <GiftedEyebrow/>
      <div style={{ fontWeight: 900, fontSize: 30, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
        Premium. On the house.
      </div>
      <div style={{ fontWeight: 500, fontSize: 14.5, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5, maxWidth: 520 }}>
        You're comped for life. Your beta seat covers everything Premium — Watching, follows, alerts, price drops, the lot. There's no card on file and no payment relationship to manage. Nothing for you to do here but enjoy it.
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: 12.5, color: "var(--signal)", letterSpacing: "0.02em" }}>
        —— You were here first. We don't forget that.
      </div>
      {/* discovery only — no management, no cancel */}
      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
        <button style={{
          all: "unset", cursor: "pointer", padding: "11px 16px", borderRadius: 10,
          background: "transparent", color: "var(--fg)", border: "1px solid var(--border-strong)",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          See what Premium unlocks
          <svg width="13" height="13" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

function GiftedPlanCardMobile() {
  return (
    <div style={{
      position: "relative", borderRadius: 14, padding: "16px 16px 18px",
      background: "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--signal) 14%, transparent) 0%, transparent 60%), var(--bg-elevated)",
      border: "1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong))",
      color: "var(--fg)", fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
        <TierBadge tier="premium" size="sm"/>
        <span style={{
          padding: "3px 8px", borderRadius: 4,
          background: "var(--surface-2)", border: "1px solid var(--border-strong)",
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9,
          letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-muted)",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 4, background: "var(--signal)" }}/>
          Beta
        </span>
        <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.14em">Lifetime · on us</MonoEyebrow>
      </div>
      <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.025em", lineHeight: 1.08 }}>
        Premium. On the house.
      </div>
      <div style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.45 }}>
        Comped for life — your beta seat covers everything Premium. No card on file, nothing to manage. Just enjoy it.
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "italic", fontSize: 11.5, color: "var(--signal)", letterSpacing: "0.02em", marginTop: 2 }}>
        —— You were here first. We don't forget that.
      </div>
      <button style={{
        all: "unset", cursor: "pointer", textAlign: "center", marginTop: 6,
        padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border-strong)",
        color: "var(--fg)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        See what Premium unlocks
        <svg width="13" height="13" viewBox="0 0 12 12"><path d="M4.5 2 L8.5 6 L4.5 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

Object.assign(window, {
  SeatMeter, FounderRaceLoser, FounderClaimTakeover,
  GiftedPlanCardDesktop, GiftedPlanCardMobile, GiftedEyebrow,
});

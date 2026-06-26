// microcopy.jsx — #782 required microcopy regions
//
//   <LegalBlock scaRegion/>      above-CTA legal block (stacked mono micro-rows)
//   <BottomMonoRail/>            refined trust rail (bottom of PaymentSurface)
//   <PricePromiseLine tier/>     grandfather-forever line for paid tier cards
//   PRICE_PROMISE                copy map (for the README / copy.ts handoff)
//
// Decisions (brief §6, Design's call):
//   • Above-CTA block = STACKED MONO MICRO-ROWS (Hugh's call) — keeps every legal
//     line visible, no collapse. Eyebrow weight, fg-subtle, links in --signal.
//     Order: (a) ToS / Privacy / Refund links · (b) auto-renew · (c) SCA notice (conditional).
//   • NO "subject to change" disclaimer anywhere — it would undermine the
//     grandfather-everyone-forever promise (brief §4).
//   • Price-promise line shows on Supporter + Premium (they lacked it). Founder
//     KEEPS its stronger "$3 locked forever" stamp from #781 — the line there is
//     phrased to reinforce, not duplicate.

const { MonoEyebrow } = window;

// ── a single legal micro-row ─────────────────────────────────
function LegalRow({ children, tone = "subtle" }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 500, lineHeight: 1.5,
      letterSpacing: "0.02em",
      color: tone === "muted" ? "var(--fg-muted)" : "var(--fg-subtle)",
      display: "flex", alignItems: "baseline", gap: 7,
    }}>
      <span style={{
        width: 4, height: 4, borderRadius: 4, marginTop: 6, flexShrink: 0,
        background: "var(--border-strong)",
      }}/>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

function LegalLink({ children }) {
  return (
    <span style={{
      color: "var(--signal)",
      textDecoration: "underline",
      textUnderlineOffset: 2,
      textDecorationColor: "color-mix(in oklch, var(--signal) 45%, transparent)",
      cursor: "pointer",
    }}>{children}</span>
  );
}

// ── Above-CTA legal block ────────────────────────────────────
// scaRegion is server-set (#775 region detection); always present for SCA-region
// users — NOT gated on Stripe's per-charge response.
function LegalBlock({ scaRegion = false }) {
  return (
    <div
      role="group"
      aria-label="Terms and billing information"
      style={{
        display: "flex", flexDirection: "column", gap: 6,
        padding: "10px 0 2px",
      }}>
      <LegalRow>
        By continuing you agree to our{" "}
        <LegalLink>Terms</LegalLink>,{" "}
        <LegalLink>Privacy</LegalLink>{" "}&amp;{" "}
        <LegalLink>Refund policy</LegalLink>.
      </LegalRow>
      <LegalRow>
        Auto-renews monthly. Cancel anytime — keeps working till the period ends.
      </LegalRow>
      {scaRegion && (
        <LegalRow tone="muted">
          Your bank may ask to confirm this payment.
        </LegalRow>
      )}
    </div>
  );
}

// ── Bottom mono rail (trust signaling — refined) ─────────────
// Replaces the original "Cancel any time · We never see your card" single line.
// Splits trust (Stripe / card privacy) from the cancel reassurance so each reads.
function BottomMonoRail() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap", gap: "4px 12px",
      padding: "6px 0 2px",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" style={{ color: "var(--fg-subtle)" }}>
          <rect x="2.5" y="5" width="7" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M4 5 V3.7 a2 2 0 0 1 4 0 V5" fill="none" stroke="currentColor" strokeWidth="1.1"/>
        </svg>
        <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">
          Stripe handles your card · we never see it
        </MonoEyebrow>
      </span>
      <span style={{ color: "var(--border-strong)", fontSize: 9 }}>·</span>
      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">
        Cancel anytime, lose nothing
      </MonoEyebrow>
    </div>
  );
}

// ── Price-promise line (grandfather-everyone-forever) ────────
// Direction (brief §4): "Whatever you pay, you pay. We won't raise it."
// Final wording is Design's call — one line per paid tier, Sour Patch register.
const PRICE_PROMISE = {
  supporter: "Whatever you pay, you pay. We never raise it.",
  premium:   "Whatever you pay, you pay. We never raise it.",
  // Founder already says it stronger via its locked-forever stamp; this line
  // reinforces rather than duplicates.
  founder:   "$3 is $3. New folks may pay double someday — never you.",
};

function PricePromiseLine({ tier = "premium", size = "md" }) {
  const text = PRICE_PROMISE[tier];
  if (!text) return null;
  const sm = size === "sm";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 7,
      padding: sm ? "7px 9px" : "8px 11px",
      borderRadius: 9,
      background: "color-mix(in oklch, var(--accent) 7%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--accent) 22%, var(--border))",
    }}>
      {/* lock-tag glyph */}
      <svg width={sm ? 12 : 13} height={sm ? 12 : 13} viewBox="0 0 14 14" aria-hidden="true" style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>
        <rect x="3" y="6" width="8" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M4.6 6 V4.5 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
      <span style={{
        fontFamily: "Inter, system-ui",
        fontWeight: 600, fontSize: sm ? 11.5 : 12.5,
        letterSpacing: "-0.005em", lineHeight: 1.4,
        color: "var(--fg-muted)",
      }}>{text}</span>
    </div>
  );
}

Object.assign(window, { LegalBlock, BottomMonoRail, PricePromiseLine, PRICE_PROMISE, LegalRow, LegalLink });

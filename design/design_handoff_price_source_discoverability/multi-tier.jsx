// multi-tier.jsx — multi-tier price card states
//
// Engineering's open question (May 25 round 2): tier is display metadata, not
// a competing claim. GA $40 and VIP $100 are independent submissions, each
// going through their own 2-confirm gate. When both are corroborated, the
// live card shows the cheapest floor as the headline with "from" language,
// and the higher tier renders as a tier-alternate row below.
//
// This file answers two implementation questions:
//
//   1. Can two pending cards appear simultaneously?
//      → YES. Each tier is independent. We render them as a stack of
//        PendingCardB cards in the price-card slot.
//
//   2. What does the resolved multi-tier state look like?
//      → Cheapest tier is the headline, framed as "from $40 · GA".
//        Higher tier(s) render as TierAlternateRow below — same visual
//        rhythm as the existing AlternateSourceRow used for cross-vendor
//        alternates in PriceBlockB. New chrome is intentionally minimal:
//        a fan should be able to see ALL prices for the show at a glance,
//        without expanding anything.
//
// Components:
//   <TwoPendingStack/>    — two PendingCardB cards stacked (GA + VIP pending)
//   <MultiTierLiveCard/>  — fully-resolved card with "from" headline + tier
//                           alternate rows
//   <MixedTierCard/>      — one tier live (headline), other tier pending
//                           (alternate row with pending badge)
//   <TierAlternateRow/>   — the alternate-row primitive for tier rows

const AZ_M    = window.PendingAZURE || "oklch(0.62 0.12 240)";
const GOLD_M  = window.PendingGOLD  || "oklch(0.66 0.14 78)";

const FormatRangeM = window.PendingFormatRange;

// Tier alternate row — shape mirrors PriceBlockB's AlternateSourceRow,
// but the label cell is the TIER instead of the vendor. Tier label is
// the eye-anchor; vendor + confirm count are secondary.
function TierAlternateRow({
  tier = "VIP",
  floor = 100, ceiling = null,
  vendor = "AXS",
  kind = "community",
  confirms = 2,
  pending = false,
  view = "other",      // "other" | "submitter"
}) {
  const dotColor = kind === "boxoffice"
    ? GOLD_M
    : kind === "community"
      ? AZ_M
      : "var(--fg-muted)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0",
      borderTop: "1px dashed var(--border)",
    }}>
      {/* Tier label — Inter 700 to match a tier chip's read */}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
        color: "var(--fg)", letterSpacing: "0.08em",
        textTransform: "uppercase", fontWeight: 700,
        minWidth: 56,
      }}>{tier}</span>

      {/* Tier-dot · color matches the trust tier */}
      <span style={{
        width: 5, height: 5, borderRadius: 2.5, flexShrink: 0,
        background: dotColor, alignSelf: "center", opacity: 0.85,
      }}/>

      {/* Pending tell or vendor */}
      {pending ? (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: AZ_M, letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>pending · {confirms}/2</span>
      ) : (
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 12,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>{vendor}</span>
      )}

      <span style={{ flex: 1 }}/>

      {/* Price (right-aligned) */}
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
        color: pending ? "var(--fg-muted)" : "var(--fg)", letterSpacing: "-0.01em",
        fontVariantNumeric: "tabular-nums",
      }}>{FormatRangeM(floor, ceiling)}</span>
    </div>
  );
}

// ============================================================
// TwoPendingStack
// ------------------------------------------------------------
// Two independent pending submissions stacked. Common case: a
// fan has submitted GA, and within an hour another fan submits
// VIP. Both sit pending in the price-card slot until each gets
// its 2 confirms independently.
// ============================================================
function TwoPendingStack({ theme = "electric" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <window.PendingCardB
        floor={40} tier="GA" vendor="AXS" kind="community"
        submitter={{ handle: "@hugh", url: "/u/hugh" }}
        submittedAt="2h ago" confirms={1} needed={2} view="other"
        note="GA standing on AXS. $40 face, no fees on the page."
      />
      <window.PendingCardB
        floor={100} tier="VIP" vendor="AXS" kind="community"
        submitter={{ handle: "@amelia", url: "/u/amelia" }}
        submittedAt="40m ago" confirms={0} needed={2} view="other"
        note="VIP — front pit + pre-show meet, $100 face on AXS."
      />
    </div>
  );
}

// ============================================================
// MultiTierLiveCard
// ------------------------------------------------------------
// Fully-resolved two-tier state. Headline is the cheapest tier
// with "from" framing. Higher tiers render as TierAlternateRow
// below. The eye sees the floor first, then can scan down to
// learn what the upgrades cost.
// ============================================================
function MultiTierLiveCard({
  cheapestTier = "GA",
  cheapestFloor = 40,
  cheapestCeiling = null,
  cheapestVendor = "AXS",
  cheapestKind = "community",
  alternates = [
    { tier: "VIP", floor: 100, ceiling: null, vendor: "AXS", kind: "community", confirms: 2 },
  ],
  observedAt = "yesterday",
  reports = 1,   // ask #3 — within-tier pick cue; appended to the meta line when >1
}) {
  return (
    <div style={{
      borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      padding: "14px 14px 12px",
    }}>
      <window.PendingEyebrow>Tickets</window.PendingEyebrow>

      {/* Headline — "from $40 · GA" */}
      <div style={{
        marginTop: 6,
        display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>from</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
        }}>{FormatRangeM(cheapestFloor, cheapestCeiling)}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>{cheapestTier}</span>
        <window.PendingTrustPill kind={cheapestKind}/>
      </div>

      {/* Vendor for the headline tier */}
      <div style={{
        marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.04em",
      }}>seen on {cheapestVendor} · observed {observedAt}{reports > 1 ? ` · ${reports} reports` : ""}</div>

      {/* Tier alternates · "Other tiers" eyebrow */}
      {alternates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 2,
          }}>Other tiers</div>
          {alternates.map((alt, i) => <TierAlternateRow key={i} {...alt}/>)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MixedTierCard
// ------------------------------------------------------------
// One tier live (the cheaper one, as the headline) + one tier
// still pending (as an alt row marked pending). The fan can see
// the floor immediately, and the pending tier is visible without
// taking over.
// ============================================================
function MixedTierCard() {
  return (
    <div style={{
      borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      padding: "14px 14px 12px",
    }}>
      <window.PendingEyebrow>Tickets</window.PendingEyebrow>

      <div style={{
        marginTop: 6,
        display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>from</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
        }}>$40</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>GA</span>
        <window.PendingTrustPill kind="community"/>
      </div>

      <div style={{
        marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.04em",
      }}>seen on AXS · observed yesterday · 2 fans confirmed</div>

      <div style={{ marginTop: 12 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em",
          textTransform: "uppercase", marginBottom: 2,
        }}>Other tiers</div>
        <TierAlternateRow
          tier="VIP" floor={100} kind="community"
          confirms={1} pending
        />
      </div>
    </div>
  );
}

window.TwoPendingStack = TwoPendingStack;
window.MultiTierLiveCard = MultiTierLiveCard;
window.MixedTierCard = MixedTierCard;
window.TierAlternateRow = TierAlternateRow;

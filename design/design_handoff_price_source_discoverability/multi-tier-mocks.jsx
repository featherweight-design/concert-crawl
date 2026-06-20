// ============================================================
// MULTI-TIER PRICING — display + submission (#644)
// Concert Crawl · revised 2026-06-19 (review round 3)
//
// Reuses the SHIPPED vocabulary end to end:
//   • pending state  → PendingCardB (pending-card.jsx) — the rich strip the
//                      current app already ships ("PENDING · 1 OF 2 · 1 TO GO",
//                      YOUR SUBMISSION footer, Confirm price). 1/2 model.
//   • resolved state → MultiTierLiveCard / TierAlternateRow (multi-tier.jsx)
//   • cross-source   → "Or pay for convenience" alternate rows, mirroring
//                      PriceBlockB's AlternateSourceRow (price-block.jsx)
//   • trust marks    → PendingTrustPill (gold box office / azure community)
//
// Review answers baked in:
//   Q "multi-source × multi-tier — too busy?"  → NO grid. Tier is the only
//     surface axis; the cross-source price folds into "Or pay for convenience"
//     on the entry tier. Card stays flat. (MultiSourceMultiTierCard)
//   Q "does every source/tier get a confirm button?" → NO. Confirm is a
//     property of a PENDING submission (PendingCardB footer), not a cell in a
//     live grid. The live card has zero per-row confirms — just the single
//     "Saw a different price?" entry. (MTConfirmScreen)
//   Copy: no SeatGeek; vendor shows "Venue" (never the venue's name).
// ============================================================

const GOLD_T = window.PendingGOLD  || "oklch(0.66 0.14 78)";
const AZ_T   = window.PendingAZURE || "oklch(0.62 0.12 240)";
const RESALE_T = "oklch(0.65 0.20 25)";

function MTEyebrow({ children, style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
      letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
      color: "var(--fg-subtle)", ...style,
    }}>{children}</div>
  );
}

function MTHead() {
  return (
    <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
      <div style={{
        width: 60, height: 60, borderRadius: 14, flexShrink: 0,
        background: `repeating-linear-gradient(135deg, color-mix(in oklab, var(--fg) 7%, transparent) 0 6px, transparent 6px 12px), var(--surface-2)`,
        border: "1px solid var(--border)",
      }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22, color: "var(--fg)", letterSpacing: "-0.025em" }}>Geese</div>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13, color: "var(--fg-muted)" }}>3D Country Tour</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-subtle)", letterSpacing: "0.02em", marginTop: 1 }}>Mission Ballroom · Sat, Jul 12</div>
      </div>
    </div>
  );
}

function MTScreen({ children }) {
  return (
    <div style={{
      width: "100%", minHeight: "100%", boxSizing: "border-box",
      background: "var(--bg)", padding: "78px 18px 28px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>{children}</div>
  );
}

function GetTickets() {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 48, borderRadius: 10, textDecoration: "none",
      background: "var(--signal)", color: "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em",
    }}>Get Tickets ↗</a>
  );
}

// ── In-context: shipped MultiTierLiveCard, box-office-first headline, "Venue" ──
function MTDetailScreen() {
  return (
    <MTScreen>
      <MTHead />
      <window.MultiTierLiveCard
        cheapestTier="GA" cheapestFloor={25} cheapestVendor="Venue"
        cheapestKind="boxoffice" observedAt="yesterday" reports={4}
        alternates={[
          { tier: "Reserved", floor: 40, vendor: "Ticketmaster", kind: "community", confirms: 2 },
          { tier: "VIP",      floor: 85, vendor: "AXS",          kind: "community", confirms: 2 },
        ]}
      />
      <GetTickets />
    </MTScreen>
  );
}

// ════════════════════════════════════════════════════════════
// AltSourceRow — mirrors PriceBlockB's AlternateSourceRow (price-block.jsx),
// $-only case (no fee math, so no window.phase7 dependency). Same shape:
// kind dot · source label · kind pill · price, dashed top border.
// ════════════════════════════════════════════════════════════
function AltSourceRow({ source = "Ticketmaster", kind = "resale", price = 35 }) {
  const dotColor = kind === "resale" ? RESALE_T : kind === "boxoffice" ? GOLD_T : kind === "community" ? AZ_T : "var(--fg-muted)";
  const kindLabel = kind === "resale" ? "resale" : kind === "boxoffice" ? "box office" : kind === "community" ? "community" : "vendor";
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 8,
      padding: "8px 0", borderTop: "1px dashed var(--border)",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 2.5, flexShrink: 0, background: dotColor, alignSelf: "center", opacity: 0.85 }}/>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>{source}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, color: dotColor, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.85 }}>{kindLabel}</span>
      <span style={{ flex: 1 }}/>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>${price}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MultiSourceMultiTierCard — the answer to "Box office GA+VIP, Resale GA+VIP:
// does it get too busy?"  No grid. Tier is the only surface axis. The entry
// tier leads at its box-office price; the cross-source (resale) price for that
// tier folds into "Or pay for convenience". Other tiers render as one row each
// (TierAlternateRow); their own cross-source alternates stay collapsed until
// tapped. Result: a flat, scannable card — never a tiers×sources matrix.
// ════════════════════════════════════════════════════════════
function MultiSourceMultiTierCard() {
  const Range = window.PendingFormatRange;
  const Star  = window.PendingStarGlyph;
  return (
    <div style={{
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)",
      padding: "14px 14px 12px",
    }}>
      <MTEyebrow>Tickets</MTEyebrow>

      {/* Headline — entry tier at its box-office price */}
      <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13, color: "var(--fg-muted)" }}>from</span>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28, color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05 }}>${20}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>GA</span>
        <window.PendingTrustPill kind="boxoffice" />
      </div>
      <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>
        seen on Venue · face value · no fees
      </div>

      {/* Or pay for convenience — the resale price for the SAME (entry) tier */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Or pay for convenience</div>
        <AltSourceRow source="Ticketmaster" kind="resale" price={35} />
      </div>

      {/* Other tiers — one row each; their alternates stay collapsed */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Other tiers</div>
        <window.TierAlternateRow tier="VIP" floor={80} vendor="Venue" kind="boxoffice" confirms={2} />
      </div>
    </div>
  );
}

function MTMultiSourceScreen() {
  return (
    <MTScreen>
      <MTHead />
      <MultiSourceMultiTierCard />
      <GetTickets />
    </MTScreen>
  );
}

// ════════════════════════════════════════════════════════════
// Confirmations — the answer to "does every source/tier get a confirm button?"
// No. Confirm is a property of a PENDING submission, rendered on the shipped
// PendingCardB footer (view="other" → "Saw a different number?" + "Confirm
// price"). Independent pending tiers stack as focused cards, each with ONE
// confirm — never a wall of inline buttons on a combined card. 1/2 model:
// the submitter is observation #1, so a fresh pending reads "1 OF 2 · 1 TO GO".
// ════════════════════════════════════════════════════════════
function MTConfirmScreen() {
  return (
    <MTScreen>
      <MTHead />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <window.PendingCardB
          floor={20} ceiling={30} tier="GA" vendor="Venue" kind="boxoffice"
          submitter={{ handle: "@amelia", url: "/u/amelia" }}
          submittedAt="2h ago" confirms={1} needed={2} view="other"
          note="GA at the box office window — $20 face, no fees."
        />
        <window.PendingCardB
          floor={85} tier="VIP" vendor="AXS" kind="community"
          submitter={{ handle: "@kel", url: "/u/kel" }}
          submittedAt="40m ago" confirms={1} needed={2} view="other"
        />
      </div>
    </MTScreen>
  );
}

// ── Collapsed state for browse / search cards — never the full breakdown ──
function MTListChip({ price = 25, kind = "boxoffice", from = true }) {
  const color = kind === "boxoffice" ? GOLD_T : kind === "community" ? AZ_T : "var(--fg-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", borderRadius: 8,
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      {kind === "boxoffice" && <window.PendingStarGlyph size={10} color={color} />}
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
        color: kind === "boxoffice" ? color : "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
      }}>{from ? "from " : ""}${price}</span>
    </span>
  );
}

// ── Submission success — "add another tier" (sequential, not a bigger form) ──
function MTAddTierSuccess() {
  const Check = window.PendingCheckGlyph;
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)", borderRadius: 14, padding: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{
        padding: "16px 14px", borderRadius: 12,
        background: `color-mix(in oklab, var(--success) 6%, var(--surface-1))`,
        border: "1px solid var(--success)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 11, background: "var(--success)",
            color: "var(--fg-on-accent)", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={12} color="var(--fg-on-accent)" />
          </span>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, color: "var(--fg)" }}>
            GA price is in. Thanks.
          </div>
        </div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, lineHeight: 1.5, color: "var(--fg-muted)" }}>
          $25 box office · sits <strong style={{ color: AZ_T }}>pending · 1/2</strong> until one more fan confirms.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <MTEyebrow>This show has more than one tier?</MTEyebrow>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Reserved", "VIP"].map((t) => (
            <button key={t} onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", boxSizing: "border-box",
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 14px", borderRadius: 999,
              border: "1px dashed var(--border-strong)", background: "var(--surface-1)",
              color: "var(--fg)", fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontWeight: 800, color: "var(--signal)" }}>+</span>
              Add {t.toLowerCase()}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
          Each tier is its own quick submission — only add the ones you actually saw.
        </div>
      </div>

      <button onClick={(e) => e.preventDefault()} style={{
        all: "unset", cursor: "pointer", textAlign: "center",
        height: 44, borderRadius: 10, border: "1px solid var(--border-strong)",
        color: "var(--fg)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>Done</button>
    </div>
  );
}

Object.assign(window, {
  MT_DetailScreen: MTDetailScreen,
  MT_MultiSourceScreen: MTMultiSourceScreen,
  MT_MultiSourceCard: MultiSourceMultiTierCard,
  MT_ConfirmScreen: MTConfirmScreen,
  MT_ListChip: MTListChip,
  MT_AddTierSuccess: MTAddTierSuccess,
});

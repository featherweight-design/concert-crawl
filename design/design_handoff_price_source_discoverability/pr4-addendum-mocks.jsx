// ============================================================
// PR 4 ADDENDUM — three open consumer-UI states
// Concert Crawl · 2026-06-24
//
// Targeted answers to eng's 3 open questions on the price-source cycle.
// Built ENTIRELY on the shipped vocabulary already in this handoff:
//   tier colors → gold boxoffice / coral resale / azure community
//   primitives  → PendingTrustPill / PendingStarGlyph / PendingDot /
//                 PendingCheckGlyph (pending-card.jsx), MT_ListChip idiom
//   tokens      → var(--bg/-fg/-surface-1/-signal/…)
//   voice       → playful + clear (deadpan)
// No new tokens, typefaces, or tier colors. Nothing here asks eng to
// change a shipped asset — these are net-new variants of existing shapes.
// ============================================================

const PR4_TIER = {
  boxoffice: "oklch(0.66 0.14 78)",  // gold
  resale:    "oklch(0.65 0.20 25)",  // coral
  community: "oklch(0.62 0.12 240)", // azure
};
const pmix = (c, pct, base = "transparent") => `color-mix(in oklab, ${c} ${pct}%, ${base})`;

function PR4Eyebrow({ children, color = "var(--fg-subtle)", style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
      letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
      color, ...style,
    }}>{children}</div>
  );
}

// ════════════════════════════════════════════════════════════
// Q1 — sold out · no resale · no primary · no box office
// VERDICT: keep the card (eng default A), but it is NOT a FaceValueCard
// anymore — with no resale row to anchor against, the comparison lesson
// collapses. What survives is the contribution half: a single ghost
// box-office row + the CTA. The outbound ProvenanceCTA is dropped (there's
// no link to point at). The card degrades from "teach the distinction" to
// "make the gap legible and fill it."
// ════════════════════════════════════════════════════════════
function ContributeFaceValueCard() {
  const gold = PR4_TIER.boxoffice;
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      background: "var(--surface-1)", border: "1px solid var(--border)",
    }}>
      <div style={{ padding: "14px 14px 10px" }}>
        <PR4Eyebrow>Face value</PR4Eyebrow>
        <div style={{
          marginTop: 7, fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16.5,
          color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.2, textWrap: "balance",
        }}>No price to show — yet.</div>
        <div style={{
          marginTop: 5, fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 500,
          color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5,
        }}>Sold out, nothing listed. Know the box-office number? Add it.</div>
      </div>

      {/* single ghost box-office row — the slot we're missing, made concrete */}
      <div style={{ margin: "2px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
          <span style={{
            width: 18, height: 18, flexShrink: 0, borderRadius: 5,
            background: pmix(gold, 10), border: `1px dashed ${pmix(gold, 55)}`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="9" height="9" viewBox="0 0 12 12" fill={gold}>
              <path d="M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z"/>
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
            }}>Box office</span>
            <span style={{
              fontFamily: "Inter, system-ui", fontSize: 11.5, fontWeight: 500,
              color: "var(--fg-subtle)", letterSpacing: "-0.005em",
            }}>the printed price · no fees</span>
          </div>
          <div style={{
            flexShrink: 0, textAlign: "right", whiteSpace: "nowrap",
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 9.5,
            letterSpacing: "0.07em", textTransform: "uppercase",
            color: pmix(gold, 90, "var(--fg-subtle)"),
          }}>not reported</div>
        </div>
      </div>

      <div style={{ padding: "12px 14px 14px" }}>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", height: 46, borderRadius: 10,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5, letterSpacing: "-0.01em",
          boxShadow: "0 12px 28px -14px var(--signal)",
        }}>
          Add the box-office price
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          marginTop: 9, textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Goes live once one more fan confirms</div>
      </div>
    </div>
  );
}

// Q1 in context — sits below the shipped SoldOutPriceCard. No outbound CTA
// (nothing to link to), and the status reporter stays as the universal magnet.
function Q1Screen() {
  return (
    <div style={{
      width: "100%", minHeight: "100%", boxSizing: "border-box", background: "var(--bg)",
      padding: "78px 18px 28px", display: "flex", flexDirection: "column", gap: 16,
    }}>
      <window.PSD_BeforeSoldOut_Head />
      <SoldOutNoResale />
      <ContributeFaceValueCard />
      <ReportFooterMini />
    </div>
  );
}

// minimal shipped-style sold-out price card (no resale row, no outbound link)
function SoldOutNoResale() {
  return (
    <div style={{
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)",
      padding: "14px 14px 13px",
    }}>
      <PR4Eyebrow>Tickets</PR4Eyebrow>
      <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 26,
          color: "var(--fg-subtle)", letterSpacing: "-0.025em", lineHeight: 1.05,
        }}>—</span>
        <span style={{
          padding: "2px 7px", borderRadius: 4, background: "var(--warning)", color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Sold out</span>
      </div>
      <div style={{
        marginTop: 9, fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)", letterSpacing: "-0.005em",
      }}>No tickets listed anywhere we can see — not even resale.</div>
    </div>
  );
}

function ReportFooterMini() {
  return (
    <div style={{ paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
      <PR4Eyebrow style={{ marginBottom: 10 }}>Spot something off?</PR4Eyebrow>
      <button onClick={(e) => e.preventDefault()} style={{
        all: "unset", cursor: "pointer", boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        width: "100%", padding: "12px 14px", borderRadius: 10,
        background: "var(--surface-1)", border: "1px solid var(--border)",
      }}>
        <span>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg)" }}>Report a status change</span>
          <span style={{ display: "block", marginTop: 3, fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)" }}>Sold out, cancelled, postponed — or back on.</span>
        </span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// compact event header reused for the Q1 screen
function PSD_BeforeSoldOut_Head() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14, flexShrink: 0,
          background: `repeating-linear-gradient(135deg, ${pmix("var(--fg)", 7)} 0 6px, transparent 6px 12px), var(--surface-2)`,
          border: "1px solid var(--border)",
        }}/>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 23, color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05 }}>Crooked Teeth</div>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13.5, color: "var(--fg-muted)", letterSpacing: "-0.005em" }}>Basement Show</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-subtle)", letterSpacing: "0.02em", marginTop: 1 }}>Hi-Dive · Thu, Jul 03</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <span style={{ padding: "4px 9px", borderRadius: 6, background: "var(--surface-2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: "var(--fg-muted)", letterSpacing: "0.02em" }}>punk</span>
        <span style={{
          padding: "4px 9px", borderRadius: 6, background: pmix("var(--warning)", 16), color: "var(--warning)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>sold out</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Q2 — browse chip when only resale exists
// VERDICT: eng default A, sharpened — a coral resale chip that ALWAYS carries
// an explicit "resale" tag. Never a bare number (color alone is too quiet at
// scan speed) and never hidden (resale is the only way in, so the cost-to-
// enter is exactly the number the scanning fan needs). The tag is what stops
// it laundering as face value.
// ════════════════════════════════════════════════════════════
function MTListChipResale({ price = 85, from = true }) {
  const coral = PR4_TIER.resale;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "5px 10px", borderRadius: 8,
      background: pmix(coral, 8, "var(--surface-1)"),
      border: `1px solid ${pmix(coral, 34, "var(--border)")}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: coral, flexShrink: 0 }}/>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
        color: coral, letterSpacing: "-0.01em", whiteSpace: "nowrap",
      }}>{from ? "from " : ""}${price}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700,
        color: coral, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.95,
      }}>resale</span>
    </span>
  );
}

// the three chips side by side (existing two + the proposed resale variant)
function Q2ChipRow() {
  const rows = [
    { node: <window.MT_ListChip price={25} kind="boxoffice" />, note: "box office · gold star (shipped)" },
    { node: <window.MT_ListChip price={48} kind="community" />, note: "community · neutral on browse (shipped) — azure reserved for detail surfaces only" },
    { node: <MTListChipResale price={85} />, note: "resale · coral + explicit tag (proposed)" },
  ];
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg)",
      padding: "24px 22px", display: "flex", flexDirection: "column", gap: 18,
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ minWidth: 116, display: "flex" }}>{r.node}</div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.02em" }}>{r.note}</span>
        </div>
      ))}
    </div>
  );
}

// Q2 on an actual browse row, so the chip is read in context
function Q2BrowseCard() {
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg)", padding: 18,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      {[
        { title: "Geese", meta: "Larimer Lounge · Fri, Jun 26", chip: <window.MT_ListChip price={25} kind="boxoffice" /> },
        { title: "Crooked Teeth", meta: "Hi-Dive · Thu, Jul 03", chip: <MTListChipResale price={85} /> },
      ].map((e, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 13, padding: 12, borderRadius: 12,
          background: "var(--surface-1)", border: "1px solid var(--border)",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 11, flexShrink: 0,
            background: `repeating-linear-gradient(135deg, ${pmix("var(--fg)", 7)} 0 6px, transparent 6px 12px), var(--surface-2)`,
            border: "1px solid var(--border)",
          }}/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.015em" }}>{e.title}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--fg-subtle)", letterSpacing: "0.02em" }}>{e.meta}</span>
          </div>
          {e.chip}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Q3 — a counter (dispute) is pending against a price
// VERDICT: eng default A hides the dispute link silently; go one notch
// further to B, kept minimal — replace it IN THE SAME FOOTER SLOT with a
// quiet pointer to the live counter. Net-new chrome = zero (it's a copy swap
// in the slot the dispute link already owned). It tells the fan WHY they can
// can't dispute right now, and routes more eyes onto the pending counter —
// which is exactly what speeds the 1/2 resolution.
// Confirm-price stays; only the "Saw a different number?" escape hatch swaps.
// ════════════════════════════════════════════════════════════
function DisputedPriceCard({ withPointer = false }) {
  const t = window.pendingTokens("community");
  const Dot = window.PendingDot;
  const Check = window.PendingCheckGlyph;
  return (
    <div style={{
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", overflow: "hidden",
    }}>
      <div style={{
        padding: "8px 14px", background: t.strip, borderBottom: `1px solid ${t.stripBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9.5, color: t.color, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
        }}>
          <span>Pending</span><span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: "inline-flex", gap: 3 }}><Dot filled color={t.color}/><Dot color={t.color}/></span>
          <span>1 of 2 confirmed</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase" }}>1 to go</span>
      </div>

      <div style={{ padding: "14px 14px 12px" }}>
        <PR4Eyebrow>Tickets</PR4Eyebrow>
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28, color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05 }}>$40</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>GA</span>
          <window.PendingTrustPill kind="community"/>
        </div>
        <div style={{ marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.04em" }}>seen on AXS · submitted by @hugh · 2h ago</div>

        {/* FOOTER — the only thing that changes */}
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
        }}>
          {withPointer ? (
            <a href="#" onClick={(e) => e.preventDefault()} style={{
              display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: PR4_TIER.resale, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: PR4_TIER.resale }}/>
              Someone's contesting this — see the counter
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </a>
          ) : (
            <button onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Saw a different number?</button>
          )}
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8, background: t.color, color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5, letterSpacing: "-0.005em",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>
            <Check size={11} color="var(--fg-on-accent)"/>
            Confirm price
          </button>
        </div>
      </div>
    </div>
  );
}

// Q3 full relationship — disputed parent (with pointer) + the pending counter
function Q3Relationship() {
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg)", padding: 18,
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <DisputedPriceCard withPointer />
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, border: "1.5px solid var(--border-strong)", borderRight: "none", borderTop: "none" }}/>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>the counter</span>
      </div>
      <window.PendingCardB
        floor={28} tier="GA" vendor="AXS" kind="community"
        submitter={{ handle: "@noor", url: "/u/noor" }}
        submittedAt="20m ago" confirms={1} needed={2} view="other"
        note="GA was $28 on AXS last night, not $40 — screenshot if you want it."
      />
    </div>
  );
}

Object.assign(window, {
  PR4_ContributeCard: ContributeFaceValueCard,
  PR4_Q1Screen: Q1Screen,
  PR4_ListChipResale: MTListChipResale,
  PR4_Q2ChipRow: Q2ChipRow,
  PR4_Q2BrowseCard: Q2BrowseCard,
  PR4_DisputedCard: DisputedPriceCard,
  PR4_Q3Relationship: Q3Relationship,
  PSD_BeforeSoldOut_Head: PSD_BeforeSoldOut_Head,
});

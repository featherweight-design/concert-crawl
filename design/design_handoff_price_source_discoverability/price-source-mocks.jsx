// ============================================================
// PRICE-SOURCE DISCOVERABILITY — design pass
// Concert Crawl · 2026-06-17
//
// Problem (beta feedback): a fan hit a sold-out show, saw only RESALE on
// Ticketmaster, and had no way to understand that resale ≠ face value — nor
// any prompt to contribute the box-office number. The resale/box-office
// distinction lives on the price card (when a price exists) and inside the
// submit form (steps deep). In the sold-out / no-price states — exactly where
// the fan was — that vocabulary disappears.
//
// This file mocks the fix, built on the SHIPPED vocabulary only:
//   tier colors  → gold boxoffice / coral resale / azure community
//   type system  → Inter + JetBrains Mono (mono uppercase, tracked)
//   tokens       → var(--bg/-fg/-surface-1/-border/-signal/…)
//   voice        → playful + clear (deadpan), brand presence first
//
// No new tokens, no new typefaces, no new tier colors.
// ============================================================

// ── Shipped tier colors (from price-block.jsx TrustMark) ──
const TIER = {
  boxoffice: "oklch(0.66 0.14 78)",  // gold — face value, from the source
  resale:    "oklch(0.65 0.20 25)",  // coral — secondary market, caveat
  community: "oklch(0.62 0.12 240)", // azure — fan-reported
};
const mix = (c, pct, base = "transparent") =>
  `color-mix(in oklab, ${c} ${pct}%, ${base})`;

// ── Tiny mono eyebrow ──
function Eyebrow({ children, color = "var(--fg-subtle)", style }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
      letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
      color, ...style,
    }}>{children}</div>
  );
}

// ── Tier marks — same pill shape across tiers (learn one element) ──
function TierMark({ kind, glyph = true }) {
  const color = TIER[kind];
  const label = kind === "boxoffice" ? "box office" : kind === "resale" ? "resale" : "community";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px", borderRadius: 4,
      background: mix(color, 14),
      border: `1px solid ${mix(color, 50)}`,
      color, fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {glyph && kind === "boxoffice" && (
        <svg width="9" height="9" viewBox="0 0 12 12" fill={color}>
          <path d="M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z"/>
        </svg>
      )}
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════
// CENTERPIECE — FaceValueCard
// Teaches resale ≠ face value AND invites the box-office number, in the
// same slot the fan was stuck in. The empty box-office row makes the gap
// visible; the CTA fills it.
// ════════════════════════════════════════════════════════════
function LadderRow({ kind, sub, right, ghost = false }) {
  const color = TIER[kind];
  const label = kind === "boxoffice" ? "Box office" : kind === "resale" ? "Resale" : "Community";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      padding: "12px 14px",
    }}>
      {/* tier dot / star */}
      <span style={{
        width: 18, height: 18, flexShrink: 0, borderRadius: 5,
        background: mix(color, ghost ? 10 : 18),
        border: ghost ? `1px dashed ${mix(color, 55)}` : `1px solid ${mix(color, 45)}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        {kind === "boxoffice"
          ? <svg width="9" height="9" viewBox="0 0 12 12" fill={color}>
              <path d="M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z"/>
            </svg>
          : <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }}/>}
      </span>

      {/* label + sub (stacked, each on one line) */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          color: ghost ? "var(--fg-muted)" : "var(--fg)", letterSpacing: "-0.005em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{label}</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 11.5, fontWeight: 500,
          color: "var(--fg-subtle)", letterSpacing: "-0.005em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{sub}</span>
      </div>

      {/* right value */}
      <div style={{
        flexShrink: 0, textAlign: "right", whiteSpace: "nowrap",
        fontFamily: ghost ? "'JetBrains Mono', monospace" : "Inter, system-ui",
        fontWeight: ghost ? 700 : 800,
        fontSize: ghost ? 9.5 : 16,
        letterSpacing: ghost ? "0.07em" : "-0.015em",
        textTransform: ghost ? "uppercase" : "none",
        color: ghost ? mix(color, 90, "var(--fg-subtle)") : "var(--fg)",
      }}>{right}</div>
    </div>
  );
}

function FaceValueCard({
  resaleRange = "$110–180",
  resaleVendor = "Ticketmaster",
  ctaLabel = "Add the box-office price",
  headline = "That's resale — not face value.",
}) {
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
    }}>
      {/* head */}
      <div style={{ padding: "14px 14px 10px" }}>
        <Eyebrow>Face value ≠ resale</Eyebrow>
        <div style={{
          marginTop: 7,
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16.5,
          color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1.2,
          textWrap: "balance",
        }}>{headline}</div>
        <div style={{
          marginTop: 5,
          fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 500,
          color: "var(--fg-muted)", letterSpacing: "-0.005em", lineHeight: 1.5,
        }}>
          Only resale tickets left. Know the box-office price? Add it.
        </div>
      </div>

      {/* ladder */}
      <div style={{
        margin: "2px 0",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <LadderRow
          kind="resale"
          sub={`${resaleVendor} · marked up over face`}
          right={resaleRange}
        />
        <div style={{ height: 1, background: "var(--border)", margin: "0 14px" }}/>
        <LadderRow
          kind="boxoffice"
          sub="the printed price · no fees"
          right="not reported"
          ghost
        />
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 14px 14px" }}>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", height: 46, borderRadius: 10,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
          letterSpacing: "-0.01em",
          boxShadow: "0 12px 28px -14px var(--signal)",
        }}>
          {ctaLabel}
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{
          marginTop: 9, textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Goes live once one more fan confirms</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ProvenanceCTA — the outbound ticket button, now honest about source.
// Same 48px button bounds as shipped PrimaryCTA; a mono caption row beneath
// names the provenance so resale never launders as "official".
// kind: "resale" | "primary" | "boxoffice"
// ════════════════════════════════════════════════════════════
function ProvenanceCTA({ kind = "resale", vendor = "Ticketmaster", outline = false }) {
  const label = kind === "resale" ? "See resale tickets ↗" : "Get Tickets ↗";
  const caption =
    kind === "resale"    ? `${vendor} resale · usually above face value`
    : kind === "boxoffice" ? `${vendor} · face value, no fees`
    :                        `Official vendor · ${vendor} · face + fees`;
  const dot = kind === "resale" ? TIER.resale : kind === "boxoffice" ? TIER.boxoffice : "var(--fg-subtle)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <a href="#" onClick={(e) => e.preventDefault()} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 48, width: "100%", borderRadius: 10, boxSizing: "border-box",
        textDecoration: "none", whiteSpace: "nowrap",
        background: outline ? "transparent" : "var(--signal)",
        border: outline ? "1px solid var(--border-strong)" : "none",
        color: outline ? "var(--fg)" : "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
        letterSpacing: "-0.01em",
      }}>{label}</a>
      <div style={{
        display: "flex", alignItems: "center", gap: 7, justifyContent: "center",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }}/>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: kind === "resale" ? mix(TIER.resale, 92, "var(--fg-muted)") : "var(--fg-muted)",
          letterSpacing: "0.03em",
        }}>{caption}</span>
      </div>
    </div>
  );
}

// ── Shipped "before" comparison: disabled SoldOutCTA + the silent Get Tickets ──
function SoldOutCTA() {
  return (
    <button disabled style={{
      all: "unset", boxSizing: "border-box", textAlign: "center", width: "100%",
      height: 48, borderRadius: 10, cursor: "not-allowed",
      background: "var(--surface-1)", border: "1px solid var(--border)",
      color: "var(--fg-subtle)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
      letterSpacing: "-0.01em",
    }}>Sold out</button>
  );
}
function PlainGetTicketsCTA() {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 48, width: "100%", borderRadius: 10, boxSizing: "border-box",
      textDecoration: "none", background: "var(--signal)", color: "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em",
    }}>Get Tickets ↗</a>
  );
}

// ════════════════════════════════════════════════════════════
// Compact event-detail header (context for the price region)
// ════════════════════════════════════════════════════════════
function Stripe({ w = 64, h = 64, r = 14 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0, overflow: "hidden",
      background: `repeating-linear-gradient(135deg, ${mix("var(--fg)", 7)} 0 6px, transparent 6px 12px), var(--surface-2)`,
      border: "1px solid var(--border)",
    }}/>
  );
}
function Chip({ children }) {
  return (
    <span style={{
      padding: "4px 9px", borderRadius: 6, background: "var(--surface-2)",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
      color: "var(--fg-muted)", letterSpacing: "0.02em",
    }}>{children}</span>
  );
}
function DetailHead({ soldOut = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
        <Stripe />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 23,
            color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
          }}>Geese</div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>3D Country Tour</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--fg-subtle)", letterSpacing: "0.02em", marginTop: 1,
          }}>Larimer Lounge · Fri, Jun 26</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 7 }}>
        <Chip>indie rock</Chip>
        <Chip>experimental</Chip>
        {soldOut && (
          <span style={{
            padding: "4px 9px", borderRadius: 6,
            background: mix("var(--warning)", 16), color: "var(--warning)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>sold out</span>
        )}
      </div>
    </div>
  );
}

// ── Shipped sold-out price card (strikethrough + SOLD OUT pill + reporter) ──
function SoldOutPriceCard() {
  return (
    <div style={{
      borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)",
      padding: "14px 14px 13px",
    }}>
      <Eyebrow>Tickets</Eyebrow>
      <div style={{ marginTop: 7, display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
          color: "var(--fg-subtle)", letterSpacing: "-0.025em", lineHeight: 1.05,
          textDecoration: "line-through", textDecorationColor: "var(--fg-subtle)",
        }}>$32</span>
        <span style={{
          padding: "2px 7px", borderRadius: 4, background: "var(--warning)",
          color: "var(--fg-on-accent)", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Sold out</span>
      </div>
      <div style={{
        marginTop: 9, fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
      }}>
        Reported sold out by{" "}
        <span style={{ color: "var(--fg-muted)", textDecoration: "underline", textDecorationColor: "var(--border-strong)" }}>@amelia</span>
        <span style={{ opacity: 0.5 }}> · </span>3 fans confirmed
      </div>
    </div>
  );
}

// ── No-price community-handoff card (shipped) ──
function NoPriceCard() {
  const azure = TIER.community;
  return (
    <div style={{
      borderRadius: 12, padding: "16px 14px 14px", position: "relative",
      background: mix(azure, 6, "var(--surface-1)"),
      border: `1px solid ${mix(azure, 32, "var(--border)")}`,
    }}>
      <span style={{
        position: "absolute", top: 12, right: 12,
        padding: "2px 7px", borderRadius: 4, background: mix(azure, 14),
        border: `1px solid ${mix(azure, 50)}`, color: azure,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>community</span>
      <Eyebrow>Tickets</Eyebrow>
      <div style={{ marginTop: 7, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 24,
          color: "var(--fg)", letterSpacing: "-0.025em",
        }}>No price yet.</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: azure,
        }}>Your call.</span>
      </div>
    </div>
  );
}

// ── Simplified report footer (shipped ReportFooterLink) ──
function ReportFooter() {
  return (
    <div style={{ paddingTop: 18, borderTop: "1px dashed var(--border)" }}>
      <Eyebrow style={{ marginBottom: 10 }}>Spot something off?</Eyebrow>
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

// ════════════════════════════════════════════════════════════
// COMPOSITIONS — the price region of the event page, in context
// ════════════════════════════════════════════════════════════
function Screen({ children, pad = 18 }) {
  return (
    <div style={{
      width: "100%", minHeight: "100%", boxSizing: "border-box",
      background: "var(--bg)", padding: `78px ${pad}px 28px`,
      display: "flex", flexDirection: "column", gap: 16,
    }}>{children}</div>
  );
}

// BEFORE — the gap. Sold-out → dead disabled button, no source vocabulary,
// the only "something's off" affordance is an event-status reporter.
function BeforeSoldOut() {
  return (
    <Screen>
      <DetailHead soldOut />
      <SoldOutPriceCard />
      <SoldOutCTA />
      <ReportFooter />
    </Screen>
  );
}

// AFTER — sold-out, source made legible. Honest resale link replaces the dead
// button; FaceValueCard teaches the distinction and invites the real number.
function AfterSoldOut() {
  return (
    <Screen>
      <DetailHead soldOut />
      <SoldOutPriceCard />
      <FaceValueCard resaleRange="$95–140" resaleVendor="Ticketmaster" />
      <ProvenanceCTA kind="resale" vendor="Ticketmaster" outline />
      <ReportFooter />
    </Screen>
  );
}

// AFTER — no price yet. Same teaching ladder folded into the handoff card.
function AfterNoPrice() {
  return (
    <Screen>
      <DetailHead />
      <NoPriceCard />
      <FaceValueCard
        resaleRange="$48–72"
        resaleVendor="Ticketmaster"
        headline="All we can see is resale."
        ctaLabel="Add a price you've seen"
      />
      <ProvenanceCTA kind="resale" vendor="Ticketmaster" outline />
      <ReportFooter />
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════
// Q2(a) close-up — the three provenance variants of the outbound CTA
// ════════════════════════════════════════════════════════════
function CTAVariants() {
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg)",
      padding: "26px 22px", display: "flex", flexDirection: "column", gap: 22,
    }}>
      {[
        { kind: "boxoffice", vendor: "Venue",        note: "rare — venue sells direct at face" },
        { kind: "primary",   vendor: "AXS",            note: "official primary vendor" },
        { kind: "resale",    vendor: "Ticketmaster",   note: "secondary market only — the friend's case" },
      ].map((v) => (
        <div key={v.kind} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Eyebrow>{v.note}</Eyebrow>
          <ProvenanceCTA kind={v.kind} vendor={v.vendor} outline={v.kind === "resale"} />
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Q1 — submit form, provenance-first reorder (before / after top of form)
// ════════════════════════════════════════════════════════════
function FormLabel({ children, req }) {
  return (
    <div style={{
      fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700,
      color: "var(--fg)", letterSpacing: "-0.005em",
      display: "flex", alignItems: "center", gap: 6,
    }}>{children}{req && <span style={{ color: "var(--accent)" }}>*</span>}</div>
  );
}
function NumberField({ label, placeholder = "35", hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <FormLabel req>{label}</FormLabel>
      <div style={{
        display: "flex", alignItems: "center",
        background: "var(--surface-1)", border: "1px solid var(--border-strong)",
        borderRadius: 10, padding: "0 0 0 12px",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: "var(--fg-muted)" }}>$</span>
        <div style={{
          flex: 1, padding: "12px", fontFamily: "Inter, system-ui", fontSize: 16,
          fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "-0.01em",
        }}>{placeholder}</div>
      </div>
      {hint && <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)" }}>{hint}</div>}
    </div>
  );
}
function SourceChip({ children, active, color = "var(--signal)" }) {
  return (
    <div style={{
      padding: "9px 13px", borderRadius: 999, boxSizing: "border-box",
      border: active ? `1.5px solid ${color}` : "1px solid var(--border-strong)",
      background: active ? mix(color, 10) : "var(--surface-1)",
      color: active ? color : "var(--fg)",
      fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
      display: "inline-flex", alignItems: "center", gap: 7,
    }}>{children}</div>
  );
}
function FormCard({ title, children }) {
  return (
    <div style={{
      width: "100%", boxSizing: "border-box", background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)", borderRadius: 14, padding: 18,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <Eyebrow>Submit a price</Eyebrow>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 20, color: "var(--fg)", letterSpacing: "-0.02em" }}>Geese</div>
        <div style={{ fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg-muted)" }}>Larimer Lounge · Fri, Jun 26</div>
      </div>
      {children}
    </div>
  );
}
function FormBefore() {
  return (
    <div style={{ background: "var(--bg)", padding: 18 }}>
      <FormCard>
        <div style={{ display: "flex", gap: 12 }}>
          <NumberField label="Floor price" placeholder="35" hint="cheapest you saw" />
          <NumberField label="Ceiling" placeholder="optional" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <FormLabel>Tier</FormLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["GA", "Reserved", "VIP"].map((o, i) => <SourceChip key={o} active={i === 0}>{o}</SourceChip>)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.5 }}>
          <FormLabel>Where it's listed</FormLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["AXS", "Ticketmaster", "Venue box office"].map((o) => <SourceChip key={o}>{o}</SourceChip>)}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--warning)",
            letterSpacing: "0.04em", marginTop: 2,
          }}>↑ source lives down here — below the number, easy to miss</div>
        </div>
      </FormCard>
    </div>
  );
}
function FormAfter() {
  return (
    <div style={{ background: "var(--bg)", padding: 18 }}>
      <FormCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <FormLabel req>Where's this price from?</FormLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SourceChip active color={TIER.boxoffice}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill={TIER.boxoffice}><path d="M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z"/></svg>
              Box office
            </SourceChip>
            <SourceChip>Standard ticket</SourceChip>
            <SourceChip color={TIER.resale}>Resale</SourceChip>
          </div>
          <div style={{ fontFamily: "Inter, system-ui", fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
            Box office is face value — the most useful number for other fans.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <NumberField label="Face value" placeholder="32" hint="the printed price" />
          <NumberField label="Ceiling" placeholder="optional" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <FormLabel>Tier</FormLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["GA", "Reserved", "VIP", "Pit", "Lawn"].map((o, i) => <SourceChip key={o} active={i === 0}>{o}</SourceChip>)}
          </div>
        </div>
        {/* Vendor demoted below source per eng decision #3; howFound dropped */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <FormLabel req>Vendor</FormLabel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Venue", "AXS", "Ticketmaster"].map((o, i) => <SourceChip key={o} active={i === 0}>{o}</SourceChip>)}
          </div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TIER.boxoffice,
          letterSpacing: "0.04em",
        }}>↑ source leads · vendor demoted (still required) · "how'd you find out?" dropped</div>
      </FormCard>
    </div>
  );
}

Object.assign(window, {
  PSD_BeforeSoldOut: BeforeSoldOut,
  PSD_AfterSoldOut: AfterSoldOut,
  PSD_AfterNoPrice: AfterNoPrice,
  PSD_CTAVariants: CTAVariants,
  PSD_FaceValueCard: FaceValueCard,
  PSD_FormBefore: FormBefore,
  PSD_FormAfter: FormAfter,
});

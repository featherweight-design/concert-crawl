// price-block.jsx — Phase 7 price-transparency surfaces
// Drops into Event Detail (mobile + desktop), with three variants:
//
//   PriceBlockA  — Compact     · single line, lives inside the existing info block
//   PriceBlockB  — Spacious    · dedicated card, all-in + breakdown + sparkline + watch
//   PriceBlockC  — Editorial   · single sentence, opened-at → now, sparkline inline
//
// Plus: PriceChip (Browse cards), Sparkline, FeeBreakdownSheet,
// WatchAffordance, and the four states the user asked about
// (no-price, stale, sold-out, drop).
//
// Voice levers come from a single TONE constant — three options:
//   "dry"     — pure factual
//   "deadpan" — Concert Crawl voice, mildly arch (default)
//   "snark"   — explicit anti-Ticketmaster
// Toggleable from the Tweaks panel.

const ph = window.phase7;  // helpers from price-data.jsx

// ── Voice / copy table ──────────────────────────────────────────
// Keep strings short. The price block is a bonus, not the headline.
const TONE_COPY = {
  dry: {
    noPrice:        "Price not yet listed",
    noPriceSub:     "We'll surface it once tickets go on sale.",
    soldOut:        "Sold out",
    soldOutSub:     "This show has closed.",
    spike:          (d) => `${ph.formatDelta(d)} since on-sale`,
    drop:           (d) => `${ph.formatDelta(d)} since on-sale`,
    feeNote:        "fees included",
    stale:          (rel) => `last checked ${rel}`,
    veryStale:      (rel) => `as of ${rel} — may be outdated`,
    watchCta:       "Notify me on price drop",
    watchActive:    "Watching",
    sourceLabel:    (src) => `via ${src}`,
  },
  deadpan: {
    noPrice:        "Price TBA",
    noPriceSub:     "We'll watch for it. You go listen to the album again.",
    soldOut:        "Sold out",
    soldOutSub:     "That's the show.",
    spike:          (d) => `${ph.formatDelta(d)} since on-sale`,
    drop:           (d) => `${ph.formatDelta(d)} cheaper than on-sale`,
    feeNote:        "all-in, including fees",
    stale:          (rel) => `as of ${rel}`,
    veryStale:      (rel) => `as of ${rel} — could be stale`,
    watchCta:       "Tell me if it drops",
    watchActive:    "We're watching",
    sourceLabel:    (src) => `via ${src}`,
  },
  snark: {
    noPrice:        "Price: who knows",
    noPriceSub:     "We'll yell once tickets actually exist.",
    soldOut:        "Sold out",
    soldOutSub:     "Should've moved faster. Try the next tour.",
    spike:          (d) => `${ph.formatDelta(d)} since on-sale. Capitalism, baby.`,
    drop:           (d) => `${ph.formatDelta(d)} cheaper than on-sale. Get in.`,
    feeNote:        "yes, fees included",
    stale:          (rel) => `as of ${rel}`,
    veryStale:      (rel) => `as of ${rel}. Take it with a grain of salt.`,
    watchCta:       "Yell if it drops",
    watchActive:    "On it",
    sourceLabel:    (src) => `via ${src}, naturally`,
  },
};

function copy(tone) {
  return TONE_COPY[tone] || TONE_COPY.deadpan;
}

// ── Tiny inline icons (1.5px stroke, match the consumer system) ─
function CaretIcon({ size = 10, dir = "down" }) {
  const rot = { down: 0, up: 180, right: -90, left: 90 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ transform: `rotate(${rot}deg)`, transition: "transform .15s" }}>
      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function BellIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 6.5C3 4.3 4.8 2.5 7 2.5S11 4.3 11 6.5V8L12 10H2L3 8V6.5Z"
            stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M5.5 11.5C5.5 12.3 6.2 13 7 13S8.5 12.3 8.5 11.5"
            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M7 1V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function ExternalIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M3.5 2H2v6h6V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 2H8v2.5M8 2L4.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function StaleDotIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" fill="var(--warning)" opacity="0.7"/>
    </svg>
  );
}
function CheckIcon({ size = 10, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1.8 5.2L4 7.4 8.4 2.6" stroke={color} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function DropDotIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" fill="var(--success)"/>
    </svg>
  );
}

// ── Sparkline ───────────────────────────────────────────────────
// Stroke-only, no fill. End-dot only. Tracks `flag` for color.
function Sparkline({ values, width = 84, height = 22, flag = null, dim = false }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y];
  });
  const d = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const last = points[points.length - 1];
  let stroke = "var(--fg-subtle)";
  if (flag === "drop")  stroke = "var(--success)";
  if (flag === "spike") stroke = "var(--fg-subtle)";  // we don't shout on up
  if (dim) stroke = "var(--fg-subtle)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
         style={{ display: "block", flexShrink: 0 }}>
      <path d={d} stroke={stroke} strokeWidth="1.25" fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={dim ? 0.7 : 1}/>
      <circle cx={last[0]} cy={last[1]} r="2" fill={stroke} />
    </svg>
  );
}

// ── Mono price number ───────────────────────────────────────────
// Big numerics use Inter (display) — mono is reserved for small caps,
// timestamps, and deltas. Matches the existing system.
function PriceNumber({ value, size = 28, color = "var(--fg)", strike = false }) {
  return (
    <span style={{
      fontFamily: "Inter, system-ui", fontWeight: 800,
      fontSize: size, color, letterSpacing: "-0.025em",
      textDecoration: strike ? "line-through" : "none",
      textDecorationColor: strike ? "var(--fg-subtle)" : "transparent",
    }}>{value}</span>
  );
}

// ── Δ token ─────────────────────────────────────────────────────
// Subtle. Drops get a green dot; spikes are neutral/muted.
// Per user: "people want to know if a price has gone down, but we may
// not always have a price... shouldn't be too noisy."
function DeltaPill({ flag, deltaUsd, tone = "deadpan", short = false }) {
  if (!flag) return null;
  const t = copy(tone);
  const isDown = flag === "drop";
  const text = short
    ? ph.formatDelta(deltaUsd)
    : (isDown ? t.drop(deltaUsd) : t.spike(deltaUsd));
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      letterSpacing: "0.02em",
      color: isDown ? "var(--success)" : "var(--fg-muted)",
    }}>
      {isDown && <DropDotIcon />}
      {text}
    </span>
  );
}

// ── Stale stamp ─────────────────────────────────────────────────
// Always shows the "as of" timestamp, subtly. Adds a warning dot when >24h.
// Per user: "subtle, only flag at >24h" — both at once.
function StaleStamp({ observedAt, tone = "deadpan", short = false }) {
  if (!observedAt) return null;
  const t = copy(tone);
  const stale = ph.isStale(observedAt);
  const rel = ph.relTime(observedAt);
  const text = short ? rel : (stale ? t.veryStale(rel) : t.stale(rel));
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: stale ? "var(--warning)" : "var(--fg-subtle)",
      letterSpacing: "0.04em",
    }}>
      {stale && <StaleDotIcon />}
      {text}
    </span>
  );
}

// ── Source link ─────────────────────────────────────────────────
// Renders different chrome based on price.sourceKind:
//   "primary"   → "via Mission Ballroom ↗"      (subtle, fg-subtle)
//   "resale"    → "Resale via SeatGeek ↗"        (fg-muted, slightly heavier)
//   "community" → "Submitted by @hugh"           (handle-linked or anonymous)
//
// For "community", sourceUrl is the submitter's profile (when known),
// not a ticket page — there isn't one.
function SourceLink({ price, tone = "deadpan" }) {
  if (!price) return null;
  const kind = ph.sourceKind(price);
  const t = copy(tone);

  // SourceLink is the receipt — TrustMark already carries the identity.
  // So we drop prefix words ("Resale via", "Submitted by") and just
  // render the attribution itself, more muted than before.
  if (kind === "community") {
    const submitter = price.submitter;
    if (!submitter) {
      return (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
          fontStyle: "italic",
        }}>anonymous fan</span>
      );
    }
    return (
      <a href={submitter.url} onClick={(e) => e.preventDefault()} style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)",
        textDecoration: "underline",
        textDecorationColor: "var(--border-strong)",
        textUnderlineOffset: 2,
        letterSpacing: "0.04em",
      }}>
        {submitter.handle}
      </a>
    );
  }

  if (!price.source) return null;
  return (
    <a href={price.sourceUrl || "#"} target="_blank" rel="noopener" onClick={(e) => e.preventDefault()}
       style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: "var(--fg-subtle)",
      textDecoration: "none",
      letterSpacing: "0.04em",
    }}>
      {price.source}
      <ExternalIcon />
    </a>
  );
}

// ── Verified stamp ──────────────────────────────────────────────
// Surfaces when a price has been verified — by a user (peer review),
// an admin (staff check), or automation (venue scrape match).
// User-verified gets the user's name in the link slot — credit given.
// Verifications go stale at 7d (longer than observation staleness:
// the act of verifying carries more weight, but eventually expires).
function VerifiedStamp({ verification, tone = "deadpan" }) {
  if (!verification) return null;
  const stale = ph.isStale(verification.at, undefined, 7 * 24);
  const rel = ph.relTime(verification.at);
  const by = verification.by || {};
  const kind = by.kind || "user";

  const color = stale ? "var(--warning)" : "var(--success)";
  const iconColor = stale ? "var(--warning)" : "var(--success)";

  // Composition:
  //   user  → "Verified by @amelia · 20h ago"   ("by" + linked handle)
  //   auto  → "Verified · checked at venue · 2h ago"   (label is a method, not a person)
  //   admin → "Verified · Concert Crawl staff · 4h ago"
  // The "by" prefix only fits a person; for methods/orgs we let the label stand alone.
  const whenText = stale ? `${rel} — could be stale` : rel;

  let head;
  if (kind === "user" && by.handle) {
    head = (
      <>
        Verified by{" "}
        <a href={by.url} onClick={(e) => e.preventDefault()} style={{
          color: "inherit", textDecoration: "underline",
          textDecorationColor: "var(--border-strong)",
          textUnderlineOffset: 2,
        }}>{by.handle}</a>
      </>
    );
  } else if (by.label) {
    head = <>Verified · {by.label}</>;
  } else {
    head = <>Verified</>;
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color, letterSpacing: "0.04em",
    }}>
      <CheckIcon color={iconColor} size={10}/>
      <span>{head}{" · "}{whenText}</span>
    </span>
  );
}

// ── Trust marks ─────────────────────────────────────────────────
// Tiny inline pill that sits next to the headline price.
// Says ONE word: "resale" or "community". Same shape, different color
// so the eye learns one mark and reads it as "this number has a caveat."
function TrustMark({ kind }) {
  if (kind !== "resale" && kind !== "community") return null;
  const label = kind === "resale" ? "resale" : "community";
  const tint  = kind === "resale" ? "var(--warning)" : "var(--fg-muted)";
  const bg    = kind === "resale"
    ? "color-mix(in oklab, var(--warning) 14%, transparent)"
    : "color-mix(in oklab, var(--fg-muted) 12%, transparent)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 6px", borderRadius: 4,
      background: bg,
      color: tint,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: "0.06em", textTransform: "uppercase",
      lineHeight: 1, whiteSpace: "nowrap", flexShrink: 0,
      verticalAlign: "middle",
    }}>{label}</span>
  );
}

// ── Watch affordance ────────────────────────────────────────────
// Lightweight inline link only — no full list screen this phase.
// Per user's scope answer: keep it casual, not a power-user feature.
function WatchAffordance({ tone = "deadpan", inline = false }) {
  const [active, setActive] = React.useState(false);
  const t = copy(tone);
  if (inline) {
    return (
      <button onClick={() => setActive(a => !a)} style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: active ? "var(--accent)" : "var(--fg-subtle)",
        letterSpacing: "0.02em",
      }}>
        <BellIcon size={11}/>
        <span>{active ? t.watchActive : t.watchCta}</span>
      </button>
    );
  }
  return (
    <button onClick={() => setActive(a => !a)} style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderRadius: 999,
      border: `1px solid ${active ? "var(--accent)" : "var(--border-strong)"}`,
      background: active ? "rgba(255,123,212,0.10)" : "transparent",
      fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 11,
      color: active ? "var(--accent)" : "var(--fg-muted)",
      letterSpacing: "-0.005em",
    }}>
      <BellIcon size={11}/>
      {active ? t.watchActive : t.watchCta}
    </button>
  );
}

// ── Fee breakdown — collapsible ─────────────────────────────────
// Default state: summary only ("+$18 fees"). Tap → line items appear inline.
function FeeBreakdownExpander({ price, tone = "deadpan", spacious = false }) {
  const [open, setOpen] = React.useState(false);
  const t = copy(tone);
  const summary = ph.feeSummary(price);
  if (!summary) return null;
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
        whiteSpace: "nowrap",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "var(--fg-muted)", letterSpacing: "0.02em",
      }}>
        <span style={{ whiteSpace: "nowrap" }}>{summary}</span>
        <CaretIcon dir={open ? "up" : "down"} size={9}/>
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: "8px 10px",
          borderRadius: 8, background: "var(--surface-1)",
          border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {price.feeBreakdown.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-muted)",
            }}>
              <span>{row.label}</span>
              <span style={{ color: "var(--fg)" }}>{ph.formatUSD(row.amount)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }}/>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-muted)",
          }}>
            <span style={{ color: "var(--fg-subtle)" }}>Face value</span>
            <span style={{ color: "var(--fg)" }}>{ph.formatUSD(price.face, { whole: true })}</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg)", fontWeight: 700,
          }}>
            <span>{t.feeNote}</span>
            <span>{ph.formatUSD(ph.allIn(price))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section label (matches existing small-caps pattern) ──────────
function MonoLabel({ children, color = "var(--fg-subtle)" }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

// ============================================================
// VARIANT A — Compact. Lives inside the existing info block as a row.
// Number-forward, single line. Drop-in replacement for the current
// "Price · TBA" InfoRow.
// ============================================================
function PriceBlockA({ price, tone = "deadpan" }) {
  const t = copy(tone);
  // Empty state
  if (!price) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
      }}>
        <div style={{ width: 16, height: 16, flexShrink: 0 }}><TicketGlyph/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MonoLabel>Price</MonoLabel>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 14,
            color: "var(--fg-muted)", marginTop: 1, letterSpacing: "-0.01em",
          }}>{t.noPrice}</div>
        </div>
      </div>
    );
  }
  const soldOut = price.status === "soldout";
  const flag = ph.deltaFlag(price);
  const delta = ph.deltaVsOpen(price);
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
    }}>
      <div style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}><TicketGlyph/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MonoLabel>Price</MonoLabel>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 1, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
            color: soldOut ? "var(--fg-subtle)" : "var(--signal)",
            letterSpacing: "-0.01em",
            textDecoration: soldOut ? "line-through" : "none",
            textDecorationColor: "var(--fg-subtle)",
          }}>
            {soldOut ? `$${price.face}` : (price.tier === "from" ? `$${price.face}+` : `$${price.face}`)}
          </span>
          {!soldOut && price.fees > 0 && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-muted)", letterSpacing: "0.02em",
            }}>{ph.feeSummary(price)}</span>
          )}
          {soldOut && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--warning)", letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>Sold out</span>
          )}
        </div>
        {!soldOut && (flag || price.observedAt) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 4,
            flexWrap: "wrap",
          }}>
            <DeltaPill flag={flag} deltaUsd={delta} tone={tone} short/>
            {flag && price.observedAt && <span style={{ color: "var(--fg-subtle)", fontSize: 9 }}>·</span>}
            <StaleStamp observedAt={price.observedAt} tone={tone} short/>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VARIANT B — Spacious. Dedicated card section. All-in headline,
// breakdown expandable, sparkline + watch.
// ============================================================
function PriceBlockB({ price, tone = "deadpan" }) {
  const t = copy(tone);
  // Empty state — kept quiet. We don't render a feature box for missing data;
  // it's a single line that says "we'll watch."
  if (!price) {
    return (
      <div style={{
        marginTop: 14, padding: "10px 0",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg-muted)", letterSpacing: "-0.01em",
        }}>{t.noPrice}</span>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
          color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        }}>{t.noPriceSub}</span>
      </div>
    );
  }
  const soldOut = price.status === "soldout";
  const flag = ph.deltaFlag(price);
  const delta = ph.deltaVsOpen(price);

  return (
    <div style={{
      marginTop: 18, padding: "14px 14px 12px",
      borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
    }}>
      {/* Top row — label + sparkline */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <MonoLabel>Tickets</MonoLabel>
        {price.range14d && !soldOut && (
          <Sparkline values={price.range14d} flag={flag} dim={soldOut}/>
        )}
      </div>

      {/* Headline number row */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap",
      }}>
        <PriceNumber
          value={soldOut ? `$${price.face}` : ph.formatUSD(ph.allIn(price), { whole: ph.allIn(price) >= 10 })}
          size={28}
          color={soldOut ? "var(--fg-subtle)" : "var(--fg)"}
          strike={soldOut}
        />
        {!soldOut && (
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>{price.tier === "from" ? "starting, all-in" : "all-in"}</span>
        )}
        {soldOut && (
          <span style={{
            padding: "2px 7px", borderRadius: 4,
            background: "var(--warning)", color: "var(--fg-on-accent)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{t.soldOut}</span>
        )}
      </div>

      {/* Breakdown summary (expandable) + Δ */}
      {!soldOut && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap",
        }}>
          <FeeBreakdownExpander price={price} tone={tone} spacious/>
          {flag && (
            <>
              <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>
              <DeltaPill flag={flag} deltaUsd={delta} tone={tone}/>
            </>
          )}
        </div>
      )}

      {/* Footer — source + stale + watch */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StaleStamp observedAt={price.observedAt} tone={tone}/>
          {(price.source || ph.isCommunity(price)) && <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>}
          <SourceLink price={price} tone={tone}/>
        </div>
        {!soldOut && <WatchAffordance tone={tone} inline/>}
      </div>
    </div>
  );
}

// ============================================================
// VARIANT C — Editorial / story. Single readable sentence. Sparkline
// inline. Smallest footprint. Only renders when there's something
// interesting to say (otherwise a one-liner).
// ============================================================
function PriceBlockC({ price, tone = "deadpan" }) {
  const t = copy(tone);
  if (!price) {
    return (
      <div style={{
        marginTop: 14, padding: "10px 0",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontSize: 13,
          color: "var(--fg-muted)", letterSpacing: "-0.01em",
        }}>
          {t.noPrice}.{" "}
          <span style={{ color: "var(--fg-subtle)" }}>{t.noPriceSub}</span>
        </div>
      </div>
    );
  }
  const soldOut = price.status === "soldout";
  const flag = ph.deltaFlag(price);
  const delta = ph.deltaVsOpen(price);
  const allInStr = ph.formatUSD(ph.allIn(price), { whole: ph.allIn(price) >= 10 });
  const opened = ph.formatUSD(price.openedAt, { whole: true });
  const kind = ph.sourceKind(price);
  const isResale = kind === "resale";
  const isCommunity = kind === "community";
  const markup = ph.markupVsFace(price);

  let line;
  if (soldOut) {
    line = (
      <>
        <span style={{ color: "var(--fg-muted)" }}>{t.soldOut}.</span>{" "}
        <span style={{ color: "var(--fg-subtle)" }}>{t.soldOutSub}</span>
      </>
    );
  } else if (isResale) {
    // Resale gets a different sentence — we lead with "Cheapest resale,"
    // then show face value when we know it, or note that we don't.
    line = (
      <>
        <span style={{ color: "var(--fg-muted)" }}>Cheapest resale: </span>
        <span style={{ color: "var(--fg)", fontWeight: 700 }}>${price.face}</span>
        {price.fees > 0 && (
          <>
            <span style={{ color: "var(--fg-muted)" }}>, </span>
            <span style={{ color: "var(--fg)", fontWeight: 600 }}>{allInStr}</span>
            <span style={{ color: "var(--fg-muted)" }}> all-in</span>
          </>
        )}
        <span style={{ color: "var(--fg-muted)" }}>. </span>
        {price.faceKnown != null ? (
          <>
            <span style={{ color: "var(--fg-muted)" }}>Face value </span>
            <span style={{ color: "var(--fg)", fontWeight: 600 }}>
              {ph.formatUSD(price.faceKnown, { whole: true })}
            </span>
            {markup != null && markup > 0 && (
              <>
                <span style={{ color: "var(--fg-muted)" }}> — </span>
                <span style={{ color: "var(--warning)", fontWeight: 600 }}>
                  +${markup} over face
                </span>
              </>
            )}
            <span style={{ color: "var(--fg-muted)" }}>.</span>
          </>
        ) : (
          <span style={{ color: "var(--fg-subtle)" }}>
            Face value not published — couldn't pull one from the primary listing.
          </span>
        )}
      </>
    );
  } else if (isCommunity) {
    // Community gets a quieter sentence — no "opened at" / "today" framing
    // because there's only one data point. Just the number + a caveat.
    // When verified, the VerifiedStamp in the footer is the trust signal,
    // so we drop the "haven't verified" caveat — they're contradictory.
    const verified = !!price.verification;
    line = (
      <>
        <span style={{ color: "var(--fg-muted)" }}>Reported at </span>
        <span style={{ color: "var(--fg)", fontWeight: 700 }}>${price.face}</span>
        <span style={{ color: "var(--fg-muted)" }}> face</span>
        <span style={{ color: "var(--fg-muted)" }}>. </span>
        {!verified && (
          <span style={{ color: "var(--fg-subtle)" }}>
            Single fan submission — not yet verified.
          </span>
        )}
      </>
    );
  } else {
    line = (
      <>
        <span style={{ color: "var(--fg-muted)" }}>Opened at </span>
        <span style={{ color: "var(--fg)", fontWeight: 600 }}>{opened}</span>
        <span style={{ color: "var(--fg-muted)" }}>. Today: </span>
        <span style={{ color: flag === "drop" ? "var(--success)" : "var(--fg)", fontWeight: 700 }}>
          ${price.face}
        </span>
        <span style={{ color: "var(--fg-muted)" }}> face</span>
        {price.fees > 0 && (
          <>
            <span style={{ color: "var(--fg-muted)" }}>, </span>
            <span style={{ color: "var(--fg)", fontWeight: 600 }}>{allInStr}</span>
            <span style={{ color: "var(--fg-muted)" }}> all-in.</span>
          </>
        )}
      </>
    );
  }

  return (
    <div style={{
      marginTop: 14, padding: "12px 0",
      borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
    }}>
      {(isResale || isCommunity) && (
        <div style={{ marginBottom: 6 }}>
          <TrustMark kind={kind}/>
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          fontFamily: "Inter, system-ui", fontSize: 13.5,
          lineHeight: 1.45, letterSpacing: "-0.01em",
          textWrap: "pretty",
        }}>
          {line}
        </div>
        {!soldOut && !isCommunity && price.range14d && (
          <Sparkline values={price.range14d} flag={flag} width={56} height={20}/>
        )}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap",
      }}>
        <StaleStamp observedAt={price.observedAt} tone={tone}/>
        {(price.source || ph.isCommunity(price)) && <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>}
        <SourceLink price={price} tone={tone}/>
        {price.verification && (
          <>
            <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>
            <VerifiedStamp verification={price.verification} tone={tone}/>
          </>
        )}
        {!soldOut && (
          <>
            <span style={{ color: "var(--fg-subtle)", opacity: 0.4, marginLeft: "auto" }}>·</span>
            <WatchAffordance tone={tone} inline/>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helper glyph reused from existing system ────────────────────
function TicketGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 5a2 2 0 010 4v3.5h13V9a2 2 0 010-4V1.5h-13V5z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 5.5v5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2"/>
    </svg>
  );
}

// ============================================================
// PriceChip — Browse / Search / list cards
// Tight. Default: just a price.
// On drop:  ↓ glyph + tinted price (success green)
// On spike: ↑ glyph in muted neutral (we acknowledge, don't dramatize)
// Sold out: muted strikethrough, no dot
// No data: returns null (caller falls back to existing "tba" affordance).
// ============================================================
function PriceArrow({ dir = "down", color, size = 9 }) {
  // Tiny chevron — 1.4px stroke matches the system's other affordances.
  const d = dir === "down"
    ? "M2 4l3 3 3-3"
    : "M2 6l3-3 3 3";
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
      <path d={d} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function PriceChip({ price, tone = "deadpan" }) {
  if (!price || price.face == null) return null;
  const soldOut = price.status === "soldout";
  const flag = ph.deltaFlag(price);
  if (soldOut) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12,
        color: "var(--fg-subtle)", letterSpacing: "-0.01em",
        textDecoration: "line-through", textDecorationColor: "var(--fg-subtle)",
        flexShrink: 0,
      }}>
        ${price.face}
      </span>
    );
  }
  const text = ph.priceChipText(price);
  // Color the price itself by direction. Down = success. Up = neutral fg-muted (no alarm).
  const priceColor =
    flag === "drop"  ? "var(--success)" :
    flag === "spike" ? "var(--fg-muted)" :
                       "var(--signal)";
  // Trust tell — single uppercase letter after the price, super tiny.
  // R = resale, C = community. Same color as the trust mark on detail.
  const kind = ph.sourceKind(price);
  const trustTell = kind === "resale" ? { letter: "R", color: "var(--warning)" }
                  : kind === "community" ? { letter: "C", color: "var(--fg-muted)" }
                  : null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
    }}>
      {flag === "drop"  && <PriceArrow dir="down" color="var(--success)" />}
      {flag === "spike" && <PriceArrow dir="up"   color="var(--fg-muted)" />}
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13,
        color: priceColor, letterSpacing: "-0.01em",
      }}>{text}</span>
      {trustTell && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          color: trustTell.color, letterSpacing: "0.06em",
          marginLeft: 1, opacity: 0.85,
          padding: "1px 3px", borderRadius: 3,
          background: kind === "resale"
            ? "color-mix(in oklab, var(--warning) 14%, transparent)"
            : "color-mix(in oklab, var(--fg-muted) 12%, transparent)",
          lineHeight: 1,
        }}>{trustTell.letter}</span>
      )}
    </span>
  );
}

window.PriceBlockA = PriceBlockA;
window.PriceBlockB = PriceBlockB;
window.PriceBlockC = PriceBlockC;
window.PriceChip = PriceChip;
window.WatchAffordance = WatchAffordance;
window.Sparkline = Sparkline;
window.StaleStamp = StaleStamp;
window.DeltaPill = DeltaPill;
window.SourceLink = SourceLink;
window.TrustMark = TrustMark;
window.VerifiedStamp = VerifiedStamp;
window.FeeBreakdownExpander = FeeBreakdownExpander;
window.TONE_COPY = TONE_COPY;

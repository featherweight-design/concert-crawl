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
    noPrice:        "No price submitted yet",
    noPriceSub:     "Submit one if you've seen it.",
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
    noPrice:        "No price yet.",
    noPriceSub:     "Your call.",
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
    noPrice:        "No price yet.",
    noPriceSub:     "Be the snitch.",
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
function VerifiedStamp({ verification, tone = "deadpan", subject = null }) {
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
  //
  // `subject` makes the verification SCOPE explicit when the card has alternate
  // sources below — without it, "Verified by @amelia" is ambiguous: which row
  // did @amelia verify? Caller passes "Box-office price" / "Community price" /
  // etc. when alternates are present.
  const whenText = stale ? `${rel} — could be stale` : rel;
  const headWord = subject ? `${subject} verified` : "Verified";

  let head;
  if (kind === "user" && by.handle) {
    head = (
      <>
        {headWord} by{" "}
        <a href={by.url} onClick={(e) => e.preventDefault()} style={{
          color: "inherit", textDecoration: "underline",
          textDecorationColor: "var(--border-strong)",
          textUnderlineOffset: 2,
        }}>{by.handle}</a>
      </>
    );
  } else if (by.label) {
    head = <>{headWord} · {by.label}</>;
  } else {
    head = <>{headWord}</>;
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

// ── Box-office attribution ──────────────────────────────────────
// Replaces SourceLink for box-office prices. Names the act, not just the
// person: "Bought at Red Rocks box office by @hugh · 2d ago" — the verb
// carries the trust signal. Four sub-tiers from boxOfficeSubtier:
//
//   in-person-bought  → "Bought at {venue} box office by @hugh"
//   phone-bought      → "Bought from {venue} box office by @hugh · by phone"
//   in-person-saw     → "Seen at {venue} box office by @hugh"
//   (phone-saw → community tier, rendered via SourceLink with phone context)
//
function BoxOfficeAttribution({ price, venue }) {
  if (!ph.isBoxOffice(price)) return null;
  const att = ph.boxOfficeAttribution(price, venue);
  if (!att) return null;
  const gold = "oklch(0.66 0.14 78)";
  const submitter = price.submitter || {};
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
      whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: "var(--fg-muted)", letterSpacing: "0.04em",
    }}>
      <span style={{ color: gold, fontWeight: 700 }}>{att.verb}</span>
      <span>{att.where}</span>
      {submitter.handle ? (
        <>
          <span style={{ opacity: 0.7 }}>{att.prep}</span>
          <a href={submitter.url} onClick={(e) => e.preventDefault()} style={{
            color: "var(--fg-muted)",
            textDecoration: "underline",
            textDecorationColor: "var(--border-strong)",
            textUnderlineOffset: 2,
          }}>{submitter.handle}</a>
        </>
      ) : (
        <span style={{ fontStyle: "italic", opacity: 0.8 }}>by an anonymous fan</span>
      )}
      {att.method && (
        <>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ opacity: 0.85 }}>{att.method}</span>
        </>
      )}
    </span>
  );
}

// ── Alternate source row ────────────────────────────────────────
// Compact row used to surface secondary purchase options below the headline.
// Multi-source point: the fan sees the box-office price is best, BUT if they
// can't get to the venue, they can pay TM for the convenience. They have
// agency. The row mirrors the TrustMark color-hierarchy: gold dot for
// box-office, orange for resale, azure for community, muted for primary.
function AlternateSourceRow({ alt }) {
  if (!alt || alt.face == null) return null;
  const allInVal = alt.face + (alt.fees || 0);
  const kind = alt.sourceKind || "primary";
  const showAllIn = alt.fees > 0;
  const dotColor =
    kind === "resale"      ? "oklch(0.65 0.20 25)"
    : kind === "community" ? "oklch(0.62 0.12 240)"
    : kind === "boxoffice" ? "oklch(0.66 0.14 78)"
    :                        "var(--fg-muted)";  // primary / vendor
  const kindLabel =
    kind === "resale"      ? "resale"
    : kind === "community" ? "community"
    : kind === "boxoffice" ? "box office"
    :                        "vendor";
  return (
    <a href={alt.sourceUrl || "#"} onClick={(e) => alt.sourceUrl ? null : e.preventDefault()}
       style={{
      all: "unset", cursor: alt.sourceUrl ? "pointer" : "default",
      display: "flex", alignItems: "baseline", gap: 8,
      padding: "8px 0",
      borderTop: "1px dashed var(--border)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 2.5, flexShrink: 0,
        background: dotColor, alignSelf: "center", opacity: 0.85,
      }}/>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
      }}>{alt.source}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5,
        color: dotColor, letterSpacing: "0.06em", textTransform: "uppercase",
        opacity: 0.75,
      }}>{kindLabel}</span>
      <span style={{ flex: 1 }}/>
      <span style={{
        fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
        color: "var(--fg-muted)", letterSpacing: "-0.01em",
      }}>{showAllIn ? ph.formatUSD(allInVal, { whole: allInVal >= 10 }) : `$${alt.face}`}</span>
      {showAllIn && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>all-in</span>
      )}
      {alt.sourceUrl && (
        <ExternalIcon size={8}/>
      )}
    </a>
  );
}

// ── Trust marks ─────────────────────────────────────────────────
// Tiny inline pill that sits next to the headline price.
// Says ONE word (or two for box office). Same shape, different color so
// the eye learns one mark and reads it as a tier signal:
//
//   resale     → warning (orange)   — caveat: secondary market
//   community  → azure (cool)       — neutral-positive: fan-reported
//   boxoffice  → gold (warm)        — premium: face value, from the source
//
// Box office optionally renders with a leading star glyph so it reads as a
// positive-trust signal rather than a caveat. Other marks stay glyph-less.
function TrustMark({ kind, glyph = true }) {
  if (kind !== "resale" && kind !== "community" && kind !== "boxoffice" && kind !== "primary") return null;
  const label = kind === "resale"    ? "resale"
              : kind === "community" ? "community"
              : kind === "boxoffice" ? "box office"
              :                        "vendor";  // primary tier — venue/ticketing listing
  const tint  = kind === "resale"    ? "oklch(0.65 0.20 25)"
              : kind === "community" ? "oklch(0.62 0.12 240)"
              : kind === "boxoffice" ? "oklch(0.66 0.14 78)"
              :                        "var(--fg-muted)";  // primary / vendor
  const bg    = kind === "resale"
    ? "color-mix(in oklab, oklch(0.65 0.20 25) 16%, transparent)"
    : kind === "community"
      ? "color-mix(in oklab, oklch(0.62 0.12 240) 16%, transparent)"
    : kind === "boxoffice"
      ? "color-mix(in oklab, oklch(0.66 0.14 78) 22%, transparent)"
      : "color-mix(in oklab, var(--fg-muted) 12%, transparent)";  // primary / vendor
  const border = kind === "boxoffice"
    ? "1px solid color-mix(in oklab, oklch(0.66 0.14 78) 60%, transparent)"
    : "none";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", borderRadius: 4,
      background: bg,
      color: tint,
      border,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
      lineHeight: 1, whiteSpace: "nowrap", flexShrink: 0,
      verticalAlign: "middle",
    }}>
      {kind === "boxoffice" && glyph && (
        <svg width="8" height="8" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
          <path d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
                fill={tint}/>
        </svg>
      )}
      {label}
    </span>
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
function PriceBlockB({ price, tone = "deadpan", venue = null }) {
  const t = copy(tone);
  // Empty state — community-handoff card. Strategy shift (May 2026): ticketing
  // APIs aren't going to give us prices, and we're not pursuing partnerships.
  // Community submission is the price mechanism, not a fallback. So the no-price
  // state owns the same real estate the price card would, and frames the gap
  // as a handoff to the user — not an apology for missing data.
  if (!price) {
    const azure = "oklch(0.62 0.12 240)";
    return (
      <div style={{
        marginTop: 18,
        padding: "16px 14px 14px",
        borderRadius: 12,
        background: `color-mix(in oklab, ${azure} 6%, var(--surface-1))`,
        border: `1px solid color-mix(in oklab, ${azure} 32%, var(--border))`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Community trust badge — same azure as the "community" trust mark on
            priced states, so this card visually signals where the data lives.
            Pinned to the top-right corner of the card. */}
        <span style={{
          position: "absolute", top: 0, right: 0,
          padding: "3px 8px",
          borderRadius: "0 0 0 6px",
          background: `color-mix(in oklab, ${azure} 20%, transparent)`,
          color: azure,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          lineHeight: 1, whiteSpace: "nowrap",
        }}>community</span>

        <MonoLabel>Tickets</MonoLabel>

        <div style={{
          marginTop: 6,
          display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 24,
            color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
          }}>{t.noPrice}</span>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
            color: azure, letterSpacing: "-0.005em",
          }}>{t.noPriceSub}</span>
        </div>

        <p style={{
          margin: "8px 0 0",
          fontFamily: "Inter, system-ui", fontSize: 13.5,
          color: "var(--fg-muted)", lineHeight: 1.5, letterSpacing: "-0.005em",
          textWrap: "pretty",
        }}>
          Ticketing APIs don't share prices with us, and we're not waiting on them.
          The community fills the gap — if you saw a number out there, drop it here.
        </p>

        {/* Focal-point submit button. Real CTA shape, signal-toned, full-width.
            Replaces the previous card-end footnote. */}
        <a href="#submit-price" onClick={(e) => e.preventDefault()} style={{
          marginTop: 14,
          boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, height: 44, width: "100%", borderRadius: 9,
          background: "var(--signal)",
          color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          letterSpacing: "-0.005em",
          textDecoration: "none",
        }}>
          Submit a price
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5"
                  stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>

        <div style={{
          marginTop: 10,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>Anonymous works · two confirms moves it live</div>
      </div>
    );
  }
  const soldOut = price.status === "soldout";
  const flag = ph.deltaFlag(price);
  const delta = ph.deltaVsOpen(price);
  const isBox = ph.isBoxOffice(price);
  const gold = "oklch(0.66 0.14 78)";

  // Sparkline only when we have ≥4 datapoints AND it's not a single-submission
  // source (boxoffice / community submissions are single data points and the
  // 14-day chart was an API-era artifact). Phase 7.2 strategy shift.
  const hasSpark = !soldOut
                && Array.isArray(price.range14d)
                && price.range14d.length >= 4
                && !isBox
                && !ph.isCommunity(price);

  // Box-office cards get a gold-tinted background + thicker accent border so
  // the whole surface telegraphs "premium tier" at a glance. Subtle, but
  // distinct from the default neutral surface-1 card.
  const cardBg     = isBox ? `color-mix(in oklab, ${gold} 8%, var(--surface-1))` : "var(--surface-1)";
  const cardBorder = isBox
    ? `1px solid color-mix(in oklab, ${gold} 52%, var(--border))`
    : "1px solid var(--border)";
  const cardShadow = isBox
    ? `inset 0 1px 0 color-mix(in oklab, ${gold} 40%, transparent)`
    : "none";

  const boContext = ph.communityBoxOfficeContext(price, venue);

  return (
    <div style={{
      marginTop: 18, padding: "14px 14px 12px",
      borderRadius: 12,
      background: cardBg,
      border: cardBorder,
      boxShadow: cardShadow,
      position: "relative",
    }}>
      {/* Top row — label + sparkline (only when meaningful) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <MonoLabel color={isBox ? gold : "var(--fg-subtle)"}>
          {isBox ? "Box office" : "Tickets"}
        </MonoLabel>
        {hasSpark && <Sparkline values={price.range14d} flag={flag} dim={soldOut}/>}
      </div>

      {/* Headline number row */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap",
      }}>
        <PriceNumber
          value={soldOut ? `$${price.face}` : (isBox || price.fees === 0
            ? `$${price.face}`
            : ph.formatUSD(ph.allIn(price), { whole: ph.allIn(price) >= 10 }))}
          size={28}
          color={soldOut ? "var(--fg-subtle)" : "var(--fg)"}
          strike={soldOut}
        />
        {!soldOut && (
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: isBox ? gold : "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>{isBox
            ? "face value · no fees"
            : (price.tier === "from" ? "starting, all-in" : "all-in")}
          </span>
        )}
        {/* Trust mark — surfaces tier directly next to the number for ANY
            non-soldout tier including primary (which renders as VENDOR).
            Box office = gold (premium); community = azure; resale = coral;
            primary/vendor = neutral muted. */}
        {!soldOut && (
          <TrustMark kind={ph.sourceKind(price)}/>
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

      {/* Box-office attribution — names the act ("Bought at Red Rocks box
          office by @hugh") so the trust signal is in the verb, not just
          a pill. Only renders for BOUGHT submissions — SAW submissions
          are community tier (see below). */}
      {isBox && (
        <div style={{ marginTop: 6 }}>
          <BoxOfficeAttribution price={price} venue={venue}/>
        </div>
      )}

      {/* Box-office-origin context for COMMUNITY tier submissions. A fan who
          saw the price at the venue (in person or by phone) without buying
          is community tier — but the box-office origin is still worth
          surfacing: "Saw at Mission box office · in person" or "Called the
          Mission box office · by phone". The verb is the trust signal. */}
      {boContext && (
        <div style={{
          marginTop: 6,
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            {boContext.kind === "phone" ? (
              <path d="M2 2.5C2 2 2.4 1.5 3 1.5h1.2c.4 0 .8.3.9.7l.3 1.2c.1.4-.1.8-.4 1L4.5 4.8c.6 1.1 1.6 2.1 2.7 2.7l.4-.5c.2-.3.6-.5 1-.4l1.2.3c.4.1.7.5.7.9V9c0 .6-.5 1-1 1-3.9 0-7-3.1-7-7v-.5z"
                    stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round"/>
            ) : (
              <>
                <circle cx="5" cy="5" r="1.8" stroke="currentColor" strokeWidth="0.9"/>
                <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="0.9" opacity="0.5"/>
              </>
            )}
          </svg>
          <span style={{ color: "var(--fg)", fontWeight: 700 }}>{boContext.verb}</span>
          <span>{boContext.where}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ opacity: 0.85 }}>{boContext.kind === "phone" ? "by phone" : "in person"}</span>
        </div>
      )}

      {/* Sold-out attribution — community-reported. Per May-13 spec: sold-out
          is itself a community claim (we don't have an API telling us). Names
          the reporter + confirms. Open question (see README): how do users
          dispute a stale sold-out flag? — likely a "still available?" CTA. */}
      {soldOut && price.soldOutBy && (
        <div style={{
          marginTop: 8,
          display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <span>Reported sold out by</span>
          <a href={price.soldOutBy.url} onClick={(e) => e.preventDefault()} style={{
            color: "var(--fg-muted)",
            textDecoration: "underline",
            textDecorationColor: "var(--border-strong)",
            textUnderlineOffset: 2,
          }}>{price.soldOutBy.handle}</a>
          {price.soldOutConfirms > 0 && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{price.soldOutConfirms} fan{price.soldOutConfirms === 1 ? "" : "s"} confirmed</span>
            </>
          )}
        </div>
      )}

      {/* Breakdown summary (expandable) + Δ — skip for box-office and
          fee-free community submissions. Only renders when there's a fee
          to expand. */}
      {!soldOut && !isBox && price.fees > 0 && (
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

      {/* Alternate sources — "if you can't get to the box office, here's
          what TM / resale wants". Box-office tier surfaces these so the fan
          has agency, not just a single number. Renders for any tier with
          alternates; box office is the typical case. */}
      {!soldOut && Array.isArray(price.alternates) && price.alternates.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 2,
          }}>Or pay for convenience</div>
          {price.alternates.map((alt, i) => (
            <AlternateSourceRow key={i} alt={alt}/>
          ))}
        </div>
      )}

      {/* Footer — stale + source + verified. For box-office the attribution
          already names submitter, so we drop SourceLink here and keep the
          footer to timestamp + verification only. */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--border)",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StaleStamp observedAt={price.observedAt} tone={tone}/>
          {!isBox && (price.source || ph.isCommunity(price)) && (
            <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>
          )}
          {!isBox && <SourceLink price={price} tone={tone}/>}
          {price.verification && (
            <>
              <span style={{ color: "var(--fg-subtle)", opacity: 0.4 }}>·</span>
              <VerifiedStamp
                verification={price.verification}
                tone={tone}
                subject={isBox && Array.isArray(price.alternates) && price.alternates.length > 0
                  ? "Box-office price"
                  : null}
              />
            </>
          )}
        </div>
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
                <span style={{ color: "oklch(0.65 0.20 25)", fontWeight: 600 }}>
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
        {false && !soldOut && (
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
  const kind = ph.sourceKind(price);
  const isBox = kind === "boxoffice";
  // Color the price by tier. Box office = gold (premium, best price you'll find).
  // Drop = success. Spike = neutral. Resale/community/primary = signal.
  const gold = "oklch(0.66 0.14 78)";
  const priceColor =
    isBox            ? gold             :
    flag === "drop"  ? "var(--success)" :
    flag === "spike" ? "var(--fg-muted)":
                       "var(--signal)";
  // Tell glyphs/letters — a per-tier marker after the price.
  //   Box office → small filled star, gold (no letter — it's a positive signal,
  //                not a caveat; reads as "deal verified by a fan at the venue")
  //   Resale     → R letter, warning
  //   Community  → C letter, azure
  //   Primary    → nothing
  const trustTell = kind === "resale"    ? { letter: "R", color: "oklch(0.65 0.20 25)", bg: "color-mix(in oklab, oklch(0.65 0.20 25) 16%, transparent)" }
                  : kind === "community" ? { letter: "C", color: "oklch(0.62 0.12 240)", bg: "color-mix(in oklab, oklch(0.62 0.12 240) 14%, transparent)" }
                  :                        null;  // primary/vendor wears no tell on browse cards
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
    }}>
      {isBox && (
        <svg width="9" height="9" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
          <path d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
                fill={gold}/>
        </svg>
      )}
      {!isBox && flag === "drop"  && <PriceArrow dir="down" color="var(--success)" />}
      {!isBox && flag === "spike" && <PriceArrow dir="up"   color="var(--fg-muted)" />}
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
          background: trustTell.bg,
          lineHeight: 1, fontWeight: 700,
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
window.BoxOfficeAttribution = BoxOfficeAttribution;
window.AlternateSourceRow = AlternateSourceRow;
window.TONE_COPY = TONE_COPY;

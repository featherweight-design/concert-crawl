// pending-card.jsx — Pending price submission card
//
// Direction B (minimal row with mono tell) is the chosen direction per Hugh
// (May 25). Renders a submission in flight using the EXACT field shape from
// Phase 8: floor + ceiling (range) + tier + vendor + optional note. Trust
// tier comes from the submission's sourceKind: only community + box-office
// are reachable through the fan submit flow (vendor/resale come from
// scrapers and never enter "pending").
//
// Direction A (tinted card with progress) is kept in this file for the
// canvas alternative section but isn't the primary recommendation.
//
// Copy direction (locked May 25): we DO NOT lead with "face value" except
// for box-office submissions. For community submissions the fan likely saw
// an all-in number; we don't claim either way — we show the number, the
// tier, and the vendor. Box-office is the only tier that earns the
// "face value · no fees" framing, because face-value-no-fees is what
// makes box-office structurally distinct.

const AZURE = "oklch(0.62 0.12 240)";
const GOLD  = "oklch(0.66 0.14 78)";

// Per-tier token bundle for pending cards. Resale and vendor aren't
// reachable through the submit flow today, but we keep their tokens
// in case the model expands.
function pendingTokens(kind) {
  if (kind === "boxoffice") return {
    color: GOLD,
    label: "Box office",
    bg: `color-mix(in oklab, ${GOLD} 8%, var(--surface-1))`,
    border: `color-mix(in oklab, ${GOLD} 38%, var(--border))`,
    strip: `color-mix(in oklab, ${GOLD} 14%, transparent)`,
    stripBorder: `color-mix(in oklab, ${GOLD} 30%, var(--border))`,
    pill: `color-mix(in oklab, ${GOLD} 22%, transparent)`,
  };
  // community is the default — most submissions are community-tier pending
  return {
    color: AZURE,
    label: "Community",
    bg: `color-mix(in oklab, ${AZURE} 6%, var(--surface-1))`,
    border: `color-mix(in oklab, ${AZURE} 32%, var(--border))`,
    strip: `color-mix(in oklab, ${AZURE} 12%, transparent)`,
    stripBorder: `color-mix(in oklab, ${AZURE} 26%, var(--border))`,
    pill: `color-mix(in oklab, ${AZURE} 16%, transparent)`,
  };
}

// ── Tiny iconography (matches price-block style) ─────────────────
function PendingDot({ size = 7, filled = false, color = AZURE }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" style={{ flexShrink: 0 }}>
      <circle cx="3.5" cy="3.5" r="2.6"
              fill={filled ? color : "transparent"}
              stroke={color} strokeWidth="1.1"/>
    </svg>
  );
}
function LockGlyph({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <rect x="2" y="4.5" width="6" height="4" rx="0.8"
            stroke="currentColor" strokeWidth="1.1"/>
      <path d="M3.4 4.5V3.2A1.6 1.6 0 015 1.6a1.6 1.6 0 011.6 1.6V4.5"
            stroke="currentColor" strokeWidth="1.1" fill="none"
            strokeLinecap="round"/>
    </svg>
  );
}
function CheckGlyph({ size = 10, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M1.8 5.2L4 7.4 8.4 2.6"
            stroke={color} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ArrowGlyph({ size = 13, dir = "right" }) {
  const rot = dir === "right" ? 0 : 180;
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none"
         style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5"
            stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function StarGlyph({ size = 10, color = GOLD }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
      <path d="M5 1l1.18 2.46L9 3.78l-2 1.92.55 2.8L5 7.2 2.45 8.5 3 5.7 1 3.78l2.82-.32L5 1z"
            fill={color}/>
    </svg>
  );
}

function Eyebrow({ children, color = "var(--fg-subtle)" }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color, letterSpacing: "0.06em", textTransform: "uppercase",
    }}>{children}</div>
  );
}

// ── Trust pill (inline) — same shape as PriceBlockB's TrustMark ──
function PendingTrustPill({ kind }) {
  const t = pendingTokens(kind);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", borderRadius: 4,
      background: t.pill,
      color: t.color,
      border: kind === "boxoffice" ? `1px solid color-mix(in oklab, ${GOLD} 60%, transparent)` : "none",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {kind === "boxoffice" && <StarGlyph size={8}/>}
      {t.label}
    </span>
  );
}

// Render a price range or single value.
function formatRange(floor, ceiling) {
  if (ceiling && ceiling > floor) return `$${floor}–$${ceiling}`;
  return `$${floor}`;
}

// Box-office subtier label. Only renders when the submission is box-office
// AND we know how the fan checked. Maps the Phase 8 action+method to a
// short readable phrase used in the attribution line.
function boxOfficeAction(action, method) {
  if (action === "bought" && method === "in-person") return "Bought in person at the venue";
  if (action === "bought" && method === "phone")     return "Bought by phone from the venue";
  if (action === "saw"    && method === "in-person") return "Saw at the box office in person";
  if (action === "saw"    && method === "phone")     return "Called the box office";
  return null;
}

// ============================================================
// PendingCardB · PRIMARY DIRECTION
// ------------------------------------------------------------
// Matches the live PriceBlockB visual rhythm so the pending →
// live transition doesn't break the card's look. The
// "pendingness" lives in a thin mono strip at the top.
//
// Submission props (mirrors the Phase 8 payload):
//   floor          required · the price number the fan submitted
//   ceiling        optional · upper bound when range was used
//   tier           one of GA / Reserved / VIP / Pit / Lawn
//   vendor         one of AXS / Ticketmaster / SeatGeek / DICE /
//                  Eventbrite / Venue box office
//   kind           "community" | "boxoffice" — defaults community
//   action/method  only when kind === "boxoffice" (per Phase 7.2 spec)
//   submitter      { handle, url } | omit for anonymous
//   submittedAt    relative time string
//   confirms       0 / 1 / 2 — progress through corroboration
//   needed         total confirms needed (always 2 today)
//   view           "other" | "submitter" | "self-locked"
//   note           optional fan note
// ============================================================
function PendingCardB({
  floor = 48,
  ceiling = null,
  tier = "GA",
  vendor = "AXS",
  kind = "community",
  action = null,
  method = null,
  submitter = { handle: "@hugh", url: "/u/hugh" },
  submittedAt = "2h ago",
  confirms = 1,
  needed = 2,
  view = "other",
  note = null,
}) {
  const t = pendingTokens(kind);
  const isSubmitter = view === "submitter" || view === "self-locked";
  const isBox = kind === "boxoffice";
  const boSubtier = isBox ? boxOfficeAction(action, method) : null;

  return (
    <div style={{
      padding: 0,
      borderRadius: 12,
      background: isBox ? t.bg : "var(--surface-1)",
      border: isBox ? `1px solid ${t.border}` : "1px solid var(--border)",
      boxShadow: isBox ? `inset 0 1px 0 color-mix(in oklab, ${GOLD} 40%, transparent)` : "none",
      overflow: "hidden",
    }}>
      {/* Pending strip — replaces the TICKETS label row */}
      <div style={{
        padding: "8px 14px",
        background: t.strip,
        borderBottom: `1px solid ${t.stripBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: t.color, letterSpacing: "0.08em", textTransform: "uppercase",
          fontWeight: 700,
        }}>
          <span>Pending</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: "inline-flex", gap: 3 }}>
            {Array.from({ length: needed }).map((_, i) => (
              <PendingDot key={i} filled={i < confirms} color={t.color}/>
            ))}
          </span>
          <span>{confirms} of {needed} confirmed</span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}>{needed - confirms} to go</span>
      </div>

      <div style={{ padding: "14px 14px 12px" }}>
        {/* Top row — section label + trust pill (gold or azure) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Eyebrow color={isBox ? t.color : "var(--fg-subtle)"}>
            {isBox ? "Box office" : "Tickets"}
          </Eyebrow>
        </div>

        {/* Headline — price range + tier label inline */}
        <div style={{
          marginTop: 6,
          display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
            color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
          }}>{formatRange(floor, ceiling)}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--fg-muted)", letterSpacing: "0.06em",
            textTransform: "uppercase", fontWeight: 700,
          }}>{tier}</span>
          {/* Box-office wears "face value · no fees" — only place this framing lives */}
          {isBox && (
            <span style={{
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
              color: t.color, letterSpacing: "-0.005em",
            }}>face value · no fees</span>
          )}
          <PendingTrustPill kind={kind}/>
        </div>

        {/* Vendor line — "seen on {vendor}" matches Phase 8 microcopy */}
        <div style={{
          marginTop: 6,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          seen on {vendor}
        </div>

        {/* Box-office subtier line — only for box-office submissions */}
        {boSubtier && (
          <div style={{
            marginTop: 4,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: GOLD, letterSpacing: "0.04em",
          }}>
            <span style={{ fontWeight: 700 }}>{boSubtier}</span>
          </div>
        )}

        {/* Attribution */}
        <div style={{
          marginTop: 8,
          display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <span>Submitted by</span>
          {isSubmitter ? (
            <span style={{ color: t.color, fontWeight: 700 }}>you</span>
          ) : submitter ? (
            <a href={submitter.url} onClick={(e) => e.preventDefault()} style={{
              color: "var(--fg-muted)",
              textDecoration: "underline",
              textDecorationColor: "var(--border-strong)",
              textUnderlineOffset: 2,
            }}>{submitter.handle}</a>
          ) : (
            <span style={{ fontStyle: "italic", opacity: 0.85 }}>an anonymous fan</span>
          )}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{submittedAt}</span>
        </div>

        {note && (
          <div style={{
            marginTop: 10, padding: "8px 10px",
            background: "color-mix(in oklab, var(--fg) 4%, transparent)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontFamily: "Inter, system-ui", fontSize: 12.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            lineHeight: 1.45, fontStyle: "italic",
          }}>"{note}"</div>
        )}

        {/* Footer — inline confirm or submitter actions */}
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexWrap: "wrap",
        }}>
          {view === "other" && (
            <>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>Saw a different number?</button>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 8,
                background: t.color, color: "var(--fg-on-accent)",
                fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
                letterSpacing: "-0.005em",
              }}>
                <CheckGlyph size={11} color="var(--fg-on-accent)"/>
                Confirm price
              </button>
            </>
          )}

          {view === "self-locked" && (
            <>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>Your submission</span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 8,
                background: "color-mix(in oklab, var(--fg) 5%, transparent)",
                border: "1px dashed var(--border-strong)",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                color: "var(--fg-muted)", letterSpacing: "-0.005em",
              }}>
                <LockGlyph size={10}/>
                Waiting on one more fan
              </span>
            </>
          )}

          {view === "submitter" && (
            <>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>Your submission</span>
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={(e) => e.preventDefault()} style={{
                  all: "unset", cursor: "pointer",
                  fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                  color: "var(--signal)", letterSpacing: "-0.005em",
                }}>Edit</button>
                <button onClick={(e) => e.preventDefault()} style={{
                  all: "unset", cursor: "pointer",
                  fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                  color: "var(--warning)", letterSpacing: "-0.005em",
                }}>Withdraw</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PendingCardA · ALTERNATIVE (kept for canvas reference)
// ------------------------------------------------------------
// Full card chrome, azure tint matching the no-price card. Not the
// chosen direction (see PendingCardB) but kept in the file so reviewers
// can compare. Same prop shape as B.
// ============================================================
function PendingCardA({
  floor = 48,
  ceiling = null,
  tier = "GA",
  vendor = "AXS",
  kind = "community",
  submitter = { handle: "@hugh", url: "/u/hugh" },
  submittedAt = "2h ago",
  confirms = 1,
  needed = 2,
  view = "other",
  note = null,
}) {
  const t = pendingTokens(kind);
  const isSubmitter = view === "submitter" || view === "self-locked";
  const isBox = kind === "boxoffice";

  return (
    <div style={{
      padding: "14px 14px 12px",
      borderRadius: 12,
      background: t.bg,
      border: `1px solid ${t.border}`,
      position: "relative",
      overflow: "hidden",
    }}>
      <span style={{
        position: "absolute", top: 0, right: 0,
        padding: "3px 8px",
        borderRadius: "0 0 0 6px",
        background: t.pill,
        color: t.color,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        lineHeight: 1, whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 5,
      }}>
        {t.label}
        <span style={{ opacity: 0.55 }}>·</span>
        pending
      </span>

      <Eyebrow>Tickets</Eyebrow>

      <div style={{
        marginTop: 6,
        display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
        }}>{formatRange(floor, ceiling)}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>{tier}</span>
        {isBox && (
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: t.color, letterSpacing: "-0.005em",
          }}>face value · no fees</span>
        )}
      </div>

      <div style={{
        marginTop: 8,
        display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-muted)", letterSpacing: "0.04em",
      }}>
        <span>seen on {vendor}</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>Submitted by</span>
        {isSubmitter
          ? <span style={{ color: t.color, fontWeight: 700 }}>you</span>
          : submitter
            ? <a href={submitter.url} onClick={(e) => e.preventDefault()} style={{
                color: "var(--fg-muted)",
                textDecoration: "underline",
                textDecorationColor: "var(--border-strong)",
                textUnderlineOffset: 2,
              }}>{submitter.handle}</a>
            : <span style={{ fontStyle: "italic", opacity: 0.85 }}>an anonymous fan</span>}
        <span style={{ opacity: 0.5 }}>·</span>
        <span>{submittedAt}</span>
      </div>

      {note && (
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontFamily: "Inter, system-ui", fontSize: 12.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          lineHeight: 1.45, fontStyle: "italic",
        }}>"{note}"</div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <Eyebrow color={t.color}>{confirms} of {needed} fans confirmed</Eyebrow>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>{needed - confirms} to go</span>
        </div>
        <div style={{
          display: "flex", gap: 4, height: 6, borderRadius: 999, overflow: "hidden",
        }}>
          {Array.from({ length: needed }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              background: i < confirms ? t.color : `color-mix(in oklab, ${t.color} 18%, transparent)`,
              borderRadius: 999,
            }}/>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 12, paddingTop: 10,
        borderTop: "1px solid var(--border)",
      }}>
        {view === "other" && (
          <>
            <button onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", boxSizing: "border-box",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, height: 40, width: "100%", borderRadius: 9,
              background: t.color, color: "var(--fg-on-accent)",
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13.5,
              letterSpacing: "-0.005em",
            }}>
              Confirm price
              <ArrowGlyph size={12}/>
            </button>
            <button onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", width: "100%",
              marginTop: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
              textTransform: "uppercase", textAlign: "center",
              display: "block",
            }}>
              Saw a different number? Submit an update →
            </button>
          </>
        )}
        {view === "self-locked" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, height: 40, borderRadius: 9,
            background: "color-mix(in oklab, var(--fg) 5%, transparent)",
            border: "1px dashed var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>
            <LockGlyph size={11}/>
            Waiting on one more fan
          </div>
        )}
        {view === "submitter" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-subtle)", letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>Your submission</div>
            <div style={{ display: "flex", gap: 14 }}>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                color: "var(--signal)", letterSpacing: "-0.005em",
              }}>Edit</button>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                color: "var(--warning)", letterSpacing: "-0.005em",
              }}>Withdraw</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.PendingCardA = PendingCardA;
window.PendingCardB = PendingCardB;
window.PendingTrustPill = PendingTrustPill;
window.PendingAZURE = AZURE;
window.PendingGOLD = GOLD;
window.pendingTokens = pendingTokens;
window.PendingDot = PendingDot;
window.PendingLockGlyph = LockGlyph;
window.PendingCheckGlyph = CheckGlyph;
window.PendingArrowGlyph = ArrowGlyph;
window.PendingEyebrow = Eyebrow;
window.PendingFormatRange = formatRange;
window.PendingStarGlyph = StarGlyph;

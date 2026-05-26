// dispute-surfaces.jsx — corroboration sheet + dispute indicator + admin panel
//
// Aligned with Phase 8 submission shape (May 25 revision):
//   - Submissions carry floor + ceiling (range) + tier + vendor (+ optional
//     box-office action/method).
//   - The counter-submit sheet mirrors the Phase 8 SubmitForm — floor +
//     ceiling + tier chips + vendor chips — not a "why?" radio. Disputes
//     are price submissions with the "update" framing, not a different
//     mechanic.
//   - Copy direction shifts from Phase 8's "File dispute" / `--danger`
//     treatment to "Submit update" / `--signal`. Same form, friendlier
//     frame. Per Hugh's May 25 note: disputes are price updates, not
//     callouts.
//
// Surfaces:
//   <CorroborationSheet/>   — friction sheet that opens from Confirm
//   <DisputedPriceCard/>    — live priced card with "update pending" strip
//   <CounterSubmitSheet/>   — Phase 8 form with update copy
//   <AdminDisputePanel/>    — two-up admin resolution surface

const AZ_D    = window.PendingAZURE || "oklch(0.62 0.12 240)";
const GOLD_D  = window.PendingGOLD  || "oklch(0.66 0.14 78)";

const Eyebrow = window.PendingEyebrow;
const Arrow   = window.PendingArrowGlyph;
const Check   = window.PendingCheckGlyph;
const Lock    = window.PendingLockGlyph;
const FormatRange = window.PendingFormatRange;

const TIER_OPTIONS   = ["GA", "Reserved", "VIP", "Pit", "Lawn"];
const VENDOR_OPTIONS = ["AXS", "Ticketmaster", "SeatGeek", "DICE", "Eventbrite", "Venue box office"];

// ── Sheet chrome ────────────────────────────────────────────────
function SheetFrame({ title, subtitle, eyebrow, onClose, children, footer, theme = "electric", height = 720 }) {
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  return (
    <div style={{
      ...themeStyle,
      width: 393, height,
      display: "flex", flexDirection: "column",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        padding: "10px 16px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
          width: 36, height: 4, borderRadius: 999,
          background: "var(--border-strong)",
        }}/>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.08em",
          textTransform: "uppercase", marginTop: 10,
        }}>{eyebrow || "Confirm price"}</span>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer", marginTop: 10,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}>Cancel</button>
      </div>
      <div style={{ padding: "8px 18px 0" }}>
        <h2 style={{
          margin: 0,
          fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 24,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.1,
          textWrap: "balance",
        }}>{title}</h2>
        {subtitle && (
          <p style={{
            margin: "6px 0 0",
            fontFamily: "Inter, system-ui", fontSize: 13.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            lineHeight: 1.45, textWrap: "pretty",
          }}>{subtitle}</p>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {children}
      </div>
      {footer && (
        <div style={{
          padding: "12px 18px 18px",
          background: "var(--bg)",
          borderTop: "1px solid var(--border)",
        }}>{footer}</div>
      )}
    </div>
  );
}

// ── Submission detail card — full Phase 8 field set ──────────────
function SubmissionDetailCard({
  floor = 48, ceiling = null, tier = "GA", vendor = "AXS",
  kind = "community",
  submitter = { handle: "@hugh" },
  submittedAt = "2h ago",
  note,
  showAttribution = true,
}) {
  const tokens = window.pendingTokens(kind);
  const isBox = kind === "boxoffice";
  return (
    <div style={{
      padding: "12px 14px",
      background: isBox
        ? tokens.bg
        : `color-mix(in oklab, ${tokens.color} 6%, var(--surface-1))`,
      border: `1px solid ${tokens.border}`,
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 30,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1,
        }}>{FormatRange(floor, ceiling)}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>{tier}</span>
        {isBox && (
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: tokens.color, letterSpacing: "-0.005em",
          }}>face value · no fees</span>
        )}
        <window.PendingTrustPill kind={kind}/>
      </div>

      <div style={{
        marginTop: 8,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 12px",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        letterSpacing: "0.04em",
      }}>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Vendor</span>
        <span style={{ color: "var(--fg)" }}>{vendor}</span>
        {showAttribution && submitter && (
          <>
            <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>By</span>
            <span style={{ color: "var(--fg)" }}>{submitter.handle}</span>
          </>
        )}
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>When</span>
        <span style={{ color: "var(--fg)" }}>{submittedAt}</span>
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
    </div>
  );
}

// ── Verify-method option (radio-ish) — friction by design ────────
function VerifyOption({ label, sub, selected, onClick, accent = AZ_D }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 10,
      background: selected ? `color-mix(in oklab, ${accent} 10%, transparent)` : "var(--surface-1)",
      border: selected
        ? `1.5px solid ${accent}`
        : "1px solid var(--border)",
      marginBottom: 8,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        marginTop: 2,
        background: selected ? accent : "transparent",
        border: selected ? `1.5px solid ${accent}` : "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <Check size={9} color="var(--fg-on-accent)"/>}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>{label}</div>
        {sub && (
          <div style={{
            marginTop: 2,
            fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            lineHeight: 1.4,
          }}>{sub}</div>
        )}
      </span>
    </button>
  );
}

// ── Chip group (matches Phase 8 chip pattern) ───────────────────
function ChipGroup({ label, options, selected, accent = "var(--signal)" }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div style={{
        marginTop: 6,
        display: "flex", flexWrap: "wrap", gap: 6,
      }}>
        {options.map(opt => {
          const active = opt === selected;
          return (
            <button key={opt} onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 999,
              background: active ? `color-mix(in oklab, ${accent} 14%, transparent)` : "var(--surface-1)",
              border: active
                ? `1.5px solid ${accent}`
                : "1px solid var(--border-strong)",
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13.5,
              color: active ? "var(--fg)" : "var(--fg-muted)",
              letterSpacing: "-0.005em",
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Number field (floor / ceiling) ───────────────────────────────
function NumField({ label, value, placeholder, optional }) {
  return (
    <div style={{ flex: 1 }}>
      <Eyebrow>
        {label}
        {optional && <span style={{ marginLeft: 6, opacity: 0.7, textTransform: "uppercase" }}>· optional</span>}
      </Eyebrow>
      <div style={{
        marginTop: 6,
        padding: "10px 12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
          color: "var(--fg-muted)", fontWeight: 700,
        }}>$</span>
        <span style={{
          flex: 1,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 16,
          color: value ? "var(--fg)" : "var(--fg-subtle)",
        }}>{value || placeholder}</span>
      </div>
    </div>
  );
}

// ============================================================
// CORROBORATION SHEET
// ============================================================
function CorroborationSheet({
  state = "fresh",
  floor = 48, ceiling = 58, tier = "GA", vendor = "AXS",
  kind = "community",
  submitter = { handle: "@hugh", url: "/u/hugh" },
  submittedAt = "2h ago",
  selected = "axs",
  note = "GA standing, checked the cart on AXS. Listed at $48 face, $58 with fees.",
  theme = "electric",
}) {
  if (state === "self-locked") {
    return (
      <SheetFrame
        title="That's your number."
        subtitle="Submitters can't confirm their own price — we need another fan to vouch. Edit or withdraw if anything's changed."
        theme={theme}
        height={620}
        footer={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", flex: 1, textAlign: "center",
              height: 44, borderRadius: 9,
              background: "var(--surface-1)",
              border: "1px solid var(--border-strong)",
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
              color: "var(--fg)", letterSpacing: "-0.005em",
            }}>Edit submission</button>
            <button onClick={(e) => e.preventDefault()} style={{
              all: "unset", cursor: "pointer", flex: 1, textAlign: "center",
              height: 44, borderRadius: 9,
              background: "transparent",
              border: "1px solid var(--warning)",
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
              color: "var(--warning)", letterSpacing: "-0.005em",
            }}>Withdraw</button>
          </div>
        }
      >
        <SubmissionDetailCard
          floor={floor} ceiling={ceiling} tier={tier} vendor={vendor} kind={kind}
          submitter={{ handle: "you" }} submittedAt={submittedAt} note={note}
        />
        <div style={{
          marginTop: 18,
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "12px 14px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 10,
        }}>
          <span style={{ color: "var(--fg-muted)", marginTop: 1 }}>
            <Lock size={14}/>
          </span>
          <div style={{
            fontFamily: "Inter, system-ui", fontSize: 13,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            lineHeight: 1.45,
          }}>
            <b style={{ color: "var(--fg)" }}>Waiting on one more fan to confirm.</b><br/>
            Share the show if you want to nudge this along — anyone who's checked the price can vouch.
          </div>
        </div>
      </SheetFrame>
    );
  }

  // Tier-aware accent: box-office sheets use gold so the corroboration UI
  // reinforces the submission's tier. Community uses azure (default).
  const accentColor = kind === "boxoffice" ? GOLD_D : AZ_D;

  return (
    <SheetFrame
      title={ceiling ? `Did you also see ${FormatRange(floor, ceiling)}?` : `Did you also see $${floor}?`}
      subtitle="Two fan confirms moves a price from pending to live. Pick how you checked — we're trying to keep this honest, not fast."
      theme={theme}
      height={820}
      footer={
        <>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 48, width: "100%", borderRadius: 10,
            background: accentColor, color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
            letterSpacing: "-0.005em",
          }}>
            <Check size={13} color="var(--fg-on-accent)"/>
            Confirm — same number
          </button>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", width: "100%",
            marginTop: 10, padding: "8px 0",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            textAlign: "center", display: "block",
          }}>
            Saw a different tier or a different price? Submit an update instead.
          </button>
        </>
      }
    >
      <SubmissionDetailCard
        floor={floor} ceiling={ceiling} tier={tier} vendor={vendor} kind={kind}
        submitter={submitter} submittedAt={submittedAt} note={note}
      />

      <div style={{ marginTop: 16, marginBottom: 10 }}>
        <Eyebrow>How did you check the price?</Eyebrow>
      </div>

      {/* Four UI options that map to three schema methods:
            same-vendor → method = "same-vendor"
            other-vendor → method = "other-vendor"
            box-office-saw → method = "box-office" (confirm-only)
            box-office-bought → method = "box-office" + follow-up
              SubmitPriceModal pre-filled with kind=boxoffice for the
              new gold-tier submission. The user's confirm posts first;
              the box-office submit modal opens AFTER the confirm lands
              so a failure there doesn't lose the corroboration. */}
      <VerifyOption
        accent={accentColor}
        label={`Same vendor (${vendor})`}
        sub={`I just checked ${vendor} and saw the same number.`}
        selected={selected === "same-vendor"}
      />
      <VerifyOption
        accent={accentColor}
        label="A different vendor / site"
        sub="I checked another ticketing site and the number matches."
        selected={selected === "other-vendor"}
      />
      <VerifyOption
        accent={accentColor}
        label="Saw the price at the box office"
        sub="In person or by phone. Counts as a community confirm with box-office origin."
        selected={selected === "box-office-saw"}
      />
      <VerifyOption
        accent={accentColor}
        label="Bought a ticket at the box office"
        sub="Confirms this submission AND opens a separate gold-tier box-office submission for your purchase."
        selected={selected === "box-office-bought"}
      />

      <div style={{
        marginTop: 16, padding: "10px 12px",
        background: "color-mix(in oklab, var(--fg) 3%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        lineHeight: 1.45,
      }}>
        Confirming is a vouch. If you're not sure, back out — a stale "confirmed" price helps no one. You can't confirm a price you submitted.
      </div>
    </SheetFrame>
  );
}

// ============================================================
// DISPUTED PRICE CARD
// ------------------------------------------------------------
// Live priced card with a soft "update pending" strip. Neutral
// `--fg-muted` chrome — disputes are price updates, not callouts.
// ============================================================
function DisputedPriceCard({
  floor = 48,
  ceiling = null,
  tier = "GA",
  vendor = "AXS",
  kind = "community",
  submitter = { handle: "@hugh", url: "/u/hugh" },
  observedAt = "yesterday",
  disputeBy = { handle: "@kel" },
  disputeAt = "1h ago",
  disputedFloor = 65,
  disputedCeiling = null,
}) {
  return (
    <div style={{
      borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {/* Update strip — neutral, not alarming */}
      <div style={{
        padding: "9px 14px",
        background: "color-mix(in oklab, var(--fg-muted) 8%, transparent)",
        borderBottom: "1px dashed var(--border-strong)",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 6px", borderRadius: 4,
          background: "color-mix(in oklab, var(--fg-muted) 14%, transparent)",
          color: "var(--fg)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
          lineHeight: 1,
        }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M2 6.5L4.2 3l1.5 2L8 4"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="4" r="1" fill="currentColor"/>
          </svg>
          update pending
        </span>
        <span style={{
          fontFamily: "Inter, system-ui", fontSize: 12,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          flex: 1, minWidth: 0,
        }}>
          {disputeBy.handle} saw <b style={{ color: "var(--fg)" }}>{FormatRange(disputedFloor, disputedCeiling)}</b> · {disputeAt}
        </span>
      </div>

      <div style={{ padding: "14px 14px 12px" }}>
        <Eyebrow>Tickets</Eyebrow>

        <div style={{
          marginTop: 6,
          display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
            color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1.05,
          }}>{FormatRange(floor, ceiling)}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--fg-muted)", letterSpacing: "0.06em",
            textTransform: "uppercase", fontWeight: 700,
          }}>{tier}</span>
          <window.PendingTrustPill kind={kind}/>
        </div>

        <div style={{
          marginTop: 6,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>seen on {vendor}</div>

        <div style={{
          marginTop: 8,
          display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <span>Submitted by</span>
          <a href={submitter.url} onClick={(e) => e.preventDefault()} style={{
            color: "var(--fg-muted)",
            textDecoration: "underline",
            textDecorationColor: "var(--border-strong)",
            textUnderlineOffset: 2,
          }}>{submitter.handle}</a>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{observedAt}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>2 fans confirmed</span>
        </div>

        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontSize: 12,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            flex: 1, minWidth: 0,
          }}>
            Got a different number?
          </span>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8,
            background: "transparent",
            border: "1px solid var(--border-strong)",
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
            color: "var(--fg)", letterSpacing: "-0.005em",
          }}>
            Submit an update
            <Arrow size={11}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COUNTER-SUBMIT SHEET
// ------------------------------------------------------------
// Mirrors the Phase 8 SubmitForm:
//   floor + ceiling + tier chip group + vendor chip group
// Copy reframed as "update" rather than "dispute" / "File dispute".
// Submitting creates a fresh community submission that runs through
// the same 2-confirm gate.
// ============================================================
function CounterSubmitSheet({
  currentFloor = 48,
  currentCeiling = null,
  currentVendor = "AXS",
  newFloor = "65",
  newCeiling = "80",
  selectedTier = "GA",
  selectedVendor = "AXS",
  theme = "electric",
}) {
  return (
    <SheetFrame
      title="Update the price."
      subtitle={`Currently listed: ${FormatRange(currentFloor, currentCeiling)} on ${currentVendor}. Your update goes pending until another fan confirms.`}
      eyebrow="Price update"
      theme={theme}
      height={820}
      footer={
        <>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 48, width: "100%", borderRadius: 10,
            background: "var(--signal)", color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
            letterSpacing: "-0.005em",
          }}>
            Submit update
            <Arrow size={13}/>
          </button>
          <div style={{
            marginTop: 10,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
            textTransform: "uppercase", textAlign: "center",
          }}>
            Treated as a fresh submission · same 2-confirm gate
          </div>
        </>
      }
    >
      {/* Floor / Ceiling */}
      <div style={{ display: "flex", gap: 12 }}>
        <NumField label="Floor" value={newFloor} placeholder="0"/>
        <NumField label="Ceiling" value={newCeiling} placeholder="0" optional/>
      </div>

      <div style={{
        marginTop: 8,
        fontFamily: "Inter, system-ui", fontSize: 11.5,
        color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        lineHeight: 1.4,
      }}>
        Ceiling is optional. Use it if you saw a range across sections / dates.
      </div>

      {/* Tier chips */}
      <div style={{ marginTop: 18 }}>
        <ChipGroup label="Tier" options={TIER_OPTIONS} selected={selectedTier}/>
      </div>

      {/* Vendor chips */}
      <div style={{ marginTop: 18 }}>
        <ChipGroup label="Where you saw it" options={VENDOR_OPTIONS} selected={selectedVendor}/>
      </div>

      <div style={{
        marginTop: 18, padding: "10px 12px",
        background: "color-mix(in oklab, var(--fg) 3%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        lineHeight: 1.45,
      }}>
        Treated as an update, not a callout. The goal is the right number for everyone — not who saw it first.
      </div>
    </SheetFrame>
  );
}

// ============================================================
// ADMIN DISPUTE RESOLUTION PANEL
// ============================================================
function AdminEntry({
  floor, ceiling, tier, vendor, kind = "community",
  submitter, observedAt, confirms, note, winner,
}) {
  const isWinner = winner === "this";
  return (
    <div style={{
      padding: "14px 16px",
      background: "var(--surface-1)",
      border: isWinner ? `2px solid ${AZ_D}` : "1px solid var(--border)",
      borderRadius: 12,
      position: "relative",
    }}>
      {isWinner && (
        <span style={{
          position: "absolute", top: -10, left: 12,
          padding: "3px 8px",
          background: AZ_D, color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          borderRadius: 4, lineHeight: 1,
        }}>winner</span>
      )}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 30,
          color: "var(--fg)", letterSpacing: "-0.025em", lineHeight: 1,
        }}>{FormatRange(floor, ceiling)}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-muted)", letterSpacing: "0.06em",
          textTransform: "uppercase", fontWeight: 700,
        }}>{tier}</span>
        <window.PendingTrustPill kind={kind}/>
      </div>
      <div style={{
        marginTop: 8,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 12px",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        letterSpacing: "0.04em",
      }}>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Submitter</span>
        <span style={{ color: "var(--fg)" }}>{submitter.handle}</span>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Vendor</span>
        <span style={{ color: "var(--fg)" }}>{vendor}</span>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Observed</span>
        <span style={{ color: "var(--fg)" }}>{observedAt}</span>
        <span style={{ color: "var(--fg-subtle)", textTransform: "uppercase" }}>Confirms</span>
        <span style={{ color: "var(--fg)" }}>{confirms}</span>
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
    </div>
  );
}

function AdminDisputePanel({ theme = "electric", winner = "counter" }) {
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  return (
    <div style={{
      ...themeStyle,
      width: 760, padding: 24,
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
      borderRadius: 14,
      border: "1px solid var(--border)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>Disputes · Phase 8.5</div>
          <h2 style={{
            margin: "4px 0 0",
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
            color: "var(--fg)", letterSpacing: "-0.025em",
          }}>Electric Callboy · Mission Ballroom · Aug 30</h2>
        </div>
        <span style={{
          padding: "5px 10px", borderRadius: 999,
          background: "color-mix(in oklab, var(--warning) 16%, transparent)",
          color: "var(--warning)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
        }}>open dispute</span>
      </div>

      <div style={{
        padding: "10px 14px",
        background: "color-mix(in oklab, var(--fg) 4%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 13,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
        lineHeight: 1.5,
        marginBottom: 18,
      }}>
        A corroborated price is being challenged. Pick the number that should
        live on the event page. Either entry can be promoted; the loser is
        archived (not deleted) with a reason. The submitter is not penalized
        — disputes are updates, not violations.
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 16px 1fr",
        alignItems: "start",
        marginBottom: 18,
      }}>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 8,
          }}>Original · live</div>
          <AdminEntry
            floor={48} ceiling={58} tier="GA" vendor="AXS"
            submitter={{ handle: "@hugh" }}
            observedAt="2d ago" confirms="2 fans · 0 admin"
            note="GA standing, checked the cart on AXS."
            winner={winner === "original" ? "this" : null}
          />
        </div>
        <div style={{
          alignSelf: "stretch", display: "flex", alignItems: "center",
          justifyContent: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-subtle)", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>vs</div>
        <div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
            color: "var(--fg-subtle)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 8,
          }}>Counter · pending</div>
          <AdminEntry
            floor={65} ceiling={80} tier="GA" vendor="AXS"
            submitter={{ handle: "@kel" }}
            observedAt="1h ago" confirms="0 fans"
            note="Same vendor — face moved to $65 after openers were announced. Cart is now showing $80 with fees."
            winner={winner === "counter" ? "this" : null}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <Eyebrow>Reason (shown to both submitters)</Eyebrow>
        <div style={{
          marginTop: 6, padding: "10px 12px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          fontFamily: "Inter, system-ui", fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.005em",
          minHeight: 44,
        }}>
          Confirmed with AXS — face moved to $65 after openers were announced. Hugh's $48 was correct at the time of submission; keeping his entry archived for history.
        </div>
      </div>

      <div style={{
        display: "flex", gap: 10, justifyContent: "flex-end",
      }}>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer",
          padding: "10px 16px", borderRadius: 9,
          background: "transparent",
          border: "1px solid var(--border-strong)",
          fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>Need more info</button>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer",
          padding: "10px 16px", borderRadius: 9,
          background: "transparent",
          border: `1px solid ${GOLD_D}`,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: GOLD_D, letterSpacing: "-0.005em",
        }}>Keep original</button>
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer",
          padding: "10px 16px", borderRadius: 9,
          background: AZ_D, color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 13,
          letterSpacing: "-0.005em",
        }}>Promote counter</button>
      </div>
    </div>
  );
}

window.CorroborationSheet = CorroborationSheet;
window.DisputedPriceCard = DisputedPriceCard;
window.CounterSubmitSheet = CounterSubmitSheet;
window.AdminDisputePanel = AdminDisputePanel;
window.SheetFrame = SheetFrame;
window.SubmissionDetailCard = SubmissionDetailCard;
window.VerifyOption = VerifyOption;
window.ChipGroup = ChipGroup;
window.NumField = NumField;
window.TIER_OPTIONS = TIER_OPTIONS;
window.VENDOR_OPTIONS = VENDOR_OPTIONS;

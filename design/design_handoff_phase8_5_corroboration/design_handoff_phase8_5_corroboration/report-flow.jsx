// report-flow.jsx — Fan event reporting (sold out / cancelled / postponed)
//
// All three report types share a corroboration model: 2 fan confirms OR an
// admin override. Per Hugh's call (May 25, 2026), 2 fans is sufficient even
// for cancelled/postponed, but admins can promote / override at any time.
//
// Architecture note: per the brief and Hugh's pick, status reports live in a
// dedicated `eventReports` table — they are status reports, not prices. The
// existing soldOutBy/soldOutConfirms on the price object is preserved for
// the rendered output (compat with the v2 price-block), but the pipeline
// that gets a sold-out report from "filed" → "live" lives in the new table.
//
// Surfaces:
//   - <ReportFooterLink>          inline link at the bottom of event detail
//   - <ReportSheet>               bottom sheet, 4 options
//   - <EvidenceForm>              "How do you know?" + optional link
//   - <PendingReportBanner>       cancelled / postponed pending state
//                                 (sits at top of event detail; cancelled
//                                  and postponed reshape the whole page)
//   - <PendingSoldOutCard>        sold-out pending state on the price card
//   - <ConfirmReportSheet>        other-fan confirmation sheet for a report
//   - <ReportTypeMark>            color-coded chip for the three report types
//
// Color discipline — uses existing tokens, no new hues:
//   sold-out   → existing --warning treatment from price-block (yellow/amber)
//   cancelled  → --danger (terminal, deserves the weight)
//   postponed  → --warning (provisional, may come back)
//   tickets-available (counter) → --success
// To distinguish sold-out (warning) from postponed (warning), postponed uses
// a clock glyph + outlined chrome; sold-out uses the filled SOLD OUT pill
// inherited from PriceBlockB. Different chrome, same hue — by design.

const AZ = window.PendingAZURE || "oklch(0.62 0.12 240)";
const EvIcon = {};

// ── Icons for the three report types ────────────────────────────
function SoldOutGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.4"/>
      <path d="M3.5 8.5L8.5 3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function CancelledGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3L3 9" stroke={color} strokeWidth="1.6"
            strokeLinecap="round"/>
    </svg>
  );
}
function PostponedGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.3"/>
      <path d="M6 3.5V6l2 1.4" stroke={color} strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TicketsAvailGlyph({ size = 12, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 5a1.5 1.5 0 010 3v2h8V8a1.5 1.5 0 010-3V3H2v2z"
            stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M5 5v3" stroke={color} strokeWidth="1.3"
            strokeLinecap="round" strokeDasharray="1.2 1.6"/>
    </svg>
  );
}
EvIcon.soldout    = SoldOutGlyph;
EvIcon.cancelled  = CancelledGlyph;
EvIcon.postponed  = PostponedGlyph;
EvIcon.available  = TicketsAvailGlyph;

// ── Per-report-type token bundle ─────────────────────────────────
function reportTokens(kind) {
  if (kind === "cancelled") return {
    label: "Cancelled",
    short: "cancelled",
    color: "var(--danger)",
    bg: "color-mix(in oklab, var(--danger) 10%, transparent)",
    bgStrong: "color-mix(in oklab, var(--danger) 18%, transparent)",
    border: "color-mix(in oklab, var(--danger) 42%, var(--border))",
    Glyph: CancelledGlyph,
  };
  if (kind === "postponed") return {
    label: "Postponed",
    short: "postponed",
    color: "var(--warning)",
    bg: "color-mix(in oklab, var(--warning) 10%, transparent)",
    bgStrong: "color-mix(in oklab, var(--warning) 18%, transparent)",
    border: "color-mix(in oklab, var(--warning) 42%, var(--border))",
    Glyph: PostponedGlyph,
  };
  if (kind === "soldout") return {
    label: "Sold out",
    short: "sold out",
    color: "var(--warning)",
    bg: "color-mix(in oklab, var(--warning) 10%, transparent)",
    bgStrong: "color-mix(in oklab, var(--warning) 18%, transparent)",
    border: "color-mix(in oklab, var(--warning) 42%, var(--border))",
    Glyph: SoldOutGlyph,
  };
  // tickets available (counter to sold-out)
  return {
    label: "Tickets available",
    short: "tickets back",
    color: "var(--success)",
    bg: "color-mix(in oklab, var(--success) 10%, transparent)",
    bgStrong: "color-mix(in oklab, var(--success) 18%, transparent)",
    border: "color-mix(in oklab, var(--success) 42%, var(--border))",
    Glyph: TicketsAvailGlyph,
  };
}

// ── ReportTypeMark — small mono pill ─────────────────────────────
function ReportTypeMark({ kind, pending = false }) {
  const t = reportTokens(kind);
  const G = t.Glyph;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px", borderRadius: 4,
      background: t.bg,
      color: t.color,
      border: `1px solid color-mix(in oklab, ${t.color} 50%, transparent)`,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700,
      lineHeight: 1, whiteSpace: "nowrap",
    }}>
      <G size={9} color={t.color}/>
      {t.label}
      {pending && <><span style={{ opacity: 0.4 }}>·</span><span>pending</span></>}
    </span>
  );
}

// ============================================================
// FOOTER LINK — sits below the related-shows section
// ============================================================
function ReportFooterLink({ theme = "electric" }) {
  const themeStyle = window.CC_THEMES
    ? Object.fromEntries(Object.entries(window.CC_THEMES[theme].tokens).map(([k,v]) => [`--${k}`, v]))
    : {};
  return (
    <div style={{
      ...themeStyle,
      width: 393, padding: "24px 18px 32px",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui, sans-serif",
      boxSizing: "border-box",
      borderTop: "1px dashed var(--border)",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 10,
      }}>Spot something off?</div>
      <button onClick={(e) => e.preventDefault()} style={{
        all: "unset", cursor: "pointer", boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, width: "100%",
        padding: "12px 14px", borderRadius: 10,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
      }}>
        <span>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
            color: "var(--fg)", letterSpacing: "-0.005em",
          }}>Report a status change</span>
          <span style={{
            display: "block", marginTop: 3,
            fontFamily: "Inter, system-ui", fontSize: 12,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>Sold out, cancelled, postponed — or back on.</span>
        </span>
        <window.PendingArrowGlyph size={13}/>
      </button>
      <div style={{
        marginTop: 10,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: "var(--fg-subtle)", letterSpacing: "0.04em",
        textTransform: "uppercase", lineHeight: 1.5,
      }}>
        Two confirms moves a report live · admins can promote anytime
      </div>
    </div>
  );
}

// ============================================================
// REPORT SHEET — bottom sheet from "Report a status change"
// ============================================================
function ReportOptionRow({ kind, sub, selected, onClick }) {
  const t = reportTokens(kind);
  const G = t.Glyph;
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%",
      boxSizing: "border-box",
      padding: "14px 14px",
      borderRadius: 10,
      background: selected ? t.bg : "var(--surface-1)",
      border: selected
        ? `1.5px solid ${t.color}`
        : "1px solid var(--border)",
      marginBottom: 8,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: t.bgStrong,
        color: t.color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <G size={15} color={t.color}/>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>{t.label}</div>
        <div style={{
          marginTop: 2,
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 12.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
          lineHeight: 1.4,
        }}>{sub}</div>
      </span>
    </button>
  );
}

// ReportSheet
//
// `liveStatus` controls which options render:
//   null            → show sold-out / postponed / cancelled. NO "Tickets
//                     available" — there's nothing to counter.
//   "soldout"       → show "Tickets available" (counter) + postponed +
//                     cancelled. Hide "Sold out" (it's already live).
//   "postponed"     → show "Tickets available" (counter — show is back on) +
//                     "Cancelled" (in case escalation is correct).
//                     Hide "Postponed" + "Sold out".
//   "cancelled"     → show "Tickets available" (counter — show is back on)
//                     only. Hide everything else.
//
// Per Hugh's May 25 note: only surface "Tickets available" when there's a
// live status report to counter. Default state of an upcoming show has no
// counter path — it doesn't make sense.
function ReportSheet({ theme = "electric", selected = "soldout", liveStatus = null }) {
  const SheetFrame = window.SheetFrame;

  // Decide which options render based on live status.
  const opts = [];
  if (liveStatus === null) {
    opts.push({ kind: "soldout",   sub: "Tickets are no longer available from the primary vendor." });
    opts.push({ kind: "postponed", sub: "Show is rescheduled to a later date. We'll keep the page up." });
    opts.push({ kind: "cancelled", sub: "Show is off entirely. Removes it from upcoming." });
  } else if (liveStatus === "soldout") {
    opts.push({ kind: "available", sub: "Tickets are back — the sold-out flag is wrong or stale." });
    opts.push({ kind: "postponed", sub: "Show is rescheduled to a later date." });
    opts.push({ kind: "cancelled", sub: "Show is off entirely. Removes it from upcoming." });
  } else if (liveStatus === "postponed") {
    opts.push({ kind: "available", sub: "Show is back on the original date." });
    opts.push({ kind: "cancelled", sub: "Show is off entirely (escalation from postponed)." });
  } else if (liveStatus === "cancelled") {
    opts.push({ kind: "available", sub: "Show is back on — the cancellation was reversed." });
  }

  const liveLabel = liveStatus && {
    soldout:   "sold out",
    cancelled: "cancelled",
    postponed: "postponed",
  }[liveStatus];

  return (
    <SheetFrame
      title="What changed?"
      subtitle={liveStatus
        ? `This show is currently marked as ${liveLabel}. Tell us what you saw — we'll route it to other fans to confirm.`
        : "We surface this to other fans so they can confirm. Pick the closest match — you can add detail on the next step."}
      eyebrow="Status report"
      theme={theme}
      height={liveStatus === "cancelled" ? 600 : 760}
      footer={
        <button onClick={(e) => e.preventDefault()} style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, height: 48, width: "100%", borderRadius: 10,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
          letterSpacing: "-0.005em",
        }}>
          Continue
          <window.PendingArrowGlyph size={13}/>
        </button>
      }
    >
      {/* When we're countering a live status, show what we're countering */}
      {liveStatus && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 6,
          }}>Currently live</div>
          <div style={{ display: "inline-flex" }}>
            <window.ReportTypeMark kind={liveStatus}/>
          </div>
        </div>
      )}

      {opts.map(o => (
        <ReportOptionRow key={o.kind} kind={o.kind} sub={o.sub} selected={selected === o.kind}/>
      ))}

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "color-mix(in oklab, var(--fg) 3%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        lineHeight: 1.5,
      }}>
        We'll ask how you know on the next step. An email from the venue, an artist's social post, or a venue announcement all count — anything we can point other fans at.
      </div>
    </SheetFrame>
  );
}

// ============================================================
// EVIDENCE FORM — "How do you know?"
// ============================================================
function EvidenceOption({ glyph, label, sub, selected }) {
  return (
    <button onClick={(e) => e.preventDefault()} style={{
      all: "unset", cursor: "pointer", display: "block", width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 10,
      background: selected ? `color-mix(in oklab, ${AZ} 10%, transparent)` : "var(--surface-1)",
      border: selected
        ? `1.5px solid ${AZ}`
        : "1px solid var(--border)",
      marginBottom: 8,
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
        marginTop: 2,
        background: selected ? AZ : "transparent",
        border: selected ? `1.5px solid ${AZ}` : "1.5px solid var(--border-strong)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <window.PendingCheckGlyph size={9} color="var(--fg-on-accent)"/>}
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

function EvidenceForm({
  kind = "cancelled",
  selected = "email",
  link = "",
  theme = "electric",
  confirmsRequired = 2,   // per ER_POLICY — 3 for cancelled on shows < 7 days out
  showDate = null,        // e.g. "in 4 days" — surfaced when confirmsRequired > 2
}) {
  const t = reportTokens(kind);
  const SheetFrame = window.SheetFrame;
  const Eyebrow = window.PendingEyebrow;
  return (
    <SheetFrame
      title="How do you know?"
      subtitle={`We need some proof before we tell other fans the show is ${t.short}. A link to the source is best — fans use it to confirm.`}
      theme={theme}
      height={800}
      footer={
        <>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 48, width: "100%", borderRadius: 10,
            background: t.color, color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
            letterSpacing: "-0.005em",
          }}>
            File report — pending confirmation
          </button>
          <div style={{
            marginTop: 10,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
            textTransform: "uppercase", textAlign: "center",
          }}>
            Live after {confirmsRequired} fan confirms · or admin promotion
          </div>
        </>
      }
    >
      {/* Selected report-type recap */}
      <div style={{
        padding: "10px 12px",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 10, marginBottom: 14,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: t.bgStrong,
          color: t.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <t.Glyph size={14} color={t.color}/>
        </span>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5,
          color: "var(--fg)", letterSpacing: "-0.005em",
        }}>Reporting as <span style={{ color: t.color }}>{t.label.toLowerCase()}</span></div>
      </div>

      {/* Higher-threshold hint — only when confirmsRequired > 2. Per ER_POLICY,
          cancelled reports on shows < 7 days out require 3 confirms instead of
          2. We surface it here so the reporter knows the bar is higher, without
          making it feel like an accusation. */}
      {confirmsRequired > 2 && (
        <div style={{
          padding: "10px 12px",
          background: "color-mix(in oklab, var(--warning) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--warning) 36%, var(--border))",
          borderRadius: 10, marginBottom: 18,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M8 2L14 13H2L8 2z" stroke="var(--warning)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6.5V9" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="10.8" r="0.7" fill="var(--warning)"/>
          </svg>
          <div>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
              color: "var(--fg)", letterSpacing: "-0.005em",
            }}>This show is {showDate || "close"} — we need {confirmsRequired} confirms instead of 2.</div>
            <div style={{
              marginTop: 3,
              fontFamily: "Inter, system-ui", fontSize: 12,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
              lineHeight: 1.45,
            }}>A wrong cancellation on an imminent show hides the event from upcoming. Higher bar, same process — strong evidence is the fastest path.</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <Eyebrow>Where did you see it?</Eyebrow>
      </div>

      <EvidenceOption
        label="Got an email from the venue"
        sub="An order email, an announcement, a refund notice."
        selected={selected === "email"}
      />
      <EvidenceOption
        label="Saw it on the artist's social"
        sub="Instagram, TikTok, Twitter / X. Share the post link below."
        selected={selected === "social"}
      />
      <EvidenceOption
        label="Venue posted an announcement"
        sub="Their site, social, or board outside the venue."
        selected={selected === "venue"}
      />
      <EvidenceOption
        label="I was at / called the venue"
        sub="Saw it on the door or heard it from staff."
        selected={selected === "venue-visit"}
      />
      <EvidenceOption
        label="Something else"
        sub="Tell us in the notes below."
        selected={selected === "other"}
      />

      {/* Link field */}
      <div style={{ marginTop: 18 }}>
        <Eyebrow>Link (optional but loved)</Eyebrow>
        <div style={{
          marginTop: 6,
          padding: "10px 12px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"
                  stroke="var(--fg-subtle)" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{
            flex: 1,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5,
            color: link ? "var(--fg)" : "var(--fg-subtle)",
            letterSpacing: "0.01em",
          }}>{link || "https://instagram.com/p/…"}</span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <Eyebrow>Notes (optional)</Eyebrow>
        <div style={{
          marginTop: 6, padding: "10px 12px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          fontFamily: "Inter, system-ui", fontSize: 13,
          color: "var(--fg-subtle)", letterSpacing: "-0.005em",
          minHeight: 56, lineHeight: 1.45,
        }}>
          What did the email / post say? Anything other fans should know.
        </div>
      </div>
    </SheetFrame>
  );
}

// ============================================================
// PENDING REPORT BANNER — cancelled / postponed reshape the
// whole page, so the pending state belongs ABOVE the title.
// ============================================================
function PendingReportBanner({
  kind = "cancelled",
  reporter = { handle: "@kel" },
  reportedAt = "3h ago",
  confirms = 1,
  needed = 2,
  evidence = "Instagram post · @electric.callboy",
  view = "other",
}) {
  const t = reportTokens(kind);
  const G = t.Glyph;
  const isReporter = view === "reporter" || view === "self-locked";
  return (
    <div style={{
      borderRadius: 12,
      background: t.bg,
      border: `1px solid ${t.border}`,
      padding: 0, overflow: "hidden",
    }}>
      {/* Top strip — kind + pending */}
      <div style={{
        padding: "10px 14px",
        background: t.bgStrong,
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <G size={14} color={t.color}/>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: t.color, letterSpacing: "0.08em",
            textTransform: "uppercase", fontWeight: 700,
          }}>{t.label} · pending</span>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: t.color, letterSpacing: "0.04em",
          textTransform: "uppercase", fontWeight: 700,
        }}>
          {Array.from({ length: needed }).map((_, i) => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i < confirms ? t.color : "transparent",
              border: `1.1px solid ${t.color}`,
              display: "inline-block",
            }}/>
          ))}
          <span style={{ marginLeft: 4 }}>{confirms} of {needed}</span>
        </span>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {/* Lead — what's going on, in human language */}
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14.5,
          color: "var(--fg)", letterSpacing: "-0.01em",
          lineHeight: 1.4, textWrap: "pretty",
        }}>
          {kind === "cancelled" && "A fan reports the show is cancelled."}
          {kind === "postponed" && "A fan reports the show is being rescheduled."}
          {kind === "soldout"   && "A fan reports the show has sold out."}
          {kind === "available" && "A fan reports tickets are back."}
        </div>

        {/* Evidence card */}
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"
                  stroke="var(--fg-muted)" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{
            flex: 1, minWidth: 0,
            fontFamily: "Inter, system-ui", fontSize: 12.5,
            color: "var(--fg)", letterSpacing: "-0.005em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{evidence}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>view</span>
        </div>

        {/* Attribution */}
        <div style={{
          marginTop: 10,
          display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <span>Reported by</span>
          {isReporter
            ? <span style={{ color: t.color, fontWeight: 700 }}>you</span>
            : <a href="#" onClick={(e) => e.preventDefault()} style={{
                color: "var(--fg-muted)",
                textDecoration: "underline",
                textDecorationColor: "var(--border-strong)",
                textUnderlineOffset: 2,
              }}>{reporter.handle}</a>}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{reportedAt}</span>
        </div>

        {/* Action row */}
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
              }}>Saw something different?</button>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                background: t.color, color: "var(--fg-on-accent)",
                fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
                letterSpacing: "-0.005em",
              }}>
                <window.PendingCheckGlyph size={11} color="var(--fg-on-accent)"/>
                Confirm
              </button>
            </>
          )}
          {view === "reporter" && (
            <>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>Your report</span>
              <div style={{ display: "flex", gap: 14 }}>
                <button onClick={(e) => e.preventDefault()} style={{
                  all: "unset", cursor: "pointer",
                  fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                  color: "var(--signal)", letterSpacing: "-0.005em",
                }}>Add evidence</button>
                <button onClick={(e) => e.preventDefault()} style={{
                  all: "unset", cursor: "pointer",
                  fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
                  color: "var(--warning)", letterSpacing: "-0.005em",
                }}>Withdraw</button>
              </div>
            </>
          )}
          {view === "self-locked" && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8,
              background: "color-mix(in oklab, var(--fg) 5%, transparent)",
              border: "1px dashed var(--border-strong)",
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
              marginLeft: "auto",
            }}>
              <window.PendingLockGlyph size={10}/>
              Waiting on one more fan
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PENDING SOLD-OUT CARD — sits where the price card lives,
// since sold-out is price-adjacent. Uses the price-card chrome
// to stay continuous with the priced state below it.
// ============================================================
function PendingSoldOutCard({
  price = 48,
  reporter = { handle: "@kel" },
  reportedAt = "3h ago",
  confirms = 1, needed = 2,
  evidence = "AXS listing · ‘not available’",
  view = "other",
}) {
  const t = reportTokens("soldout");
  const isReporter = view === "reporter" || view === "self-locked";
  return (
    <div style={{
      borderRadius: 12,
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {/* Top strip */}
      <div style={{
        padding: "8px 14px",
        background: t.bgStrong,
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          color: t.color, letterSpacing: "0.08em",
          textTransform: "uppercase", fontWeight: 700,
        }}>
          <t.Glyph size={11} color={t.color}/>
          Sold out · pending
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: t.color, letterSpacing: "0.04em",
          textTransform: "uppercase", fontWeight: 700,
        }}>
          {Array.from({ length: needed }).map((_, i) => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i < confirms ? t.color : "transparent",
              border: `1.1px solid ${t.color}`,
              display: "inline-block",
            }}/>
          ))}
          <span style={{ marginLeft: 4 }}>{confirms} of {needed}</span>
        </span>
      </div>

      <div style={{ padding: "14px 14px 12px" }}>
        <window.PendingEyebrow>Tickets</window.PendingEyebrow>

        {/* Strikethrough price — same idiom as live sold-out state */}
        <div style={{
          marginTop: 6,
          display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 28,
            color: "var(--fg-subtle)", letterSpacing: "-0.025em", lineHeight: 1.05,
            textDecoration: "line-through",
            textDecorationColor: "var(--fg-subtle)",
          }}>${price}</span>
          <span style={{
            padding: "2px 7px", borderRadius: 4,
            background: t.color, color: "var(--fg-on-accent)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
          }}>Sold out</span>
        </div>

        {/* Evidence */}
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"
                  stroke="var(--fg-muted)" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{
            flex: 1, minWidth: 0,
            fontFamily: "Inter, system-ui", fontSize: 12.5,
            color: "var(--fg)", letterSpacing: "-0.005em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{evidence}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>view</span>
        </div>

        <div style={{
          marginTop: 10,
          display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "var(--fg-muted)", letterSpacing: "0.04em",
        }}>
          <span>Reported by</span>
          {isReporter
            ? <span style={{ color: t.color, fontWeight: 700 }}>you</span>
            : <a href="#" onClick={(e) => e.preventDefault()} style={{
                color: "var(--fg-muted)",
                textDecoration: "underline",
                textDecorationColor: "var(--border-strong)",
                textUnderlineOffset: 2,
              }}>{reporter.handle}</a>}
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{reportedAt}</span>
        </div>

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
              }}>Tickets still available?</button>
              <button onClick={(e) => e.preventDefault()} style={{
                all: "unset", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 8,
                background: t.color, color: "var(--fg-on-accent)",
                fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 12.5,
                letterSpacing: "-0.005em",
              }}>
                <window.PendingCheckGlyph size={11} color="var(--fg-on-accent)"/>
                Confirm sold out
              </button>
            </>
          )}
          {view === "reporter" && (
            <>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                color: "var(--fg-subtle)", letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>Your report</span>
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
// CONFIRM-REPORT SHEET — opens from the "Confirm" CTA on a
// pending report. Same friction shape as price corroboration,
// adapted to status verification.
// ============================================================
function ConfirmReportSheet({
  kind = "cancelled",
  reporter = { handle: "@kel" },
  reportedAt = "3h ago",
  evidence = "Instagram post · @electric.callboy",
  selected = "saw-source",
  theme = "electric",
}) {
  const t = reportTokens(kind);
  const SheetFrame = window.SheetFrame;
  const Eyebrow = window.PendingEyebrow;
  return (
    <SheetFrame
      title={`Is this show ${t.short}?`}
      subtitle={`Confirm only if you have your own reason to believe it. Two confirms moves a report live — a wrong one reshapes the page.`}
      theme={theme}
      height={780}
      footer={
        <>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", boxSizing: "border-box",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, height: 48, width: "100%", borderRadius: 10,
            background: t.color, color: "var(--fg-on-accent)",
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
            letterSpacing: "-0.005em",
          }}>
            <window.PendingCheckGlyph size={13} color="var(--fg-on-accent)"/>
            Confirm — same status
          </button>
          <button onClick={(e) => e.preventDefault()} style={{
            all: "unset", cursor: "pointer", width: "100%",
            marginTop: 10, padding: "8px 0",
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
            textAlign: "center", display: "block",
          }}>
            I think this is wrong → file a counter-report
          </button>
        </>
      }
    >
      {/* Recap */}
      <div style={{
        padding: "12px 14px",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: t.bgStrong,
            color: t.color,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <t.Glyph size={15} color={t.color}/>
          </span>
          <div>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
              color: "var(--fg)", letterSpacing: "-0.01em",
            }}>{t.label}</div>
            <div style={{
              marginTop: 2,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              color: "var(--fg-muted)", letterSpacing: "0.04em",
            }}>by {reporter.handle} · {reportedAt}</div>
          </div>
        </div>
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "color-mix(in oklab, var(--fg) 4%, transparent)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5L8.5 5.5M4.5 9.5L3 8a2.5 2.5 0 010-3.5L4.5 3M9.5 4.5L11 6a2.5 2.5 0 010 3.5L9.5 11"
                  stroke="var(--fg-muted)" strokeWidth="1.3"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{
            flex: 1, minWidth: 0,
            fontFamily: "Inter, system-ui", fontSize: 12.5,
            color: "var(--fg)", letterSpacing: "-0.005em",
          }}>{evidence}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>view</span>
        </div>
      </div>

      <div style={{ marginTop: 16, marginBottom: 10 }}>
        <Eyebrow>How do you know?</Eyebrow>
      </div>

      <window.VerifyOption
        label="I saw the same source"
        sub={`I also saw the ${kind === "soldout" ? "vendor listing" : "post / email"} the reporter linked.`}
        selected={selected === "saw-source"}
      />
      <window.VerifyOption
        label="I have my own evidence"
        sub="A different email, post, or announcement — I'll attach it on the next step."
        selected={selected === "own-evidence"}
      />
      <window.VerifyOption
        label="I heard from someone at the venue"
        sub="Staff, the artist's team, or another fan who was there."
        selected={selected === "word-of-mouth"}
      />

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "color-mix(in oklab, var(--fg) 3%, transparent)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 12,
        color: "var(--fg-subtle)", letterSpacing: "-0.005em",
        lineHeight: 1.45,
      }}>
        Status reports reshape the event page. A wrong "cancelled" hides the show from upcoming. Vouch in good faith — fans rely on this.
      </div>
    </SheetFrame>
  );
}

// ── Cancelled / postponed banner in their LIVE state (for context) ─
// Shown in canvas so we can compare pending → live in one section.
function LiveReportBanner({ kind = "cancelled", reportedBy = "@kel", confirms = 2 }) {
  const t = reportTokens(kind);
  const G = t.Glyph;
  return (
    <div style={{
      borderRadius: 12,
      background: t.bg,
      border: `1px solid ${t.border}`,
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: t.bgStrong,
          color: t.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <G size={15} color={t.color}/>
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15,
            color: "var(--fg)", letterSpacing: "-0.01em",
          }}>{kind === "cancelled" && "This show is cancelled."}
            {kind === "postponed" && "This show has been postponed."}
            {kind === "soldout"   && "This show is sold out."}
          </div>
          <div style={{
            marginTop: 2,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "var(--fg-muted)", letterSpacing: "0.04em",
          }}>Confirmed by {confirms} fans · reported by {reportedBy}</div>
        </div>
      </div>
    </div>
  );
}

window.ReportFooterLink = ReportFooterLink;
window.ReportSheet = ReportSheet;
window.EvidenceForm = EvidenceForm;
window.PendingReportBanner = PendingReportBanner;
window.PendingSoldOutCard = PendingSoldOutCard;
window.ConfirmReportSheet = ConfirmReportSheet;
window.LiveReportBanner = LiveReportBanner;
window.ReportTypeMark = ReportTypeMark;
window.reportTokens = reportTokens;

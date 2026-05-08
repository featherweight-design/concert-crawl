// ============================================================
// SUBMIT + VERIFY A PRICE — Phase 8 design pass
// Concert Crawl · 2026-05
//
// Three submit surfaces (inline / sheet / route), full state coverage,
// verify loop, anti-abuse rails (preset chips, bounds, rate limits,
// pending-corroboration), anonymized attribution by default.
//
// Reads tokens from theme-context.jsx (--bg, --signal, --accent, etc).
// Reuses BetaPill / CCWordmark / CCClusterMark from landing-screens.jsx.
//
// COMPONENTS EXPORTED
//   <SubmitInline />, <SubmitSheet />, <SubmitRoute />
//   <VerifySheet />, <SubmissionList />, <CommunityPriceChip />
//   <DetailContextHeader />  ← show-context strip used above forms
// ============================================================

const SP_BetaPill = window.BetaPill;
const SP_CCWordmark = window.CCWordmark;
const SP_CCClusterMark = window.CCClusterMark;

// ── Sample show context (previews only; real impl receives `show` prop) ──
const SAMPLE_SHOW = {
  artist: "Habstrakt",
  presenter: "AlleyCVT presents: Supersonic Rocks",
  venue: "Red Rocks Amphitheatre",
  city: "Morrison, CO",
  date: "Thursday, May 7",
  doors: "6:30 PM",
  show: "7:30 PM",
  ages: "All Ages",
  // existing community submissions on this show
  submissions: [
    { id: "s1", floor: 35, ceiling: 75, tier: "GA",       source: "At the venue",     vendor: "Venue box office", submittedAgo: "3d", confirms: 2, disputes: 0, byYou: false },
    { id: "s2", floor: 65, ceiling: 90, tier: "Reserved", source: "Bought it myself", vendor: "Ticketmaster",     submittedAgo: "1d", confirms: 1, disputes: 0, byYou: false },
    { id: "s3", floor: 40, ceiling: 80, tier: "GA",       source: "Saw the listing",  vendor: "AXS",              submittedAgo: "5h", confirms: 0, disputes: 0, byYou: true,  pending: true },
  ],
};

// ── Form vocab — the tweakable bits live here so the Tweaks panel
// can show real chip text without drilling props all over the place.
const TIER_OPTIONS    = ["GA", "Reserved", "VIP", "Pit", "Lawn"];
const SOURCE_OPTIONS  = ["Bought it myself", "Saw the listing", "At the venue"];
const VENDOR_OPTIONS  = ["AXS", "Ticketmaster", "SeatGeek", "DICE", "Eventbrite", "Venue box office"];

// Anti-abuse policy (UI-side; server enforces canonically)
const SP_POLICY = {
  floorMin: 1,
  floorMax: 2000,        // hard cap
  ceilingMax: 2000,
  outlierLowFactor: 0.4, // <40% of community avg → soft warn
  outlierHighFactor: 2.5,
  customCharLimit: 30,
  rateLimitHours: 24,
  confirmsRequired: 2,
};

function sp_validate({ floor, ceiling, tier, source, vendor, otherSubmissions = [] }) {
  const errors = {};
  const warnings = {};
  const f = Number(floor);
  const c = ceiling === "" || ceiling == null ? null : Number(ceiling);

  if (!floor && floor !== 0) errors.floor = "Floor price is required.";
  else if (Number.isNaN(f)) errors.floor = "Numbers only.";
  else if (f < SP_POLICY.floorMin) errors.floor = `Has to be at least $${SP_POLICY.floorMin}.`;
  else if (f > SP_POLICY.floorMax) errors.floor = `Cap is $${SP_POLICY.floorMax} — pick a number that exists.`;

  if (c != null) {
    if (Number.isNaN(c)) errors.ceiling = "Numbers only.";
    else if (c < f) errors.ceiling = "Ceiling can't be below floor.";
    else if (c > SP_POLICY.ceilingMax) errors.ceiling = `Cap is $${SP_POLICY.ceilingMax}.`;
  }

  if (!tier)   errors.tier   = "Pick a tier.";
  if (!vendor) errors.vendor = "Pick where it's listed.";
  if (!source) errors.source = "Pick how you found out.";

  // Outlier warning vs. existing community submissions
  if (!errors.floor && otherSubmissions.length >= 2) {
    const others = otherSubmissions.map(s => s.floor).filter(n => Number.isFinite(n));
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    if (f < avg * SP_POLICY.outlierLowFactor)  warnings.floor = `Other fans reported around $${Math.round(avg)}. Sure about this one?`;
    if (f > avg * SP_POLICY.outlierHighFactor) warnings.floor = `Other fans reported around $${Math.round(avg)}. Sure about this one?`;
  }

  return { errors, warnings, ok: Object.keys(errors).length === 0 };
}

// ============================================================
// PRIMITIVES — chip group, number field, text field, helpers
// ============================================================

function SPChipGroup({ label, options, value, onChange, error }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <SPLabel>{label}</SPLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(opt => {
          const active = value === opt;
          return (
            <button key={opt} type="button" onClick={() => onChange(opt)} style={{
              all: "unset", cursor: "pointer", boxSizing: "border-box",
              padding: "8px 14px", borderRadius: 999,
              border: active ? "1.5px solid var(--signal)" : "1px solid var(--border-strong)",
              background: active ? "rgba(122,230,255,0.08)" : "var(--surface-1)",
              color: active ? "var(--signal)" : "var(--fg)",
              fontFamily: "Inter, system-ui",
              fontSize: 13.5, fontWeight: 600,
              letterSpacing: "-0.005em",
              transition: "background 0.15s, border-color 0.15s",
            }}>{opt}</button>
          );
        })}
      </div>
      {error && <SPErrorText>{error}</SPErrorText>}
    </div>
  );
}

function SPLabel({ children, required = false }) {
  return (
    <div style={{
      fontFamily: "Inter, system-ui",
      fontSize: 13, fontWeight: 700,
      color: "var(--fg)",
      letterSpacing: "-0.005em",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {children}
      {required && <span style={{ color: "var(--accent)", fontWeight: 700 }}>*</span>}
    </div>
  );
}

function SPHint({ children, tone = "muted" }) {
  return (
    <div style={{
      fontFamily: "Inter, system-ui",
      fontSize: 12, lineHeight: 1.45,
      color: tone === "warning" ? "var(--warning)" : "var(--fg-muted)",
      letterSpacing: "-0.005em",
    }}>{children}</div>
  );
}

function SPErrorText({ children }) {
  return (
    <div style={{
      fontFamily: "Inter, system-ui",
      fontSize: 12, fontWeight: 600,
      color: "var(--danger)",
      letterSpacing: "-0.005em",
    }}>{children}</div>
  );
}

function SPNumberField({ label, required, value, onChange, prefix = "$", placeholder, error, warning, hint, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
      <SPLabel required={required}>{label}</SPLabel>
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        background: "var(--surface-1)",
        border: error
          ? "1.5px solid var(--danger)"
          : warning ? "1.5px solid var(--warning)" : "1px solid var(--border-strong)",
        borderRadius: 10,
        padding: "0 0 0 12px",
        opacity: disabled ? 0.5 : 1,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14, fontWeight: 700,
          color: "var(--fg-muted)",
        }}>{prefix}</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder={placeholder}
          style={{
            all: "unset", boxSizing: "border-box",
            flex: 1, minWidth: 0,
            padding: "12px 12px",
            fontFamily: "Inter, system-ui",
            fontSize: 16, fontWeight: 700,
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        />
      </div>
      {error && <SPErrorText>{error}</SPErrorText>}
      {!error && warning && <SPHint tone="warning">{warning}</SPHint>}
      {!error && !warning && hint && <SPHint>{hint}</SPHint>}
    </div>
  );
}

// ── Show-context header — used above form in sheet + route surfaces ──
function DetailContextHeader({ show = SAMPLE_SHOW, dense = false }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: dense ? 4 : 6,
      paddingBottom: dense ? 12 : 16,
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: "0.14em",
        textTransform: "uppercase", fontWeight: 700,
        color: "var(--fg-subtle)",
      }}>Submit a price</div>
      <div style={{
        fontFamily: "Inter, system-ui",
        fontSize: dense ? 18 : 22, fontWeight: 900,
        color: "var(--fg)",
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
        textWrap: "balance",
      }}>{show.artist}</div>
      <div style={{
        fontFamily: "Inter, system-ui",
        fontSize: 13, color: "var(--fg-muted)",
        letterSpacing: "-0.005em",
      }}>{show.venue} · {show.date}</div>
    </div>
  );
}

// ============================================================
// CORE FORM — used inside all three surfaces
// ============================================================

const initialFormState = () => ({
  floor: "",
  ceiling: "",
  tier: null,
  vendor: null,
  source: null,
});

function SubmitForm({
  show = SAMPLE_SHOW,
  initialState = "empty",   // "empty" | "submitting" | "success" | "error" | "alreadySubmitted"
  onClose = () => {},
  dense = false,
}) {
  const [form, setForm] = React.useState(() => {
    if (initialState === "alreadySubmitted") {
      return { floor: "40", ceiling: "80", tier: "GA", vendor: "AXS", source: "Saw the listing" };
    }
    if (initialState === "error") {
      return { floor: "9999", ceiling: "20", tier: "GA", vendor: null, source: null };
    }
    return initialFormState();
  });
  const [phase, setPhase] = React.useState(initialState); // empty -> submitting -> success
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const otherSubs = (show.submissions || []).filter(s => !s.byYou);
  const { errors, warnings } = sp_validate({ ...form, otherSubmissions: otherSubs });

  // Submitting state — disable everything, show progress
  const submitting = phase === "submitting";
  const success    = phase === "success";
  const showErr    = phase === "error";
  const already    = phase === "alreadySubmitted";

  function handleSubmit() {
    if (Object.keys(errors).length > 0) {
      setPhase("error");
      return;
    }
    setPhase("submitting");
    setTimeout(() => setPhase("success"), 700);
  }

  // ── SUCCESS ──
  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DetailContextHeader show={show} dense={dense} />
        <div style={{
          padding: "18px 16px",
          background: "rgba(123,255,176,0.06)",
          border: "1px solid var(--success)",
          borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 11,
              background: "var(--success)",
              color: "var(--fg-on-accent)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16">
                <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 15, fontWeight: 800,
              color: "var(--fg)",
            }}>Got it. Thanks.</div>
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontSize: 13.5, lineHeight: 1.5,
            color: "var(--fg-muted)",
          }}>
            Your price is in. It'll show up tagged{" "}
            <strong style={{ color: "var(--accent)" }}>pending</strong>{" "}
            until {SP_POLICY.confirmsRequired} other fans corroborate it. We'll let you know if
            anyone confirms or disputes.
          </div>
        </div>

        <SPSecondaryButton onClick={onClose}>Done</SPSecondaryButton>
      </div>
    );
  }

  // ── ALREADY SUBMITTED (your existing entry) ──
  if (already && phase === "alreadySubmitted") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <DetailContextHeader show={show} dense={dense} />
        <div style={{
          padding: "14px 14px",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PendingPill />
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700,
              color: "var(--fg)",
            }}>You submitted this 5h ago</div>
          </div>
          <div style={{
            display: "flex", alignItems: "baseline", gap: 8,
            fontFamily: "Inter, system-ui",
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--fg)" }}>${form.floor}</div>
            {form.ceiling && (
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-muted)" }}>– ${form.ceiling}</div>
            )}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 4 }}>
              {form.tier}
            </div>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "var(--fg-muted)",
            letterSpacing: "0.04em",
          }}>{form.vendor} · {form.source.toLowerCase()}</div>
          <div style={{
            display: "flex", gap: 8, paddingTop: 4,
          }}>
            <SPSecondaryButton small onClick={() => setPhase("empty")}>Edit</SPSecondaryButton>
            <SPDangerButton small onClick={() => { /* withdraw */ }}>Withdraw</SPDangerButton>
          </div>
        </div>
        <SPHint>You can submit one price per show every {SP_POLICY.rateLimitHours}h.</SPHint>
      </div>
    );
  }

  // ── FORM (empty / error) ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 14 : 18 }}>
      <DetailContextHeader show={show} dense={dense} />

      {/* Anti-abuse banner */}
      <div style={{
        padding: "10px 12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <div style={{
          width: 18, height: 18, flexShrink: 0,
          borderRadius: 4,
          background: "var(--surface-3)",
          color: "var(--signal)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginTop: 1,
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16">
            <path d="M8 1.5L14 4v4.5c0 3.5-2.5 5.5-6 6-3.5-.5-6-2.5-6-6V4l6-2.5z"
              stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{
          fontFamily: "Inter, system-ui",
          fontSize: 12.5, lineHeight: 1.5,
          color: "var(--fg-muted)",
          letterSpacing: "-0.005em",
        }}>
          Prices are capped at <strong style={{ color: "var(--fg)" }}>${SP_POLICY.floorMax}</strong>.
          Submissions stay <em>pending</em> until {SP_POLICY.confirmsRequired} fans confirm.
        </div>
      </div>

      {/* Floor + ceiling */}
      <div style={{ display: "flex", gap: 12 }}>
        <SPNumberField
          label="Floor price"
          required
          value={form.floor}
          onChange={v => setField("floor", v)}
          placeholder="35"
          error={showErr && errors.floor}
          warning={!showErr ? warnings.floor : undefined}
          hint="cheapest you saw"
          disabled={submitting}
        />
        <SPNumberField
          label="Ceiling"
          value={form.ceiling}
          onChange={v => setField("ceiling", v)}
          placeholder="optional"
          error={showErr && errors.ceiling}
          hint="if known"
          disabled={submitting}
        />
      </div>

      <SPChipGroup
        label="Tier"
        options={TIER_OPTIONS}
        value={form.tier}
        onChange={v => setField("tier", v)}
        error={showErr ? errors.tier : undefined}
      />

      <SPChipGroup
        label="Where it's listed"
        options={VENDOR_OPTIONS}
        value={form.vendor}
        onChange={v => setField("vendor", v)}
        error={showErr ? errors.vendor : undefined}
      />

      <SPChipGroup
        label="How'd you find out?"
        options={SOURCE_OPTIONS}
        value={form.source}
        onChange={v => setField("source", v)}
        error={showErr ? errors.source : undefined}
      />

      <SPPrimaryButton onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit price"}
      </SPPrimaryButton>

      <SPHint>
        Anonymous to other fans. Goes out as <em>pending</em> until {SP_POLICY.confirmsRequired} confirm.
        We rate-limit at 1 per show per {SP_POLICY.rateLimitHours}h.
      </SPHint>
    </div>
  );
}

// ── Buttons ─────────────────────────────────────────────────────
function SPPrimaryButton({ onClick, children, disabled, fullWidth = true }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      all: "unset", cursor: disabled ? "not-allowed" : "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 50, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      boxSizing: "border-box",
      background: disabled ? "var(--surface-2)" : "var(--signal)",
      color: disabled ? "var(--fg-subtle)" : "var(--fg-on-accent)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15.5,
      letterSpacing: "-0.005em",
      boxShadow: disabled ? "none" : "0 12px 32px -12px var(--signal)",
    }}>{children}</button>
  );
}

function SPSecondaryButton({ onClick, children, small = false }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 6, height: small ? 36 : 44, padding: small ? "0 14px" : "0 18px",
      boxSizing: "border-box",
      background: "transparent",
      color: "var(--fg)",
      border: "1px solid var(--border-strong)",
      borderRadius: 8,
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: small ? 13 : 14,
      letterSpacing: "-0.005em",
    }}>{children}</button>
  );
}

function SPDangerButton({ onClick, children, small = false }) {
  return (
    <button onClick={onClick} style={{
      all: "unset", cursor: "pointer", textAlign: "center",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 6, height: small ? 36 : 44, padding: small ? "0 14px" : "0 18px",
      boxSizing: "border-box",
      background: "transparent",
      color: "var(--danger)",
      border: "1px solid var(--danger)",
      borderRadius: 8,
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: small ? 13 : 14,
      letterSpacing: "-0.005em",
      opacity: 0.85,
    }}>{children}</button>
  );
}

// ── Pending / Confirmed pills ───────────────────────────────────
function PendingPill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 999,
      background: "rgba(255,210,122,0.10)",
      border: "1px solid var(--warning)",
      color: "var(--warning)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.10em", textTransform: "uppercase",
    }}>pending</span>
  );
}

function ConfirmedPill({ count = 2 }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 999,
      background: "rgba(123,255,176,0.10)",
      border: "1px solid var(--success)",
      color: "var(--success)",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.10em", textTransform: "uppercase",
    }}>
      <svg width="9" height="9" viewBox="0 0 16 16">
        <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
      {count} confirmed
    </span>
  );
}

// ============================================================
// VERIFY PATH — community price chip on detail
// ============================================================

function CommunityPriceChip({
  show = SAMPLE_SHOW,
  attribution = "anonymous",   // "anonymous" | "handle"
  onTapDetails = () => {},
  showQuickConfirm = true,     // tweakable verify entry point
}) {
  // Compute the consensus from submissions
  const subs = show.submissions || [];
  const verified = subs.filter(s => s.confirms >= SP_POLICY.confirmsRequired);
  const consensus = verified[0] || subs.sort((a, b) => b.confirms - a.confirms)[0];
  if (!consensus) return null;

  const totalCount = subs.length;
  const confirmCount = subs.reduce((acc, s) => acc + (s.confirms || 0), 0);
  const isVerified = verified.length > 0;

  return (
    <div style={{
      padding: "14px 14px",
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          padding: "3px 7px", borderRadius: 999,
          background: "rgba(255,123,212,0.10)",
          color: "var(--accent)",
          border: "1px solid var(--accent)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>community</span>
        {isVerified ? <ConfirmedPill count={confirmCount} /> : <PendingPill />}
      </div>

      <div style={{
        display: "flex", alignItems: "baseline", gap: 8,
      }}>
        <div style={{
          fontFamily: "Inter, system-ui",
          fontSize: 28, fontWeight: 900,
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}>${consensus.floor}</div>
        {consensus.ceiling && (
          <div style={{
            fontFamily: "Inter, system-ui",
            fontSize: 18, fontWeight: 700,
            color: "var(--fg-muted)",
          }}>– ${consensus.ceiling}</div>
        )}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          color: "var(--fg-subtle)",
          letterSpacing: "0.06em", textTransform: "uppercase",
          marginLeft: 4,
        }}>{consensus.tier}</div>
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: "var(--fg-muted)",
        letterSpacing: "0.04em",
      }}>seen on {consensus.vendor || "—"}</div>

      <div style={{
        fontFamily: "Inter, system-ui",
        fontSize: 12.5, color: "var(--fg-muted)",
        letterSpacing: "-0.005em",
      }}>
        {attribution === "handle" ? (
          <>Submitted by <span style={{ color: "var(--signal)", fontWeight: 700 }}>@hugh</span> · {consensus.submittedAgo} ago</>
        ) : (
          <>Submitted by {totalCount} fan{totalCount === 1 ? "" : "s"} · most recent {consensus.submittedAgo} ago</>
        )}
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, paddingTop: 4,
        borderTop: "1px dashed var(--border)",
        marginTop: 2, paddingTop: 12,
      }}>
        {showQuickConfirm && (
          <button type="button" style={{
            all: "unset", cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 8,
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            color: "var(--success)",
            fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700,
            letterSpacing: "-0.005em",
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16">
              <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            Saw the same
          </button>
        )}
        <button type="button" onClick={onTapDetails} style={{
          all: "unset", cursor: "pointer",
          marginLeft: "auto",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          color: "var(--fg-muted)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>{totalCount} report{totalCount === 1 ? "" : "s"} →</button>
      </div>
    </div>
  );
}

// ── Inline dispute form — opens under a submission card ──
function DisputeForm({ submission, onCancel = () => {}, onSubmit = () => {} }) {
  const [floor, setFloor] = React.useState("");
  const [ceiling, setCeiling] = React.useState("");
  const [vendor, setVendor] = React.useState(null);
  const [phase, setPhase] = React.useState("empty"); // empty | error | submitting | success

  const errors = {};
  if (!floor) errors.floor = "What price did you see?";
  else if (Number.isNaN(Number(floor))) errors.floor = "Numbers only.";
  if (!vendor) errors.vendor = "Where did you see it?";

  const showErr = phase === "error";

  function handleSubmit() {
    if (Object.keys(errors).length) { setPhase("error"); return; }
    setPhase("submitting");
    setTimeout(() => { setPhase("success"); onSubmit({ floor, ceiling, vendor }); }, 600);
  }

  if (phase === "success") {
    return (
      <div style={{
        marginTop: 8, padding: "10px 12px",
        background: "rgba(123,255,176,0.06)",
        border: "1px solid var(--success)",
        borderRadius: 10,
        fontFamily: "Inter, system-ui", fontSize: 12.5,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
      }}>
        Logged. Your alternate price will show up alongside this one.
      </div>
    );
  }

  return (
    <div style={{
      marginTop: 8, padding: "12px 12px",
      background: "var(--bg-elevated)",
      border: "1px solid var(--danger)",
      borderRadius: 10,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
        color: "var(--fg)", letterSpacing: "-0.005em",
      }}>What did <em>you</em> see instead?</div>
      <div style={{
        fontFamily: "Inter, system-ui", fontSize: 11.5, lineHeight: 1.45,
        color: "var(--fg-muted)", letterSpacing: "-0.005em",
      }}>Disputes have to come with a price and a vendor. Keeps it honest.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <SPNumberField
          label="Floor"
          required
          value={floor}
          onChange={setFloor}
          placeholder="45"
          error={showErr && errors.floor}
        />
        <SPNumberField
          label="Ceiling"
          value={ceiling}
          onChange={setCeiling}
          placeholder="optional"
        />
      </div>
      <SPChipGroup
        label="Where you saw it"
        options={VENDOR_OPTIONS}
        value={vendor}
        onChange={setVendor}
        error={showErr ? errors.vendor : undefined}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <SPSecondaryButton small onClick={onCancel}>Cancel</SPSecondaryButton>
        <button onClick={handleSubmit} type="button" style={{
          all: "unset", cursor: "pointer", textAlign: "center",
          flex: 1,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 36, padding: "0 14px",
          background: "var(--danger)",
          color: "#fff",
          borderRadius: 8,
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          letterSpacing: "-0.005em",
          opacity: phase === "submitting" ? 0.6 : 1,
        }}>{phase === "submitting" ? "Submitting…" : "File dispute"}</button>
      </div>
    </div>
  );
}

function SubmissionActions({ submission, disputeOpenId, setDisputeOpenId }) {
  const isOpen = disputeOpenId === submission.id;
  if (isOpen) {
    return (
      <DisputeForm
        submission={submission}
        onCancel={() => setDisputeOpenId(null)}
        onSubmit={() => setDisputeOpenId(null)}
      />
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
      <button type="button" style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "7px 11px", borderRadius: 8,
        background: "var(--surface-2)",
        border: "1px solid var(--border-strong)",
        color: "var(--success)",
        fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
      }}>
        <svg width="11" height="11" viewBox="0 0 16 16">
          <path d="M3 8.5l3 3 7-8" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        Confirm
      </button>
      <button type="button" onClick={() => setDisputeOpenId(submission.id)} style={{
        all: "unset", cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "7px 11px", borderRadius: 8,
        background: "transparent",
        border: "1px solid var(--border-strong)",
        color: "var(--fg-muted)",
        fontFamily: "Inter, system-ui", fontSize: 12.5, fontWeight: 700,
      }}>Dispute</button>
    </div>
  );
}

// ── Submission list (used inside the verify sheet) ──
function SubmissionList({ show = SAMPLE_SHOW, attribution = "anonymous", initialDisputeOpenId = null }) {
  const subs = show.submissions || [];
  const [disputeOpenId, setDisputeOpenId] = React.useState(initialDisputeOpenId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {subs.map((s, i) => {
        const verified = (s.confirms || 0) >= SP_POLICY.confirmsRequired;
        return (
          <div key={s.id} style={{
            padding: "12px 14px",
            background: s.byYou ? "rgba(255,123,212,0.04)" : "var(--surface-1)",
            border: s.byYou ? "1px solid var(--accent)" : "1px solid var(--border)",
            borderRadius: 10,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {verified ? <ConfirmedPill count={s.confirms} /> : <PendingPill />}
              {s.byYou && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9.5, fontWeight: 700,
                  padding: "3px 8px", borderRadius: 999,
                  background: "var(--accent)",
                  color: "var(--fg-on-accent)",
                  letterSpacing: "0.10em", textTransform: "uppercase",
                }}>you</span>
              )}
              <span style={{
                marginLeft: "auto",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, color: "var(--fg-subtle)",
                letterSpacing: "0.04em",
              }}>{s.submittedAgo} ago</span>
            </div>
            <div style={{
              display: "flex", alignItems: "baseline", gap: 8,
              fontFamily: "Inter, system-ui",
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--fg)" }}>${s.floor}</div>
              {s.ceiling && (
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-muted)" }}>– ${s.ceiling}</div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginLeft: 2 }}>
                {s.tier}
              </div>
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "var(--fg-muted)",
              letterSpacing: "0.04em",
            }}>
              {s.vendor} · {s.source ? s.source.toLowerCase() : ""}
              {attribution === "handle" && !s.byYou && <span> · @anon{i + 1}</span>}
            </div>
            {!s.byYou && (
              <SubmissionActions submission={s} disputeOpenId={disputeOpenId} setDisputeOpenId={setDisputeOpenId} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Verify Sheet (mobile bottom sheet showing all submissions) ──
function VerifySheet({ show = SAMPLE_SHOW, attribution = "anonymous", onClose = () => {} }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 14,
      height: "100%",
    }}>
      <DetailContextHeader show={show} dense />
      <div style={{
        fontFamily: "Inter, system-ui",
        fontSize: 13, lineHeight: 1.5,
        color: "var(--fg-muted)",
        letterSpacing: "-0.005em",
      }}>
        Confirm what you saw, dispute what looks off. Two confirms move a price out of <em>pending</em>.
      </div>
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
        <SubmissionList show={show} attribution={attribution} />
      </div>
      <SPSecondaryButton onClick={onClose}>Close</SPSecondaryButton>
    </div>
  );
}

// ============================================================
// SURFACE 1 — INLINE (collapsible panel on detail)
// ============================================================

function SubmitInline({ show = SAMPLE_SHOW, initialOpen = false, initialState = "empty" }) {
  const [open, setOpen] = React.useState(initialOpen);
  const [phase, setPhase] = React.useState(initialState);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Collapsed entry */}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{
          all: "unset", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px",
          background: "var(--surface-1)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 12,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: 14,
            background: "var(--surface-3)",
            color: "var(--accent)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 18,
          }}>+</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700,
              color: "var(--fg)", letterSpacing: "-0.005em",
            }}>Know the ticket price?</div>
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 12.5,
              color: "var(--fg-muted)", letterSpacing: "-0.005em",
            }}>Drop it in. Other fans will confirm.</div>
          </div>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, fontWeight: 700,
            color: "var(--signal)",
            letterSpacing: "0.10em", textTransform: "uppercase",
          }}>add →</span>
        </button>
      ) : (
        <div style={{
          padding: "16px 16px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
        }}>
          <SubmitForm
            show={show}
            initialState={phase}
            onClose={() => { setOpen(false); setPhase("empty"); }}
            dense
          />
          {phase === "empty" && (
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={() => setOpen(false)} style={{
                all: "unset", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 700,
                color: "var(--fg-muted)",
                letterSpacing: "0.10em", textTransform: "uppercase",
              }}>← Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SURFACE 2 — BOTTOM SHEET
// ============================================================

function SubmitSheet({ show = SAMPLE_SHOW, initialState = "empty", onClose = () => {} }) {
  // Renders as a sheet pinned to the bottom of a phone-shaped container.
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      background: "rgba(0,0,0,0.55)",
    }}>
      {/* Scrim - tap to close */}
      <div onClick={onClose} style={{ flex: 1 }} />
      {/* Sheet */}
      <div style={{
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: "1px solid var(--border-strong)",
        padding: "10px 18px 22px",
        maxHeight: "82%",
        display: "flex", flexDirection: "column",
        boxShadow: "0 -24px 60px -10px rgba(0,0,0,0.5)",
      }}>
        {/* Grabber */}
        <div style={{
          width: 44, height: 4, borderRadius: 2,
          background: "var(--border-strong)",
          alignSelf: "center",
          marginBottom: 12,
        }} />
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
          <SubmitForm
            show={show}
            initialState={initialState}
            onClose={onClose}
            dense
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SURFACE 3 — DEDICATED ROUTE (full screen task)
// ============================================================

function SubmitRoute({ show = SAMPLE_SHOW, initialState = "empty", onClose = () => {} }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Top chrome */}
      <header style={{
        flexShrink: 0,
        padding: "16px 20px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10,
      }}>
        <button type="button" onClick={onClose} style={{
          all: "unset", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, fontWeight: 700,
          color: "var(--fg-muted)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {SP_CCClusterMark && <SP_CCClusterMark size={20} color="var(--signal)" glow="var(--accent)" />}
          {SP_CCWordmark && <SP_CCWordmark size={14} />}
        </div>
        <div style={{ width: 60 }} />
      </header>

      {/* Body */}
      <main style={{
        flex: 1, minHeight: 0,
        overflowY: "auto",
        padding: "12px 20px 16px",
      }}>
        <SubmitForm
          show={show}
          initialState={initialState}
          onClose={onClose}
        />
      </main>
    </div>
  );
}

// ============================================================
// EXPORTS
// ============================================================

Object.assign(window, {
  SubmitInline,
  SubmitSheet,
  SubmitRoute,
  SubmitForm,
  VerifySheet,
  CommunityPriceChip,
  SubmissionList,
  DisputeForm,
  DetailContextHeader,
  PendingPill,
  ConfirmedPill,
  SP_POLICY,
  SP_TIER_OPTIONS: TIER_OPTIONS,
  SP_SOURCE_OPTIONS: SOURCE_OPTIONS,
  SP_VENDOR_OPTIONS: VENDOR_OPTIONS,
  SP_SAMPLE_SHOW: SAMPLE_SHOW,
});

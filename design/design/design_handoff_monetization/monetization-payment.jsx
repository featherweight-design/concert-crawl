// monetization-payment.jsx — payment modal / sheet
//
// Triggered after a tier is selected. Stripe Elements owns the actual form
// internals; we design the container, summary rail, totals, and result states.
//
// Exports:
//   <PaymentSurface variant="mobile|desktop" state="..." tier role userState/>
//
// States:
//   "form"     default — Stripe Elements slot visible, summary on top
//   "loading"  submitting — Stripe processing
//   "success"  payment + subscription confirmed
//   "error"    Stripe returned an error
//   "switch"   inline "change tier" picker visible

const { TIERS, MMark, TierBadge, RoleBadge, MonoEyebrow, RailHeader,
        ScarcityRail, DragHandle, SheetChrome, ModalChrome,
        getFounderState, TrialBanner } = window;

// ── Stripe Elements slot — illustrative dashed placeholder ───
function StripeElementsSlot({ disabled = false, error = false }) {
  return (
    <div style={{
      position: "relative",
      borderRadius: 12,
      background: "var(--surface-1)",
      border: `1px dashed ${error ? "var(--danger)" : "var(--border-strong)"}`,
      padding: "16px 14px",
      display: "flex", flexDirection: "column", gap: 12,
      opacity: disabled ? 0.55 : 1,
    }}>
      {/* Stripe lockup mark */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <MonoEyebrow size={9} letterSpacing="0.16em">Stripe Elements</MonoEyebrow>
        <MonoEyebrow size={9} letterSpacing="0.16em" color="var(--fg-subtle)">PCI · SCA · 3DS</MonoEyebrow>
      </div>

      {/* Card row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          padding: "11px 12px", borderRadius: 8,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          color: "var(--fg-subtle)", letterSpacing: "0.04em",
        }}>
          <span>1234 1234 1234 1234</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["#1A1F71", "#EB001B", "#F79E1B"].map((c, i) => (
              <div key={i} style={{ width: 22, height: 14, borderRadius: 3, background: c, opacity: 0.85 }}/>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{
            padding: "11px 12px", borderRadius: 8,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>MM / YY</div>
          <div style={{
            padding: "11px 12px", borderRadius: 8,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            color: "var(--fg-subtle)", letterSpacing: "0.04em",
          }}>CVC</div>
        </div>
      </div>

      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">
        Stripe owns these fields. We never see your card.
      </MonoEyebrow>
    </div>
  );
}

// ── Selected tier summary rail ───────────────────────────────
function TierSummaryRail({ tier, founderState, urgencyIntensity, trial = false, onSwitch }) {
  if (!tier) return null;
  const isFounder = tier.key === "founder";
  return (
    <div style={{
      position: "relative",
      padding: "14px 14px 14px",
      borderRadius: 12,
      background: tier.key === "premium" ? "color-mix(in oklch, var(--signal) 8%, var(--surface-1))"
              : tier.key === "founder" ? "linear-gradient(135deg, color-mix(in oklch, var(--accent) 12%, var(--surface-1)), color-mix(in oklch, var(--signal) 10%, var(--surface-1)))"
              : "var(--surface-1)",
      border: `1px solid ${tier.key === "premium" ? "color-mix(in oklch, var(--signal) 40%, var(--border-strong))"
              : tier.key === "founder" ? "color-mix(in oklch, var(--accent) 40%, var(--border-strong))"
              : "var(--border-strong)"}`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {isFounder && founderState?.open && (
        <ScarcityRail state={founderState} intensity={urgencyIntensity}/>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 20,
              letterSpacing: "-0.02em", color: "var(--fg)",
            }}>{tier.name}</span>
            {tier.key !== "free" && <TierBadge tier={tier.key} size="sm"/>}
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
            color: "var(--fg-muted)", letterSpacing: "-0.005em",
          }}>{tier.tagline}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
            letterSpacing: "-0.04em", color: "var(--fg)", lineHeight: 1,
          }}>{tier.priceText}</div>
          <MonoEyebrow size={9} style={{ marginTop: 4 }}>{tier.priceUnit}</MonoEyebrow>
        </div>
      </div>
      {onSwitch && (
        <button onClick={onSwitch} style={{
          all: "unset", cursor: "pointer", alignSelf: "flex-start",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--signal)",
          padding: "4px 0", borderBottom: "1px dashed color-mix(in oklch, var(--signal) 50%, transparent)",
        }}>Change tier ↗</button>
      )}
    </div>
  );
}

// ── Totals row ───────────────────────────────────────────────
function TotalsBlock({ tier, trial = false }) {
  if (!tier || tier.key === "free") return null;
  const today = trial ? 0 : tier.price;
  const after = tier.price;
  return (
    <div style={{
      padding: "12px 0",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 13.5, color: "var(--fg-muted)" }}>
          {trial ? "Charged today" : "Due today"}
        </div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 22,
          letterSpacing: "-0.04em", color: trial ? "var(--signal)" : "var(--fg)",
        }}>
          {trial ? "$0.00" : `$${today.toFixed(2)}`}
        </div>
      </div>
      {trial && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>
            Then in 14 days
          </div>
          <div style={{
            fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14,
            letterSpacing: "-0.02em", color: "var(--fg)",
          }}>
            ${after.toFixed(2)} / month
          </div>
        </div>
      )}
      {!trial && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12, color: "var(--fg-muted)" }}>
            Then monthly
          </div>
          <MonoEyebrow size={10}>
            ${after.toFixed(2)} {tier.key === "founder" ? "· locked forever" : ""}
          </MonoEyebrow>
        </div>
      )}
    </div>
  );
}

// ── Switch-tier inline picker ────────────────────────────────
function SwitchTierPicker({ founderState, currentKey, onPick, onClose, onConfirm }) {
  const opts = TIERS.filter(t => {
    if (t.key === "free") return false;
    if (t.key === "founder" && !founderState?.open) return false;
    return true;
  });
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      padding: "14px", borderRadius: 12,
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <MonoEyebrow size={10} color="var(--fg)" letterSpacing="0.14em">Change tier</MonoEyebrow>
        <button onClick={onClose} style={{
          all: "unset", cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--fg-subtle)",
        }}>Cancel ×</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map(t => {
          const isActive = t.key === currentKey;
          return (
            <div key={t.key} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 10,
              background: isActive ? "color-mix(in oklch, var(--signal) 12%, var(--bg-elevated))" : "var(--bg-elevated)",
              border: `1px solid ${isActive ? "var(--signal)" : "var(--border)"}`,
              cursor: "pointer",
            }} onClick={() => onPick?.(t.key)}>
              <div style={{
                width: 16, height: 16, borderRadius: 16,
                border: `2px solid ${isActive ? "var(--signal)" : "var(--border-strong)"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {isActive && <div style={{ width: 8, height: 8, borderRadius: 8, background: "var(--signal)" }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", rowGap: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}>{t.name}</span>
                  <TierBadge tier={t.key} size="sm"/>
                </div>
                <MonoEyebrow size={9}>{t.tagline}</MonoEyebrow>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.03em" }}>{t.priceText}</div>
                <MonoEyebrow size={9}>{t.priceUnit.split("·")[0].trim()}</MonoEyebrow>
              </div>
            </div>
          );
        })}
      </div>
      {/* CTA — inline in the picker so it doesn't float alone below empty space */}
      <button onClick={onConfirm} style={{
        all: "unset", cursor: "pointer", marginTop: 4,
        display: "block", width: "100%", textAlign: "center",
        padding: "12px 14px", borderRadius: 10,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
        letterSpacing: "-0.005em",
        boxShadow: "0 0 18px color-mix(in oklch, var(--signal) 25%, transparent)",
      }}>Use selected tier</button>
    </div>
  );
}

// ── Submit button ────────────────────────────────────────────
function PaymentCTA({ tier, trial, state, onClick }) {
  if (!tier) return null;
  const label = state === "loading" ? "Processing…"
             : state === "success" ? "Done"
             : trial && tier.key === "premium" ? "Start free trial"
             : tier.key === "founder" ? "Claim Founder pricing"
             : `Pay $${tier.price.toFixed(2)} / month`;
  const isFounder = tier.key === "founder";
  return (
    <button onClick={onClick} disabled={state === "loading"} style={{
      all: "unset", cursor: state === "loading" ? "wait" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "14px 16px", borderRadius: 12,
      background: isFounder
        ? "linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--accent) 60%, var(--signal)))"
        : "var(--signal)",
      color: "var(--fg-on-accent)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
      letterSpacing: "-0.005em",
      boxShadow: isFounder ? "0 0 24px color-mix(in oklch, var(--accent) 35%, transparent)" : "none",
      opacity: state === "loading" ? 0.75 : 1,
    }}>
      {state === "loading" && (
        <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "mPaySpin 0.9s linear infinite" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
          <path d="M21 12 A9 9 0 0 0 12 3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}

// inject spinner keyframe
if (typeof document !== "undefined" && !document.getElementById("monetization-keyframes")) {
  const s = document.createElement("style");
  s.id = "monetization-keyframes";
  s.textContent = `
    @keyframes mPaySpin { to { transform: rotate(360deg) } }
  `;
  document.head.appendChild(s);
}

// ── Success state body ───────────────────────────────────────
function SuccessBody({ tier, trial, role }) {
  const sweetHeadline = trial && tier.key === "premium"
    ? "Trial's running."
    : tier.key === "founder"
    ? "Founder. Locked in."
    : tier.key === "supporter"
    ? "You're a Supporter."
    : "You're in.";
  const subtle = trial && tier.key === "premium"
    ? "14 days of full Premium. Cancel any time, lose nothing. We'll nudge you before the trial ends — no surprises."
    : tier.key === "founder"
    ? `$3/mo, forever. Your Founder badge is live. Thanks — we mean it.`
    : tier.key === "supporter"
    ? "History, calendar export, and the Supporter badge are switched on. Thanks for chipping in."
    : "Premium's on. Alerts, sync, the works. Welcome to the inside.";
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 18,
      alignItems: "center", textAlign: "center",
      padding: "20px 4px 8px",
    }}>
      {/* Confetti-free celebration mark — MMark on a signal disc */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <div style={{
          position: "absolute", inset: -8, borderRadius: 80,
          background: "radial-gradient(circle, color-mix(in oklch, var(--signal) 50%, transparent) 0%, transparent 70%)",
        }}/>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 20,
          background: "var(--surface-1)",
          border: "1px solid color-mix(in oklch, var(--signal) 40%, var(--border-strong))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <MMark size={56}/>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: 26, letterSpacing: "-0.035em",
          color: "var(--fg)", lineHeight: 1.05,
        }}>{sweetHeadline}</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 500,
          fontSize: 13.5, color: "var(--fg-muted)",
          maxWidth: 320, margin: "0 auto", lineHeight: 1.5,
        }}>{subtle}</div>
      </div>

      {/* Badge preview */}
      {tier.key !== "free" && (
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <MonoEyebrow size={9}>Now showing on your profile</MonoEyebrow>
          <TierBadge tier={tier.key} size="md"/>
          {role && role !== "member" && <RoleBadge role={role} size="md"/>}
        </div>
      )}
    </div>
  );
}

// ── Error state body ─────────────────────────────────────────
function ErrorBody({ message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 14,
      padding: "16px 14px", borderRadius: 12,
      background: "color-mix(in oklch, var(--danger) 8%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--danger) 35%, var(--border))",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--danger)", boxShadow: "0 0 8px var(--danger)" }}/>
        <MonoEyebrow color="var(--danger)" size={10} letterSpacing="0.16em">Card didn't go through</MonoEyebrow>
      </div>
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13,
        color: "var(--fg)", lineHeight: 1.5,
      }}>
        {message || "Stripe rejected the charge. Could be a typo, an expired card, or a temporary bank hiccup. Have a look and try again — or skip it for now, we'll be here."}
      </div>
    </div>
  );
}

// ── Header (close + title + selected tier rail) ──────────────
function PaymentHeader({ tier, founderState, urgencyIntensity, voluntary, onClose, trial }) {
  const title = !tier ? "Confirm"
              : voluntary ? "Support Concert Crawl"
              : trial && tier.key === "premium" ? "Start your trial"
              : `Confirm ${tier.name}`;
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 10,
      padding: "16px 16px 4px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MMark size={22}/>
        <span style={{
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          letterSpacing: "-0.02em", color: "var(--fg)",
        }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
        <div style={{ flex: 1 }}/>
        {onClose && (
          <button onClick={onClose} style={{
            all: "unset", cursor: "pointer", padding: 8, borderRadius: 8,
            color: "var(--fg-muted)",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
      <RailHeader
        tone={tier?.key === "founder" ? "warning" : "signal"}
        eyebrow={voluntary ? "Voluntary support" : trial ? "Premium trial" : "Confirm subscription"}
        code={tier ? tier.priceText.toUpperCase() : "—"}
      />
      <div style={{
        fontFamily: "Inter, system-ui", fontWeight: 900,
        fontSize: 24, letterSpacing: "-0.03em",
        color: "var(--fg)", marginTop: 2,
      }}>{title}</div>
    </div>
  );
}

// ── Top-level PaymentSurface ─────────────────────────────────
function PaymentSurface({
  variant = "mobile",
  state = "form",
  tierKey = "premium",
  founderKind = "open-many",
  urgencyIntensity = "medium",
  trial = false,
  role = "member",
  voluntary = false,
  errorMessage,
}) {
  const tier = TIERS.find(t => t.key === tierKey);
  const founderState = getFounderState(founderKind);
  const [showSwitcher, setShowSwitcher] = React.useState(state === "switch");

  React.useEffect(() => { setShowSwitcher(state === "switch"); }, [state]);

  const trialEligible = trial && tier?.key === "premium" && !voluntary;

  const body = (() => {
    if (state === "success") return (
      <div style={{ padding: "0 16px 18px" }}>
        <SuccessBody tier={tier} trial={trialEligible} role={role}/>
      </div>
    );
    if (state === "error") return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 16px 4px" }}>
        <TierSummaryRail tier={tier} founderState={founderState} urgencyIntensity={urgencyIntensity} trial={trialEligible} onSwitch={() => setShowSwitcher(true)}/>
        <ErrorBody message={errorMessage}/>
        <StripeElementsSlot error/>
        <TotalsBlock tier={tier} trial={trialEligible}/>
      </div>
    );
    if (showSwitcher) return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 16px 4px" }}>
        <SwitchTierPicker
          founderState={founderState}
          currentKey={tierKey}
          onClose={() => setShowSwitcher(false)}
          onConfirm={() => setShowSwitcher(false)}
        />
      </div>
    );
    // form, loading
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 16px 4px" }}>
        <TierSummaryRail tier={tier} founderState={founderState} urgencyIntensity={urgencyIntensity} trial={trialEligible} onSwitch={() => setShowSwitcher(true)}/>
        {trialEligible && state !== "loading" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 10,
            background: "color-mix(in oklch, var(--signal) 10%, var(--surface-1))",
            border: "1px solid color-mix(in oklch, var(--signal) 30%, var(--border))",
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--signal)" strokeWidth="1.5"/>
              <path d="M7 4 L7 7 L9 8.5" fill="none" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{
              fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12.5,
              color: "var(--fg)", letterSpacing: "-0.005em", flex: 1,
            }}>14 days free. Charged on day 15. Cancel any time before.</div>
          </div>
        )}
        <StripeElementsSlot disabled={state === "loading"}/>
        <TotalsBlock tier={tier} trial={trialEligible}/>
      </div>
    );
  })();

  const footer = (() => {
    if (state === "success") return (
      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={{
          all: "unset", cursor: "pointer",
          textAlign: "center", padding: "13px 16px", borderRadius: 12,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14,
          letterSpacing: "-0.005em",
        }}>Done</button>
        <button style={{
          all: "unset", cursor: "pointer", alignSelf: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--fg-subtle)", padding: "6px 8px",
        }}>Receipt sent to your email</button>
      </div>
    );
    if (showSwitcher) return null;
    if (state === "error") return (
      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <PaymentCTA tier={tier} trial={trialEligible} state="form" />
        <button style={{
          all: "unset", cursor: "pointer", alignSelf: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--fg-subtle)", padding: "6px 8px",
        }}>Save for later · email me a link</button>
      </div>
    );
    return (
      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <PaymentCTA tier={tier} trial={trialEligible} state={state}/>
        <div style={{
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, color: "var(--fg-subtle)",
          letterSpacing: "0.14em", textTransform: "uppercase",
          padding: "4px 0",
        }}>
          Cancel any time · We never see your card
        </div>
      </div>
    );
  })();

  if (variant === "mobile") {
    return (
      <SheetChrome height="84%">
        <DragHandle/>
        <PaymentHeader tier={tier} founderState={founderState} urgencyIntensity={urgencyIntensity} voluntary={voluntary} trial={trialEligible}/>
        <div style={{ flex: 1, overflow: "auto" }}>{body}</div>
        {footer}
      </SheetChrome>
    );
  }

  // desktop: centered modal
  return (
    <ModalChrome width={520}>
      <PaymentHeader tier={tier} founderState={founderState} urgencyIntensity={urgencyIntensity} voluntary={voluntary} trial={trialEligible} onClose={() => {}}/>
      <div style={{ flex: 1, overflow: "auto" }}>{body}</div>
      {footer}
    </ModalChrome>
  );
}

Object.assign(window, {
  PaymentSurface, StripeElementsSlot, TierSummaryRail, TotalsBlock,
  SwitchTierPicker, PaymentCTA, SuccessBody, ErrorBody, PaymentHeader,
});

// failure-surfaces.jsx — #782 payment failure states + challenge mounts
//
//   <FailureSurface category variant tierKey trial scaRegion/>
//        category ∈ insufficient_funds | expired_or_incorrect_card
//                 | issuer_declined | fraud_block | network_timeout
//   <ChallengeMount kind variant tierKey/>   kind ∈ "3ds" | "sca"
//   FAILURE_CONFIG       the 5-category copy map (for README / copy.ts handoff)
//
// Built on the locked chrome from monetization-payment.jsx (PaymentHeader,
// TierSummaryRail, TotalsBlock, StripeElementsSlot) + SheetChrome / ModalChrome.
//
// Voice (brief): Sour Patch, honesty side — "Your bank said no", not "Oops!".
// Color: var(--danger) for the blocking-failure messaging (never on the action
// button — the forward action stays --signal per the CTA token rule).
//
// A11y (annotated in §7): each surface is role="alertdialog" + aria-modal +
// the headline is an aria-live="assertive" region (an error is an interrupt by
// definition); focus moves to the primary action; Escape dismisses to the picker.
//
// Retry shape (brief §3, hybrid): in the ACTIVE payment flow every forward action
// resets the PaymentSurface in place (Stripe Elements re-renders). fraud_block has
// NO retry-on-same-card path. network_timeout is NOT a card problem, so it keeps
// the entered card and just re-submits.

const { MMark, MonoEyebrow, RailHeader, DragHandle, SheetChrome, ModalChrome,
        TIERS, TierBadge, getFounderState } = window;
const { TierSummaryRail, TotalsBlock, StripeElementsSlot } = window;

// ── per-category config ──────────────────────────────────────
const FAILURE_CONFIG = {
  insufficient_funds: {
    eyebrow: "CARD DECLINED",
    code: "01",
    headline: "Your bank said no.",
    body: "It came back as insufficient funds — nothing was charged. Try again, or drop in a different card.",
    primary: "Try again",
    secondary: "Use a different card",
    freshCard: true,
    note: null,
  },
  expired_or_incorrect_card: {
    eyebrow: "CARD DECLINED",
    code: "02",
    headline: "That card won't go through.",
    body: "The number, expiry, or security code didn't check out — or the card's expired. Give it another look. Nothing was charged.",
    primary: "Try again",
    secondary: "Use a different card",
    freshCard: true,
    freshEmpty: true,
    note: null,
  },
  issuer_declined: {
    eyebrow: "CARD DECLINED",
    code: "03",
    headline: "Your bank declined it.",
    body: "They don't tell us why — banks keep that to themselves. A different card usually does the trick. Nothing was charged.",
    primary: "Try a different card",
    secondary: null,
    freshCard: true,
    freshEmpty: true,
    note: null,
  },
  fraud_block: {
    // NEVER the word "fraud" in copy. No retry-on-same-card affordance.
    eyebrow: "CARD FLAGGED",
    code: "04",
    headline: "Your card got flagged for review.",
    body: "Your bank put a hold on this one — it happens, often for no real reason. Nothing was charged.",
    primary: "Try a different card",
    secondary: null,
    freshCard: true,
    freshEmpty: true,
    note: "It's worth a quick call to your bank, too.",
    noteTone: "muted",
  },
  network_timeout: {
    eyebrow: "CONNECTION HICCUP",
    code: "05",
    headline: "That didn't go through — but it's not your card.",
    body: "Something dropped between us and the payment network. Your card's fine and nothing was charged.",
    primary: "Try again",
    secondary: null,
    freshCard: false,          // not a card problem — keep what they entered
    note: "If it keeps happening, give it a minute and try again.",
    noteTone: "polite",        // aria-live="polite" auto-retry suggestion
  },
};

// ── danger status block (the error itself) ───────────────────
function FailureStatus({ cfg, headingId, descId }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 11,
      padding: "15px 15px 16px", borderRadius: 13,
      background: "color-mix(in oklch, var(--danger) 9%, var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--danger) 34%, var(--border))",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--danger)", boxShadow: "0 0 8px var(--danger)", flexShrink: 0 }}/>
        <MonoEyebrow color="var(--danger)" size={10} letterSpacing="0.16em">{cfg.eyebrow}</MonoEyebrow>
      </div>
      {/* headline is the assertive live region — it IS the interrupt */}
      <div
        id={headingId}
        aria-live="assertive"
        style={{
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1,
          color: "var(--fg)", textWrap: "balance",
        }}>{cfg.headline}</div>
      <div
        id={descId}
        style={{
          fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13,
          color: "var(--fg-muted)", lineHeight: 1.5,
        }}>{cfg.body}</div>

      {cfg.note && (
        <div
          aria-live={cfg.noteTone === "polite" ? "polite" : undefined}
          style={{
            display: "flex", alignItems: "flex-start", gap: 7,
            paddingTop: 3,
            fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 12,
            color: "var(--fg-subtle)", lineHeight: 1.45,
          }}>
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1, color: "var(--fg-subtle)" }}>
            <circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 4.2 v0.2 M7 6.4 v3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span>{cfg.note}</span>
        </div>
      )}
    </div>
  );
}

// ── failure header (danger rail + close) ─────────────────────
function FailureHeader({ cfg, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MMark size={22}/>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em", color: "var(--fg)" }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
        <div style={{ flex: 1 }}/>
        <button onClick={onClose} aria-label="Close and return to plans" style={{
          all: "unset", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--fg-muted)",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </button>
      </div>
      <RailHeader tone="muted" eyebrow="Payment · declined" code={cfg.code}/>
    </div>
  );
}

// ── retry / different-card buttons ───────────────────────────
function FailureActions({ cfg, autoFocusPrimary }) {
  return (
    <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        autoFocus={autoFocusPrimary}
        style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          width: "100%", textAlign: "center",
          padding: "14px 16px", borderRadius: 12,
          background: "var(--signal)", color: "var(--fg-on-accent)",
          fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14, letterSpacing: "-0.005em",
        }}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8 a5.5 5.5 0 1 1 -1.6 -3.9 M13.6 2.2 V4.6 H11.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>{cfg.primary}</span>
      </button>
      {cfg.secondary && (
        <button style={{
          all: "unset", cursor: "pointer", boxSizing: "border-box",
          width: "100%", textAlign: "center",
          padding: "11px 16px", borderRadius: 12,
          border: "1px solid var(--border-strong)", color: "var(--fg-muted)",
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13, letterSpacing: "-0.005em",
        }}>{cfg.secondary}</button>
      )}
      <button style={{
        all: "unset", cursor: "pointer", alignSelf: "center",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--fg-subtle)", padding: "6px 8px",
      }}>Save it for later · email me a link</button>
    </div>
  );
}

// ── shared body ──────────────────────────────────────────────
function FailureBody({ cfg, tier, trialEligible, headingId, descId }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13, padding: "8px 16px 4px" }}>
      <FailureStatus cfg={cfg} headingId={headingId} descId={descId}/>
      <TierSummaryRail tier={tier} trial={trialEligible}/>
      {cfg.freshCard ? (
        <StripeElementsSlot error={!cfg.freshEmpty}/>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "11px 13px", borderRadius: 11,
          background: "var(--surface-1)", border: "1px solid var(--border)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ color: "var(--fg-muted)", flexShrink: 0 }}>
            <rect x="2" y="5" width="12" height="8" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M2 7.5 H14" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <MonoEyebrow size={10} color="var(--fg-muted)" letterSpacing="0.06em">
            Card on file kept — we'll reuse it on retry
          </MonoEyebrow>
        </div>
      )}
      <TotalsBlock tier={tier} trial={trialEligible}/>
    </div>
  );
}

// ── FailureSurface ───────────────────────────────────────────
function FailureSurface({
  category = "insufficient_funds",
  variant = "mobile",
  tierKey = "premium",
  trial = false,
}) {
  const cfg = FAILURE_CONFIG[category] || FAILURE_CONFIG.insufficient_funds;
  const tier = TIERS.find(t => t.key === tierKey);
  const trialEligible = trial && tier?.key === "premium";
  const headingId = `fail-h-${category}-${variant}`;
  const descId = `fail-d-${category}-${variant}`;

  const dialogProps = {
    role: "alertdialog",
    "aria-modal": "true",
    "aria-labelledby": headingId,
    "aria-describedby": descId,
  };

  if (variant === "mobile") {
    return (
      <SheetChrome height="86%">
        <div {...dialogProps} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <DragHandle/>
          <FailureHeader cfg={cfg} onClose={() => {}}/>
          <div style={{ flex: 1, overflow: "auto" }}>
            <FailureBody cfg={cfg} tier={tier} trialEligible={trialEligible} headingId={headingId} descId={descId}/>
          </div>
          <FailureActions cfg={cfg} autoFocusPrimary={false}/>
        </div>
      </SheetChrome>
    );
  }
  return (
    <ModalChrome width={520}>
      <div {...dialogProps} style={{ display: "flex", flexDirection: "column", maxHeight: "inherit" }}>
        <FailureHeader cfg={cfg} onClose={() => {}}/>
        <div style={{ flex: 1, overflow: "auto" }}>
          <FailureBody cfg={cfg} tier={tier} trialEligible={trialEligible} headingId={headingId} descId={descId}/>
        </div>
        <FailureActions cfg={cfg} autoFocusPrimary={false}/>
      </div>
    </ModalChrome>
  );
}

// ── Challenge mounts (3DS / SCA) — chrome around Stripe's iframe ──
const CHALLENGE_CONFIG = {
  "3ds": {
    eyebrow: "SECURE CHECK · 3DS",
    code: "3DS",
    headline: "One quick step from your bank.",
    body: "Your bank wants to confirm it's really you. It happens in their secure window below — we never see any of it.",
  },
  "sca": {
    eyebrow: "SECURE CHECK · SCA",
    code: "SCA",
    headline: "Your bank needs a thumbs-up.",
    body: "EU rules mean your bank confirms this one directly. Approve it in their secure window below and you're set.",
  },
};

// the dashed slot that stands in for Stripe's challenge iframe
function StripeChallengeFrame() {
  return (
    <div
      role="group"
      aria-label="Secure bank verification (handled by Stripe)"
      style={{
        position: "relative", borderRadius: 12,
        background: "var(--surface-1)",
        border: "1px dashed var(--border-strong)",
        padding: "26px 18px 22px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 13,
        minHeight: 196,
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", position: "absolute", top: 11, left: 0, padding: "0 13px" }}>
        <MonoEyebrow size={9} letterSpacing="0.16em">Stripe · 3-D Secure</MonoEyebrow>
        <MonoEyebrow size={9} letterSpacing="0.16em" color="var(--fg-subtle)">your bank's window</MonoEyebrow>
      </div>
      {/* lock + spinner */}
      <div style={{ position: "relative", width: 54, height: 54, marginTop: 6 }}>
        <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true" style={{ position: "absolute", inset: 0, animation: "mPaySpin 1.1s linear infinite", color: "var(--signal)" }}>
          <circle cx="27" cy="27" r="23" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.18"/>
          <path d="M50 27 A23 23 0 0 0 27 4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--signal)" }}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <rect x="5" y="9.5" width="12" height="8.5" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M7.4 9.5 V7 a3.6 3.6 0 0 1 7.2 0 V9.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        </div>
      </div>
      <div style={{ fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
        Waiting for your bank…
      </div>
      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em">
        Stripe renders this · Concert Crawl never sees it
      </MonoEyebrow>
    </div>
  );
}

function ChallengeMount({ kind = "3ds", variant = "mobile", tierKey = "premium" }) {
  const cfg = CHALLENGE_CONFIG[kind] || CHALLENGE_CONFIG["3ds"];
  const tier = TIERS.find(t => t.key === tierKey);
  const headingId = `chal-h-${kind}-${variant}`;
  const descId = `chal-d-${kind}-${variant}`;

  const header = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 4px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MMark size={22}/>
        <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em", color: "var(--fg)" }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
        <div style={{ flex: 1 }}/>
        <button aria-label="Cancel verification and return" style={{ all: "unset", cursor: "pointer", padding: 8, borderRadius: 8, color: "var(--fg-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
        </button>
      </div>
      <RailHeader tone="signal" eyebrow={cfg.eyebrow} code={cfg.code}/>
      <div id={headingId} style={{ fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 23, letterSpacing: "-0.03em", color: "var(--fg)", marginTop: 2, lineHeight: 1.1, textWrap: "balance" }}>
        {cfg.headline}
      </div>
    </div>
  );

  const body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 13, padding: "6px 16px 4px" }}>
      <div id={descId} style={{ fontFamily: "Inter, system-ui", fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>
        {cfg.body}
      </div>
      <StripeChallengeFrame/>
      <TierSummaryRail tier={tier}/>
    </div>
  );

  const footer = (
    <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <MonoEyebrow size={10} color="var(--fg-subtle)" letterSpacing="0.12em">
        Don't close this window — it'll finish on its own
      </MonoEyebrow>
      <button style={{
        all: "unset", cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--fg-subtle)", padding: "6px 8px",
      }}>Cancel payment</button>
    </div>
  );

  const dialogProps = { role: "dialog", "aria-modal": "true", "aria-labelledby": headingId, "aria-describedby": descId };

  if (variant === "mobile") {
    return (
      <SheetChrome height="80%">
        <div {...dialogProps} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <DragHandle/>
          {header}
          <div style={{ flex: 1, overflow: "auto" }}>{body}</div>
          {footer}
        </div>
      </SheetChrome>
    );
  }
  return (
    <ModalChrome width={500}>
      <div {...dialogProps} style={{ display: "flex", flexDirection: "column", maxHeight: "inherit" }}>
        {header}
        <div style={{ flex: 1, overflow: "auto" }}>{body}</div>
        {footer}
      </div>
    </ModalChrome>
  );
}

Object.assign(window, { FailureSurface, ChallengeMount, FAILURE_CONFIG, CHALLENGE_CONFIG });

// code-entry.jsx — Invite code redemption screen (mobile + desktop)
// The literal "auth gate" step. User has clicked "I have a code →" from
// the landing page and lands here BEFORE Clerk authentication.
//
// Flow:  Landing  →  Code Entry  →  Clerk signup/login  →  Browse
//
// Code shape:  BETA-XXXX-XXXX  (alphanumeric, 8 chars after BETA-)
// e.g.  BETA-3C41-8BC0
//
// States:
//   "empty"      — fresh load, mask placeholder visible
//   "typing"     — partial entry, no error yet
//   "invalid"    — format wrong (too short / non-alphanum chars)
//   "submitting" — POSTing to validation endpoint
//   "valid"      — code accepted, brief celebratory state before routing to Clerk
//   "used"       — code already redeemed
//   "expired"    — code expired
//   "notfound"   — code doesn't exist
//   "ratelimit"  — too many bad attempts
//
// Exposes: window.CodeEntryMobile, window.CodeEntryDesktop

const ccTokenVarsCE = window.ccTokenVars;
const FormFieldCE = window.LandingFormField;
const PrimaryCTACE = ({ onClick, children, fullWidth = false, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{
    all: "unset", cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "center",
    boxSizing: "border-box",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, height: 52, padding: "0 22px",
    width: fullWidth ? "100%" : "auto",
    maxWidth: "100%", minWidth: 0,
    whiteSpace: "nowrap",
    background: disabled ? "var(--surface-2)" : "var(--signal)",
    color: disabled ? "var(--fg-subtle)" : "var(--fg-on-accent)",
    borderRadius: 10,
    fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16,
    letterSpacing: "-0.01em",
    boxShadow: disabled ? "none" : "0 12px 32px -12px var(--signal)",
    opacity: disabled ? 0.7 : 1,
    transition: "background 0.15s, opacity 0.15s",
  }}>{children}</button>
);

// ── Code formatting helpers ──────────────────────────────────────
// Strip non-alphanumerics, uppercase, then chunk into BETA-XXXX-XXXX.
function formatCodeInput(raw) {
  const cleaned = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Detect & strip a leading BETA prefix the user may have typed.
  const body = cleaned.startsWith("BETA") ? cleaned.slice(4) : cleaned;
  const chunk1 = body.slice(0, 4);
  const chunk2 = body.slice(4, 8);
  if (!chunk1) return "";
  if (!chunk2) return `BETA-${chunk1}`;
  return `BETA-${chunk1}-${chunk2}`;
}

// Returns true if the formatted code is structurally complete + valid format.
function isCodeComplete(code) {
  return /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

// Returns true if user has typed enough to be in "invalid format" territory
// (currently: typed 12+ chars but still doesn't match — e.g. they typed
// special chars we stripped, or it's malformed somehow). Since formatCodeInput
// auto-cleans, structural invalidity is rare; we only show invalid if the user
// has the right chars but wrong shape, or the parent forces it.
function isFormatInvalid(code) {
  if (!code) return false;
  const onlyBody = code.replace(/^BETA-/, "").replace(/-/g, "");
  // Fewer than 8 alphanumeric chars after BETA = still typing, not invalid.
  // 8+ chars but not matching = invalid.
  return onlyBody.length === 8 && !isCodeComplete(code);
}

// ── Status banner (used for error states) ────────────────────────
function StatusBanner({ tone = "danger", title, body }) {
  const colors = {
    danger:  { bg: "rgba(255,122,138,0.10)", border: "rgba(255,122,138,0.40)", icon: "var(--danger)",  iconChar: "!" },
    warning: { bg: "rgba(255,210,122,0.10)", border: "rgba(255,210,122,0.40)", icon: "var(--warning)", iconChar: "!" },
    info:    { bg: "rgba(122,230,255,0.08)", border: "rgba(122,230,255,0.30)", icon: "var(--signal)",  iconChar: "i" },
  };
  const c = colors[tone];
  return (
    <div style={{
      display: "flex", gap: 12,
      padding: "12px 14px",
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, flexShrink: 0,
        background: c.icon, color: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 13,
      }}>{c.iconChar}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
          color: "var(--fg)", letterSpacing: "-0.005em",
          marginBottom: 2,
        }}>{title}</div>
        <div style={{
          fontFamily: "Inter, system-ui", fontSize: 12.5,
          color: "var(--fg-muted)", lineHeight: 1.4,
        }}>{body}</div>
      </div>
    </div>
  );
}

// ── Big code input — monospace, fat, mask-styled ─────────────────
function CodeInput({ value, onChange, error = false, disabled = false, autoFocus = false }) {
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 80);
    }
  }, [autoFocus]);

  const placeholder = "BETA-XXXX-XXXX";

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(formatCodeInput(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={14}  // BETA-XXXX-XXXX = 14 chars
        style={{
          width: "100%", boxSizing: "border-box",
          height: 64,
          padding: "0 18px",
          background: disabled ? "var(--surface-2)" : "var(--surface-1)",
          border: `1.5px solid ${error ? "var(--danger)" : "var(--border-strong)"}`,
          borderRadius: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--fg)",
          outline: "none",
          textTransform: "uppercase",
          textAlign: "center",
          transition: "border-color 0.15s",
        }}
        onFocus={e => {
          if (!error) e.currentTarget.style.borderColor = "var(--border-focus)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? "var(--danger)" : "var(--border-strong)";
        }}
      />
    </div>
  );
}

// ── Helper text below the input ──────────────────────────────────
function CodeHelper({ state, attemptsLeft = null }) {
  if (state === "invalid") {
    return (
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: "var(--danger)", letterSpacing: "0.04em",
      }}>Codes look like BETA-XXXX-XXXX</span>
    );
  }
  if (state === "ratelimit") {
    return (
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
        color: "var(--warning)", letterSpacing: "0.04em",
      }}>Too many tries. Wait 5 min and try again.</span>
    );
  }
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      color: "var(--fg-subtle)", letterSpacing: "0.04em",
    }}>Letters and digits only · auto-formatted as you type</span>
  );
}

// ── State → presentation mapping ────────────────────────────────
function presentForState(state, code) {
  // Returns: { error, banner, ctaLabel, ctaDisabled, ctaTone }
  switch (state) {
    case "empty":
      return { error: false, banner: null, ctaLabel: "Continue", ctaDisabled: true, ctaTone: "default" };
    case "typing":
      return { error: false, banner: null, ctaLabel: "Continue", ctaDisabled: !isCodeComplete(code), ctaTone: "default" };
    case "invalid":
      return {
        error: true, banner: null,
        ctaLabel: "Continue", ctaDisabled: true, ctaTone: "default",
      };
    case "submitting":
      return {
        error: false, banner: null,
        ctaLabel: "Checking…", ctaDisabled: true, ctaTone: "submitting",
      };
    case "valid":
      return {
        error: false,
        banner: { tone: "info", title: "Code accepted", body: "Sending you to sign-in… you can use Google or email." },
        ctaLabel: "Continue to sign-in", ctaDisabled: false, ctaTone: "valid",
      };
    case "used":
      return {
        error: true,
        banner: { tone: "danger", title: "Code already redeemed", body: "This code was used to set up another account. If that wasn't you, contact us." },
        ctaLabel: "Try another code", ctaDisabled: true, ctaTone: "default",
      };
    case "expired":
      return {
        error: true,
        banner: { tone: "warning", title: "Code expired", body: "Invite codes are good for 30 days. Hop on the waitlist for a fresh one." },
        ctaLabel: "Try another code", ctaDisabled: true, ctaTone: "default",
      };
    case "notfound":
      return {
        error: true,
        banner: { tone: "danger", title: "We don't recognize that code", body: "Double-check for typos. Codes are 8 characters after BETA-." },
        ctaLabel: "Try again", ctaDisabled: true, ctaTone: "default",
      };
    case "ratelimit":
      return {
        error: true,
        banner: { tone: "warning", title: "Too many attempts", body: "We've paused entry for 5 minutes to prevent guessing. Take a breath, then try again." },
        ctaLabel: "Try again later", ctaDisabled: true, ctaTone: "default",
      };
    default:
      return { error: false, banner: null, ctaLabel: "Continue", ctaDisabled: true, ctaTone: "default" };
  }
}

// ── Inner content (shared between mobile & desktop) ──────────────
function CodeEntryContent({ state, code, setCode, onSubmit, onBack, onJoinWaitlist, dense = false }) {
  const present = presentForState(state, code);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: dense ? 18 : 22 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "var(--signal)", letterSpacing: "0.14em",
          textTransform: "uppercase", fontWeight: 700,
        }}>Step 1 of 2 · Invite code</div>
        <h1 style={{
          margin: 0,
          fontFamily: "Inter, system-ui", fontWeight: 900,
          fontSize: dense ? 28 : 34, letterSpacing: "-0.03em",
          lineHeight: 1.05,
          textWrap: "balance",
        }}>
          Got a code?<br/>
          <span style={{ color: "var(--accent)" }}>Drop it in.</span>
        </h1>
        <p style={{
          margin: 0,
          fontFamily: "Inter, system-ui", fontSize: 14.5,
          color: "var(--fg-muted)", lineHeight: 1.45,
          textWrap: "pretty",
        }}>
          We're invite-only during the beta. After your code clears, you'll
          finish sign-in with email or Google.
        </p>
      </div>

      {/* Input + helper */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <CodeInput
          value={code}
          onChange={setCode}
          error={present.error}
          disabled={state === "submitting" || state === "ratelimit"}
          autoFocus
        />
        <div style={{ paddingLeft: 4 }}>
          <CodeHelper state={state} />
        </div>
      </div>

      {/* Banner (used / expired / notfound / valid / ratelimit) */}
      {present.banner && (
        <StatusBanner
          tone={present.banner.tone}
          title={present.banner.title}
          body={present.banner.body}
        />
      )}

      {/* CTA */}
      <PrimaryCTACE
        fullWidth
        disabled={present.ctaDisabled || state === "submitting"}
        onClick={onSubmit}
      >
        {state === "submitting" ? (
          <>
            <Spinner /> Checking…
          </>
        ) : present.ctaLabel}
      </PrimaryCTACE>

      {/* Footer links */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12,
        paddingTop: 8,
      }}>
        <button onClick={onJoinWaitlist} style={{
          all: "unset", cursor: "pointer", textAlign: "center",
          fontFamily: "Inter, system-ui", fontSize: 13.5,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>
          Don't have a code? <span style={{
            color: "var(--signal)", fontWeight: 700,
            textDecoration: "underline", textDecorationColor: "var(--border-strong)",
            textUnderlineOffset: 3,
          }}>Join the waitlist</span>
        </button>
        <button onClick={onBack} style={{
          all: "unset", cursor: "pointer", textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "var(--fg-subtle)", letterSpacing: "0.10em",
          textTransform: "uppercase", fontWeight: 700,
        }}>
          ← Back to landing
        </button>
      </div>
    </div>
  );
}

// Tiny spinner for submitting state
function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: "ce-spin 0.8s linear infinite" }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25"/>
      <path d="M8 2 a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <style>{`@keyframes ce-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ============================================================
// CODE ENTRY — MOBILE  (393×852)
// ============================================================
function CodeEntryMobile({
  theme = "electric",
  initialState = "empty",
  initialCode = "",
  onBack = () => {},
  onJoinWaitlist = () => {},
}) {
  const [state, setState] = React.useState(initialState);
  const [code, setCode] = React.useState(initialCode);

  React.useEffect(() => { setState(initialState); }, [initialState]);
  React.useEffect(() => { setCode(initialCode); }, [initialCode]);

  // Live transitions: as user types, reset error states on input change.
  React.useEffect(() => {
    if (["used", "expired", "notfound"].includes(state) && code === "") {
      setState("empty");
    }
  }, [code, state]);

  const handleSubmit = () => {
    if (!isCodeComplete(code)) {
      setState("invalid");
      return;
    }
    setState("submitting");
    // In a real app, this would POST to validation. Mock:
    setTimeout(() => setState("valid"), 1200);
  };

  return (
    <div style={{
      ...ccTokenVarsCE(theme),
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Top chrome — mark + back chevron */}
      <div style={{
        flexShrink: 0,
        padding: "20px 22px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={onBack} style={{
          all: "unset", cursor: "pointer",
          width: 36, height: 36, borderRadius: 18,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg)",
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {window.CCClusterMark && <window.CCClusterMark size={22} color="var(--signal)" glow="var(--accent)" />}
          {window.CCWordmark && <window.CCWordmark size={16} />}
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Body — vertically centered per design feedback */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 22px 28px",
        boxSizing: "border-box",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <CodeEntryContent
          state={state}
          code={code}
          setCode={(c) => { setCode(c); if (state !== "submitting") setState("typing"); }}
          onSubmit={handleSubmit}
          onBack={onBack}
          onJoinWaitlist={onJoinWaitlist}
        />
      </div>
    </div>
  );
}

// ============================================================
// CODE ENTRY — DESKTOP  (≥1240px)
// Centered card on a dim background. Same content, different chrome.
// ============================================================
function CodeEntryDesktop({
  theme = "electric",
  initialState = "empty",
  initialCode = "",
  onBack = () => {},
  onJoinWaitlist = () => {},
}) {
  const [state, setState] = React.useState(initialState);
  const [code, setCode] = React.useState(initialCode);

  React.useEffect(() => { setState(initialState); }, [initialState]);
  React.useEffect(() => { setCode(initialCode); }, [initialCode]);

  React.useEffect(() => {
    if (["used", "expired", "notfound"].includes(state) && code === "") {
      setState("empty");
    }
  }, [code, state]);

  const handleSubmit = () => {
    if (!isCodeComplete(code)) {
      setState("invalid");
      return;
    }
    setState("submitting");
    setTimeout(() => setState("valid"), 1200);
  };

  return (
    <div style={{
      ...ccTokenVarsCE(theme),
      width: "100%", minHeight: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Faint poster watermark in background — using same poster mark */}
      <div style={{
        position: "absolute", top: -80, right: -80, width: 360, height: 360,
        opacity: 0.08, pointerEvents: "none",
        transform: "rotate(-12deg)",
      }}>
        {window.CCClusterMark && <window.CCClusterMark size={360} color="var(--accent)" glow="var(--signal)" />}
      </div>

      {/* Top chrome */}
      <header style={{
        flexShrink: 0, position: "relative", zIndex: 1,
        padding: "22px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={onBack} style={{
          all: "unset", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8,
          fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
          color: "var(--fg-muted)", letterSpacing: "-0.005em",
        }}>
          <svg width="13" height="13" viewBox="0 0 16 16">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          Back to landing
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {window.CCClusterMark && <window.CCClusterMark size={28} color="var(--signal)" glow="var(--accent)" />}
          {window.CCWordmark && <window.CCWordmark size={20} />}
        </div>
        {window.BetaPill && <window.BetaPill />}
      </header>

      {/* Centered card */}
      <main style={{
        flex: 1, position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 32px 60px",
      }}>
        <div style={{
          width: "100%", maxWidth: 480,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          padding: "36px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
        }}>
          <CodeEntryContent
            state={state}
            code={code}
            setCode={(c) => { setCode(c); if (state !== "submitting") setState("typing"); }}
            onSubmit={handleSubmit}
            onBack={onBack}
            onJoinWaitlist={onJoinWaitlist}
            dense
          />
        </div>
      </main>
    </div>
  );
}

window.CodeEntryMobile = CodeEntryMobile;
window.CodeEntryDesktop = CodeEntryDesktop;
window.formatCodeInput = formatCodeInput;
window.isCodeComplete = isCodeComplete;

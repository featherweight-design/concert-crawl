// feedback-modal.jsx — Concert Crawl in-app feedback surface
//
// MOBILE: bottom sheet (~85% viewport)
// DESKTOP: centered modal card (520 × 640)
//
// Single component — <FeedbackSurface variant="mobile|desktop" state="..."/>
// — that renders every state we ship:
//
//   "form"       default empty form
//   "filled"     same form with values typed in (canvas fixture state)
//   "validate"   validation errors visible (no category, empty body)
//   "loading"    submitting — content disabled, button shows spinner
//   "success"    Hybrid empty-state pattern, voice-matched
//   "error"      submission failed; offer retry or save-for-later
//   "offline"    proactive offline rail; submit replaced w/ "Save for later"
//
// FIELDS (per founder direction)
//   • category   chips (Bug · Idea · Praise · Other), single-select, REQUIRED
//   • body       free-text textarea, REQUIRED, no length cap shown
//   • screenshot optional — dashed slot, single attach, can remove
//   • auto-context (route / theme / build / device) — silent capture,
//     shown via collapsible "what we'll send" disclosure for transparency
//
// NOT INCLUDED (intentionally)
//   • email field — we already have it from Clerk
//   • severity / urgency — Hugh decides on his end
//   • email-to-Hugh affordance — out of scope per founder
//
// VOICE
//   Mixes the empty-state Hybrid voice ("Crickets." / "Signal lost.") with
//   the YoureIn rail pattern ("BETA CHANNEL · ALWAYS OPEN"). Headline is
//   playful + clear; body stays transactional.
//
// EXPORTS
//   <FeedbackSurface .../>, <FeedbackHeaderRail/>, <CategoryChips/>,
//   <ContextDisclosure/>, FB_SAMPLE_CONTEXT

const FB_CATEGORIES = [
  { key: "bug",    label: "Bug",    hint: "Something's broken." },
  { key: "idea",   label: "Idea",   hint: "Wish it did this." },
  { key: "praise", label: "Praise", hint: "Loved a thing." },
  { key: "other",  label: "Other",  hint: "Anything else." },
];

const FB_SAMPLE_CONTEXT = {
  route:  "/event/sleep-token-fillmore",
  theme:  "electric",
  build:  "v0.4.2-beta · 5e9c1a3",
  device: "iPhone 14 Pro · iOS 17.6",
  user:   "you@example.com",
};

// ── Local Cluster Path mark — copy of CCMark in browse-home.jsx ─────
// Kept identical (CLAUDE.md). Sized down for header use.
function FBMark({ size = 22 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" fill="var(--bg)" rx="16" />
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22" />
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42" />
      <circle cx="72" cy="24" r="7"  fill="var(--signal)" />
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill="var(--signal)" opacity={0.35 + i * 0.09} />
      ))}
    </svg>
  );
}

// ── Status rail ────────────────────────────────────────────────
// Mirrors empty-state Hybrid + YoureIn rail. Dot + eyebrow + hairline + status code.
function FeedbackHeaderRail({ tone = "open", code }) {
  const accent = tone === "error"   ? "var(--warning)"
              : tone === "offline"  ? "var(--fg-subtle)"
              : tone === "success"  ? "var(--signal)"
              : "var(--accent)"; // open / form
  const eyebrow = tone === "error"   ? "Beta channel · stalled"
                : tone === "offline" ? "Beta channel · offline"
                : tone === "success" ? "Got it · beta channel"
                : "Beta channel · always open";
  const right = code !== undefined ? code
              : tone === "error"   ? "ERR"
              : tone === "offline" ? "OFF"
              : tone === "success" ? "SENT"
              : "OPEN";
  const pulse = tone === "open" || tone === "loading";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <span style={{
        width: 6, height: 6, borderRadius: 6, background: accent, flexShrink: 0,
        boxShadow: pulse ? `0 0 8px ${accent}` : "none",
        animation: pulse ? "fbPulse 1.6s ease-in-out infinite" : "none",
      }}/>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, color: accent,
        letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
        whiteSpace: "nowrap",
      }}>{eyebrow}</div>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, color: "var(--fg-subtle)",
        letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
      }}>{right}</div>
    </div>
  );
}

// Pulse keyframe injection (one-time, idempotent).
if (typeof document !== "undefined" && !document.getElementById("fb-keyframes")) {
  const s = document.createElement("style");
  s.id = "fb-keyframes";
  s.textContent = `
    @keyframes fbPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
    @keyframes fbSpin  { to { transform: rotate(360deg); } }
    .fb-textarea::placeholder { color: var(--fg-subtle); }
    .fb-textarea:focus { border-color: var(--border-focus); }
  `;
  document.head.appendChild(s);
}

// ── Category chips ─────────────────────────────────────────────
function CategoryChips({ value, onChange, error = false, disabled = false }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      opacity: disabled ? 0.55 : 1,
    }}>
      {FB_CATEGORIES.map(c => {
        const active = value === c.key;
        const borderColor = active
          ? "var(--signal)"
          : error
            ? "var(--warning)"
            : "var(--border-strong)";
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => !disabled && onChange?.(c.key)}
            style={{
              all: "unset",
              cursor: disabled ? "default" : "pointer",
              padding: "7px 12px",
              borderRadius: 999,
              fontFamily: "Inter, system-ui",
              fontWeight: 700,
              fontSize: 12.5,
              letterSpacing: "-0.005em",
              background: active ? "var(--signal)" : "transparent",
              color: active ? "var(--fg-on-accent)" : "var(--fg)",
              border: `1.5px solid ${borderColor}`,
              transition: "background .12s, color .12s, border-color .12s",
            }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Field label (eyebrow style) ────────────────────────────────
function FBLabel({ children, error = false }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, fontWeight: 700,
      color: error ? "var(--warning)" : "var(--fg-subtle)",
      letterSpacing: "0.14em", textTransform: "uppercase",
      marginBottom: 8,
    }}>{children}</div>
  );
}

function FBHelp({ children, tone = "muted" }) {
  const c = tone === "error" ? "var(--warning)" : "var(--fg-subtle)";
  return (
    <div style={{
      fontFamily: "Inter, system-ui",
      fontSize: 12, color: c,
      marginTop: 6, letterSpacing: "-0.005em",
      lineHeight: 1.4,
    }}>{children}</div>
  );
}

// ── Textarea ───────────────────────────────────────────────────
function FBTextarea({ value, onChange, placeholder, error = false, disabled = false, rows = 5 }) {
  return (
    <textarea
      className="fb-textarea"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "12px 14px",
        background: "var(--surface-1)",
        color: "var(--fg)",
        border: `1px solid ${error ? "var(--warning)" : "var(--border-strong)"}`,
        borderRadius: 10,
        fontFamily: "Inter, system-ui",
        fontSize: 14,
        lineHeight: 1.5,
        letterSpacing: "-0.005em",
        resize: "vertical",
        outline: "none",
        opacity: disabled ? 0.6 : 1,
        transition: "border-color .12s",
      }}
    />
  );
}

// ── Screenshot slot ─────────────────────────────────────────────
// Two states: empty (dashed slot) and filled (thumbnail + meta + remove).
function ScreenshotSlot({ filled = false, onAttach, onRemove, disabled = false, mock }) {
  if (filled) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
      }}>
        {/* mock thumbnail — striped placeholder representing a shot of the page */}
        <div style={{
          width: 48, height: 64, borderRadius: 6, flexShrink: 0,
          background: `repeating-linear-gradient(135deg, var(--surface-3) 0 6px, var(--surface-2) 6px 12px)`,
          border: "1px solid var(--border-strong)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.18) 100%)",
          }}/>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{
            fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 700,
            color: "var(--fg)", letterSpacing: "-0.005em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{mock?.name || "screen-2026-05-09-103122.png"}</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "var(--fg-subtle)", letterSpacing: "0.06em",
          }}>{mock?.size || "142 kb"} · attached</div>
        </div>
        <button type="button" onClick={onRemove} disabled={disabled} style={{
          all: "unset", cursor: disabled ? "default" : "pointer",
          width: 28, height: 28, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--fg-muted)", border: "1px solid var(--border)",
        }} aria-label="Remove screenshot">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={onAttach} disabled={disabled} style={{
      all: "unset", cursor: disabled ? "default" : "pointer",
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 14px", width: "100%", boxSizing: "border-box",
      background: "transparent",
      border: "1.5px dashed var(--border-strong)",
      borderRadius: 10,
      color: "var(--fg-muted)",
      fontFamily: "Inter, system-ui", fontSize: 13, fontWeight: 600,
      letterSpacing: "-0.005em",
      opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 7,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-2)", color: "var(--signal)",
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5.5 3.5l1-1.2h3l1 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
        <span style={{ color: "var(--fg)", fontSize: 13, fontWeight: 700 }}>Attach a screenshot</span>
        <span style={{ color: "var(--fg-subtle)", fontSize: 11.5, fontWeight: 500, letterSpacing: 0 }}>
          Optional · helps a lot
        </span>
      </span>
    </button>
  );
}

// ── Context disclosure ────────────────────────────────────────
// Collapsible row showing what we silently attach. Expanded by default in
// the canvas so reviewers can see the contract.
function ContextDisclosure({ ctx = FB_SAMPLE_CONTEXT, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const rows = [
    { k: "Route",  v: ctx.route },
    { k: "Theme",  v: ctx.theme },
    { k: "Build",  v: ctx.build },
    { k: "Device", v: ctx.device },
    { k: "User",   v: ctx.user },
  ];
  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 10,
      background: "var(--surface-1)",
      overflow: "hidden",
    }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        all: "unset", cursor: "pointer",
        width: "100%", boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 12px",
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{
          color: "var(--fg-muted)",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .15s",
          flexShrink: 0,
        }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--fg-muted)",
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>Auto-attached · what we'll send</span>
        <span style={{ flex: 1 }}/>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 700,
          color: "var(--fg-subtle)",
          letterSpacing: "0.10em",
        }}>{rows.length} fields</span>
      </button>
      {open && (
        <div style={{
          padding: "4px 12px 12px",
          display: "flex", flexDirection: "column", gap: 6,
          borderTop: "1px solid var(--border)",
        }}>
          {rows.map(r => (
            <div key={r.k} style={{
              display: "grid", gridTemplateColumns: "60px 1fr",
              gap: 10, alignItems: "baseline",
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 700,
                color: "var(--fg-subtle)",
                letterSpacing: "0.10em", textTransform: "uppercase",
              }}>{r.k}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11, fontWeight: 600,
                color: "var(--fg)",
                letterSpacing: "0.01em",
                wordBreak: "break-all",
                lineHeight: 1.4,
              }}>{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submit button ──────────────────────────────────────────────
function FBSubmit({ children, onClick, disabled = false, loading = false, tone = "primary", fullWidth = true }) {
  const isPrimary = tone === "primary";
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} style={{
      all: "unset",
      cursor: (disabled || loading) ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 48, padding: "0 22px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", boxSizing: "border-box",
      background: isPrimary ? "var(--signal)" : "transparent",
      color: isPrimary ? "var(--fg-on-accent)" : "var(--fg)",
      borderRadius: 10,
      border: isPrimary ? "none" : "1px solid var(--border-strong)",
      fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5,
      letterSpacing: "-0.005em",
      whiteSpace: "nowrap",
      boxShadow: isPrimary && !disabled && !loading ? "0 12px 32px -16px var(--signal)" : "none",
      opacity: disabled ? 0.55 : 1,
      transition: "opacity .12s, transform .12s",
    }}>
      {loading && (
        <span style={{
          width: 14, height: 14, borderRadius: "50%",
          border: "1.6px solid currentColor",
          borderTopColor: "transparent",
          animation: "fbSpin 0.8s linear infinite",
        }}/>
      )}
      <span>{children}</span>
    </button>
  );
}

function FBSecondary({ children, onClick, fullWidth = true }) {
  return (
    <button type="button" onClick={onClick} style={{
      all: "unset", cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, height: 44, padding: "0 16px",
      width: fullWidth ? "100%" : "auto",
      maxWidth: "100%", boxSizing: "border-box",
      background: "transparent",
      color: "var(--fg-muted)",
      borderRadius: 10,
      fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13,
      letterSpacing: "-0.005em",
      textAlign: "center",
    }}>{children}</button>
  );
}

// ── State-specific bodies (success / error / offline-confirm) ──
function HybridStatus({ tone, eyebrow, title, body, primary, secondary }) {
  const accent = tone === "error" ? "var(--warning)"
              : tone === "success" ? "var(--signal)"
              : "var(--fg-subtle)";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: 14, padding: "8px 0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: accent, flexShrink: 0 }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: accent,
          letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700,
          whiteSpace: "nowrap",
        }}>{eyebrow}</div>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "var(--fg-subtle)",
          letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700,
        }}>{tone === "error" ? "ERR · 503" : tone === "success" ? "200 · OK" : "QUEUED"}</div>
      </div>
      <div style={{
        fontSize: 30, fontWeight: 900,
        letterSpacing: "-0.035em", lineHeight: 1.0,
        color: "var(--fg)", textWrap: "balance",
        marginTop: 2,
      }}>{title}</div>
      <div style={{
        fontSize: 14, color: "var(--fg-muted)",
        lineHeight: 1.55, letterSpacing: "-0.005em",
        textWrap: "pretty",
      }}>{body}</div>
      <div style={{
        display: "flex", flexDirection: "column", gap: 6,
        marginTop: 4,
      }}>
        {primary && <FBSubmit onClick={primary.onClick}>{primary.label}</FBSubmit>}
        {secondary && <FBSecondary onClick={secondary.onClick}>{secondary.label}</FBSecondary>}
      </div>
    </div>
  );
}

// ── Form body — all "filled-out" states share this layout ──────
function FormBody({
  state = "form",
  values = {},
  errors = {},
  ctx = FB_SAMPLE_CONTEXT,
  showContextOpen = true,
}) {
  const disabled = state === "loading" || state === "offline-saving";
  const showCatErr  = !!errors.category;
  const showBodyErr = !!errors.body;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{
          margin: 0,
          fontFamily: "Inter, system-ui",
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: "-0.035em",
          lineHeight: 1.0,
          color: "var(--fg)",
          textWrap: "balance",
        }}>Holler at us.</h1>
        <p style={{
          margin: 0,
          fontFamily: "Inter, system-ui",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--fg-muted)",
          letterSpacing: "-0.005em",
          textWrap: "pretty",
        }}>Bug, idea, or praise. We read all of it — usually within a couple days.</p>
      </div>

      {/* Category */}
      <div>
        <FBLabel error={showCatErr}>What kind?</FBLabel>
        <CategoryChips
          value={values.category}
          onChange={() => {}}
          error={showCatErr}
          disabled={disabled}
        />
        {showCatErr && (
          <FBHelp tone="error">Pick a vibe so we know how to read this.</FBHelp>
        )}
      </div>

      {/* Body */}
      <div>
        <FBLabel error={showBodyErr}>What's up?</FBLabel>
        <FBTextarea
          value={values.body || ""}
          onChange={() => {}}
          placeholder="What did you see? What did you expect? Anything that helps us reproduce it."
          error={showBodyErr}
          disabled={disabled}
        />
        {showBodyErr && (
          <FBHelp tone="error">Don't leave us hanging — give us a sentence.</FBHelp>
        )}
      </div>

      {/* Screenshot */}
      <div>
        <FBLabel>Proof (optional)</FBLabel>
        <ScreenshotSlot
          filled={values.screenshot === "filled"}
          mock={values.screenshotMock}
          disabled={disabled}
        />
      </div>

      {/* Auto-context */}
      <ContextDisclosure ctx={ctx} defaultOpen={showContextOpen}/>
    </div>
  );
}

// ── The actual surface — wraps body in mobile sheet OR desktop card ──
function FeedbackSurface({
  variant = "mobile",
  state = "form",
  values,
  errors,
  ctx = FB_SAMPLE_CONTEXT,
  showContextOpen = false,
  pageBehind, // optional ReactNode rendered dimmed behind the sheet (mobile only)
}) {
  // Default fixtures per state for canvas display.
  const fixtures = React.useMemo(() => {
    switch (state) {
      case "form":     return { values: {}, errors: {} };
      case "filled":   return {
        values: {
          category: "bug",
          body: "Tapped a price chip on the Sleep Token detail page and nothing happens — chip flashes but the source link never opens. Happens every time. iPhone 14 Pro, latest beta.",
          screenshot: "filled",
          screenshotMock: { name: "screen-IMG_4421.png", size: "284 kb" },
        },
        errors: {},
      };
      case "validate": return {
        values: { body: "" },
        errors: { category: true, body: true },
      };
      case "loading": return {
        values: {
          category: "bug",
          body: "Tapped a price chip on the Sleep Token detail page and nothing happens — chip flashes but the source link never opens.",
          screenshot: "filled",
          screenshotMock: { name: "screen-IMG_4421.png", size: "284 kb" },
        },
        errors: {},
      };
      default: return { values: {}, errors: {} };
    }
  }, [state]);

  const v = values || fixtures.values;
  const er = errors || fixtures.errors;

  // ── Footer per state ─────────────────────────────────────────
  const footer = (() => {
    if (state === "loading") {
      return <FBSubmit loading disabled>Sending…</FBSubmit>;
    }
    if (state === "offline") {
      return <FBSubmit>Save for later</FBSubmit>;
    }
    return <FBSubmit>Send →</FBSubmit>;
  })();

  // ── Body per state ──────────────────────────────────────────
  const body = (() => {
    if (state === "success") {
      return (
        <HybridStatus
          tone="success"
          eyebrow="Got it · beta channel"
          title={<>Loud and clear.</>}
          body={<>Your message is in the queue. We read everything — Hugh especially. Don't expect a reply unless we need more from you.</>}
          primary={{ label: "Back to the show", onClick: () => {} }}
          secondary={{ label: "Send another", onClick: () => {} }}
        />
      );
    }
    if (state === "error") {
      return (
        <HybridStatus
          tone="error"
          eyebrow="Didn't send · beta channel"
          title={<>Signal lost.</>}
          body={<>We couldn't push that to the queue just now. Your message is saved on this device — try again in a sec, or send it later.</>}
          primary={{ label: "Try again", onClick: () => {} }}
          secondary={{ label: "Save and come back", onClick: () => {} }}
        />
      );
    }
    if (state === "offline") {
      // proactive offline rail above the form — submit button below replaced
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            padding: "10px 12px",
            background: "var(--surface-1)",
            border: "1px dashed var(--border-strong)",
            borderRadius: 10,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700,
              color: "var(--fg-muted)", letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--fg-subtle)" }}/>
              Offline · we'll send when you're back
            </div>
            <div style={{
              fontFamily: "Inter, system-ui", fontSize: 13, color: "var(--fg)",
              letterSpacing: "-0.005em", lineHeight: 1.5,
            }}>
              Type it now. We'll hold onto it locally and push as soon as the
              signal's back.
            </div>
          </div>
          <FormBody state={state} values={v} errors={er} ctx={ctx} showContextOpen={showContextOpen}/>
        </div>
      );
    }
    return <FormBody state={state} values={v} errors={er} ctx={ctx} showContextOpen={showContextOpen}/>;
  })();

  if (variant === "desktop") {
    return (
      <DesktopShell state={state} body={body} footer={footer} pageBehind={pageBehind}/>
    );
  }
  return <MobileShell state={state} body={body} footer={footer} pageBehind={pageBehind}/>;
}

// ── Mobile bottom sheet shell ──────────────────────────────────
function MobileShell({ state, body, footer, pageBehind }) {
  const tone = state === "success" ? "success"
            : state === "error"   ? "error"
            : state === "offline" ? "offline"
            : "open";
  const sheetHeight = state === "success" || state === "error" ? "62%" : "85%";
  const showFooter = state !== "success" && state !== "error";

  return (
    <div style={{
      width: "100%", height: "100%",
      position: "relative",
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      fontFamily: "Inter, system-ui",
      overflow: "hidden",
      color: "var(--fg)",
    }}>
      {/* page-behind dimmer scene */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
        {pageBehind || <PageBehindMock variant="mobile"/>}
      </div>
      {/* scrim */}
      <div style={{
        position: "absolute", inset: 0,
        background: "var(--scrim)",
        backdropFilter: "blur(2px)",
      }}/>
      {/* sheet */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: sheetHeight,
        background: "var(--bg-elevated)",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: "0 -16px 48px rgba(0,0,0,0.45)",
        border: "1px solid var(--border)",
        borderBottom: "none",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* drag handle */}
        <div style={{
          flexShrink: 0,
          height: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "var(--border-strong)",
          }}/>
        </div>
        {/* header rail */}
        <div style={{
          flexShrink: 0,
          padding: "0 18px 12px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <FBMark size={20}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FeedbackHeaderRail tone={tone}/>
          </div>
          <button type="button" aria-label="Close" style={{
            all: "unset", cursor: "pointer",
            width: 28, height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)",
            border: "1px solid var(--border)",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {/* scroll area */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: "auto",
          padding: "6px 18px 18px",
          opacity: state === "loading" ? 0.5 : 1,
          pointerEvents: state === "loading" ? "none" : "auto",
        }}>
          {body}
        </div>
        {/* footer */}
        {showFooter && (
          <div style={{
            flexShrink: 0,
            padding: "12px 18px 22px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Desktop modal shell ────────────────────────────────────────
function DesktopShell({ state, body, footer, pageBehind }) {
  const tone = state === "success" ? "success"
            : state === "error"   ? "error"
            : state === "offline" ? "offline"
            : "open";
  const showFooter = state !== "success" && state !== "error";

  return (
    <div style={{
      width: "100%", height: "100%",
      position: "relative",
      background: "var(--bg)",
      fontFamily: "Inter, system-ui",
      overflow: "hidden",
      color: "var(--fg)",
    }}>
      {/* page behind, dimmed */}
      <div style={{ position: "absolute", inset: 0 }}>
        {pageBehind || <PageBehindMock variant="desktop"/>}
      </div>
      {/* scrim */}
      <div style={{
        position: "absolute", inset: 0,
        background: "var(--scrim)",
        backdropFilter: "blur(4px)",
      }}/>
      {/* card */}
      <div style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 520, maxWidth: "calc(100% - 64px)",
        maxHeight: "calc(100% - 80px)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        borderRadius: 16,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{
          flexShrink: 0,
          padding: "18px 22px 12px",
          display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid var(--border)",
        }}>
          <FBMark size={22}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FeedbackHeaderRail tone={tone}/>
          </div>
          <button type="button" aria-label="Close" style={{
            all: "unset", cursor: "pointer",
            width: 30, height: 30, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--fg-muted)",
            border: "1px solid var(--border)",
          }}>
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: "auto",
          padding: "18px 22px 18px",
          opacity: state === "loading" ? 0.5 : 1,
          pointerEvents: state === "loading" ? "none" : "auto",
        }}>
          {body}
        </div>
        {showFooter && (
          <div style={{
            flexShrink: 0,
            padding: "14px 22px 18px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>
            <FBSecondary fullWidth={false} onClick={() => {}}>Cancel</FBSecondary>
            <div style={{ width: 200 }}>{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page-behind mock — a stylized browse/event surface for context ──
// Lightweight; we don't need the real components, just a recognizable
// hint of "you're feeding back from somewhere."
function PageBehindMock({ variant = "mobile" }) {
  const isMobile = variant === "mobile";
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* topbar */}
      <div style={{
        flexShrink: 0,
        padding: isMobile ? "62px 16px 10px" : "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FBMark size={isMobile ? 26 : 28}/>
          <span style={{
            fontFamily: "Inter, system-ui", fontWeight: 800,
            fontSize: isMobile ? 17 : 19,
            color: "var(--fg)", letterSpacing: "-0.02em",
          }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
      </div>
      {/* hero block */}
      <div style={{
        margin: isMobile ? "0 16px 12px" : "0 32px 20px",
        height: isMobile ? 200 : 280,
        borderRadius: 12,
        background: `linear-gradient(135deg, oklch(0.30 0.10 280), oklch(0.18 0.05 320))`,
        border: "1px solid var(--border-strong)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.16,
          backgroundImage: `repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 10px)`,
        }}/>
        <div style={{
          position: "absolute", left: 14, top: 12,
          padding: "3px 8px", borderRadius: 4,
          background: "var(--accent)", color: "var(--fg-on-accent)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>★ tonight</div>
        <div style={{
          position: "absolute", left: 14, bottom: 14, right: 14,
        }}>
          <div style={{
            fontWeight: 900, fontSize: isMobile ? 24 : 32,
            letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.05,
          }}>SLEEP TOKEN</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, color: "rgba(255,255,255,0.78)",
            marginTop: 4, letterSpacing: "0.04em",
          }}>FILLMORE · 8:00 · $58–$92</div>
        </div>
      </div>
      {/* Edge tab — the chosen entry point, visible behind the dimmed scene */}
      <div style={{
        position: "absolute", right: 0, top: "44%",
        padding: isMobile ? "12px 6px" : "14px 7px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-strong)",
        borderRight: "none",
        borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        color: "var(--fg)",
        pointerEvents: "none",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: "var(--accent)",
        }}/>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: isMobile ? 10 : 11,
          fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--fg)",
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
        }}>Tell us · beta</div>
      </div>
      {/* row stubs */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          margin: isMobile ? "0 16px 8px" : "0 32px 10px",
          height: isMobile ? 56 : 64,
          borderRadius: 10,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
            borderRadius: 8,
            background: `linear-gradient(135deg, oklch(0.40 0.08 ${80 + i*60}), oklch(0.25 0.05 ${110 + i*60}))`,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              height: 12, width: "60%", borderRadius: 4,
              background: "var(--surface-3)", marginBottom: 6,
            }}/>
            <div style={{
              height: 9, width: "40%", borderRadius: 4,
              background: "var(--surface-2)",
            }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Exports ────────────────────────────────────────────────────
Object.assign(window, {
  FeedbackSurface,
  FeedbackHeaderRail,
  CategoryChips,
  ContextDisclosure,
  ScreenshotSlot,
  FBMark,
  FB_CATEGORIES,
  FB_SAMPLE_CONTEXT,
  FB_PageBehindMock: PageBehindMock,
});

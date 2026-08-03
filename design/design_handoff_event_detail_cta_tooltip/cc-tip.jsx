// cc-tip.jsx — CCTip: the app-wide explainer tooltip.
//
// One component, two shells, six content shapes.
//
//   Shells   desktop → anchored popover (hover-intent + focus + click-to-pin)
//            mobile  → bottom sheet (tap opens; content can be tall/rich)
//   Trigger  small ⓘ icon button. Never the only affordance — the thing it
//            explains always has its own visible label/copy.
//   Content  declared as DATA in TIP_CONTENT, never as JSX at the call site,
//            so copy is reviewable in one file and reusable across surfaces.
//
// Variants
//   text     1–2 sentences. (Event Detail · Going vs Watching)
//   titled   header line + body.
//   defs     label + description + state dot rows. (Admin · chip states)
//   steps    numbered how-to sequence.
//   example  label + description + mono "say this / not this" snippet.
//   dos      do's & don'ts pair.
//
// API
//   <CCTip tip="going-vs-watch" surface="mobile|desktop" size="sm|md"
//          placement="top|bottom" align="start|center|end"
//          defaultOpen={false} onOpenChange={fn} />
//   <CCTipBody tip={TIP_CONTENT[k]} />   ← renderer, if you need it inline
//
// A11y: trigger is a real <button> with aria-expanded + aria-controls and an
// aria-label built from the tip's `label`. Popover/sheet is role="dialog"
// aria-modal on mobile only. Escape closes and returns focus. No native
// title= tooltips anywhere (project convention).

const TIP_UI = "Inter, system-ui, sans-serif";
const TIP_MONO = "'JetBrains Mono', ui-monospace, monospace";

// ── Content registry ────────────────────────────────────────────────
// Keys are stable; product copy lives here. `label` is the accessible name
// of the trigger AND the sheet title on mobile.
const TIP_CONTENT = {
  // Event Detail · the CTA pair.
  // R2: Going is gated behind Concert History; Watching is free. This tip is the
  // last thing a Free user reads before tapping Going, so it says so — plainly,
  // once, without turning into a paywall notice.
  "going-vs-watch": {
    label: "Going vs. Watching",
    variant: "defs",
    intro: "Two different promises.",
    rows: [
      { tone: "good", title: "Watching: free", body: "Keeps an eye on the price. We ping you on drops and sold-outs. Nothing else." },
      { tone: "neutral", title: "Going: part of Concert History", body: "Saves the night to your history after the show. It's a paid feature. You can watch this show either way." },
    ],
  },
  // Event Detail · what Concert History is (the locked-Going pitch)
  "concert-history": {
    label: "Concert History",
    variant: "titled",
    title: "Your gig log, kept for you.",
    body: "Mark the shows you're going to and they stack into a history: what you saw, where, who opened, what you paid. Part of the paid tier. Watching a price is free and always will be.",
  },
  // Event Detail · price provenance (second text example, same surface)
  "who-set-this-price": {
    label: "Where this price came from",
    variant: "titled",
    title: "A fan put it there.",
    body: "Most prices here are submitted by people who actually checked. Box-office prices come from someone who bought a ticket at the window. No API, no guessing.",
  },
  // Browse / Venue list header · one tip for the whole list, never per row
  "watching-on-browse": {
    label: "Watching",
    variant: "titled",
    title: "Keep an eye on a show.",
    body: "Tap the eye and we'll track the price for you: pings on drops and sold-outs. It doesn't say you're going; that lives on the show's page.",
  },
  // Admin · First-timer guide (screenshots 5 + 6 — definition rows)
  "chip-states": {
    label: "Chip state indicators",
    variant: "defs",
    intro: "Every chip on a guide is in one of three states.",
    rows: [
      { tone: "neutral", title: "Blank", body: "No content yet. Optional chips stay hidden on the venue page — never shown empty." },
      { tone: "good", title: "Authored", body: "A concert-goer-voice line the admin wrote and voice-passed. This is what ships to display." },
      { tone: "warn", title: "Honest placeholder", body: "Accessibility only. Satisfies the publish gate without faking content — shows “not documented yet, call the venue.”" },
    ],
  },
  // Admin · how to publish (steps)
  "publish-gate": {
    label: "How publishing works",
    variant: "steps",
    steps: [
      "Write the insider tip — the thing you'd text a friend who's never been.",
      "Fill Accessibility, or flip “Can't document yet” for the honest placeholder.",
      "Add any chips you actually know. Leave the rest blank.",
      "Publish. Blank chips stay hidden on the venue page.",
    ],
    footer: "Publish stays blocked until Accessibility is answered one way or the other.",
  },
  // Admin · voice rules (example rows)
  "guide-voice": {
    label: "Writing in concert-goer voice",
    variant: "example",
    rows: [
      { title: "Be specific", body: "Numbers, street names, times. A regular would know them.", say: "$15 cash, Blake St. lot", not: "Paid parking available" },
      { title: "Be honest", body: "If you can't say it like a regular, leave it blank.", say: "Line's brutal after 8:30 — come early", not: "Arrive early for best experience" },
    ],
  },
  // Admin · chip content do's & don'ts
  "chip-dos": {
    label: "Chip content rules",
    variant: "dos",
    dos: [
      "One thought per chip, texted-to-a-friend length.",
      "Name the thing — bar, balcony, north door.",
      "Say when it's true (“after 8:30”, “weeknights”).",
    ],
    donts: [
      "Marketing voice, hype, or exclamation points.",
      "Filling a chip just to fill it.",
      "Promising anything we can't verify.",
    ],
  },
};

// ── Icons ───────────────────────────────────────────────────────────
function TipInfoIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.4" fill="none"/>
      <circle cx="8" cy="5.1" r="0.95" fill="currentColor"/>
      <path d="M8 7.4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function TipXIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function TipCheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.2 6.4L4.8 9L9.8 3.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// State dot — mirrors ChipStateDot's tones without importing the admin bundle.
function TipDot({ tone = "neutral", size = 9 }) {
  const map = {
    neutral: { fill: "transparent", stroke: "var(--border-strong)" },
    good: { fill: "var(--success)", stroke: "var(--success)" },
    warn: { fill: "var(--warning)", stroke: "var(--warning)" },
    bad: { fill: "var(--danger)", stroke: "var(--danger)" },
  }[tone];
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: "50%", display: "block",
      background: map.fill, border: `1.5px solid ${map.stroke}`, flexShrink: 0,
      boxShadow: tone === "neutral" ? "none" : `0 0 0 3px color-mix(in oklab, ${map.stroke} 16%, transparent)`,
    }}/>
  );
}

// ── Body renderers ──────────────────────────────────────────────────
function TipText({ children }) {
  return <p style={{ margin: 0, fontFamily: TIP_UI, fontSize: 13, lineHeight: 1.55, color: "var(--fg-muted)", textWrap: "pretty" }}>{children}</p>;
}
function TipRowTitle({ children }) {
  return <div style={{ fontFamily: TIP_UI, fontSize: 12.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.005em" }}>{children}</div>;
}

function CCTipBody({ tip }) {
  const v = tip.variant;
  if (v === "text") return <TipText>{tip.body}</TipText>;

  if (v === "titled") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ fontFamily: TIP_UI, fontSize: 13.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.01em" }}>{tip.title}</div>
      <TipText>{tip.body}</TipText>
    </div>
  );

  if (v === "defs") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tip.intro && <TipText>{tip.intro}</TipText>}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {tip.rows.map((r, i) => (
          <div key={r.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
            <span style={{ paddingTop: 4 }}><TipDot tone={r.tone}/></span>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <TipRowTitle>{r.title}</TipRowTitle>
              <div style={{ fontFamily: TIP_UI, fontSize: 12, lineHeight: 1.5, color: "var(--fg-muted)", textWrap: "pretty" }}>{r.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (v === "steps") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
        {tip.steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span aria-hidden="true" style={{
              width: 19, height: 19, borderRadius: "50%", flexShrink: 0, marginTop: 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid color-mix(in oklab, var(--signal) 45%, transparent)",
              background: "color-mix(in oklab, var(--signal) 12%, transparent)",
              color: "var(--signal)", fontFamily: TIP_MONO, fontSize: 10, fontWeight: 700,
            }}>{i + 1}</span>
            <span style={{ fontFamily: TIP_UI, fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-muted)", textWrap: "pretty" }}>{s}</span>
          </li>
        ))}
      </ol>
      {tip.footer && (
        <div style={{ paddingTop: 9, borderTop: "1px solid var(--border)", fontFamily: TIP_MONO, fontSize: 10.5, lineHeight: 1.5, letterSpacing: "0.02em", color: "var(--fg-subtle)" }}>{tip.footer}</div>
      )}
    </div>
  );

  if (v === "example") return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {tip.rows.map((r, i) => (
        <div key={r.title} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "11px 0", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
          <TipRowTitle>{r.title}</TipRowTitle>
          <div style={{ fontFamily: TIP_UI, fontSize: 12, lineHeight: 1.5, color: "var(--fg-muted)", textWrap: "pretty" }}>{r.body}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <TipSnippet tone="good" text={r.say}/>
            <TipSnippet tone="bad" text={r.not}/>
          </div>
        </div>
      ))}
    </div>
  );

  if (v === "dos") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[["Do", tip.dos, "good"], ["Don't", tip.donts, "bad"]].map(([head, items, tone]) => (
        <div key={head} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{
            fontFamily: TIP_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: tone === "good" ? "var(--success)" : "var(--danger)",
          }}>{head}</span>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map((it) => (
              <li key={it} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ color: tone === "good" ? "var(--success)" : "var(--danger)", marginTop: 2, flexShrink: 0, display: "inline-flex" }}>
                  {tone === "good" ? <TipCheckIcon size={11}/> : <TipXIcon size={10}/>}
                </span>
                <span style={{ fontFamily: TIP_UI, fontSize: 12.5, lineHeight: 1.45, color: "var(--fg-muted)", textWrap: "pretty" }}>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return null;
}

function TipSnippet({ tone, text }) {
  const c = tone === "good" ? "var(--success)" : "var(--danger)";
  return (
    <div style={{
      display: "flex", gap: 7, alignItems: "flex-start",
      padding: "6px 9px", borderRadius: 7,
      background: `color-mix(in oklab, ${c} 8%, var(--surface-1))`,
      border: `1px solid color-mix(in oklab, ${c} 26%, transparent)`,
    }}>
      <span aria-hidden="true" style={{ color: c, marginTop: 1.5, flexShrink: 0, display: "inline-flex" }}>
        {tone === "good" ? <TipCheckIcon size={11}/> : <TipXIcon size={10}/>}
      </span>
      <span style={{ fontFamily: TIP_MONO, fontSize: 11, lineHeight: 1.45, color: "var(--fg)", letterSpacing: "0.01em" }}>{text}</span>
    </div>
  );
}

// ── Shell: anchored popover (desktop) ───────────────────────────────
function CCTipPopover({ id, tip, placement = "top", align = "center", width = 296, onClose }) {
  const vert = placement === "bottom"
    ? { top: "calc(100% + 11px)" }
    : { bottom: "calc(100% + 11px)" };
  const horiz = align === "start" ? { left: -10 } : align === "end" ? { right: -10 } : { left: "50%", transform: "translateX(-50%)" };
  const arrow = placement === "bottom" ? { top: -4.5 } : { bottom: -4.5 };
  const arrowH = align === "start" ? { left: 17 } : align === "end" ? { right: 17 } : { left: "50%", marginLeft: -4.5 };
  return (
    <div id={id} role="dialog" aria-label={tip.label} style={{
      position: "absolute", zIndex: 40, width, ...vert, ...horiz,
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-strong)",
      borderRadius: 12,
      boxShadow: "0 18px 44px -14px var(--shadow-strong), 0 2px 6px -2px var(--shadow-soft)",
      padding: 14,
      textAlign: "left",
    }}>
      <div style={{
        position: "absolute", width: 9, height: 9, ...arrow, ...arrowH,
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--border-strong)",
        borderTop: "1px solid var(--border-strong)",
        transform: `${align === "center" ? "" : ""}rotate(45deg)`,
      }}/>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: tip.variant === "text" ? 0 : 9 }}>
        <span style={{
          flex: 1, fontFamily: TIP_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "var(--fg-subtle)",
          display: tip.variant === "text" ? "none" : "block", paddingTop: 1,
        }}>{tip.label}</span>
        {tip.variant !== "text" && (
          <button type="button" onClick={onClose} aria-label="Close" style={{
            all: "unset", cursor: "pointer", color: "var(--fg-subtle)", flexShrink: 0,
            width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4,
          }}><TipXIcon size={11}/></button>
        )}
      </div>
      <CCTipBody tip={tip}/>
    </div>
  );
}

// ── Shell: bottom sheet (mobile) ────────────────────────────────────
// Positions against the nearest positioned ancestor — on a real route that's
// the app viewport; in the canvas it's the phone screen wrapper.
// R2: aria-modal now comes with a real focus trap — focus moves into the sheet
// on open and Tab cycles inside it until it closes.
function CCTipSheet({ id, tip, onClose }) {
  const trapRef = React.useRef(null);
  React.useEffect(() => {
    const root = trapRef.current;
    if (!root) return;
    const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const first = root.querySelector(sel);
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const items = Array.from(root.querySelectorAll(sel)).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div ref={trapRef} style={{ position: "absolute", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <button type="button" aria-label="Close" onClick={onClose} style={{
        all: "unset", position: "absolute", inset: 0, cursor: "pointer",
        background: "var(--scrim)", backdropFilter: "blur(1.5px)",
      }}/>
      <div id={id} role="dialog" aria-modal="true" aria-label={tip.label} style={{
        position: "relative", background: "var(--bg-elevated)",
        borderTop: "1px solid var(--border-strong)",
        borderRadius: "18px 18px 0 0",
        padding: "10px 18px 26px",
        boxShadow: "0 -20px 50px -18px var(--shadow-strong)",
        textAlign: "left",
      }}>
        <div aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 99, background: "var(--border-strong)", margin: "0 auto 12px" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
          <span style={{
            flex: 1, fontFamily: TIP_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--fg-subtle)",
          }}>{tip.label}</span>
          <button type="button" onClick={onClose} aria-label="Close" style={{
            all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)", color: "var(--fg-muted)", flexShrink: 0,
          }}><TipXIcon size={12}/></button>
        </div>
        <CCTipBody tip={tip}/>
      </div>
    </div>
  );
}

// ── Trigger + orchestration ─────────────────────────────────────────
// R2 open model — hover and pin are separate states, which is what the R1
// README claimed and the code didn't do:
//   hover in     → open (unpinned)
//   hover out    → close ONLY if unpinned
//   click        → toggle pinned; a pinned panel survives mouse-out
//   focus        → open (unpinned)
//   blur past it → close if unpinned (relatedTarget outside the wrapper)
//   Escape       → close, unpin, return focus to the trigger
let CC_TIP_SEQ = 0;
function CCTip({
  tip, surface = "desktop", size = "sm", placement = "top", align = "center",
  width, defaultOpen = false, onOpenChange, sheetHost,
}) {
  const content = typeof tip === "string" ? TIP_CONTENT[tip] : tip;
  const [open, setOpen] = React.useState(defaultOpen);
  const [pinned, setPinned] = React.useState(defaultOpen);
  const idRef = React.useRef(null);
  const btnRef = React.useRef(null);
  if (!idRef.current) idRef.current = `cctip-${++CC_TIP_SEQ}`;
  const panelId = idRef.current;
  const timer = React.useRef(null);

  React.useEffect(() => { setOpen(defaultOpen); setPinned(defaultOpen); }, [defaultOpen]);
  React.useEffect(() => { onOpenChange && onOpenChange(open); }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false); setPinned(false);
      if (btnRef.current) btnRef.current.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!content) return null;
  const isMobile = surface === "mobile";
  const box = size === "md" ? 30 : 26;
  const icon = size === "md" ? 17 : 15;

  const hoverIn = () => { if (isMobile) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), 110); };
  const hoverOut = () => {
    if (isMobile) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (!pinned) setOpen(false); }, 140);
  };
  const handleBlur = (e) => {
    if (isMobile || pinned) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setOpen(false);
  };
  const handleClick = () => {
    if (isMobile) { setOpen((o) => !o); setPinned((o) => !o); return; }
    if (pinned) { setPinned(false); setOpen(false); }
    else { setPinned(true); setOpen(true); }
  };
  const close = () => { setOpen(false); setPinned(false); };

  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={hoverIn} onMouseLeave={hoverOut} onBlur={handleBlur}>
      <button
        ref={btnRef}
        type="button"
        aria-label={open ? `Hide: ${content.label}` : `What's this? ${content.label}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={handleClick}
        onFocus={() => !isMobile && setOpen(true)}
        style={{
          all: "unset", cursor: "pointer", flexShrink: 0,
          width: box, height: box, borderRadius: 999,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: open ? "var(--signal)" : "var(--fg-subtle)",
          background: open ? "color-mix(in oklab, var(--signal) 12%, transparent)" : "transparent",
          transition: "color 120ms, background 120ms",
          // 44px touch target without a 44px visual footprint
          outlineOffset: 2,
        }}
      >
        <TipInfoIcon size={icon}/>
        {isMobile && <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%,-50%)" }}/>}
      </button>
      {open && !isMobile && (
        <CCTipPopover id={panelId} tip={content} placement={placement} align={align}
          width={width || (content.variant === "text" || content.variant === "titled" ? 272 : 320)}
          onClose={close}/>
      )}
      {open && isMobile && (
        sheetHost === false
          ? null
          : <CCTipSheetPortal host={sheetHost}><CCTipSheet id={panelId} tip={content} onClose={close}/></CCTipSheetPortal>
      )}
    </span>
  );
}

// Renders the sheet into the surface root (an element ref or a selector) so it
// spans the viewport instead of the trigger's little inline box. Falls back to
// rendering in place if no host is given.
function CCTipSheetPortal({ host, children }) {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    if (!host) return;
    const el = typeof host === "string" ? document.querySelector(host) : (host.current || host);
    setNode(el || null);
  }, [host]);
  if (!host) return children;
  if (!node) return null;
  return ReactDOM.createPortal(children, node);
}

Object.assign(window, {
  CCTip, CCTipBody, CCTipPopover, CCTipSheet, CCTipSheetPortal,
  TIP_CONTENT, TipInfoIcon, TipDot, TipSnippet, TIP_UI, TIP_MONO,
});

// a11y.jsx — #782 accessibility annotation pass (WCAG AA)
//
// Primitives:
//   <A11yPin n top left tone/>         numbered callout badge (absolute)
//   <A11yLegend title items/>          numbered legend list (pairs with pins)
//   <A11yBackTable rows/>              back-annotation spec table (#781 + #780)
//   <SRScript title surface steps/>    screen-reader walkthrough (numbered)
//
// Composites (render a real #782 surface + overlay pins + legend, side by side):
//   <AnnotatedFailure theme category/>
//   <AnnotatedChallenge theme kind/>
//   <AnnotatedPastDue theme/>
//
// Approach (brief §5, Hugh's call = hybrid): numbered callout OVERLAYS on the new
// #782 artboards; spec TABLES for the back-annotated #781 + #780 surfaces.

const { FailureSurface, ChallengeMount, PastDueBanner } = window;
const { MMark, MonoEyebrow } = window;

// ── numbered pin ─────────────────────────────────────────────
function A11yPin({ n, top, left, tone = "signal" }) {
  const c = tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--signal)";
  return (
    <div style={{
      position: "absolute", top, left, transform: "translate(-50%, -50%)",
      width: 24, height: 24, borderRadius: 24, zIndex: 6,
      background: c, color: "var(--fg-on-accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 12,
      boxShadow: `0 0 0 3px color-mix(in oklch, ${c} 28%, transparent), 0 2px 8px rgba(0,0,0,0.4)`,
    }}>{n}</div>
  );
}

// ── legend ───────────────────────────────────────────────────
function A11yLegend({ title, items, tone = "signal" }) {
  const c = tone === "warning" ? "var(--warning)" : tone === "danger" ? "var(--danger)" : "var(--signal)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "Inter, system-ui" }}>
      <MonoEyebrow size={11} color={c} letterSpacing="0.16em">{title}</MonoEyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {items.map((it) => (
          <div key={it.n} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 22, flexShrink: 0, marginTop: 1,
              background: c, color: "var(--fg-on-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11,
            }}>{it.n}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)", letterSpacing: "-0.005em" }}>{it.label}</div>
              <div style={{ fontWeight: 500, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>{it.detail}</div>
              {it.code && (
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: c, background: `color-mix(in oklch, ${c} 12%, transparent)`, padding: "2px 6px", borderRadius: 5, marginTop: 2, alignSelf: "flex-start" }}>{it.code}</code>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── annotation panel shell (paper bg + title) ────────────────
function A11yPanel({ theme = "electric", children }) {
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{
        width: "100%", height: "100%", background: "var(--bg)",
        display: "grid", gridTemplateColumns: "404px 1fr", gap: 0,
        fontFamily: "Inter, system-ui", color: "var(--fg)",
      }}>{children}</div>
    </window.ThemeProvider>
  );
}

// faux phone scene (page-behind + scrim) so a SheetChrome surface anchors
function PinDevice({ height = 720, children }) {
  return (
    <div style={{
      position: "relative", width: 380, height, margin: "0 auto",
      borderRadius: 30, overflow: "hidden",
      border: "1px solid var(--border-strong)", background: "var(--bg)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    }}>
      {/* page behind */}
      <div style={{ position: "absolute", inset: 0, padding: "54px 16px 16px", display: "flex", flexDirection: "column", gap: 11, opacity: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MMark size={20}/>
          <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", marginTop: 6 }}>Go Premium</div>
        {[0,1,2].map(i => <div key={i} style={{ height: 44, borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)" }}/>)}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "var(--scrim)" }}/>
      {children}
    </div>
  );
}

// ── Annotated failure surface (representative: issuer_declined) ──
function AnnotatedFailure({ theme = "electric", category = "issuer_declined" }) {
  const pins = [
    { n: 1, top: "15.5%", left: "9%" },
    { n: 2, top: "32%",  left: "16%" },
    { n: 3, top: "39%",  left: "62%" },
    { n: 4, top: "60%",  left: "20%" },
    { n: 5, top: "90%",  left: "20%" },
    { n: 6, top: "15.5%", left: "90%" },
  ];
  const items = [
    { n: 1, label: "role=\"alertdialog\" + aria-modal", detail: "It interrupts the flow with an error, so alertdialog (not dialog). Focus trapped inside until resolved or dismissed.", code: "role=\"alertdialog\" aria-modal=\"true\"" },
    { n: 2, label: "Headline is an assertive live region", detail: "The error announces immediately on mount — it's an interrupt by definition.", code: "aria-live=\"assertive\"" },
    { n: 3, label: "Description associated to the dialog", detail: "Body copy is referenced so SR reads the explanation after the headline.", code: "aria-describedby" },
    { n: 4, label: "Form labels on the Stripe slot", detail: "Stripe owns its iframe a11y; we label the surrounding region. Retry re-renders Elements in place.", code: "aria-label (group)" },
    { n: 5, label: "Focus moves to the primary action", detail: "On mount, focus lands on \u201cTry a different card\u201d so keyboard users act immediately.", code: "autofocus / focus()" },
    { n: 6, label: "Escape dismisses to the picker", detail: "Esc closes the surface and returns focus to the affordance that opened payment.", code: "Esc \u2192 focus return" },
  ];
  return (
    <A11yPanel theme={theme}>
      <div style={{ position: "relative", padding: "20px 12px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)" }}>
        <PinDevice height={720}>
          <FailureSurface category={category} variant="mobile" tierKey="premium"/>
          {pins.map(p => <A11yPin key={p.n} {...p} tone="danger"/>)}
        </PinDevice>
      </div>
      <div style={{ padding: "26px 28px", overflow: "auto" }}>
        <A11yLegend tone="danger" title={`Failure surface · a11y · ${category}`} items={items}/>
      </div>
    </A11yPanel>
  );
}

// ── Annotated challenge mount (3DS) ──────────────────────────
function AnnotatedChallenge({ theme = "electric", kind = "3ds" }) {
  const pins = [
    { n: 1, top: "20%", left: "9%" },
    { n: 2, top: "28%", left: "55%" },
    { n: 3, top: "55%", left: "50%" },
    { n: 4, top: "92%", left: "50%" },
  ];
  const items = [
    { n: 1, label: "role=\"dialog\" + aria-modal", detail: "A modal step, not an error — dialog (not alertdialog). Focus trapped while the bank challenge is open.", code: "role=\"dialog\" aria-modal=\"true\"" },
    { n: 2, label: "Labelled + described by our chrome", detail: "Our headline + body are the accessible name/description; Stripe's iframe owns everything inside it.", code: "aria-labelledby / -describedby" },
    { n: 3, label: "Stripe iframe = separate a11y context", detail: "We annotate around the iframe only. The bank's challenge handles its own focus + labels.", code: "iframe (Stripe-owned)" },
    { n: 4, label: "Cancel path returns focus", detail: "\u201cCancel payment\u201d closes the mount and returns to the payment surface; no dead-end.", code: "Esc / Cancel \u2192 focus return" },
  ];
  return (
    <A11yPanel theme={theme}>
      <div style={{ position: "relative", padding: "20px 12px", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)" }}>
        <PinDevice height={720}>
          <ChallengeMount kind={kind} variant="mobile" tierKey="premium"/>
          {pins.map(p => <A11yPin key={p.n} {...p} tone="signal"/>)}
        </PinDevice>
      </div>
      <div style={{ padding: "26px 28px", overflow: "auto" }}>
        <A11yLegend tone="signal" title={`Challenge mount · a11y · ${kind.toUpperCase()}`} items={items}/>
      </div>
    </A11yPanel>
  );
}

// ── Annotated past-due banner ────────────────────────────────
function AnnotatedPastDue({ theme = "electric" }) {
  const items = [
    { n: 1, label: "role=\"region\" + aria-label", detail: "A labelled landmark so SR users can find/skip it. Not a dialog \u2014 it doesn't trap focus.", code: "role=\"region\" aria-label=\"Payment notice\"" },
    { n: 2, label: "Polite live region", detail: "It appears between sessions, not mid-interaction, so polite (never assertive) \u2014 it shouldn't interrupt.", code: "aria-live=\"polite\"" },
    { n: 3, label: "CTA is portal-bound + labelled", detail: "\u201cUpdate card\u201d opens the Stripe portal (new tab) \u2014 the \u2197 marks the off-site jump.", code: "Update card \u2197 (Stripe portal)" },
    { n: 4, label: "Dismiss has an explicit label", detail: "Icon-only button needs an accessible name; per-session dismissal (not single-fire).", code: "aria-label=\"Dismiss payment notice\"" },
  ];
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative" }}>
          <PastDueBanner variant="desktop"/>
          <A11yPin n={1} top="50%" left="2.5%" tone="warning"/>
          <A11yPin n={2} top="50%" left="38%" tone="warning"/>
          <A11yPin n={3} top="50%" left="83%" tone="warning"/>
          <A11yPin n={4} top="50%" left="96.5%" tone="warning"/>
        </div>
        <div style={{ padding: "30px 40px", maxWidth: 760 }}>
          <A11yLegend tone="warning" title="Past-due banner · a11y" items={items}/>
        </div>
      </div>
    </window.ThemeProvider>
  );
}

// ── back-annotation spec table (#781 + #780 surfaces) ────────
function A11yBackTable({ theme = "electric", rows, title }) {
  const cols = ["Surface", "Round", "Role / container", "Focus", "Live region", "Key notes"];
  return (
    <window.ThemeProvider theme={theme} style={{ width: "100%", height: "100%" }}>
      <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "26px 30px", overflow: "auto" }}>
        <MonoEyebrow size={11} color="var(--signal)" letterSpacing="0.16em" style={{ marginBottom: 16 }}>{title}</MonoEyebrow>
        <div role="table" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 1.5fr 1.3fr 1.1fr 2.2fr", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {cols.map((c, i) => (
            <div key={"h"+i} role="columnheader" style={{ padding: "10px 12px", background: "var(--surface-2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-muted)", borderBottom: "1px solid var(--border-strong)" }}>{c}</div>
          ))}
          {rows.map((r, ri) => (
            [r.surface, r.round, r.role, r.focus, r.live, r.notes].map((cell, ci) => (
              <div key={ri+"-"+ci} role="cell" style={{
                padding: "11px 12px", fontSize: 12, lineHeight: 1.45,
                color: ci === 0 ? "var(--fg)" : "var(--fg-muted)",
                fontWeight: ci === 0 ? 700 : 500,
                background: ri % 2 ? "color-mix(in oklch, var(--surface-1) 50%, var(--bg))" : "var(--bg)",
                borderBottom: ri === rows.length - 1 ? "none" : "1px solid var(--border)",
                fontFamily: (ci === 2 || ci === 4) ? "'JetBrains Mono', monospace" : "Inter, system-ui",
                fontSize: (ci === 2 || ci === 4) ? 10.5 : 12,
              }}>{cell}</div>
            ))
          ))}
        </div>
      </div>
    </window.ThemeProvider>
  );
}

const BACK_ANNOTATION_ROWS = [
  { surface: "Tier picker — desktop matrix", round: "#781", role: "<table> + th scope", focus: "row/col headers", live: "—", notes: "Semantic table, not a div-grid. aria-current=\"true\" (not \"page\") on current-plan column + a visually-hidden \u201cCurrent plan\u201d label." },
  { surface: "Tier picker — mobile accordion", round: "#781", role: "role=\"group\"", focus: "moves to panel on open", live: "—", notes: "aria-expanded + aria-controls shipped; add aria-label per row." },
  { surface: "Scarcity rail (Founder)", round: "#781", role: "—", focus: "—", live: "polite", notes: "Hidden sentence: \u201cFounder seats remaining: 47 of 100. Window closes in 3 days.\u201d Never assertive." },
  { surface: "Mini paywall sheet", round: "#781", role: "role=\"dialog\"", focus: "trap; return to affordance", live: "—", notes: "aria-modal; focus returns to the locked control that opened it." },
  { surface: "Payment surface", round: "#780/#781", role: "role=\"dialog\"", focus: "trap; Esc returns", live: "—", notes: "Form labels on inputs. Stripe iframe owns its own a11y; we annotate around it. (Walkthrough in §9.)" },
  { surface: "Settings Plan card (all variants)", round: "#780", role: "inline (no trap)", focus: "—", live: "polite", notes: "aria-label names the state, e.g. \u201cPremium, renews Jul 15\u201d. Trial countdown is polite." },
  { surface: "Cancel / downgrade / upgrade", round: "#780", role: "role=\"dialog\"", focus: "trap each", live: "—", notes: "ChangesDisclosure gets aria-expanded/-controls. Proration math as <dl><dt><dd>." },
  { surface: "Account-deletion sheet 1", round: "#780", role: "role=\"dialog\"", focus: "trap", live: "—", notes: "\u201cGone for good\u201d list is a semantic <ul>." },
  { surface: "Account-deletion sheet 2", round: "#780", role: "role=\"alertdialog\"", focus: "trap; on email input", live: "polite", notes: "Destructive. aria-invalid until match; aria-describedby \u2192 match-state; button aria-disabled until exact match." },
  { surface: "Trial-ended takeover", round: "#780", role: "role=\"alertdialog\"", focus: "trap; Esc closes", live: "assertive", notes: "Announces \u201cYour Premium trial has ended\u201d on mount \u2014 the one correct assertive use. Picker beneath inherits picker a11y. (Walkthrough in §9.)" },
  { surface: "Day-13 banner", round: "#780", role: "role=\"region\"", focus: "—", live: "polite", notes: "aria-label=\"Trial ending nudge\"; dismiss aria-label=\"Dismiss trial-end notice\"." },
];

// ── screen-reader walkthrough script ─────────────────────────
function SRScript({ title, surface, tone = "signal", steps }) {
  const c = tone === "danger" ? "var(--danger)" : tone === "warning" ? "var(--warning)" : "var(--signal)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "Inter, system-ui", color: "var(--fg)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <MonoEyebrow size={10} color={c} letterSpacing="0.16em">{surface}</MonoEyebrow>
        <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, counterReset: "sr" }}>
        {steps.map((s, i) => (
          <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 22, height: 22, borderRadius: 22, flexShrink: 0, marginTop: 1, background: `color-mix(in oklch, ${c} 18%, transparent)`, border: `1px solid color-mix(in oklch, ${c} 45%, transparent)`, color: c, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 11 }}>{i + 1}</div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>{s.action}</span>{" "}
              <span style={{ fontWeight: 500, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>{s.reads}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const SR_SCRIPTS = {
  matrix: {
    surface: "Tier comparison matrix · desktop",
    title: "How a screen-reader user reads the matrix",
    tone: "signal",
    steps: [
      { action: "Enters the table.", reads: "\u201cTable, 4 columns, 7 rows. Plans and features.\u201d The <caption> sets context." },
      { action: "Reads column headers.", reads: "\u201cFree. Supporter. Premium, current plan. Founder.\u201d The current column carries aria-current=\"true\" + a hidden \u201cCurrent plan\u201d label." },
      { action: "Arrows down a column.", reads: "Each cell pairs with its row + column header: \u201cPrice-drop alerts \u2014 Premium \u2014 included.\u201d No orphaned checkmarks." },
      { action: "Reaches a CTA cell.", reads: "\u201cStart 14-day free trial, button.\u201d Reading order per column: name \u2192 price \u2192 tagline \u2192 features \u2192 CTA." },
      { action: "Tabs to act.", reads: "Tab visits only the 4 CTA buttons in column order \u2014 feature cells aren't focusable, so there's no tab-stop noise." },
    ],
  },
  payment: {
    surface: "Payment surface",
    title: "How a screen-reader user completes payment",
    tone: "signal",
    steps: [
      { action: "Surface opens.", reads: "\u201cConfirm Premium, dialog.\u201d Focus is trapped; the rail header + title form the accessible name." },
      { action: "Reads the summary.", reads: "\u201cPremium, 5 dollars per month. Due today, 0 dollars \u2014 then 5 dollars in 14 days.\u201d Totals are a <dl>." },
      { action: "Enters the card fields.", reads: "Focus crosses into Stripe's iframe; Stripe labels its own inputs. We don't intercept." },
      { action: "Reaches the legal block.", reads: "\u201cTerms, link. Privacy, link. Refund policy, link. Auto-renews monthly, cancel anytime.\u201d SCA-region users also hear \u201cYour bank may ask to confirm this.\u201d" },
      { action: "Hits the CTA + trust rail.", reads: "\u201cStart free trial, button.\u201d After: \u201cStripe handles your card, we never see it. Cancel anytime.\u201d" },
      { action: "On decline.", reads: "An alertdialog replaces it; the headline announces assertively (\u201cYour bank declined it\u201d) and focus jumps to \u201cTry a different card.\u201d" },
    ],
  },
  takeover: {
    surface: "Trial-ended takeover",
    title: "How a screen-reader user meets the takeover",
    tone: "signal",
    steps: [
      { action: "Next session opens.", reads: "Assertive announce: \u201cYour Premium trial has ended.\u201d This is the one place assertive is correct \u2014 a state change the user must know." },
      { action: "Hears the framing.", reads: "\u201cTrial\u2019s done. Pick a lane.\u201d then the body explaining what paused vs what stays (browsing + saved shows stay)." },
      { action: "Moves through the picker.", reads: "The locked #781 picker beneath inherits its a11y: each tier is a group with name \u2192 price \u2192 features \u2192 CTA." },
      { action: "Wants out.", reads: "\u201cKeep browsing on Free, button\u201d \u2014 or Escape. Both dismiss and return focus to where they were headed." },
      { action: "Single-fire.", reads: "Dismissed, it won't re-announce on later sessions for the same expiry (eng owns last_trial_ended_shown_at)." },
    ],
  },
};

Object.assign(window, {
  A11yPin, A11yLegend, A11yBackTable, SRScript,
  AnnotatedFailure, AnnotatedChallenge, AnnotatedPastDue,
  BACK_ANNOTATION_ROWS, SR_SCRIPTS,
});

// lo-gating.jsx — #794 deliverable 4: the tier-picker moment, logged out.
// Extends the SHIPPED logged-out picker state (tier-picker/definitions/copy.ts
// already carries loggedOutEyebrow). #781 owns the picker's mechanics and
// visuals; this file changes exactly two things:
//   1. the header copy — the shipped eyebrow "Save a show · sign in" violates
//      locked vocabulary (there is no "Save" concept in this product);
//   2. the accessible-name contract behind an affordance whose pixels are
//      identical signed-out and signed-in (§3.10 — Design owns this).

const { Mono, LO_MONO, LO_UI, IconEye, IconArrow, IconCheck, Btn, Phone, Desk, Note,
        Scrim, Sheet, Modal, WatchEye, EventRow, LO_SHOWS,
        MobileHeader, BottomNav, BrowseBody, DesktopHeader, DesktopBrowseBody } = window;

// PROPOSED replacement copy for the vocabulary violation. One-line edit.
const LO_PICKER_COPY = {
  eyebrow: "Watching · free with an account",
  title: "Keep an eye on the ones you can't miss.",
  sub: "Watching is free — it just needs an account to save to. Start on Free; pick a lane later if you ever want to chip in.",
  signInPrompt: "Already have an account?",
  signInLink: "Sign in →",
  primary: "Sign up free",
  footer: "Free forever · no card · we'll put you back on this show",
};

const LO_TIERS = [
  { name: "Free", price: "$0", tag: "Watching lives here", pick: true, feats: ["Browse, search, filter every show", "Watch shows you're tracking", "Submit and confirm prices"] },
  { name: "Supporter", price: "$2", tag: "Chip in, get a badge", feats: ["Everything in Free", "Supporter badge"] },
  { name: "Premium", price: "$5", tag: "The stuff that costs us money", feats: ["Everything in Free", "History, export, alerts"] },
];

// Tiers stack VERTICALLY at every breakpoint — three columns squeezes the
// feature lines to two words a row and the whole point is that Free already
// covers Watching.
function TierCard({ t, wide = false }) {
  return (
    <div style={{
      boxSizing: "border-box", width: "100%",
      padding: wide ? "13px 15px" : "12px 13px", borderRadius: 12,
      background: t.pick ? "color-mix(in oklch, var(--signal) 10%, var(--surface-1))" : "var(--surface-1)",
      border: t.pick ? "1.5px solid color-mix(in oklch, var(--signal) 55%, transparent)" : "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontFamily: LO_UI, fontWeight: 800, fontSize: wide ? 16 : 15, letterSpacing: "-0.02em", color: t.pick ? "var(--signal)" : "var(--fg)" }}>{t.name}</span>
        <Mono size={9} ls="0.08em" color="var(--fg-subtle)">{t.tag}</Mono>
        <span style={{ flex: 1 }} />
        <Mono size={12} ls="0.02em" color={t.pick ? "var(--signal)" : "var(--fg-muted)"}>{t.price}{t.name !== "Free" && "/mo"}</Mono>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 16px" }}>
        {t.feats.map((f) => (
          <span key={f} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontFamily: LO_UI, fontSize: wide ? 12.5 : 12, fontWeight: 500, color: "var(--fg-muted)", lineHeight: 1.45 }}>
            <span style={{ color: t.pick ? "var(--signal)" : "var(--fg-subtle)", flexShrink: 0, marginTop: 2 }}><IconCheck s={11} /></span>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function PickerBody({ wide = false, anchor = "Geese" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: LO_UI, color: "var(--fg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: "var(--signal)", flexShrink: 0, boxShadow: "0 0 8px var(--signal)" }} />
          <Mono size={10} color="var(--signal)">{LO_PICKER_COPY.eyebrow}</Mono>
        </span>
        <Mono size={10} color="var(--fg-subtle)">3 tiers</Mono>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <span style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: "color-mix(in oklch, var(--signal) 14%, var(--surface-1))",
          border: "1px solid color-mix(in oklch, var(--signal) 34%, var(--border))",
          color: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center",
        }}><IconEye s={21} /></span>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 900, fontSize: wide ? 25 : 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{LO_PICKER_COPY.title}</span>
          <span style={{ fontWeight: 500, fontSize: wide ? 14 : 13, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{LO_PICKER_COPY.sub}</span>
          <Mono size={9.5} ls="0.08em" color="var(--fg-subtle)">Anchored to: {anchor}</Mono>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LO_TIERS.map((t) => <TierCard key={t.name} t={t} wide={wide} />)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <Btn kind="primary" full>{LO_PICKER_COPY.primary}<IconArrow /></Btn>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)" }}>{LO_PICKER_COPY.signInPrompt}</span>
          <a href="#" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--signal)", textDecoration: "none" }}>{LO_PICKER_COPY.signInLink}</a>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <Mono size={9} ls="0.12em" color="var(--fg-subtle)">{LO_PICKER_COPY.footer}</Mono>
      </div>
    </div>
  );
}

// ── In-context: the eye was tapped on a browse card ───────────────────────
function PickerMobile({ width = 390, height = 820, note }) {
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut />
      <BrowseBody signedOut narrow={width <= 340} />
      <BottomNav signedOut active="browse" />
      <Scrim>
        <Sheet>
          <div style={{ padding: "4px 16px 20px" }}><PickerBody /></div>
        </Sheet>
      </Scrim>
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

function PickerDesktop({ width = 1200, height = 720, note }) {
  return (
    <Desk width={width} height={height}>
      <DesktopHeader signedOut />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ opacity: 0.42, height: "100%" }}><DesktopBrowseBody signedOut /></div>
        <div style={{ position: "absolute", inset: 0, background: "var(--scrim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Modal width={560}>
            <div style={{ padding: "22px 24px 20px" }}><PickerBody wide /></div>
          </Modal>
        </div>
      </div>
      {note && <Note>{note}</Note>}
    </Desk>
  );
}

// ── The hard problem: identical pixels, honest name ───────────────────────
const LO_NAMES = [
  { aff: "Watch eye · card", out: "Watch Geese — sign up to start watching", inn: "Watch this show / Watching, click to stop" },
  { aff: "Watch eye · detail", out: "Watch Geese — sign up to start watching", inn: "Watch this show / Watching, click to stop" },
  { aff: "Follow artist", out: "Follow Geese — sign up to follow artists", inn: "Follow Geese / Following, click to stop" },
  { aff: "Calendar export", out: "Add to calendar — sign up to export", inn: "Add to calendar" },
  { aff: "Account slot", out: "Account menu — sign up or sign in", inn: "Account menu" },
];

const LO_ARIA_RULES = [
  ["Name states the outcome", "The name says what activating it will actually do — open a sign-up path — without adding a visible word. `aria-label` overrides the icon's implied name."],
  ["No aria-pressed signed out", "Signed out the eye is not a toggle, so it carries no pressed state to misreport. Omit the attribute entirely; do not ship `aria-pressed=\"false\"`."],
  ["Declare the dialog", "`aria-haspopup=\"dialog\"` plus `aria-expanded` on the affordance. AT announces \"opens a dialog\" before activation, not after."],
  ["Focus moves in, then back", "On open, focus the sheet/modal's first heading; trap within; on dismiss, return focus to the affordance that opened it."],
  ["Announce the seam", "After sign-up returns the visitor, the completed action is announced once through a `role=\"status\"` region — see the return seam."],
  ["Never dim, never lock", "No reduced-contrast or lock-glyph variant exists. Contrast and hit area are identical on both sides of the auth boundary."],
];

function A11ySpec({ width = 900, height = 720 }) {
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 26, display: "flex", flexDirection: "column", gap: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Mono size={10} color="var(--accent)">§3.10 · Design owns this</Mono>
        <span style={{ fontWeight: 900, fontSize: 27, letterSpacing: "-0.03em" }}>Same pixels. Honest name.</span>
        <span style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 680, textWrap: "pretty" }}>
          Gated affordances are pixel-identical at rest, so the whole honesty burden falls on the
          accessible name and the popup contract. A screen-reader user must never be told they are
          toggling something that will instead open a tier picker.
        </span>
      </div>

      <div style={{ display: "flex", gap: 22, alignItems: "stretch" }}>
        {[
          { label: "Signed out", eye: <WatchEye artist="Geese" signedOut size={44} />, name: "Watch Geese — sign up to start watching", extra: "aria-haspopup=\"dialog\" · aria-expanded=\"false\" · no aria-pressed" },
          { label: "Signed in", eye: <WatchEye artist="Geese" size={44} />, name: "Watch this show", extra: "aria-pressed=\"false\" · no aria-haspopup" },
        ].map((c) => (
          <div key={c.label} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: 16, background: "var(--surface-1)", display: "flex", gap: 14, alignItems: "flex-start" }}>
            {c.eye}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <Mono size={9.5} color="var(--fg-subtle)">{c.label}</Mono>
              <span style={{ fontFamily: LO_MONO, fontSize: 12, fontWeight: 700, color: "var(--fg)", lineHeight: 1.4 }}>“{c.name}”</span>
              <span style={{ fontFamily: LO_MONO, fontSize: 10, color: "var(--fg-muted)", lineHeight: 1.5, letterSpacing: "0.01em" }}>{c.extra}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, minHeight: 0, flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Mono size={10} color="var(--fg-subtle)">Name table</Mono>
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            {LO_NAMES.map((n, i) => (
              <div key={n.aff} style={{ padding: "9px 11px", borderBottom: i === LO_NAMES.length - 1 ? "none" : "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{n.aff}</span>
                <span style={{ fontFamily: LO_MONO, fontSize: 9.5, color: "var(--signal)", lineHeight: 1.4 }}>out · “{n.out}”</span>
                <span style={{ fontFamily: LO_MONO, fontSize: 9.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>in&nbsp; · “{n.inn}”</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Mono size={10} color="var(--fg-subtle)">Contract</Mono>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {LO_ARIA_RULES.map(([t, b]) => (
              <div key={t} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--fg)" }}>{t}</span>
                <span style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rest / focus / open states of the gated eye, at size.
function EyeStates({ width = 640, height = 260 }) {
  const states = [
    { l: "rest", el: <WatchEye artist="Geese" signedOut /> },
    { l: "focus-visible", el: <WatchEye artist="Geese" signedOut focus /> },
    { l: "picker open", el: <WatchEye artist="Geese" signedOut state="open" /> },
    { l: "signed-in · watching", el: <WatchEye artist="Geese" state="watching" /> },
  ];
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Mono size={10} color="var(--accent)">Watch eye</Mono>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.025em" }}>No gated variant exists.</span>
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        {states.map((s) => (
          <div key={s.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
            {s.el}
            <Mono size={9} ls="0.08em" color="var(--fg-subtle)">{s.l}</Mono>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <EventRow show={LO_SHOWS[0]} signedOut />
        <Mono size={9.5} ls="0.06em" color="var(--fg-subtle)">Signed-out row. Identical to signed-in-not-watching, by decision.</Mono>
      </div>
    </div>
  );
}

Object.assign(window, { PickerMobile, PickerDesktop, PickerBody, A11ySpec, EyeStates, LO_PICKER_COPY });

// lo-watching.jsx — #794 deliverable 3: the /watching signed-out state.
// §3.3 — the tab NAVIGATES here. This is the one screen a visitor reaches by
// deliberately asking "what is this?", so it teaches BOTH ways: a definition in
// words, and a worked example of a populated list. The example is decorative to
// assistive tech (aria-hidden) with a text alternative beside it, because a
// screen-reader user must not mistake sample rows for their own shows.
//
// Public route, gated payload: nothing here is fetched.

const { Mono, LO_MONO, LO_UI, IconEye, IconArrow, Btn, Phone, Desk, Note, Art,
        MobileHeader, BottomNav, DesktopHeader } = window;

const LO_DEMO_ROWS = [
  { artist: "Geese", meta: "Ogden · Tonight · 9:00 PM", price: "$25", delta: "−$7", tone: "var(--success)" },
  { artist: "Wednesday", meta: "Mission · Tue · 8:00 PM", price: "$30", delta: "flat", tone: "var(--fg-subtle)" },
  { artist: "Bright Eyes", meta: "Red Rocks · May 6 · 7:00 PM", price: "—", delta: "SOLD OUT", tone: "var(--warning)" },
];

// The worked example. Marked as an example in three ways at once: the mono
// caption, the dashed container, and aria-hidden + a text alternative.
function DemoList({ compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Mono size={9} ls="0.14em" color="var(--fg-subtle)">Example · not your list</Mono>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div aria-hidden="true" style={{
        border: "1px dashed var(--border-strong)", borderRadius: 12, padding: 9,
        display: "flex", flexDirection: "column", gap: 7, background: "color-mix(in oklch, var(--surface-1) 60%, transparent)",
      }}>
        {LO_DEMO_ROWS.map((r) => (
          <div key={r.artist} style={{
            display: "grid", gridTemplateColumns: `${compact ? 34 : 40}px 1fr auto`, gap: 10, alignItems: "center",
            background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px",
          }}>
            <Art artist={r.artist} size={compact ? 34 : 40} radius={7} />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: LO_UI, fontWeight: 700, fontSize: compact ? 12.5 : 13.5, color: "var(--fg)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.artist}</span>
              <span style={{ fontFamily: LO_MONO, fontSize: 9.5, letterSpacing: "0.02em", color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.meta}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span style={{ fontFamily: LO_MONO, fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{r.price}</span>
              <span style={{ fontFamily: LO_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", color: r.tone }}>{r.delta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const LO_WATCH_FACTS = [
  { k: "01", t: "The eye is the whole gesture.", b: "Tap it on any show — card or detail page — and the show lands here." },
  { k: "02", t: "We watch the price, not you.", b: "Drops, spikes, and sell-outs show up against what it cost when you started watching." },
  { k: "03", t: "Free, and it stays free.", b: "Watching is on the Free tier. No card, no trial, nothing to cancel." },
];

function FactList({ compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 11 : 13 }}>
      {LO_WATCH_FACTS.map((f) => (
        <div key={f.k} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, alignItems: "start" }}>
          <Mono size={10} color="var(--signal)" style={{ paddingTop: 2 }}>{f.k}</Mono>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: LO_UI, fontSize: compact ? 13 : 14, fontWeight: 700, letterSpacing: "-0.015em", color: "var(--fg)" }}>{f.t}</span>
            <span style={{ fontFamily: LO_UI, fontSize: compact ? 12 : 13, fontWeight: 500, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>{f.b}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchingHead({ compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: "color-mix(in oklch, var(--signal) 14%, var(--surface-1))",
          border: "1px solid color-mix(in oklch, var(--signal) 34%, var(--border))",
          color: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center",
        }}><IconEye s={17} /></span>
        <Mono size={10} color="var(--fg-subtle)">Watching</Mono>
      </div>
      <span style={{ fontFamily: LO_UI, fontWeight: 900, fontSize: compact ? 27 : 32, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--fg)" }}>
        Keep an eye on it.
      </span>
      <span style={{ fontFamily: LO_UI, fontSize: compact ? 13 : 14.5, fontWeight: 500, color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>
        Watching is your shortlist of shows you don't want to miss — and a price
        tracker on each one. Nothing to set up. It just needs an account to save to.
      </span>
    </div>
  );
}

function WatchingCTA({ full = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <Btn kind="primary" full={full} size="lg">Sign up free<IconArrow /></Btn>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 500, color: "var(--fg-muted)" }}>Already have an account?</span>
        <a href="#" style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 700, color: "var(--signal)", textDecoration: "none" }}>Sign in</a>
      </div>
      <a href="#" style={{ fontFamily: LO_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)", textDecoration: "none", textAlign: "center", padding: "10px 0", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Or keep browsing →
      </a>
    </div>
  );
}

// ── Mobile ────────────────────────────────────────────────────────────────
function WatchingOutMobile({ width = 390, height = 1020, note }) {
  const compact = width <= 340;
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: compact ? "14px 12px 16px" : "16px 16px 18px", display: "flex", flexDirection: "column", gap: compact ? 16 : 20 }}>
        <WatchingHead compact={compact} />
        <DemoList compact={compact} />
        <FactList compact={compact} />
        <WatchingCTA />
      </div>
      <BottomNav signedOut active="watching" />
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────
function WatchingOutDesktop({ width = 1200, height = 720, note }) {
  return (
    <Desk width={width} height={height}>
      <DesktopHeader signedOut active="Watching" />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "34px 28px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <WatchingHead />
            <WatchingCTA />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <DemoList />
            <FactList />
          </div>
        </div>
      </div>
      {note && <Note>{note}</Note>}
    </Desk>
  );
}

// ── Signed-in comparison: the shipped empty state, unchanged ──────────────
function WatchingEmptyIn({ width = 390, height = 620 }) {
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut={false} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 26px", textAlign: "center" }}>
        <span style={{ color: "var(--fg-subtle)" }}><IconEye s={30} /></span>
        <Mono size={10}>Watching</Mono>
        <span style={{ fontFamily: LO_UI, fontWeight: 800, fontSize: 21, letterSpacing: "-0.025em", color: "var(--fg)" }}>No shows, grandpa.</span>
        <span style={{ fontFamily: LO_UI, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>
          Add a show to follow it. Soon, we'll watch the price for you and notify you of drops, spikes, or sell-outs.
        </span>
        <Btn kind="primary" style={{ marginTop: 4 }}>Browse tonight's shows</Btn>
      </div>
      <BottomNav signedOut={false} active="watching" />
      <Note>Signed-in empty state — unchanged by #794. Shown for comparison: same route, different payload.</Note>
    </Phone>
  );
}

Object.assign(window, { WatchingOutMobile, WatchingOutDesktop, WatchingEmptyIn, DemoList, FactList });

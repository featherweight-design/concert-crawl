// lo-onboarding.jsx — #794 deliverables 6 + 7.
// §3.7 — onboarding becomes a POST-AUTH welcome: account first, then a
// two-minute tour that is skippable from every step and permanently reachable
// from the account menu ("How Concert Crawl works"). The theme step and the
// price-source honesty material survive verbatim in substance; the
// beta-insider voice is rewritten for a public audience.

const { Mono, LO_MONO, LO_UI, Lockup, CCMark, IconArrow, IconCheck, IconEye, IconChevron,
        Btn, Phone, Note, Art, InitialDisc, ThemeGrid } = window;

const LO_STEPS = ["welcome", "how", "today", "theme", "notyet", "done"];
const LO_STEP_LABELS = {
  welcome: "Welcome", how: "How it works", today: "Today",
  notyet: "Not yet", theme: "Make it yours", done: "That's the tour",
};

// ── Chrome: rail + skip ───────────────────────────────────────────────────
// The skip affordance sits in the top rail on EVERY step, same place, always
// reachable. Default weight is a quiet mono link — easy but not loud. When the
// visitor arrived mid-intent it becomes an outlined button and names the
// destination, because that person came to do one specific thing.
function StepRail({ step, intent, entry = "signup" }) {
  const i = LO_STEPS.indexOf(step) + 1;
  return (
    <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 14px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <CCMark size={20} />
          <Mono size={9} ls="0.12em" color="var(--fg-subtle)">
            {entry === "menu" ? "How it works" : `Step ${i} of 6`} · {LO_STEP_LABELS[step]}
          </Mono>
        </span>
        {intent ? (
          <Btn kind="outline" size="sm" style={{ minHeight: 36, padding: "8px 11px", fontSize: 11.5, borderRadius: 9 }}>
            Skip — back to {intent}
          </Btn>
        ) : (
          <a href="#" style={{ fontFamily: LO_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-muted)", textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center", padding: "0 2px" }}>
            {entry === "menu" ? "Close" : "Skip"}
          </a>
        )}
      </div>
      {intent && (
        <div role="status" style={{ padding: "8px 14px", borderTop: "1px solid var(--border)", background: "color-mix(in oklch, var(--signal) 8%, transparent)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--signal)", display: "flex" }}><IconEye s={13} filled /></span>
          <Mono size={9.5} ls="0.06em" color="var(--signal)">Watching {intent} — we'll take you back</Mono>
        </div>
      )}
      <div style={{ height: 2, background: "var(--border)" }}>
        <div style={{ height: 2, width: `${(i / 6) * 100}%`, background: "var(--signal)" }} />
      </div>
    </div>
  );
}

function StepFoot({ next = "Next", back = true }) {
  return (
    <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, background: "var(--bg-elevated)" }}>
      {back && <a href="#" style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 700, color: "var(--fg-muted)", textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>← Back</a>}
      <span style={{ flex: 1 }} />
      <Btn kind="primary" size="sm" style={{ minHeight: 40 }}>{next}<IconArrow s={12} /></Btn>
    </div>
  );
}

function StepBody({ children, gap = 14 }) {
  return <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap }}>{children}</div>;
}
function StepHead({ eyebrow, title, accent, lede }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Mono size={10} color="var(--accent)">{eyebrow}</Mono>
      <span style={{ fontFamily: LO_UI, fontWeight: 900, fontSize: 25, letterSpacing: "-0.035em", lineHeight: 1.1, color: "var(--fg)" }}>
        {title}{accent && <> <span style={{ color: "var(--signal)" }}>{accent}</span></>}
      </span>
      {lede && <span style={{ fontFamily: LO_UI, fontSize: 13, fontWeight: 500, color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>{lede}</span>}
    </div>
  );
}

// ── Step 1 · welcome (public voice — replaces the founder beta note) ──────
function StepWelcome({ intent, entry }) {
  return (
    <>
      <StepRail step="welcome" intent={intent} entry={entry} />
      <StepBody>
        <StepHead eyebrow="A note from the developer" title="Thanks for signing up." />
        {[
          "I'm Hugh. I go to a lot of shows. Concert Crawl is the thing I always wanted: one place to see what's playing, what it costs, and who to drag along.",
          "It covers Denver for now. It tells you where every price came from, and it says so plainly when it doesn't know one.",
          "This tour takes about two minutes. You can skip it — your account already works, and it lives in your account menu if you want it later.",
        ].map((p, i) => (
          <span key={i} style={{ fontFamily: LO_UI, fontSize: 13, fontWeight: 500, color: i === 0 ? "var(--fg)" : "var(--fg-muted)", lineHeight: 1.6, textWrap: "pretty" }}>{p}</span>
        ))}
        <span style={{ marginTop: "auto", fontFamily: LO_MONO, fontSize: 10, letterSpacing: "0.06em", color: "var(--fg-subtle)" }}>— Hugh</span>
      </StepBody>
      <StepFoot back={false} />
    </>
  );
}

// ── Step 2 · how it works (SURVIVES — price-source honesty) ──────────────
const LO_SOURCES = [
  { label: "Box office", kind: "success", d: "Straight from the venue. Face value, no markup." },
  { label: "Community", kind: "signal", d: "Reported by a fan, confirmed by others. We name the vendor." },
  { label: "Resale", kind: "warning", d: "A marketplace listing. Secondary market, not face value. We flag it." },
];
function StepHow({ intent, entry }) {
  return (
    <>
      <StepRail step="how" intent={intent} entry={entry} />
      <StepBody gap={13}>
        <StepHead eyebrow="How this works" title="Honest by design."
          lede="Two minutes on where the prices come from, and what we'll never do." />
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 9 }}>
            <Mono size={10} color="var(--signal)">01</Mono>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em" }}>We crawl, we don't sell.</span>
              <span style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>We read public listings from venues. We don't sell tickets and we don't take a cut. See the price, tap through, buy at the source.</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 9 }}>
            <Mono size={10} color="var(--signal)">02</Mono>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em" }}>Every price says where it came from.</span>
              {LO_SOURCES.map((s) => (
                <div key={s.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: LO_MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: `var(--${s.kind})`, border: `1px solid color-mix(in oklch, var(--${s.kind}) 45%, transparent)`,
                    borderRadius: 4, padding: "3px 5px", flexShrink: 0, whiteSpace: "nowrap",
                  }}>{s.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>{s.d}</span>
                </div>
              ))}
              <Mono size={9} ls="0.06em" color="var(--fg-subtle)">If we can't find a price, we say so.</Mono>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 9 }}>
            <Mono size={10} color="var(--signal)">03</Mono>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.015em" }}>Verifications expire.</span>
              <span style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>A community price gets more trustworthy once another fan confirms it — but even verified prices go stale after a week. We'll show you when one is old.</span>
            </div>
          </div>
        </div>
      </StepBody>
      <StepFoot />
    </>
  );
}

// ── Step 3 · today ────────────────────────────────────────────────────────
function StepToday({ intent, entry }) {
  const items = [
    "Browse every upcoming show in the Denver area",
    "Compare real prices side by side, with their sources",
    "Watch shows you're tracking — we follow the price",
    "Submit a price you saw, or confirm one someone else did",
  ];
  return (
    <>
      <StepRail step="today" intent={intent} entry={entry} />
      <StepBody>
        <StepHead eyebrow="Today" title="What you can do right now."
          lede="Denver first. Here's what's actually in front of you." />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {items.map((t) => (
            <div key={t} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 11px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--success)", flexShrink: 0, marginTop: 1 }}><IconCheck s={12} /></span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>
      </StepBody>
      <StepFoot />
    </>
  );
}

// ── Step 4 · theme (SURVIVES) ─────────────────────────────────────────────
function StepTheme({ intent, entry }) {
  return (
    <>
      <StepRail step="theme" intent={intent} entry={entry} />
      <StepBody>
        <StepHead eyebrow="Make it yours" title="Pick your drip."
          lede="Nine themes, different genre flavors. Pick one now, switch it any time from the account menu." />
        <ThemeGrid activeKey="electric" dense />
      </StepBody>
      <StepFoot />
    </>
  );
}

// ── Step 5 · not yet ──────────────────────────────────────────────────────
function StepNotYet({ intent, entry }) {
  const items = [
    ["Notifications.", "No push or email alerts yet. We'll bother you when it's ready."],
    ["Cities outside Denver.", "The crawl is regional for now. Others onboard later."],
    ["Artist following.", "Follow a band and we surface their shows before you go looking."],
    ["Price alerts.", "Watch a show and we'll ping you when it drops into your range."],
  ];
  return (
    <>
      <StepRail step="notyet" intent={intent} entry={entry} />
      <StepBody>
        <StepHead eyebrow="Not yet" title="What's missing."
          lede="These are coming, not abandoned. We'd rather say so than fake it." />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(([t, b]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 11, borderLeft: "1px solid var(--border-strong)" }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--fg)" }}>{t}</span>
              <span style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>{b}</span>
            </div>
          ))}
        </div>
      </StepBody>
      <StepFoot />
    </>
  );
}

// ── Step 6 · done (ends by returning you where you were) ─────────────────
function StepDone({ intent, entry }) {
  return (
    <>
      <StepRail step="done" intent={intent} entry={entry} />
      <StepBody>
        <StepHead eyebrow="You're in" title="That's the tour." accent="Go find something."
          lede="One favor, if you're up for it: most shows don't have a price yet. If you see one — at the box office, on a listing, on your receipt — drop it in. Every price you add makes the calendar more useful for the next person." />
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
          <Btn kind="primary" full size="lg">
            {intent ? `Back to ${intent}` : "Start browsing"}<IconArrow s={14} />
          </Btn>
          <Mono size={9} ls="0.1em" color="var(--fg-subtle)" style={{ textAlign: "center" }}>
            {intent ? "Your show is still watched · we saved it" : "The tour lives in your account menu"}
          </Mono>
        </div>
      </StepBody>
    </>
  );
}

const LO_STEP_COMPONENTS = {
  welcome: StepWelcome, how: StepHow, today: StepToday,
  theme: StepTheme, notyet: StepNotYet, done: StepDone,
};

function OnboardStep({ step = "welcome", intent = null, entry = "signup", width = 380, height = 740, note }) {
  const C = LO_STEP_COMPONENTS[step];
  return (
    <Phone width={width} height={height}>
      <C intent={intent} entry={entry} />
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

// ── Deliverable 7 · the post-signup return seam ──────────────────────────
// Frame 1 — Clerk's own screen (out of scope; stubbed so the seam reads).
function SeamClerk({ width = 380, height = 740 }) {
  return (
    <Phone width={width} height={height}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: "0 22px" }}>
        <Lockup mark={28} size={17} />
        <div style={{ border: "1px dashed var(--border-strong)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12, background: "var(--surface-1)" }}>
          <Mono size={9.5} color="var(--warning)">Clerk owns this screen</Mono>
          <span style={{ fontFamily: LO_UI, fontWeight: 800, fontSize: 19, letterSpacing: "-0.025em" }}>Create your account</span>
          {["Email", "Password"].map((f) => (
            <div key={f} style={{ height: 44, borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", display: "flex", alignItems: "center", padding: "0 12px" }}>
              <Mono size={10} ls="0.04em" color="var(--fg-subtle)">{f}</Mono>
            </div>
          ))}
          <Btn kind="primary" full>Continue</Btn>
        </div>
        <Mono size={9} ls="0.06em" color="var(--fg-subtle)" style={{ textAlign: "center" }}>
          ?redirect_url=/events/geese-ogden &amp;intent=watch
        </Mono>
      </div>
      <Note>Out of scope for #794. Shown only so the return path's two carried params are visible.</Note>
    </Phone>
  );
}

// Frame 3 — the destination, with the pending action applied and confirmed.
function SeamReturn({ width = 380, height = 740, confirmed = true }) {
  const { MobileHeader, BottomNav } = window;
  return (
    <Phone width={width} height={height}>
      <MobileHeader signedOut={false} />
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {confirmed && (
          <div role="status" aria-live="polite" style={{
            margin: "8px 14px 0", padding: "11px 12px", borderRadius: 11,
            background: "color-mix(in oklch, var(--signal) 13%, var(--surface-1))",
            border: "1px solid color-mix(in oklch, var(--signal) 45%, transparent)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ color: "var(--signal)", display: "flex" }}><IconEye s={17} filled /></span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: LO_UI, fontSize: 12.5, fontWeight: 800, color: "var(--fg)" }}>Now watching Geese.</span>
              <Mono size={9} ls="0.06em" color="var(--fg-muted)">Kept while you were signing up</Mono>
            </div>
            <a href="#" style={{ fontFamily: LO_MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--signal)", textDecoration: "none", minHeight: 44, display: "flex", alignItems: "center" }}>View</a>
          </div>
        )}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Art artist="Geese" size={width - 28} radius={12} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontFamily: LO_UI, fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}>Geese</span>
              <Mono size={10} ls="0.04em" color="var(--fg-muted)">Ogden Theatre · Tonight · 9:00 PM</Mono>
            </div>
            {window.WatchEye ? <window.WatchEye artist="Geese" state="watching" /> : null}
          </div>
          <div style={{ padding: "12px 13px", borderRadius: 12, background: "var(--surface-1)", border: "1px solid var(--border)", display: "flex", alignItems: "baseline", gap: 8 }}>
            <Mono size={20} ls="0.01em" color="var(--fg)">$25</Mono>
            <Mono size={9.5} ls="0.08em" color="var(--fg-subtle)">box office · face value</Mono>
          </div>
        </div>
      </div>
      <BottomNav signedOut={false} active="browse" />
      <Note>role="status" · announced once · dismisses after 6s or on any navigation. The eye is already filled — the confirmation explains the change, it doesn't perform it.</Note>
    </Phone>
  );
}

// The seam, as a path.
function SeamDiagram({ width = 1080, height = 420 }) {
  const steps = [
    { k: "01", t: "Tap the eye", d: "On any card or detail page, signed out.", c: "var(--fg-muted)" },
    { k: "02", t: "Tier picker opens", d: "Feature-anchored. Sign up free is the primary.", c: "var(--signal)" },
    { k: "03", t: "Clerk sign-up", d: "redirect_url + intent ride along in the query.", c: "var(--fg-muted)" },
    { k: "04", t: "Welcome tour", d: "Skippable from step 1. Rail names the pending show.", c: "var(--accent)" },
    { k: "05", t: "Back where you were", d: "Action applied, confirmed once, announced once.", c: "var(--success)" },
  ];
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 26, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Mono size={10} color="var(--accent)">Return seam · §3.7 + §3.12</Mono>
        <span style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em" }}>One intent, carried the whole way.</span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 720, textWrap: "pretty" }}>
          The same seam serves a gated-route redirect (§3.12) and the post-signup return (§3.7): both preserve a
          destination, and the second also preserves an action. If the action can't be replayed, the visitor still
          lands on the destination — never on <code>/</code>.
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        {steps.map((s, i) => (
          <React.Fragment key={s.k}>
            <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--surface-1)", display: "flex", flexDirection: "column", gap: 7 }}>
              <Mono size={10} color={s.c}>{s.k}</Mono>
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.t}</span>
              <span style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{s.d}</span>
            </div>
            {i < steps.length - 1 && <span style={{ alignSelf: "center", color: "var(--fg-subtle)", display: "flex" }}><IconArrow s={15} /></span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {[
          ["Gated route, no session", "/watching/settings → /sign-in?redirect_url=… → back to the route. Never a bounce to /."],
          ["Action can't be replayed", "Show sold out or unlinked mid-flow: land on the destination, no confirmation strip, no error."],
          ["Skipped the tour", "Skip goes straight to step 05. The action is applied and confirmed identically."],
        ].map(([t, d]) => (
          <div key={t} style={{ flex: 1, borderLeft: "1px solid var(--border-strong)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 3 }}>
            <Mono size={9.5} color="var(--fg-subtle)">{t}</Mono>
            <span style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { OnboardStep, SeamClerk, SeamReturn, SeamDiagram, StepRail });

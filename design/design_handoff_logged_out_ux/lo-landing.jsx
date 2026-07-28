// lo-landing.jsx — #794 deliverable 5: the reworked landing CTA block.
// §3.9 — primary becomes "Browse shows" → /events; secondary Sign up; the
// "I have a code" and waitlist CTAs retire; the four hero posters become live
// links. The hero keeps the SHIPPED poster animation — `LandingPosterAnimation`
// mode="stack" from design_handoff_landing_poster_v2, rendering the shipped
// `LandingPoster` over the Phase 7.5 IdentityArt engine. #794 does not redesign
// the poster or its motion; it only makes the cards linkable.

const { Mono, LO_MONO, LO_UI, Lockup, IconArrow, Btn, Phone, Desk, Note } = window;

// Link chrome wrapped around the shipped poster. Rest / hover / focus-visible /
// press — the poster art itself is untouched.
function PosterLink({ show, state = "rest", w = 260, h = 364 }) {
  const hover = state === "hover", press = state === "press", focus = state === "focus";
  return (
    <a href="#" aria-label={`${show.artist} at ${show.venue}, ${show.dateShort}. See the show`} style={{
      display: "block", position: "relative", textDecoration: "none", borderRadius: 14,
      transform: hover ? "translateY(-4px)" : press ? "scale(0.99)" : "none",
      boxShadow: hover ? "0 18px 40px color-mix(in oklch, var(--bg) 62%, transparent)" : "none",
      outline: focus ? "2px solid var(--focus)" : "none", outlineOffset: 3,
      transition: "transform 140ms, box-shadow 140ms",
    }}>
      {window.LandingPoster ? <window.LandingPoster show={show} width={w} height={h} /> : null}
      <span style={{
        position: "absolute", right: 10, bottom: 10,
        width: 32, height: 32, borderRadius: 999,
        background: "var(--signal)", color: "var(--fg-on-accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: hover || focus || press ? 1 : 0, transition: "opacity 140ms",
      }}><IconArrow s={14} /></span>
    </a>
  );
}

// ── The CTA block itself ──────────────────────────────────────────────────
// Two CTAs and one mono reassurance line. Nothing absorbs the retired code /
// waitlist buttons — the block simply gets shorter.
function CTABlock({ stacked = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11, alignItems: stacked ? "stretch" : "flex-start" }}>
      <div style={{ display: "flex", flexDirection: stacked ? "column" : "row", gap: 10, alignItems: "stretch" }}>
        <Btn kind="primary" size="lg" full={stacked} style={{ paddingLeft: 22, paddingRight: 22 }}>Browse shows<IconArrow s={14} /></Btn>
        <Btn kind="outline" size="lg" full={stacked} style={{ paddingLeft: 20, paddingRight: 20 }}>Sign up</Btn>
      </div>
      <Mono size={9.5} ls="0.1em" color="var(--fg-subtle)">No account needed to look around</Mono>
    </div>
  );
}

function LandingHead({ compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 16, maxWidth: 560 }}>
      <Mono size={10} color="var(--accent)">Denver · updated hourly</Mono>
      <span style={{ fontFamily: LO_UI, fontWeight: 900, fontSize: compact ? 36 : 56, letterSpacing: "-0.045em", lineHeight: 0.98, color: "var(--fg)" }}>
        See who's<br />playing <span style={{ color: "var(--accent)" }}>tonight.</span>
      </span>
      <span style={{ fontFamily: LO_UI, fontSize: compact ? 14 : 16.5, fontWeight: 500, color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>
        Every show in Denver, in one place — and what it actually costs. Built for
        the fans, not the shareholders.
      </span>
    </div>
  );
}

// The stack animation is real motion with real timers, and each advance fully
// remounts its poster cards (LPStack keys layers by index) — every remount
// re-renders a hero-scale IdentityArt, which is hundreds of SVG nodes apiece.
// In the canvas only ONE artboard runs it, on a slow interval, so a
// 48-artboard document stays interactive. Production runs the shipped
// intervalMs (5200) on a page with exactly one stack.
function PosterStage({ width = 300, intervalMs = 5200, animate = false, cards = 3 }) {
  const shows = window.LP_EVENTS || [];
  if (!shows.length || !window.LandingPoster) return null;
  if (animate && window.LandingPosterAnimation) {
    return <window.LandingPosterAnimation mode="stack" shows={shows} width={width} intervalMs={intervalMs} />;
  }
  const h = Math.round(width * 1.38);
  const off = width * 0.04;
  const layers = [
    { x: -off * 0.8, y: off * 1.4, r: -5, s: 0.97, b: 0.92, z: 8 },
    { x: off, y: off * 0.7, r: 3.5, s: 0.985, b: 0.96, z: 9 },
    { x: 0, y: 0, r: -1.5, s: 1, b: 1, z: 10 },
  ].slice(-cards);
  const padX = Math.max(28, Math.round(width * 0.14));
  const padY = Math.max(36, Math.round(width * 0.18));
  return (
    <div style={{ width: width + padX * 2, height: h + padY * 2, position: "relative" }}>
      {layers.map((l, i) => (
        <div key={i} style={{
          position: "absolute", left: padX, top: padY, zIndex: l.z,
          transform: `translate(${l.x}px, ${l.y}px) rotate(${l.r}deg) scale(${l.s})`,
          transformOrigin: "30% 100%", filter: `brightness(${l.b})`,
        }}>
          <window.LandingPoster show={shows[i % shows.length]} width={width} height={h} />
        </div>
      ))}
      <div style={{ position: "absolute", left: "50%", bottom: Math.round(padY * 0.25), transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 20 }}>
        {shows.slice(0, 4).map((_, i) => (
          <span key={i} style={{ width: i === 2 ? 16 : 6, height: 6, borderRadius: 3, background: i === 2 ? "var(--fg)" : "color-mix(in oklch, var(--fg) 30%, transparent)" }} />
        ))}
      </div>
    </div>
  );
}

function LandingDesktop({ width = 1200, height = 860, note, animate = false, intervalMs = 5200 }) {
  return (
    <Desk width={width} height={height}>
      <div style={{ height: 68, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
        <Lockup mark={30} size={17} />
        <a href="#" style={{ fontFamily: LO_UI, fontSize: 13.5, fontWeight: 700, color: "var(--fg-muted)", textDecoration: "none", padding: "10px 8px", minHeight: 44, display: "flex", alignItems: "center" }}>Sign in</a>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: "10px 40px 0", display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <LandingHead />
          <CTABlock />
          <a href="#" style={{ fontFamily: LO_UI, fontSize: 13.5, fontWeight: 700, color: "var(--signal)", textDecoration: "none", display: "flex", alignItems: "center", gap: 7, minHeight: 44 }}>
            See all 214 shows this week<IconArrow s={13} />
          </a>
        </div>
        <PosterStage width={286} animate={animate} intervalMs={intervalMs} cards={2} />
      </div>
      {note && <Note>{note}</Note>}
    </Desk>
  );
}

function LandingMobile({ width = 390, height = 880, note }) {
  const compact = width <= 340;
  return (
    <Phone width={width} height={height}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
        <Lockup mark={26} size={16} />
        <a href="#" style={{ fontFamily: LO_UI, fontSize: 13, fontWeight: 700, color: "var(--fg-muted)", textDecoration: "none", padding: "10px 4px", minHeight: 44, display: "flex", alignItems: "center" }}>Sign in</a>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: compact ? "10px 14px 0" : "12px 16px 0", display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
        <LandingHead compact />
        <CTABlock stacked />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <PosterStage width={compact ? 176 : 200} cards={1} />
        </div>
        <a href="#" style={{ fontFamily: LO_UI, fontSize: 13, fontWeight: 700, color: "var(--signal)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44 }}>
          See all 214 shows this week<IconArrow s={12} />
        </a>
      </div>
      {note && <Note>{note}</Note>}
    </Phone>
  );
}

// ── Poster interaction states, at size ────────────────────────────────────
function PosterStates({ width = 1160, height = 520 }) {
  const shows = window.LP_EVENTS || [];
  const states = ["rest", "hover", "focus"];
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Mono size={10} color="var(--accent)">Hero posters · now links</Mono>
        <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-0.025em" }}>One target per poster. The whole card.</span>
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 760, textWrap: "pretty" }}>
          The poster and its stack animation are unchanged (`LandingPosterAnimation` mode="stack").
          #794 adds only the link chrome: lift on hover, standard focus ring, settle on press, and an
          arrow badge that appears on all three.
        </span>
      </div>
      <div style={{ display: "flex", gap: 26 }}>
        {states.map((s, i) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <PosterLink show={shows[i % Math.max(shows.length, 1)]} state={s} w={210} h={294} />
            <Mono size={9} ls="0.1em" color="var(--fg-subtle)">{s}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Before / after the CTA block, and the ISR boundary ────────────────────
function CTARetirement({ width = 700, height = 640 }) {
  const retired = [
    ["Primary", "I have a code → /auth/code", "Browse shows → /events"],
    ["Secondary", "Join the waitlist (modal)", "Sign up → /sign-up"],
    ["Tertiary", "Sign in → /sign-in", "Sign in — moves to the top bar"],
    ["Header pill", "PRIVATE BETA", "Retires with the beta artifacts"],
    ["Hero posters", "Display only, no links", "Each poster links to /events/[id]"],
    ["Poster motion", "Stack animation", "Unchanged — kept as-is"],
  ];
  return (
    <div style={{ width, height, boxSizing: "border-box", background: "var(--bg)", color: "var(--fg)", fontFamily: LO_UI, padding: 24, display: "flex", flexDirection: "column", gap: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Mono size={10} color="var(--accent)">Landing · what changes</Mono>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}>The block gets shorter, not busier.</span>
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty" }}>
          Nothing moves into the space the retired CTAs held. The "see all" line does the work the code
          button used to, and the poster stack keeps its own motion untouched.
        </span>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        {retired.map((r, i) => (
          <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "96px 1fr 1fr", gap: 10, padding: "10px 12px", borderBottom: i === retired.length - 1 ? "none" : "1px solid var(--border)", alignItems: "center" }}>
            <Mono size={9} color="var(--fg-subtle)">{r[0]}</Mono>
            <span style={{ fontFamily: LO_MONO, fontSize: 10.5, color: "var(--fg-subtle)", textDecoration: r[2].startsWith("Unchanged") ? "none" : "line-through", lineHeight: 1.4 }}>{r[1]}</span>
            <span style={{ fontFamily: LO_MONO, fontSize: 10.5, color: "var(--signal)", lineHeight: 1.4 }}>{r[2]}</span>
          </div>
        ))}
      </div>
      <div style={{ border: "1px solid var(--border-strong)", borderRadius: 10, padding: 15, background: "var(--surface-1)", display: "flex", flexDirection: "column", gap: 8 }}>
        <Mono size={9.5} color="var(--warning)">ISR · revalidate = 300</Mono>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Nothing on this page needs to know who you are.</span>
        <span style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>
          Middleware already redirects a signed-in request off <code>/</code> to <code>/events</code>, so the
          landing page only ever renders for a visitor with no session. That lets the whole CTA block stay in
          the ISR shell — no <code>auth()</code>, no <code>cookies()</code>, no dynamic render. The poster
          stack is already a Client Component and stays one; making its cards links adds no auth dependency.
          If a signed-in variant of <code>/</code> is ever wanted, the island boundary is this block alone.
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { LandingDesktop, LandingMobile, PosterStates, CTARetirement, PosterLink, PosterStage, CTABlock });

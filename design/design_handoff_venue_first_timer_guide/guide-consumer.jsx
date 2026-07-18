// guide-consumer.jsx — #764 consumer surfaces
// Venue detail (first-timer populated / thin / returner / anonymous) + Event
// detail. Single-column rhythm matching the production venue page (About + map
// kept; guide sits inline as a peer section, never a sidebar). Tokens only.

const { GuideIcon, CHIP_ORDER, CHIP_DEFS } = window;
const {
  ROXY_GUIDE_COPY, ROXY_VIBE, ROXY_THIN_COPY, ROXY_THIN_VIBE,
  CALLOUT_COPY, EVENT_CHIP_COPY, PLACEHOLDER_COPY,
  ROXY_VENUE, ROXY_ABOUT, ROXY_UPCOMING, ROXY_EVENT,
} = window;
const GF = window.G_FONT, GM = window.G_MONO;
const IdentityArt = window.IdentityArt;

// ── Hero — real risograph identity art (matches prod) ──────────────────────
function Hero({ name, kind = "venue", height = 220, showInitials = true }) {
  return (
    <div style={{ position: "relative", width: "100%", height, flexShrink: 0, overflow: "hidden" }}>
      <IdentityArt name={name} kind={kind} scale="hero" showInitials={showInitials} grain={0.1} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90,
        background: "linear-gradient(transparent, var(--bg))" }} />
    </div>
  );
}
function ArtTile({ name, kind = "artist", size = 44 }) {
  return <div style={{ width: size, height: size, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
    <IdentityArt name={name} kind={kind} scale="tile" showInitials={false} grain={0.05} /></div>;
}
function BackButton() {
  return <div style={{ position: "absolute", top: 12, left: 12, zIndex: 5, width: 36, height: 36,
    borderRadius: 18, background: "var(--scrim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="9" height="15" viewBox="0 0 10 16" fill="none"><path d="M8 2L2 8l6 6"
      stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}

// ── Mono eyebrow ───────────────────────────────────────────────────────────
function Eyebrow({ children, color = "var(--fg-subtle)", size = 9.5, style }) {
  return <div style={{ fontFamily: GM, fontSize: size, fontWeight: 700, letterSpacing: "0.14em",
    textTransform: "uppercase", color, ...style }}>{children}</div>;
}

// ── First-timer callout — warm inline card. Copy is a QUESTION. ────────────
function FirstTimerCallout({ variant = "populated", onJump }) {
  const c = CALLOUT_COPY[variant];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12,
      background: "color-mix(in oklab, var(--accent) 12%, var(--bg))",
      border: "1px solid color-mix(in oklab, var(--accent) 32%, transparent)" }}>
      <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9,
        background: "color-mix(in oklab, var(--accent) 20%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="5" cy="14.5" r="1.6" fill="var(--accent)" opacity="0.55" />
          <circle cx="10" cy="10" r="2.1" fill="var(--accent)" opacity="0.8" />
          <circle cx="15" cy="5" r="2.8" fill="var(--signal)" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow color="var(--accent)" size={9}>New here</Eyebrow>
        <div style={{ fontFamily: GF, fontWeight: 800, fontSize: 15.5, color: "var(--fg)",
          letterSpacing: "-0.02em", marginTop: 3 }}>{c.q}</div>
        <div style={{ fontFamily: GF, fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2,
          lineHeight: 1.4, textWrap: "pretty" }}>{c.sub}</div>
      </div>
      <button onClick={onJump} aria-label="Jump to the first-timer guide" style={{
        all: "unset", cursor: "pointer", flexShrink: 0, minWidth: 44, minHeight: 44,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        color: "var(--signal)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v9M4.5 8.5L8 12l3.5-3.5" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: GM, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em" }}>GUIDE</span>
      </button>
    </div>
  );
}

// ── Single guide chip — icon + mono label + concert-goer line ──────────────
function GuideChip({ chipKey, value, first }) {
  const def = CHIP_DEFS[chipKey];
  const isAccess = chipKey === "accessibility";
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0",
      borderTop: first ? "none" : "1px solid var(--border)" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isAccess ? "color-mix(in oklab, var(--signal) 14%, transparent)" : "var(--surface-2)",
        color: isAccess ? "var(--signal)" : "var(--fg-muted)" }}>
        <GuideIcon name={def.icon} size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Eyebrow color={isAccess ? "var(--signal)" : "var(--fg-subtle)"}>{def.label}</Eyebrow>
          {def.star && <span style={{ fontFamily: GM, fontSize: 8, fontWeight: 700, color: "var(--signal)",
            letterSpacing: "0.08em" }}>★ ALWAYS HERE</span>}
        </div>
        <div style={{ fontFamily: GF, fontSize: 13.5, color: "var(--fg)", lineHeight: 1.5,
          marginTop: 3, letterSpacing: "-0.005em", textWrap: "pretty" }}>{value}</div>
      </div>
    </div>
  );
}

// ── Accessibility honest-placeholder chip (its designed 2nd state) ─────────
function AccessPlaceholderChip({ first }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0",
      borderTop: first ? "none" : "1px solid var(--border)" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--surface-2)", color: "var(--fg-subtle)",
        border: "1px dashed var(--border-strong)" }}>
        <GuideIcon name="access" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Eyebrow>Accessibility</Eyebrow>
          <span style={{ fontFamily: GM, fontSize: 8, fontWeight: 700, color: "var(--fg-subtle)",
            letterSpacing: "0.08em" }}>NOT DOCUMENTED</span>
        </div>
        <div style={{ fontFamily: GF, fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5,
          marginTop: 3, letterSpacing: "-0.005em", textWrap: "pretty" }}>{PLACEHOLDER_COPY.accessibility}</div>
      </div>
    </div>
  );
}

// ── Vibe line — the personality carrier. LEADS the guide. ──────────────────
function VibeLine({ text, lead }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: lead ? 14 : 0, marginTop: lead ? 0 : 14,
      padding: "13px 14px", borderRadius: 10,
      background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <Eyebrow color="var(--accent)">Insider tip</Eyebrow>
      <div style={{ fontFamily: GF, fontSize: 14.5, color: "var(--fg)", lineHeight: 1.55,
        marginTop: 6, letterSpacing: "-0.01em", textWrap: "pretty" }}>{text}</div>
    </div>
  );
}

// ── Thin "still gathering" cluster — honest, not faked ─────────────────────
function StillGathering() {
  const missing = CHIP_ORDER.filter((k) => k !== "accessibility");
  return (
    <div style={{ marginTop: 14 }}>
      <Eyebrow>{PLACEHOLDER_COPY.thinLabel}</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {missing.map((k) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 9px", borderRadius: 999, background: "transparent",
            border: "1px dashed var(--border-strong)", color: "var(--fg-subtle)",
            fontFamily: GF, fontSize: 11.5, fontWeight: 500 }}>
            <GuideIcon name={CHIP_DEFS[k].icon} size={12} />{CHIP_DEFS[k].label}
          </span>
        ))}
      </div>
      <div style={{ fontFamily: GF, fontSize: 12, color: "var(--fg-subtle)", marginTop: 10,
        fontStyle: "italic", letterSpacing: "-0.005em" }}>{PLACEHOLDER_COPY.thinFooter}</div>
    </div>
  );
}

// ── Guide section — modes: populated | thin | returner ─────────────────────
// Vibe line LEADS (populated + returner-open); chips follow.
function GuideSection({ mode = "populated", startOpen, columns = 1 }) {
  const thin = mode === "thin";
  const copy = thin ? ROXY_THIN_COPY : ROXY_GUIDE_COPY;
  const vibe = thin ? ROXY_THIN_VIBE : ROXY_VIBE;
  const authored = CHIP_ORDER.filter((k) => copy[k]);
  const [open, setOpen] = React.useState(mode === "returner" ? !!startOpen : true);

  const Chips = (
    <div style={columns === 2 ? { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 28 } : undefined}>
      {authored.map((k, i) => (
        <div key={k} style={columns === 2 ? { minWidth: 0 } : undefined}>
          <GuideChip chipKey={k} value={copy[k]} first={columns === 2 ? true : i === 0} />
        </div>
      ))}
    </div>
  );

  // Returner: an accent-styled card so it stands out even for repeat visitors —
  // this is a feature worth noticing, not a muted afterthought. One gesture opens it.
  if (mode === "returner") {
    const preview = authored.slice(0, 3).map((k) => CHIP_DEFS[k].label).join(" · ");
    const extra = authored.length - 3;
    return (
      <div style={{ borderRadius: 12, overflow: "hidden",
        background: "color-mix(in oklab, var(--accent) 9%, var(--bg))",
        border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{
          all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 11,
          width: "100%", minHeight: 44, padding: "12px 14px", boxSizing: "border-box" }}>
          <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8,
            background: "color-mix(in oklab, var(--accent) 18%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="5" cy="14.5" r="1.5" fill="var(--accent)" opacity="0.55" />
              <circle cx="10" cy="10" r="2" fill="var(--accent)" opacity="0.8" />
              <circle cx="15" cy="5" r="2.6" fill="var(--signal)" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow color="var(--accent)">First-timer guide</Eyebrow>
            <div style={{ fontFamily: GF, fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {open ? "The stuff worth knowing before you walk in" : `${preview}${extra > 0 ? ` +${extra}` : ""}`}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 12 12" style={{ flexShrink: 0, color: "var(--accent)",
            transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform .15s" }}>
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </button>
        {open && (
          <div style={{ padding: "0 14px 14px" }}>
            <VibeLine text={vibe} lead />
            {Chips}
          </div>
        )}
      </div>
    );
  }

  // First-timer populated / thin
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: GF, fontWeight: 800, fontSize: 15, color: "var(--fg)",
          letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Before you go</span>
        <Eyebrow color="var(--signal)">First-timer guide</Eyebrow>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <VibeLine text={vibe} lead />
      {Chips}
      {thin && <StillGathering />}
    </div>
  );
}

// ── About (venue personality — kept per prod) ──────────────────────────────
function AboutSection({ text }) {
  return (
    <div>
      <Eyebrow>About</Eyebrow>
      <p style={{ margin: "6px 0 0", fontFamily: GF, fontSize: 13.5, color: "var(--fg-muted)",
        lineHeight: 1.6, textWrap: "pretty" }}>{text}</p>
    </div>
  );
}

// ── Directions link ────────────────────────────────────────────────────────
function DirectionsRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <span style={{ fontFamily: GM, fontSize: 10.5, color: "var(--fg-muted)", letterSpacing: "0.04em",
        textTransform: "uppercase" }}>{ROXY_VENUE.city}</span>
      <span style={{ color: "var(--fg-subtle)" }}>·</span>
      <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: GM, fontSize: 10.5, fontWeight: 700, color: "var(--signal)", letterSpacing: "0.04em",
        textTransform: "uppercase", textDecoration: "none" }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 7h7M7 3l4 4-4 4"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Directions
      </a>
    </div>
  );
}

// ── Basics row — Capacity / Upcoming / Type (matches prod) ─────────────────
function BasicsRow() {
  const items = [
    ["Capacity", ROXY_VENUE.capacity],
    ["Upcoming", String(ROXY_VENUE.upcoming), true],
    ["Type", ROXY_VENUE.type],
  ];
  return (
    <div style={{ display: "flex", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      {items.map(([l, v, sig], i) => (
        <div key={l} style={{ flex: 1, padding: "12px 0", minWidth: 0,
          borderLeft: i > 0 ? "1px solid var(--border)" : "none", paddingLeft: i > 0 ? 16 : 0 }}>
          <Eyebrow>{l}</Eyebrow>
          <div style={{ fontFamily: GF, fontSize: 15, fontWeight: 700,
            color: sig ? "var(--signal)" : "var(--fg)", marginTop: 4, letterSpacing: "-0.01em" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ── Upcoming list ──────────────────────────────────────────────────────────
function UpcomingList({ compact }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: GF, fontWeight: 800, fontSize: 15, color: "var(--fg)",
          letterSpacing: "-0.01em" }}>Upcoming</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontFamily: GM, fontSize: 9, color: "var(--fg-subtle)" }}>{ROXY_VENUE.upcoming} shows</span>
      </div>
      {ROXY_UPCOMING.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
          borderBottom: i < ROXY_UPCOMING.length - 1 ? "1px solid var(--border)" : "none" }}>
          <ArtTile name={s.artist} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: GF, fontWeight: 700, fontSize: 13.5, color: "var(--fg)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.artist}</div>
            <div style={{ fontFamily: GM, fontSize: 9.5, color: "var(--fg-muted)", marginTop: 2 }}>
              {s.date} · {s.time}</div>
          </div>
          {compact ? (
            <span style={{ fontFamily: GF, fontWeight: 800, fontSize: 12,
              color: s.price ? "var(--signal)" : "var(--fg-subtle)" }}>{s.price || "tba"}</span>
          ) : (
            <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              minHeight: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border-strong)",
              background: "var(--surface-1)", color: "var(--fg)", fontFamily: GF, fontSize: 12, fontWeight: 600 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Watch this show
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Venue detail — single column (mobile + desktop share the ordering) ─────
function VenueDetail({ mode = "populated", desktop = false, startOpen = false }) {
  const showCallout = mode === "populated" || mode === "thin";
  const calloutVariant = mode === "thin" ? "thin" : "populated";
  const maxW = desktop ? 760 : "100%";
  const sidePad = desktop ? 24 : 18;

  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: GF, minHeight: "100%" }}>
      <div style={{ position: "relative" }}>
        <Hero name={ROXY_VENUE.name} kind="venue" height={desktop ? 260 : 200} />
        <BackButton />
      </div>
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: `0 ${sidePad}px ${desktop ? 48 : 28}px`,
        marginTop: desktop ? -34 : -18, position: "relative" }}>
        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, background: "var(--surface-3)",
          color: "var(--fg-muted)", fontFamily: GM, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {ROXY_VENUE.type}</span>
        <h1 style={{ margin: "8px 0 0", fontFamily: GF, fontWeight: 900,
          fontSize: desktop ? 40 : 27, letterSpacing: "-0.03em", color: "var(--fg)" }}>{ROXY_VENUE.name}</h1>
        <DirectionsRow />

        {/* Venue basics + About sit ABOVE the callout so the whole "Before you
            go" block (callout + guide) reads as one contiguous unit. */}
        <div style={{ marginTop: 18 }}><BasicsRow /></div>
        <div style={{ marginTop: 18 }}><AboutSection text={ROXY_ABOUT} /></div>

        {showCallout && <div style={{ marginTop: 22 }}>
          <FirstTimerCallout variant={calloutVariant}
            onJump={() => document.getElementById("ft-guide")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        </div>}

        <div id="ft-guide" style={{ marginTop: showCallout ? 16 : 22, scrollMarginTop: 12 }}>
          <GuideSection mode={mode} startOpen={startOpen} columns={desktop && mode !== "returner" ? 2 : 1} />
        </div>

        <div style={{ marginTop: 26 }}><UpcomingList /></div>
      </div>
    </div>
  );
}

// ── Event detail — chip lives with the VENUE row, right-aligned, signal-tinted ─
// Signal (not accent) so it never reads as another commit action next to the
// accent Watching pill / Get Tickets CTA.
function WatchingPill({ watching = true }) {
  return (
    <button style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
      minHeight: 34, padding: "0 13px", borderRadius: 8, border: "1.5px solid var(--accent)",
      background: watching ? "color-mix(in oklab, var(--accent) 16%, transparent)" : "transparent",
      color: "var(--accent)", fontFamily: GF, fontWeight: 700, fontSize: 13 }}>
      {watching
        ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9l4.5-5.5"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
      {watching ? "Watching" : "Watch this show"}
    </button>
  );
}

function EventVenueRow({ firstTimer }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "9px 0" }}>
      <Eyebrow>Venue</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9, minWidth: 0 }}>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: GF, fontWeight: 600, fontSize: 14, color: "var(--fg)", textDecoration: "none" }}>
          {ROXY_EVENT.venue}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5l4 3.5-4 3.5"
            stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        {/* first-timer chip — right-aligned with the page, signal-tinted so it's
            distinct from the accent commit actions above */}
        {firstTimer && <EventFirstTimerChip />}
      </div>
    </div>
  );
}

function EventFirstTimerChip() {
  // In prod this resolves cross-page: href={`/venues/${venue.slug}#ft-guide`}.
  // Prototype uses the venue-page anchor shape to document intent; preventDefault
  // keeps the canvas static (same convention as other prototype links here).
  return (
    <a href="/venues/roxy-music-hall#ft-guide" onClick={(e) => e.preventDefault()} style={{
      all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
      minHeight: 32, padding: "0 11px", borderRadius: 999,
      background: "color-mix(in oklab, var(--signal) 14%, transparent)",
      border: "1px solid color-mix(in oklab, var(--signal) 34%, transparent)", color: "var(--signal)" }}>
      <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="5" cy="14.5" r="1.5" fill="currentColor" opacity="0.55" />
        <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.8" />
        <circle cx="15" cy="5" r="2.6" fill="currentColor" />
      </svg>
      <span style={{ fontFamily: GF, fontWeight: 700, fontSize: 12, letterSpacing: "-0.005em" }}>
        {EVENT_CHIP_COPY}</span>
      <span style={{ fontFamily: GF, fontWeight: 700, fontSize: 13 }}>→</span>
    </a>
  );
}

function EventDetail({ firstTimer = true }) {
  const e = ROXY_EVENT;
  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", fontFamily: GF, minHeight: "100%" }}>
      <div style={{ position: "relative" }}>
        <Hero name={e.artist} kind="artist" height={230} />
        <BackButton />
      </div>
      <div style={{ padding: "0 18px", marginTop: -16, position: "relative" }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {e.genre.map((g) => (
            <span key={g} style={{ padding: "3px 8px", borderRadius: 4, background: "var(--surface-3)",
              color: "var(--fg-muted)", fontFamily: GM, fontSize: 9, letterSpacing: "0.03em" }}>{g}</span>
          ))}
        </div>
        <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em",
          lineHeight: 1.1, color: "var(--fg)" }}>{e.artist}</h1>
        <div style={{ fontWeight: 500, fontSize: 14, color: "var(--fg-muted)", marginTop: 4 }}>{e.title}</div>

        {/* Commitment actions — Watching now, Going later (Concert History).
            These own the space under the title; the guide chip stays out of it. */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <WatchingPill watching />
        </div>

        <div style={{ marginTop: 14, padding: "4px 0", borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)" }}>
          <EventVenueRow firstTimer={firstTimer} />
          <div style={{ height: 1, background: "var(--border)" }} />
          {[["Date", e.date], ["Doors / Show", `${e.doors} / ${e.showTime}`], ["Ages", e.ages]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0" }}>
              <Eyebrow>{l}</Eyebrow>
              <span style={{ fontFamily: GF, fontWeight: 600, fontSize: 13.5, color: "var(--fg)" }}>{v}</span>
            </div>
          ))}
        </div>
        <a href="#" onClick={(ev) => ev.preventDefault()} style={{ all: "unset", cursor: "pointer",
          display: "flex", marginTop: 16, height: 48, borderRadius: 10, background: "var(--accent)",
          color: "var(--fg-on-accent)", fontFamily: GF, fontWeight: 800, fontSize: 15,
          alignItems: "center", justifyContent: "center" }}>Get Tickets ↗</a>
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

Object.assign(window, {
  Hero, ArtTile, Eyebrow, FirstTimerCallout, GuideChip, AccessPlaceholderChip,
  VibeLine, StillGathering, GuideSection, AboutSection,
  VenueDetail, EventDetail, EventFirstTimerChip, WatchingPill,
});

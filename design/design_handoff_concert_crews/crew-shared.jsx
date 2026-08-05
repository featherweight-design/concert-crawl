// crew-shared.jsx — atoms + fixtures for Concert Crews (#1226).
//
// Atoms are LIFTED, not reinvented (CLAUDE.md §4): CMark is a verbatim copy of
// CCMark from browse-home.jsx; MonoEyebrow / RailHeader / SheetChrome /
// ModalChrome / Scrim / DragHandle match monetization-shared.jsx so crew
// surfaces sit inside the shipped sheet vocabulary.
//
// New here, and only here:
//   <MemberDot/> <MemberCluster/>  — the honest-identity monogram (#762)
//   <CrewRow/> <StubRow/>          — crew list row + shared-past ticket stub
//   <SectionRail/> <Btn/>          — small layout + action atoms
//   CREWS · CREW_MEMBERS · CREW_NIGHTS · CREW_LENS_SHOWS   — fixtures
//
// Crew ids are the SEED for crew art and are written the way the row id will
// look in production: minted once at creation, never derived from name or
// membership.

const CS_UI = "Inter, system-ui, sans-serif";
const CS_MONO = "'JetBrains Mono', ui-monospace, monospace";
const CS_SR = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };

// ── Cluster Path mark — verbatim copy of CCMark in browse-home.jsx (CLAUDE.md §1) ──
function CMark({ size = 24 }) {
  const trail = [
    { x: 14, y: 76, r: 1.5 }, { x: 24, y: 70, r: 2 },
    { x: 34, y: 64, r: 2.5 }, { x: 42, y: 58, r: 3 },
    { x: 50, y: 50, r: 4 },   { x: 58, y: 42, r: 5 },
    { x: 66, y: 32, r: 6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" fill="var(--bg)" rx="16"/>
      <circle cx="72" cy="24" r="20" fill="var(--accent)" opacity="0.22"/>
      <circle cx="72" cy="24" r="12" fill="var(--accent)" opacity="0.42"/>
      <circle cx="72" cy="24" r="7" fill="var(--signal)"/>
      {trail.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--signal)" opacity={0.35 + i * 0.09}/>
      ))}
    </svg>
  );
}
function Wordmark({ size = 17 }) {
  return (
    <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: size, color: "var(--fg)", letterSpacing: "-0.02em" }}>
      concert<span style={{ color: "var(--accent)" }}>crawl.</span>
    </span>
  );
}

// ── Shared atoms ─────────────────────────────────────────────────────
function MonoEyebrow({ children, color = "var(--fg-subtle)", size = 10, weight = 700, letterSpacing = "0.14em", style }) {
  return <div style={{ fontFamily: CS_MONO, fontSize: size, fontWeight: weight, textTransform: "uppercase", letterSpacing, color, ...style }}>{children}</div>;
}
function RailHeader({ tone = "accent", eyebrow, code }) {
  const c = tone === "signal" ? "var(--signal)" : tone === "warning" ? "var(--warning)" : tone === "muted" ? "var(--fg-subtle)" : "var(--accent)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: c, flexShrink: 0, boxShadow: `0 0 8px ${c}` }}/>
      <MonoEyebrow color={c} letterSpacing="0.16em">{eyebrow}</MonoEyebrow>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {code !== undefined && <MonoEyebrow letterSpacing="0.14em">{code}</MonoEyebrow>}
    </div>
  );
}
function SectionRail({ title, meta, action }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, width: "100%" }}>
      <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: "var(--fg)" }}>{title}</span>
      {meta && <MonoEyebrow size={9.5}>{meta}</MonoEyebrow>}
      <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
      {action}
    </div>
  );
}
// The grabber belongs to CCOverlay now — no-op so callers can't draw a second.
function DragHandle() { return null; }
function Scrim() {
  return <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--scrim)", backdropFilter: "blur(4px) saturate(120%)", WebkitBackdropFilter: "blur(4px) saturate(120%)" }}/>;
}
// ── Overlay chrome — delegated to the shipped cc-overlay.jsx ────────────
// R1 drew these as bare <div>s: no role, no aria-modal, no focus trap, no
// Escape, no focus return. `cc-overlay.jsx` was sitting in the same folder
// exporting exactly that contract (it's the shell CCTip and WatcherRoster
// already share), so both chromes now delegate to it and every crew overlay
// inherits dialog semantics from one place.
//
// SheetChrome → CCOverlay mode="sheet"  (scrim, grabber, trap, aria-modal)
// ModalChrome → centred dialog on the same useFocusTrap + Escape contract
//
// The scrim belongs to the overlay now, so callers must NOT paint their own.
function SheetChrome({ children, height, title = "", onClose = () => {} }) {
  return (
    <window.CCOverlay mode="sheet" title={title} onClose={onClose} showHeader={!!title}>
      {children}
    </window.CCOverlay>
  );
}
function ModalChrome({ children, width = 640, height, title = "", onClose = () => {} }) {
  const trapRef = window.useFocusTrap(true);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label={title || undefined} style={{
      width, maxHeight: height || "min(86vh, 820px)", borderRadius: 18,
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      boxShadow: "0 30px 80px -20px var(--shadow-strong), 0 2px 8px -2px var(--shadow-soft)",
      display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--fg)",
    }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 0" }}>
          <span style={{ flex: 1, fontFamily: CS_MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{title}</span>
          <button type="button" onClick={onClose} aria-label={window.CREW_COPY.a11y.close} style={{
            all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--border)", color: "var(--fg-muted)", flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Buttons — 44px minimum touch target everywhere ───────────────────
function Btn({ children, tone = "primary", size = "md", wide, onClick, disabled, style }) {
  const h = size === "sm" ? 36 : 46;
  const pal = {
    primary: { bg: "var(--signal)", fg: "var(--fg-on-accent)", bd: "var(--signal)" },
    ghost:   { bg: "transparent", fg: "var(--fg)", bd: "var(--border-strong)" },
    quiet:   { bg: "var(--surface-2)", fg: "var(--fg-muted)", bd: "var(--border)" },
    danger:  { bg: "transparent", fg: "var(--danger)", bd: "color-mix(in oklch, var(--danger) 46%, transparent)" },
  }[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      all: "unset", boxSizing: "border-box", cursor: disabled ? "default" : "pointer",
      minHeight: h, padding: size === "sm" ? "0 12px" : "0 18px", borderRadius: 10,
      background: pal.bg, color: pal.fg, border: `1px solid ${pal.bd}`,
      fontFamily: CS_UI, fontWeight: 700, fontSize: size === "sm" ? 12.5 : 14.5,
      letterSpacing: "-0.01em", display: wide ? "flex" : "inline-flex",
      alignItems: "center", justifyContent: "center", gap: 7,
      width: wide ? "100%" : undefined, opacity: disabled ? 0.45 : 1, ...style,
    }}>{children}</button>
  );
}

// ── Member identity — #762's "don't fake identity" rule, drawn ────────
// A member WITH a handle gets a monogram from that handle.
// A member WITHOUT one gets a dashed, letterless dot. We do not invent an
// initial from an email, a phone number or a row id, and we never name them
// in prose — they're counted.
function MemberDot({ member, size = 28, ring = true, showYou }) {
  const has = !!member.handle;
  const initial = has ? member.handle.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() : null;
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: size, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: has ? "var(--surface-3)" : "transparent",
      border: has
        ? (ring ? "1.5px solid var(--border-strong)" : "none")
        : "1.5px dashed var(--border-strong)",
      color: showYou ? "var(--signal)" : "var(--fg-muted)",
      fontFamily: CS_UI, fontWeight: 800, fontSize: size * 0.42, letterSpacing: "-0.02em",
      boxShadow: ring ? "0 0 0 2px var(--bg)" : "none",
    }}>
      {has ? initial : <span style={{ width: size * 0.22, height: size * 0.22, borderRadius: size, background: "var(--fg-subtle)", opacity: 0.7 }}/>}
    </span>
  );
}
function MemberCluster({ members, size = 26, max = 4, label }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    // `isolation: isolate` is load-bearing. The overlapping dots need z-index to
    // stack front-to-back, and a z-index on a FLEX ITEM applies even without
    // position — so without a local stacking context those dots painted above
    // later siblings entirely, including the scrim and any sheet above them
    // (crew avatars floated on top of the Premium gate). Isolate keeps the
    // stacking argument inside the cluster where it belongs.
    <span style={{ display: "inline-flex", alignItems: "center", position: "relative", isolation: "isolate" }}>
      <span style={{ display: "inline-flex", alignItems: "center", paddingLeft: 3 }}>
        {shown.map((m, i) => (
          <span key={m.id} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: shown.length - i }}>
            <MemberDot member={m} size={size} showYou={m.you}/>
          </span>
        ))}
      </span>
      {extra > 0 && (
        <span style={{
          marginLeft: -size * 0.22, zIndex: 0, width: size, height: size, borderRadius: size,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--surface-2)", border: "1.5px solid var(--border-strong)",
          boxShadow: "0 0 0 2px var(--bg)",
          fontFamily: CS_MONO, fontWeight: 700, fontSize: size * 0.36, color: "var(--fg-muted)",
        }} aria-hidden="true">+{extra}</span>
      )}
      {label && <span style={{ ...CS_SR }}>{label}</span>}
    </span>
  );
}

// Names a set of members honestly: handles first, everyone else folded into a
// count. Mirrors the shipped #762 watcher rail exactly.
function nameMembers(members, max = 2) {
  const named = members.filter(m => m.handle).slice(0, max).map(m => m.you ? "you" : m.handle);
  const extra = members.length - named.length;
  return { named, extra };
}

// ── Mobile app bar — LIFTED from CCAppBar ─────────────────────────────
// notifications-chrome.jsx:61 (#737), which is itself browse-home.jsx's AppBar
// unchanged. Shipped spec: padding 62px 16px 10px · CCMark 28 · wordmark 17 ·
// 36px trailing disc carrying the SEARCH magnifier.
//
// Fourth instance of one pattern, so this is the structural fix rather than a
// third patch: CrewsScreen and BrowseLensMobile each hand-drew this bar, they
// disagreed with each other about the trailing glyph, and one drew a BELL. A bell
// in the mobile header is precisely the placement #737 Q1 rejected ("no new
// persistent nav slots" — the pip rides the `me` tab). Both callers now render
// this one component.
//
// One departure, same shape as the CCTabBar / DesktopHeader lifts: the trailing
// disc is a real <button aria-label="Search">. The shipped component uses a
// non-interactive <div> with no accessible name, which would re-break brief §3's
// parity rule in the round desktop gained real <a>s. Owed upstream.
function CrewAppBar({ pad = "62px 16px 10px" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: pad, background: "var(--bg)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <CMark size={28}/>
        <span style={{ fontFamily: CS_UI, fontWeight: 800, fontSize: 17, color: "var(--fg)", letterSpacing: "-0.02em" }}>
          concert<span style={{ color: "var(--accent)" }}>crawl.</span>
        </span>
      </div>
      <button type="button" aria-label={window.CREW_COPY.a11y.search} style={{
        all: "unset", cursor: "pointer", width: 36, height: 36, borderRadius: 18,
        boxSizing: "border-box", flexShrink: 0, border: "1.5px solid var(--border-strong)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.5" stroke="var(--fg-muted)" strokeWidth="1.5"/>
          <path d="M11 11L14.5 14.5" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Bottom nav ─────────────────────────────────────────────
// Delegates to NavBar in crew-nav-options.jsx, which is the shipped CCTabBar
// (#737) with corrected labels. R1 hardcoded `browse · search · watching · crews
// · me`; R2's first pass fixed the labels but hand-drew the bar a second time.
// One bar, one source, real <button>s with aria — all from CCTabBar.
//
// Product artboards render NAV_PRODUCT — Option A per the Aug 4 ruling, so Crews
// is a fifth tab and a crew screen highlights `crews`.
function CrewBottomNav({ active = "crews", narrow = false, tabs }) {
  return <window.NavBar tabs={tabs || window.NAV_PRODUCT} active={active}/>;
}

// ── Fixtures ──────────────────────────────────────────────────────────
// Handles from the shipped #762 watcher-rail fixtures where they overlap.
const M = (id, handle, opts = {}) => ({ id, handle, ...opts });
const CREW_MEMBERS = {
  you:      M("u_you", "hugh", { you: true }),
  ross:     M("u_ross", "mvp_ross"),
  cassidy:  M("u_cass", "cassidy"),
  dee:      M("u_dee", "deewhy"),
  nat:      M("u_nat", "natstretch"),
  omar:     M("u_omar", "omar.wav"),
  bex:      M("u_bex", "bexlikesdrums"),
  jules:    M("u_jules", "julesmp3"),
  tam:      M("u_tam", "tamtamtam"),
  // No handle yet — joined from an invite link, never finished a profile.
  ghost:    M("u_ghost", null),
  ghost2:   M("u_ghost2", null),
  kit:      M("u_kit", "kitfisto"),
  sal:      M("u_sal", "salvage"),
};
const CM = CREW_MEMBERS;

const CREWS = [
  {
    id: "cr_7f3a91",              // ← the art seed. Immutable.
    name: "Thursdays",
    createdBy: "u_you",
    members: [CM.you, CM.ross, CM.cassidy, CM.dee, CM.nat, CM.ghost],
  },
  {
    id: "cr_2b8d04",
    name: "The Vinyl Retirement Plan",
    createdBy: "u_ross",
    members: [CM.you, CM.ross, CM.omar, CM.bex, CM.jules, CM.tam, CM.kit, CM.sal, CM.dee, CM.ghost2, CM.nat],
  },
  {
    id: "cr_9e15cc",
    name: "Basement Show Union",
    createdBy: "u_omar",
    members: [CM.you, CM.omar, CM.bex],
  },
  {
    id: "cr_41a7b2",
    name: "Night Shift",
    createdBy: "u_you",
    members: [CM.you, CM.ross, CM.cassidy, CM.dee, CM.nat, CM.omar, CM.bex, CM.jules, CM.tam, CM.kit, CM.sal, CM.ghost],
  },
  {
    id: "cr_c0de55",
    name: "Sunset Crew",
    createdBy: "u_you",
    members: [CM.you],
  },
];
const crewById = (id) => CREWS.find(c => c.id === id);

// Counts are DERIVED, never stored on the crew. R1 carried `upcoming` and
// `nights` fields on each fixture; they're denormalized summaries of
// CREW_GOING / CREW_NIGHTS, and the moment one drifts a tab or a list row
// states a number the list below it contradicts — fatal for a design whose
// whole argument is that the counts are legible. (It did drift: Thursdays said
// 9 nights against a 6-night list.) In production these are query aggregates
// for the same reason.
function crewUpcomingCount(id) {
  const going = CREW_GOING[id] || {};
  return (window.R_SHOWS || []).filter(s => going[s.id] && going[s.id].length).length;
}
function crewNightCount(id) { return (CREW_NIGHTS[id] || []).length; }

// Shared past — a night only lands here when ≥2 members were there (§3.3).
const CREW_NIGHTS = {
  cr_7f3a91: [
    { id: "n1", artist: "Hermanos Gutiérrez", venue: "Mission Ballroom", dateLabel: "Mar 14, 2026", year: "2026", went: [CM.you, CM.ross, CM.cassidy, CM.dee] },
    { id: "n2", artist: "Yves Tumor",         venue: "Summit",           dateLabel: "Feb 2, 2026",  year: "2026", went: [CM.you, CM.nat] },
    { id: "n3", artist: "Bonobo",             venue: "Mission Ballroom", dateLabel: "Jan 17, 2026", year: "2026", went: [CM.you, CM.ross, CM.nat, CM.dee, CM.cassidy] },
    { id: "n4", artist: "Fontaines D.C.",     venue: "Ogden Theatre",    dateLabel: "Nov 8, 2025",  year: "2025", went: [CM.ross, CM.cassidy] },
    { id: "n5", artist: "Khruangbin",         venue: "Red Rocks",        dateLabel: "Sep 21, 2025", year: "2025", went: [CM.you, CM.ross, CM.dee, CM.nat, CM.cassidy, CM.ghost] },
    { id: "n6", artist: "Jessica Pratt",      venue: "Bluebird Theater", dateLabel: "Aug 3, 2025",  year: "2025", went: [CM.you, CM.dee] },
  ],
  cr_9e15cc: [
    { id: "n7", artist: "Militarie Gun", venue: "Larimer Lounge", dateLabel: "Apr 9, 2026", year: "2026", went: [CM.omar, CM.bex] },
    { id: "n8", artist: "Gel",           venue: "Hi-Dive",        dateLabel: "Feb 20, 2026", year: "2026", went: [CM.you, CM.omar, CM.bex] },
    { id: "n9", artist: "Chat Pile",     venue: "Hi-Dive",        dateLabel: "Oct 30, 2025", year: "2025", went: [CM.you, CM.omar] },
  ],
  cr_c0de55: [],
};

// Which crew members are going to which show, keyed by the shipped row-data ids.
const CREW_GOING = {
  cr_7f3a91: {
    holdfast: [CM.ross, CM.cassidy],
    fourtet:  [CM.dee],
    hermanos: [CM.ross, CM.nat, CM.dee, CM.ghost],
    geese:    [CM.cassidy],
  },
  cr_41a7b2: { masego: [CM.jules], longname: [CM.kit, CM.sal], fkj: [CM.omar] },
  cr_2b8d04: { fourtet: [CM.omar, CM.bex], cassandra: [CM.tam] },
  cr_9e15cc: {},
  cr_c0de55: {},
};

Object.assign(window, {
  CS_UI, CS_MONO, CS_SR,
  // CCMark alias: notifications-chrome.jsx's shipped components read
  // window.CCMark, and CMark here is that component verbatim (CLAUDE.md §1).
  CMark, CCMark: CMark, Wordmark, CrewAppBar, MonoEyebrow, RailHeader, SectionRail, DragHandle, Scrim,
  SheetChrome, ModalChrome, Btn, MemberDot, MemberCluster, nameMembers, CrewBottomNav,
  CREW_MEMBERS, CREWS, CREW_NIGHTS, CREW_GOING, crewById,
  crewUpcomingCount, crewNightCount,
});

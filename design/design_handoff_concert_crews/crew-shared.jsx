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
function DragHandle() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
      <div style={{ width: 36, height: 4, borderRadius: 4, background: "var(--border-strong)", opacity: 0.6 }}/>
    </div>
  );
}
function Scrim() {
  return <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--scrim)", backdropFilter: "blur(4px) saturate(120%)", WebkitBackdropFilter: "blur(4px) saturate(120%)" }}/>;
}
function SheetChrome({ children, height = "88%" }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height, zIndex: 20,
      background: "var(--bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24,
      border: "1px solid var(--border)", borderBottom: "none",
      boxShadow: "0 -20px 50px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--fg)",
    }}>{children}</div>
  );
}
function ModalChrome({ children, width = 640, height }) {
  return (
    <div style={{
      width, maxHeight: height || "min(86vh, 820px)", borderRadius: 18,
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column", overflow: "hidden", color: "var(--fg)",
    }}>{children}</div>
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

// ── Bottom nav — crews is the 5th tab (see README §"Nav change") ──────
// ⚠️ READINESS.md B1: this fixture does NOT match the shipped bar. Production
// ships three link tabs (browse · venues · "my shows") plus an account trigger
// — there is no `search` tab, `venues` is missing here, and tab 3's container
// is "my shows", not "watching". Do not build from this list; it is blocked
// pending the R2 nav re-decision.
function CrewBottomNav({ active = "crews", narrow = false }) {
  const tabs = [
    { key: "browse", label: "browse" }, { key: "search", label: "search" },
    { key: "watching", label: "watching" }, { key: "crews", label: "crews" },
    { key: "me", label: "me" },
  ];
  const icon = (k, on) => {
    const c = on ? "var(--signal)" : "var(--fg-subtle)";
    const sw = 1.7;
    if (k === "browse") return <><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" stroke={c} strokeWidth={sw} fill="none"/><path d="M3 8.5h14M7 4.5V2.5M13 4.5V2.5" stroke={c} strokeWidth={sw} strokeLinecap="round"/></>;
    if (k === "search") return <><circle cx="9" cy="9" r="5.5" stroke={c} strokeWidth={sw} fill="none"/><path d="M13 13l4 4" stroke={c} strokeWidth={sw} strokeLinecap="round"/></>;
    if (k === "watching") return <><path d="M10 5c4 0 7 3.2 8 5-1 1.8-4 5-8 5S3 11.8 2 10c1-1.8 4-5 8-5z" stroke={c} strokeWidth={sw} fill="none"/><circle cx="10" cy="10" r="2.2" fill={c}/></>;
    if (k === "crews") return <><rect x="3" y="3" width="14" height="14" rx="4.6" stroke={c} strokeWidth={sw} fill="none"/><circle cx="10" cy="10" r="4.4" stroke={c} strokeWidth={sw} fill="none"/><circle cx="10" cy="10" r="1.5" fill={c}/></>;
    return <><circle cx="10" cy="7" r="3.2" stroke={c} strokeWidth={sw} fill="none"/><path d="M4 17c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round"/></>;
  };
  return (
    <div style={{
      display: "flex", borderTop: "1px solid var(--border)", background: "var(--bg-elevated)",
      padding: "8px 0 26px", flexShrink: 0,
    }}>
      {tabs.map(t => {
        const on = t.key === active;
        return (
          <button key={t.key} type="button" style={{
            all: "unset", cursor: "pointer", boxSizing: "border-box",
            flex: 1, minHeight: 44, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3,
          }} aria-current={on ? "page" : undefined}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">{icon(t.key, on)}</svg>
            <span style={{
              fontFamily: CS_MONO, fontSize: narrow ? 8 : 8.5, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: on ? "var(--signal)" : "var(--fg-subtle)",
            }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
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
  CMark, Wordmark, MonoEyebrow, RailHeader, SectionRail, DragHandle, Scrim,
  SheetChrome, ModalChrome, Btn, MemberDot, MemberCluster, nameMembers, CrewBottomNav,
  CREW_MEMBERS, CREWS, CREW_NIGHTS, CREW_GOING, crewById,
  crewUpcomingCount, crewNightCount,
});

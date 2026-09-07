// follow-surfaces.jsx — the five surfaces, each renderable at R2 (before) or
// R3 (after). Geometry, copy and data are lifted from the shipped screens; the
// ONLY variable between the two columns is the follow affordance.

function Phone({ children, w = 390, h = 720 }) {
  return (
    <div style={{ width: w, height: h, background: "var(--bg)", borderRadius: 14, overflow: "hidden",
      border: "1px solid var(--border)", position: "relative" }}>{children}</div>
  );
}
function Slab({ children, w = 390, pad = 16 }) {
  return <div style={{ width: w, background: "var(--bg)", padding: pad }}>{children}</div>;
}

// ── 1 · Event detail · the bill ─────────────────────────────────
// Screenshot 1. R2 put a 36px filled pill on every row AND a full-width 48px
// filled "Follow all" underneath — three saturated slabs stacked. R3: rows go
// quiet at 28, and "Follow all N" moves up into the header as one quiet pill,
// where it reads as what it is (a shortcut for the rows below), not as the
// section's primary action.
function BillBlock({ legacy = false, tier = "premium", bill }) {
  const rows = bill || [
    { name: "Son Little: CityFolk Tour 2026", role: "Headliner", state: "idle" },
    { name: "Tonina", role: "Support", state: "idle" },
  ];
  const remaining = rows.filter(b => b.state === "idle").length;
  const locked = fsLocked(tier);
  const st = (s) => (locked && s === "idle" ? "locked" : s);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface-1)" }}>
      <div style={{ padding: "12px 13px 11px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>On this bill</div>
          {legacy
            ? <Mono size={9.5}>{rows.length} artists</Mono>
            : (remaining > 0
                ? <CCFollow state={locked ? "locked" : "idle"} size="row" tone="quiet" label={`Follow all ${remaining}`} onClick={() => {}}/>
                : <Mono size={9.5}>{rows.length} artists</Mono>)}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45, textWrap: "pretty" }}>
          We'll tell you the day any of them book another Denver date.
        </div>
      </div>
      {rows.map(b => (
        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: legacy ? "8px 13px" : "11px 13px", borderTop: "1px solid var(--border)", minHeight: 52 }}>
          <FSArt name={b.name} size={legacy ? 0 : 34} circle/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
            {!legacy && <Mono size={9} ls="0.1em">{b.role}</Mono>}
          </div>
          <CCFollow state={st(b.state)} size="row" tone="quiet" legacy={legacy}/>
        </div>
      ))}
      {legacy && (
        <div style={{ padding: "12px 13px" }}>
          <CCFollow state={locked ? "locked" : "idle"} size="primary" tone="loud" legacy full label={`Follow all ${remaining}`}/>
        </div>
      )}
    </div>
  );
}

// ── 2 · Search results ──────────────────────────────────────────
// Screenshot 2. The filled pill was wider than the artist's own name block and
// collided with the ARTIST PAGE chip beside it. Quiet at 28 lets the chip and
// the button sit in one right-hand cluster without either shouting.
const FS_RESULTS = [
  { name: "Doja Cat", sub: "1 upcoming show", state: "idle", page: true },
  { name: "Dojo Cuts", sub: "no dates announced", state: "idle", page: false },
  { name: "Doja Kitten", sub: "2 upcoming shows", state: "following", page: true },
];
function SearchResults({ legacy = false, narrow = false, query = "doja" }) {
  return (
    <div style={{ background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "0 14px", height: 56, borderBottom: "1px solid var(--border)" }}>
        <span style={{ color: "var(--fg-subtle)" }}><GlyphSearch size={17}/></span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "var(--fg)" }}>{query}</span>
        <span style={{ width: 26, height: 26, borderRadius: 999, background: "var(--surface-2)", color: "var(--fg-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</span>
      </div>
      <div style={{ padding: "12px 14px 8px" }}><Mono size={9.5}>Artist pages · {FS_RESULTS.length}</Mono></div>
      {FS_RESULTS.map(a => (
        <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 14px", borderTop: "1px solid var(--border)", minHeight: 60 }}>
          <FSArt name={a.name} size={40} circle/>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
            <Mono size={9.5} ls="0.06em">{a.sub}</Mono>
          </div>
          {a.page && !narrow && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--accent)", border: "1px solid color-mix(in oklab, var(--accent) 45%, transparent)", borderRadius: 6, padding: "4px 7px" }}>Artist page</span>
          )}
          <CCFollow state={a.state} size="row" tone="quiet" legacy={legacy} iconOnly={narrow && !legacy}/>
        </div>
      ))}
    </div>
  );
}

// ── 3 · Artist page hero ────────────────────────────────────────
// Screenshot 3. This is the ONE place the filled --signal pill survives: the
// page exists to make this decision, and it's the only follow on screen. It
// only loses height — 48 → 44, matching the shipped primary button ramp.
function ArtistHero({ legacy = false, state = "idle", name = "Doja Cat" }) {
  return (
    <div style={{ padding: "14px 16px 18px", background: "var(--bg)" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-muted)", marginBottom: 14 }}>
        <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Browse</a>
        <span style={{ color: "var(--fg-subtle)" }}>/</span>
        <span style={{ color: "var(--fg)", fontWeight: 700 }}>{name}</span>
      </nav>
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: "100%", aspectRatio: "1 / 1" }}><window.IdentityArt name={name} kind="artist" scale="hero" showInitials/></div>
      </div>
      <CCFollow state={state} size="primary" tone="loud" legacy={legacy} full/>
      <div style={{ fontSize: 11.5, color: "var(--fg-subtle)", marginTop: 8, lineHeight: 1.45 }}>
        {state === "following" ? "Their shows land in your Watching." : "Every show they book lands in your Watching."}
      </div>
    </div>
  );
}

// ── 4 · Sticky sub-header ───────────────────────────────────────
// Carries the follow once the hero scrolls out. R2 used the 44px compact
// button, which at 56px bar height left 6px of air top and bottom and made the
// bar feel like a toolbar of one button. R3 uses the quiet 28.
function StickyFollowBar({ legacy = false, name = "Doja Cat", state = "idle" }) {
  return (
    <div style={{ height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 12px",
      background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
      <span style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 15, color: "var(--fg)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      <CCFollow state={state} size={legacy ? "rowWide" : "row"} tone="quiet" legacy={legacy}/>
    </div>
  );
}

// ── 5 · Shelf / picker badge ────────────────────────────────────
function ShelfStrip({ legacy = false }) {
  const list = [
    { name: "Militarie Gun", sub: "Nov 4 · Larimer", state: "idle" },
    { name: "Been Stellar", sub: "no dates", state: "following" },
    { name: "Wednesday", sub: "Oct 12 · Bluebird", state: "idle" },
  ];
  return (
    <div style={{ background: "var(--surface-1)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "13px 0 15px" }}>
      <div style={{ padding: "0 16px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
        <Mono size={9.5} color="var(--signal)">Start here</Mono>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.02em" }}>Follow someone. Anyone.</div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "0 16px" }}>
        {list.map(a => (
          <div key={a.name} style={{ width: 124, flexShrink: 0 }}>
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 7 }}>
              <div style={{ width: "100%", aspectRatio: "3 / 4" }}><window.IdentityArt name={a.name} kind="artist" scale="tile"/></div>
              <div style={{ position: "absolute", top: 6, right: 6 }}><CCFollowBadge state={a.state} legacy={legacy}/></div>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
            <Mono size={9} ls="0.06em" style={{ marginTop: 2 }}>{a.sub}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6 · Desktop ─────────────────────────────────────────────────
// Rows get one notch back (32) because the pointer target isn't the constraint
// and the rail is wider; the rail's primary CTA stays 44 and full-rail-width.
function DesktopRail({ legacy = false }) {
  return (
    <div style={{ width: 320, background: "var(--bg)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <CCFollow state="idle" size="primary" tone="loud" legacy={legacy} full/>
      <BillBlock legacy={legacy}/>
    </div>
  );
}

function DesktopSearchRow({ legacy = false }) {
  return (
    <div style={{ width: 620, background: "var(--bg)", padding: "6px 0" }}>
      {FS_RESULTS.map(a => (
        <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 13, padding: "10px 16px", borderTop: "1px solid var(--border)", minHeight: 58 }}>
          <FSArt name={a.name} size={40} circle/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.015em" }}>{a.name}</div>
            <Mono size={9.5} ls="0.06em" style={{ marginTop: 3 }}>{a.sub}</Mono>
          </div>
          {a.page && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--accent)", border: "1px solid color-mix(in oklab, var(--accent) 45%, transparent)", borderRadius: 6, padding: "4px 7px" }}>Artist page</span>
          )}
          <CCFollow state={a.state} size={legacy ? "primary" : "rowWide"} tone="quiet" legacy={legacy}/>
        </div>
      ))}
    </div>
  );
}

// ── State gallery + measured comparison ─────────────────────────
function StateGallery() {
  const rows = [
    ["idle", "Not following"], ["following", "Following"],
    ["locked", "Free / Supporter"], ["pending", "In flight"],
  ];
  return (
    <div style={{ background: "var(--bg)", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Mono size={9.5} color="var(--signal)">Quiet · rows, sticky bar, desktop</Mono>
        {rows.map(([s, label]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 132, fontSize: 12, color: "var(--fg-muted)" }}>{label}</div>
            <CCFollow state={s} size="row" tone="quiet"/>
            <CCFollow state={s} size="row" tone="quiet" iconOnly/>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--border)" }}/>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Mono size={9.5} color="var(--signal)">Loud · artist page hero only</Mono>
        {rows.map(([s, label]) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 132, fontSize: 12, color: "var(--fg-muted)" }}>{label}</div>
            <CCFollow state={s} size="primary" tone="loud"/>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--border)" }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 132 }}><Mono size={9.5} color="var(--signal)">Badge</Mono></div>
        <CCFollowBadge state="idle"/><CCFollowBadge state="following"/><CCFollowBadge state="locked"/>
      </div>
    </div>
  );
}

// Hit-area proof: the pill is 28, the target is 44. Shown with the target made
// visible — it is transparent in the build.
function HitProof() {
  const Row = ({ label, h, pill }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 96, fontSize: 11.5, color: "var(--fg-muted)" }}>{label}</div>
      <div style={{ position: "relative", height: 44, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", inset: `0 ${-(44 - h) / 2}px`, border: "1px dashed color-mix(in oklab, var(--signal) 50%, transparent)", borderRadius: 8 }}/>
        {pill}
      </div>
      <Mono size={9.5}>{h}px pill · 44px target</Mono>
    </div>
  );
  return (
    <div style={{ background: "var(--bg)", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.5, textWrap: "pretty", maxWidth: 380 }}>
        The pill shrank two notches; the tap target did not move. Each quiet button carries a transparent overlay
        grown by the same amount on both axes, so a square control lands at 44 × 44 and a labelled one is already
        wider. Dashed line = the real hit box, drawn here only.
      </div>
      <Row label="Row" h={28} pill={<CCFollow state="idle" size="row" tone="quiet"/>}/>
      <Row label="Icon-only" h={28} pill={<CCFollow state="idle" size="row" tone="quiet" iconOnly/>}/>
      <Row label="Badge" h={26} pill={<CCFollowBadge state="idle"/>}/>
      <Row label="Desktop row" h={32} pill={<CCFollow state="idle" size="rowWide" tone="quiet"/>}/>
    </div>
  );
}

function SizeTable() {
  const data = [
    ["badge", "30 → 26", "on art · shelves, picker"],
    ["row", "36 → 28", "bill rows, search rows, sticky bar"],
    ["rowWide", "44 → 32", "desktop rows"],
    ["primary", "48 → 44", "artist page hero — the only filled one"],
  ];
  return (
    <div style={{ background: "var(--bg)", padding: 18, display: "flex", flexDirection: "column", gap: 0, width: 360 }}>
      <div style={{ display: "flex", padding: "0 0 8px", borderBottom: "1px solid var(--border-strong)" }}>
        <div style={{ width: 78 }}><Mono size={9}>size</Mono></div>
        <div style={{ width: 74 }}><Mono size={9}>height</Mono></div>
        <div style={{ flex: 1 }}><Mono size={9}>where</Mono></div>
      </div>
      {data.map(([k, h, w]) => (
        <div key={k} style={{ display: "flex", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 78, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--signal)" }}>{k}</div>
          <div style={{ width: 74, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg)" }}>{h}</div>
          <div style={{ flex: 1, fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.4 }}>{w}</div>
        </div>
      ))}
    </div>
  );
}

function Note({ children, tone }) {
  return (
    <div style={{ background: "var(--bg)", padding: 18, width: 320 }}>
      <div style={{ fontSize: 12.5, color: tone || "var(--fg-muted)", lineHeight: 1.55, textWrap: "pretty" }}>{children}</div>
    </div>
  );
}

Object.assign(window, {
  Phone, Slab, BillBlock, SearchResults, ArtistHero, StickyFollowBar, ShelfStrip,
  DesktopRail, DesktopSearchRow, StateGallery, HitProof, SizeTable, Note, FS_RESULTS,
});

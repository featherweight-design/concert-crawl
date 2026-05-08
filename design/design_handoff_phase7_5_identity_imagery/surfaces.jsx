// surfaces.jsx — Phase 7.5 mock surfaces for the canvas.
// Faithful (not byte-for-byte) chunks of each surface where the identity art
// appears: Event Detail hero (mobile + desktop), Venue Profile hero, Browse
// list tile, Search results row, Watching list item.
//
// Keeps the surface markup tight so the gallery stays focused on the art.
// Real impl lives in detail-screens.jsx, browse-home.jsx, etc.

// Mini icons (re-used)
function _ChevLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12 4 L6 10 L12 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function _Heart() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 16.5 L3.5 10.2 a3.5 3.5 0 0 1 5-5 L10 6.5 l1.5-1.3 a3.5 3.5 0 0 1 5 5 z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
function _Share() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="5" cy="10" r="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="6.7" y1="9" x2="13.3" y2="6" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="6.7" y1="11" x2="13.3" y2="14" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

// ── Event Detail hero — mobile ─────────────────────────────────
function MobileEventDetailHero({
  artist = "Wednesday",
  supporting = "Hotline TNT",
  venue = "Mission Ballroom",
  date = "Tue, May 12",
  doors = "7:00 PM",
  showTime = "8:00 PM",
  ages = "16+",
  price = "$30",
  artProps = {},
}) {
  return (
    <div style={{ width: 375, fontFamily: "'Inter', sans-serif", color: "var(--fg)", background: "var(--bg)" }}>
      {/* Hero band */}
      <div style={{ position: "relative", height: 360 }}>
        <IdentityArt name={artist} kind="artist" scale="hero" {...artProps} />
        {/* Top bar */}
        <div style={{
          position: "absolute", inset: "0 0 auto 0",
          padding: "52px 16px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          color: "#fff",
        }}>
          <button style={iconBtn}><_ChevLeft /></button>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={iconBtn}><_Share /></button>
            <button style={iconBtn}><_Heart /></button>
          </div>
        </div>
        {/* Bottom scrim for legibility */}
        <div style={{
          position: "absolute", inset: "60% 0 0 0",
          background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }} />
      </div>
      {/* Title block */}
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-muted)" }}>
          {date} · {venue}
        </div>
        <h1 style={{ margin: "8px 0 4px", fontWeight: 900, fontSize: 32, lineHeight: 1.05,
          letterSpacing: "-0.03em", textWrap: "balance" }}>{artist}</h1>
        <div style={{ fontSize: 14, color: "var(--fg-muted)" }}>with {supporting}</div>
      </div>
      {/* 2×2 info grid stub */}
      <div style={{ padding: "12px 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
        background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12,
        marginInline: 20, marginBottom: 20, overflow: "hidden" }}>
        {[
          ["Doors", doors], ["Show", showTime], ["Ages", ages], ["Price", price],
        ].map(([k, v], i) => (
          <div key={i} style={{ background: "var(--surface-1)", padding: "12px 14px" }}>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.1em",
              textTransform: "uppercase" }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const iconBtn = {
  width: 36, height: 36, borderRadius: 999,
  background: "rgba(0,0,0,0.45)", color: "#fff",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  border: "none", cursor: "pointer",
  backdropFilter: "blur(6px)",
};

// ── Event Detail hero — desktop ────────────────────────────────
function DesktopEventDetailHero({
  artist = "Bright Eyes",
  supporting = "Lucy Dacus",
  venue = "Red Rocks Amphitheatre",
  date = "Wed, May 6",
  doors = "6:00 PM",
  showTime = "7:00 PM",
  ages = "All ages",
  price = "$40–$75",
  artProps = {},
}) {
  return (
    <div style={{ width: 880, padding: 24, background: "var(--bg)", color: "var(--fg)",
      fontFamily: "'Inter', sans-serif", borderRadius: 16, border: "1px solid var(--border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        {/* Art */}
        <div style={{ position: "relative", height: 480, borderRadius: 16, overflow: "hidden" }}>
          <IdentityArt name={artist} kind="artist" scale="hero" {...artProps} />
        </div>
        {/* Info card */}
        <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-muted)" }}>
            {date} · {venue}
          </div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 44, lineHeight: 1.0,
            letterSpacing: "-0.035em", textWrap: "balance" }}>{artist}</h1>
          <div style={{ fontSize: 16, color: "var(--fg-muted)" }}>with {supporting}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 4 }}>
            {[["Doors", doors], ["Show", showTime], ["Ages", ages], ["Price", price]].map(([k, v], i) => (
              <div key={i}>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700, color: "var(--fg-subtle)", letterSpacing: "0.1em",
                  textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <button style={{
            marginTop: 8, padding: "14px 18px", borderRadius: 999, border: "none",
            background: "var(--signal)", color: "var(--fg-on-accent)", fontWeight: 700,
            fontSize: 15, cursor: "pointer", letterSpacing: "-0.01em",
          }}>Get tickets</button>
        </div>
      </div>
    </div>
  );
}

// ── Venue Profile hero — mobile ────────────────────────────────
function MobileVenueHero({
  venue = "Mission Ballroom",
  city = "Denver, CO",
  capacity = "3,950 cap",
  outdoors = "Indoor",
  artProps = {},
}) {
  return (
    <div style={{ width: 375, fontFamily: "'Inter', sans-serif", color: "var(--fg)", background: "var(--bg)" }}>
      <div style={{ position: "relative", height: 320 }}>
        <IdentityArt name={venue} kind="venue" scale="hero" {...artProps} />
        <div style={{
          position: "absolute", inset: "0 0 auto 0",
          padding: "52px 16px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button style={iconBtn}><_ChevLeft /></button>
          <button style={iconBtn}><_Heart /></button>
        </div>
      </div>
      <div style={{ padding: "20px 20px 8px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-muted)" }}>
          Venue
        </div>
        <h1 style={{ margin: "8px 0 6px", fontWeight: 900, fontSize: 30, lineHeight: 1.05,
          letterSpacing: "-0.03em" }}>{venue}</h1>
        <div style={{ fontSize: 14, color: "var(--fg-muted)" }}>{city} · {capacity} · {outdoors}</div>
      </div>
    </div>
  );
}

// ── Browse list tile — mobile (88×88 art) ──────────────────────
function BrowseListTile({
  title = "Wednesday",
  supporting = "with Hotline TNT",
  venue = "Mission",
  date = "Tue · 8:00 PM",
  price = "$30",
  artProps = {},
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 14, alignItems: "center",
      padding: "12px 16px", background: "var(--surface-1)",
      border: "1px solid var(--border)", borderRadius: 12, color: "var(--fg)",
      fontFamily: "'Inter', sans-serif", width: 343,
    }}>
      <div style={{ width: 88, height: 88, borderRadius: 8, overflow: "hidden" }}>
        <IdentityArt name={title} kind="artist" scale="tile" showInitials={false} grain={0.06} {...artProps} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{supporting}</div>
        <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 6,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
          {venue} · {date}
        </div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
        color: "var(--signal)", letterSpacing: "-0.01em" }}>{price}</div>
    </div>
  );
}

// ── Search row — slimmer (64×64 art) ───────────────────────────
function SearchResultRow({
  title = "David Guetta",
  meta = "Red Rocks · Tue, May 5",
  kind = "artist",
  artProps = {},
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 12, alignItems: "center",
      padding: "10px 14px", color: "var(--fg)", fontFamily: "'Inter', sans-serif",
      borderBottom: "1px solid var(--border)", width: 343,
    }}>
      <div style={{ width: 64, height: 64, borderRadius: 6, overflow: "hidden" }}>
        <IdentityArt name={title} kind={kind} scale="tile" showInitials={false} grain={0.05} {...artProps} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>{meta}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
        color: "var(--fg-subtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {kind}
      </div>
    </div>
  );
}

// ── Watching list item — vertical card (future surface) ────────
function WatchingListItem({
  title = "Mannequin Pussy",
  meta = "Bluebird · Thu, May 7",
  delta = "−$4",
  artProps = {},
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 12, alignItems: "center",
      padding: "10px 12px", background: "var(--surface-1)",
      border: "1px solid var(--border)", borderRadius: 10, color: "var(--fg)",
      fontFamily: "'Inter', sans-serif", width: 343,
    }}>
      <div style={{ width: 56, height: 56, borderRadius: 6, overflow: "hidden" }}>
        <IdentityArt name={title} kind="artist" scale="tile" showInitials={false} grain={0.05} {...artProps} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>{meta}</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
        color: "var(--success)" }}>{delta}</div>
    </div>
  );
}

Object.assign(window, {
  MobileEventDetailHero, DesktopEventDetailHero,
  MobileVenueHero, BrowseListTile, SearchResultRow, WatchingListItem,
});

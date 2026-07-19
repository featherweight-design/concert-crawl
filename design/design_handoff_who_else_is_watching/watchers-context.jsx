// watchers-context.jsx — #762 Who Else Is Watching
// Event-detail hero framing that MATCHES the shipped event-detail-v2 mocks
// (mobile: hero 300 + overlap column; desktop: full-bleed wide hero + centered
// 880 column). Layout + type + chrome lifted verbatim from event-detail-v2.jsx /
// event-detail-v2-desktop.jsx so the watchers surface reads in its real spot.
// The ONLY change vs. the mock is the Watch zone: WatchShowButton's retired
// count tail is replaced by <WatchZone> (Q6). Mobile + desktop mount the identical
// WatchZone — parity is behavioural.

// ── Shared hero image (same hue trick as the mocks) ──────────────────────────
function w_heroHue(name) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [280, 200, 340, 160, 30, 220, 310, 180, 50, 260];
  return hues[hash % hues.length];
}
function HeroArt({ label, height, big }) {
  const hue = w_heroHue(label);
  return (
    <div style={{ width: "100%", height, flexShrink: 0, position: "relative", overflow: "hidden",
      background: `linear-gradient(135deg, oklch(0.35 0.08 ${hue}), oklch(0.22 0.06 ${hue + 40}))`,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: height * (big ? 0.45 : 0.33),
        color: `oklch(0.75 0.12 ${hue})`, opacity: big ? 0.55 : 0.6, letterSpacing: "-0.03em" }}>{label}</span>
      <div style={{ position: "absolute", inset: 0, background: "var(--image-tint)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: big ? 120 : 80,
        background: "linear-gradient(transparent, var(--bg))" }} />
    </div>
  );
}

// ── Genre chips (mock ChipRow) ───────────────────────────────────────────────
function ChipRow({ items }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {items.map((g) => (
        <span key={g} style={{ padding: "3px 8px", borderRadius: 4, background: "var(--surface-3)",
          color: "var(--fg-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          letterSpacing: "0.03em" }}>{g}</span>
      ))}
    </div>
  );
}

// ── Info rows (mock InfoRow / DInfoRow) ──────────────────────────────────────
function IconPin()  { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="8" cy="6.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/></svg>); }
function IconCal()  { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M2 7h12" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M5.5 1.5v3M10.5 1.5v3" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function IconClk()  { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M8 4.5V8l3 1.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function IconAge()  { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="var(--fg-subtle)" strokeWidth="1.5"/><path d="M1 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--fg-subtle)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11.5" cy="5.5" r="2" stroke="var(--fg-subtle)" strokeWidth="1.2"/><path d="M12.5 9.5c1.8.4 3 1.6 3 3.5" stroke="var(--fg-subtle)" strokeWidth="1.2" strokeLinecap="round"/></svg>); }
function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{ width: 16, height: 16, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--fg-subtle)",
          letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 600, fontSize: 14, color: "var(--fg)",
          marginTop: 1, letterSpacing: "-0.01em" }}>{value}</div>
      </div>
    </div>
  );
}
function InfoBlock({ event, grid }) {
  return (
    <div style={{ padding: grid ? "8px 0" : "4px 0", borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      ...(grid ? { display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32 } : {}) }}>
      <InfoRow icon={<IconPin/>} label="Venue" value={event.venue}/>
      <InfoRow icon={<IconCal/>} label="Date" value={event.date}/>
      <InfoRow icon={<IconClk/>} label="Doors / Show" value={`${event.doors} / ${event.showTime}`}/>
      <InfoRow icon={<IconAge/>} label="Ages" value={event.ages}/>
    </div>
  );
}

// ── Mobile back button (mock BackButton) ─────────────────────────────────────
function BackButton() {
  return (
    <div style={{ position: "absolute", top: 56, left: 14, zIndex: 20, width: 36, height: 36,
      borderRadius: 18, background: "var(--scrim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M8 2L2 8l6 6" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}
function Breadcrumb({ artist }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)",
      letterSpacing: "0.08em", textTransform: "uppercase" }}>
      <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "inline-flex", alignItems: "center",
        gap: 6, color: "var(--fg-muted)", textDecoration: "none", fontWeight: 600 }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1.5L3.5 5 7 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Browse
      </a>
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ color: "var(--fg)", fontWeight: 700 }}>{artist}</span>
    </nav>
  );
}

// ── Mobile event-detail (matches EventDetail) ────────────────────────────────
function EventHeroMobile({ event = W_EVENT, watchers, active = false, loading = false, startExpanded = false }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <HeroArt label={event.artist.charAt(0)} height={300}/>
        <BackButton/>
      </div>
      <div style={{ flex: 1, overflowY: "auto", marginTop: -20, position: "relative" }}>
        <div style={{ padding: "0 18px" }}>
          <ChipRow items={event.genre}/>
          <h1 style={{ margin: "8px 0 0", fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{event.artist}</h1>
          {event.support && <div style={{ fontWeight: 500, fontSize: 14, color: "var(--fg-muted)", marginTop: 4 }}>with {event.support}</div>}
          <div style={{ marginTop: 12 }}>
            <WatchZone active={active} watchers={watchers} loading={loading} startExpanded={startExpanded} ring="var(--bg)"/>
          </div>
          <div style={{ marginTop: 14 }}><InfoBlock event={event}/></div>
        </div>
      </div>
    </div>
  );
}

// ── Desktop event-detail (matches EventDetailDesktop) ────────────────────────
// Full-bleed wide hero + centered 880 column that overlaps the hero fade.
function EventHeroDesktop({ event = W_EVENT, watchers, active = false, loading = false, startExpanded = false }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", overflowY: "auto" }}>
      <HeroArt label={event.artist.charAt(0)} height={340} big/>
      <div style={{ maxWidth: 880, width: "100%", margin: "0 auto", boxSizing: "border-box",
        padding: "20px 32px 48px", marginTop: -60, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <Breadcrumb artist={event.artist}/>
          <ChipRow items={event.genre}/>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 44, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{event.artist}</h1>
          {event.support && <div style={{ fontWeight: 500, fontSize: 16, color: "var(--fg-muted)", letterSpacing: "-0.01em" }}>with {event.support}</div>}
        </div>
        <div style={{ marginBottom: 24 }}>
          <WatchZone active={active} watchers={watchers} loading={loading} startExpanded={startExpanded} ring="var(--bg)"/>
        </div>
        <InfoBlock event={event} grid/>
      </div>
    </div>
  );
}

Object.assign(window, {
  HeroArt, ChipRow, InfoRow, InfoBlock, EventHeroMobile, EventHeroDesktop,
});

// discovery-surface.jsx — R2 · "Denver shows based on your taste" (Premium)
//
// Decision (★): a SECTION on Browse, not a new tab. A horizontally-scrolling
// "Based on your taste" shelf pinned to the top of Browse — clearly curated
// (Spotify-marked header, reason chips, richer cards) but it lives in the main
// flow, so it never feels like a different app. Uses richer taste data than
// follows alone (top artists from listening history), so reasons vary:
// "You play them a lot" vs "Following".
//
//   TastePickCard, DiscoveryShelf, DiscoveryScreen, DiscoveryEmpty, DiscoveryFailure

const DISC_PICKS = [
  { artist: "Turnstile", reason: "You play them a lot", venue: "Mission Ballroom", date: "Aug 2", price: "$39", hue: 20 },
  { artist: "Big Head Todd", reason: "Following", venue: "Red Rocks", date: "Aug 9", price: "$55", hue: 140 },
  { artist: "Alvvays", reason: "You play them a lot", venue: "Ogden Theatre", date: "Aug 14", price: "$34", hue: 190 },
  { artist: "JPEGMAFIA", reason: "In your top 5", venue: "Summit", date: "Aug 21", price: "$41", hue: 300 },
  { artist: "Fontaines D.C.", reason: "Following", venue: "Fillmore", date: "Sep 1", price: "$46", hue: 240 },
];

function ReasonChip({ children, small = false }) {
  const { SpotifyLogo } = window;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "2px 7px 2px 4px" : "3px 8px 3px 5px", borderRadius: 5,
      background: "var(--surface-3)", border: "1px solid var(--border-strong)",
      color: "var(--fg)", fontFamily: "Inter, system-ui", fontWeight: 700,
      fontSize: small ? 9.5 : 10.5, letterSpacing: "-0.005em", whiteSpace: "nowrap",
    }}>
      <SpotifyLogo size={small ? 11 : 13} radius={3} />
      {children}
    </span>
  );
}

function TastePickCard({ artist, reason, venue, date, price, hue }) {
  return (
    <div style={{ width: 168, flexShrink: 0, borderRadius: 14, overflow: "hidden", background: "var(--surface-1)", border: "1px solid var(--border)" }}>
      <div style={{ height: 116, background: `linear-gradient(135deg, oklch(0.4 0.11 ${hue}), oklch(0.24 0.07 ${hue + 45}))` }} />
      <div style={{ padding: "10px 11px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex" }}><ReasonChip small>{reason}</ReasonChip></div>
        <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 14.5, letterSpacing: "-0.015em", lineHeight: 1.15, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-muted)", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {venue}<span style={{ opacity: 0.45 }}> · </span>{date}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: "var(--signal)" }}>{price}</div>
      </div>
    </div>
  );
}

// ── The shelf (header + horizontal card row) ────────────────────
function DiscoveryShelf() {
  const { SpotifyLogo, MonoEyebrow } = window;
  return (
    <div style={{ paddingTop: 6 }}>
      <div style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <SpotifyLogo size={22} radius={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: "var(--fg)" }}>Based on your taste</div>
          <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.1em">5 PICKS · REFRESHED WEEKLY</MonoEyebrow>
        </div>
      </div>
      <div style={{ display: "flex", gap: 11, overflowX: "auto", padding: "2px 16px 4px" }}>
        {DISC_PICKS.map((p, i) => <TastePickCard key={i} {...p} />)}
      </div>
    </div>
  );
}

// ── Full browse screen with the shelf pinned on top ─────────────
function DiscoveryScreen() {
  const belowRows = [
    { headline: "Two Friends", subtitle: "Big Bootie Tour", venue: "Red Rocks", time: "7:00 PM", genres: ["electronic"], price: "$45", hue: 210, followed: false },
    { headline: "Geese", subtitle: "3D Country Tour", venue: "Ogden Theatre", time: "9:00 PM", genres: ["rock"], price: "$25", hue: 200, followed: true },
    { headline: "David Guetta", subtitle: "", venue: "Red Rocks", time: "8:00 PM", genres: ["house"], price: "$65", hue: 30, followed: false },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "58px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <window.MMark size={26} />
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 32, background: "var(--signal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-on-accent)", fontWeight: 900, fontSize: 13 }}>H</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <DiscoveryShelf />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 16px 4px" }}>
          <span style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12, color: "var(--fg)", letterSpacing: "0.05em", textTransform: "uppercase" }}>All Denver shows</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div style={{ padding: "0 16px 16px" }}>
          {belowRows.map((r, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
              <window.EventRowCC {...r} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty + failure ─────────────────────────────────────────────
function DiscoveryStateShell({ children }) {
  return <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "58px 24px 22px", display: "flex", flexDirection: "column" }}>{children}</div>;
}
function DiscoveryHeader() {
  const { SpotifyLogo } = window;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
      <SpotifyLogo size={22} radius={6} />
      <div style={{ fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Based on your taste</div>
    </div>
  );
}

function DiscoveryEmpty() {
  const { SignalButton } = window;
  return (
    <DiscoveryStateShell>
      <DiscoveryHeader />
      <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><circle cx="13" cy="13" r="8.5" stroke="var(--fg-subtle)" strokeWidth="2"/><path d="M19 19l6 6" stroke="var(--fg-subtle)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-subtle)", marginBottom: 10 }}>QUIET MONTH</div>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.14, marginBottom: 10, maxWidth: 290 }}>Your artists are lying low.</div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 290, marginBottom: 22 }}>Nobody from your taste has a Denver date this month. We refresh picks weekly — or dig through everything yourself.</div>
        <div style={{ width: "100%", maxWidth: 290 }}><SignalButton>Browse all shows</SignalButton></div>
      </div>
    </DiscoveryStateShell>
  );
}

function DiscoveryFailure() {
  const { ConnectButton } = window;
  return (
    <DiscoveryStateShell>
      <DiscoveryHeader />
      <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <window.SpotifyLogo size={62} radius={18} />
          <span style={{ position: "absolute", right: -4, bottom: -4, width: 24, height: 24, borderRadius: 999, background: "var(--warning)", color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900 }}>!</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--warning)", marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--warning)" }} />TASTE ON PAUSE</div>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.14, marginBottom: 10, maxWidth: 290 }}>Can't read your taste right now.</div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 290, marginBottom: 22 }}>Your Spotify link needs a refresh, so picks are paused. Your saved shows are untouched — reconnect to bring taste back.</div>
        <div style={{ width: "100%", maxWidth: 290, display: "flex", flexDirection: "column", gap: 10 }}>
          <ConnectButton>Reconnect Spotify</ConnectButton>
          <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "11px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Browse all shows</button>
        </div>
      </div>
    </DiscoveryStateShell>
  );
}

Object.assign(window, { TastePickCard, DiscoveryShelf, DiscoveryScreen, DiscoveryEmpty, DiscoveryFailure });

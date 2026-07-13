// connect-flow.jsx — the Spotify Sync connect journey (mobile-first)
//
// Surfaces:
//   ConnectEntry       — Settings ▸ Connections, disconnected state (primary entry)
//   FirstWatchNudge    — post-first-watch inline nudge on Browse (secondary entry)
//   OAuthHandoff       — our interstitial before the redirect (honesty rail)
//   ConnectSuccess     — post-connect success ("here's what you told Spotify you love")
//   AutoWatchSheet     — one-time opt-in: auto-watch vs highlight-only
//
// Voice: Sour Patch — warm, permissive, recognition NOT surveillance.
// Green only via var(--signal) through the spotify-shared atoms.

const { MMark, MonoEyebrow, RailHeader, DragHandle } = window;
const cfWord = (accent) => (
  <span style={{ fontWeight: 800 }}>concert<span style={{ color: "var(--accent)" }}>crawl.</span></span>
);

// Imported-taste sample (generic representation, not real user data)
const CF_ARTISTS = [
  { name: "Sleep Token", hue: 280 }, { name: "Amyl and The Sniffers", hue: 20 },
  { name: "Wednesday", hue: 160 }, { name: "Geese", hue: 210 },
  { name: "Mannequin Pussy", hue: 330 }, { name: "Bright Eyes", hue: 50 },
  { name: "Wisp", hue: 300 }, { name: "Jason Isbell", hue: 30 },
];

// ── Screen shell (fills the phone) ──────────────────────────────
function CFScreen({ children, pad = "58px 18px 20px", scroll = true }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", padding: pad,
      display: "flex", flexDirection: "column", overflowY: scroll ? "auto" : "hidden",
    }}>{children}</div>
  );
}

// ═══ 1 · ENTRY — Settings ▸ Connections (disconnected) ══════════
function ConnectEntry() {
  const { SpotifyLogo, GreenButton } = window;
  return (
    <CFScreen>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <svg width="9" height="15" viewBox="0 0 9 15" style={{ marginRight: 2 }}><path d="M7.5 1L1.5 7.5l6 6.5" stroke="var(--fg-muted)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <MonoEyebrow size={10} letterSpacing="0.16em">SETTINGS</MonoEyebrow>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.035em", margin: "6px 0 4px" }}>Connections</div>
      <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.4, marginBottom: 18 }}>
        Link a service and we'll tune your browsing to what you already love. One thing so far.
      </div>

      {/* Spotify connection card — disconnected */}
      <div style={{
        borderRadius: 16, background: "var(--surface-1)", border: "1px solid var(--border)",
        padding: 16, display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <SpotifyLogo size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>Spotify</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-subtle)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Not connected</div>
          </div>
          <span style={{ width: 9, height: 9, borderRadius: 9, background: "var(--fg-subtle)", opacity: 0.5 }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.45 }}>
          Bring over the artists you already follow and play the most. We'll flag their Denver shows the moment they land.
        </div>
        <GreenButton leftIcon={<SpotifyLogo size={18} radius={5} />}>Connect Spotify</GreenButton>
      </div>

      <div style={{ marginTop: 14 }}>
        <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.1em" style={{ textAlign: "center" }}>
          READ-ONLY · UNLINK ANYTIME · WE NEVER SEE YOUR PASSWORD
        </MonoEyebrow>
      </div>
    </CFScreen>
  );
}

// ═══ 2 · SECONDARY ENTRY — post-first-watch nudge ══════════════
// Fires once, inline on Browse, right after the user watches their first show.
function FirstWatchNudge({ bare = false }) {
  const { SpotifyLogo, GreenButton } = window;
  const card = (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(180deg, color-mix(in oklch, var(--signal) 9%, var(--surface-1)), var(--surface-1))",
      border: "1px solid color-mix(in oklch, var(--signal) 26%, var(--border))",
      padding: 16, position: "relative",
    }}>
      <button style={{ all: "unset", cursor: "pointer", position: "absolute", top: 12, right: 12, color: "var(--fg-subtle)", fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <SpotifyLogo size={26} />
        <MonoEyebrow size={9} color="var(--signal)" letterSpacing="0.14em">NICE — FIRST ONE SAVED</MonoEyebrow>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--fg)" }}>
        Want the rest picked for your taste?
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.4, marginTop: 6, marginBottom: 14 }}>
        Link Spotify and we'll surface shows from the artists you already play — no more scrolling past them.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <GreenButton size="sm" full={false} leftIcon={<SpotifyLogo size={16} radius={4} />} style={{ flex: 1 }}>Connect Spotify</GreenButton>
        <button style={{ all: "unset", cursor: "pointer", padding: "9px 14px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13, color: "var(--fg-muted)" }}>Not now</button>
      </div>
    </div>
  );
  if (bare) return card;
  // framed inline within a mini browse context
  return (
    <CFScreen pad="58px 16px 16px">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <MMark size={26} />
        <span style={{ fontSize: 16, letterSpacing: "-0.02em" }}>{cfWord()}</span>
      </div>
      {/* a saved show, faint, above the nudge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", opacity: 0.6 }}>
        <div style={{ width: 46, height: 46, borderRadius: 6, background: "linear-gradient(135deg, oklch(0.35 0.09 280), oklch(0.22 0.06 320))" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Sleep Token</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "var(--fg-muted)", marginTop: 2 }}>FILLMORE · JUN 14</div>
        </div>
        <span style={{ color: "var(--signal)" }}>♥</span>
      </div>
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0 16px" }} />
      {card}
    </CFScreen>
  );
}

// ═══ 3 · OAUTH HANDOFF — our interstitial before redirect ═══════
function OAuthHandoff() {
  const { SpotifyLogo, GreenButton, HonestyRail, MMark: _M } = window;
  return (
    <CFScreen pad="58px 20px 22px" scroll={true}>
      {/* connection glyph pair: our mark ↔ spotify mark */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "18px 0 22px" }}>
        <MMark size={52} />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)", opacity: 0.4 + i * 0.25 }} />)}
        </div>
        <SpotifyLogo size={52} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <MonoEyebrow size={10} color="var(--signal)" letterSpacing="0.16em" style={{ textAlign: "center" }}>HANDING OFF TO SPOTIFY</MonoEyebrow>
      </div>
      <div style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-0.03em", textAlign: "center", lineHeight: 1.15, margin: "8px 0 8px" }}>
        You'll log in on Spotify's page — not ours.
      </div>
      <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.45, textAlign: "center", maxWidth: 320, alignSelf: "center", marginBottom: 22 }}>
        We ask Spotify one question: which artists do you love? Here's exactly what that does and doesn't mean.
      </div>

      <div style={{
        borderRadius: 16, background: "var(--surface-1)", border: "1px solid var(--border)",
        padding: 16, marginBottom: 18,
      }}>
        <HonestyRail />
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <GreenButton leftIcon={<SpotifyLogo size={18} radius={5} />}>Continue to Spotify</GreenButton>
        <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "10px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Cancel</button>
      </div>
    </CFScreen>
  );
}

// ═══ 4 · SUCCESS — "here's what you told Spotify you love" ═══════
function ConnectSuccess() {
  const { SpotifyLogo, SignalButton, ArtistChip, SyncStat } = window;
  return (
    <CFScreen pad="58px 18px 20px">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 8 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20, background: "var(--signal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 30px color-mix(in oklch, var(--signal) 40%, transparent)",
          }}>
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none"><path d="M9 17.5l5.5 5.5L25 11" stroke="#0A0A0A" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <MonoEyebrow size={10} color="var(--signal)" letterSpacing="0.16em" style={{ textAlign: "center" }}>SPOTIFY · LINKED</MonoEyebrow>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.12, margin: "8px 0 8px" }}>
          Got it. We know your taste now.
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.45, maxWidth: 320 }}>
          Here's what you told Spotify you love — <b style={{ color: "var(--fg)" }}>34 artists</b>, and <b style={{ color: "var(--fg)" }}>9</b> of them play Denver.
        </div>
      </div>

      {/* stat strip */}
      <div style={{
        display: "flex", justifyContent: "space-around", gap: 8, margin: "20px 0 16px",
        padding: "14px 8px", borderRadius: 14, background: "var(--surface-1)", border: "1px solid var(--border)",
      }}>
        <SyncStat value="34" label="Artists" />
        <div style={{ width: 1, background: "var(--border)" }} />
        <SyncStat value="9" label="Play Denver" tone="signal" />
        <div style={{ width: 1, background: "var(--border)" }} />
        <SyncStat value="Now" label="Synced" />
      </div>

      {/* imported chips */}
      <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.12em" style={{ marginBottom: 10 }}>WE RECOGNIZED</MonoEyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {CF_ARTISTS.slice(0, 6).map(a => <ArtistChip key={a.name} name={a.name} hue={a.hue} follow={a.name === "Sleep Token" || a.name === "Wednesday"} />)}
        <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: 999, background: "var(--surface-2)", border: "1px dashed var(--border-strong)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)" }}>+28 more</div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <SignalButton>See my Denver shows</SignalButton>
      </div>
    </CFScreen>
  );
}

// ═══ 5 · AUTO-WATCH OPT-IN — one-time, fires at success ═════════
// Two explicit choices. Dismissing (scrim/✕) defaults to highlight-only.
function AutoWatchSheet({ choice = "none" }) {
  const { SpotifyLogo, SheetChrome } = window;
  const Opt = ({ id, icon, title, body, rec }) => {
    const sel = choice === id;
    return (
      <div style={{
        borderRadius: 14, padding: 15, cursor: "pointer",
        background: sel ? "color-mix(in oklch, var(--signal) 10%, var(--surface-1))" : "var(--surface-1)",
        border: sel ? "1.5px solid var(--signal)" : "1px solid var(--border)",
        display: "flex", gap: 12, alignItems: "flex-start", position: "relative",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: sel ? "var(--signal)" : "var(--surface-3)",
          color: sel ? "var(--fg-on-accent)" : "var(--fg-muted)",
        }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", color: "var(--fg)" }}>{title}</span>
            {rec && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--fg-subtle)", border: "1px solid var(--border-strong)", borderRadius: 4, padding: "2px 5px" }}>DEFAULT</span>}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.4, marginTop: 4 }}>{body}</div>
        </div>
        <span style={{
          width: 20, height: 20, borderRadius: 999, flexShrink: 0, marginTop: 2,
          border: sel ? "6px solid var(--signal)" : "2px solid var(--border-strong)",
          background: sel ? "var(--bg)" : "transparent", boxSizing: "border-box",
        }} />
      </div>
    );
  };
  return (
    <SheetChrome height="72%">
      <DragHandle />
      <div style={{ padding: "6px 20px 20px", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SpotifyLogo size={24} />
          <MonoEyebrow size={9} color="var(--signal)" letterSpacing="0.14em">9 ARTISTS PLAY DENVER</MonoEyebrow>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 6 }}>
          Want us to watch these for you?
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.45, marginBottom: 18 }}>
          "Watching" a show means you get a heads-up on new dates and price drops. Your call how eager we are.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Opt id="auto"
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L9 12.3 5.3 14.3l.7-4.3-3.1-3 4.3-.6L9 2.5z" fill="currentColor"/></svg>}
            title="Auto-watch matching shows"
            body="We'll add all 9 to your Watching list now, and any new match automatically. Undo any single one anytime." />
          <Opt id="highlight" rec
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5s2-4.5 5-4.5 5 4.5 5 4.5-2 4.5-5 4.5-5-4.5-5-4.5z" stroke="currentColor" strokeWidth="1.6"/><circle cx="9" cy="9.5" r="1.8" fill="currentColor"/></svg>}
            title="Just highlight them"
            body="We'll mark matching shows with a 'You follow' badge as you browse. You decide what to watch." />
        </div>

        <div style={{ marginTop: "auto", paddingTop: 18 }}>
          <window.SignalButton>{choice === "auto" ? "Auto-watch 9 shows" : "Highlight as I browse"}</window.SignalButton>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <MonoEyebrow size={9} color="var(--fg-subtle)" letterSpacing="0.08em" style={{ textAlign: "center" }}>CHANGE THIS ANYTIME IN SETTINGS ▸ CONNECTIONS</MonoEyebrow>
          </div>
        </div>
      </div>
    </SheetChrome>
  );
}

Object.assign(window, {
  ConnectEntry, FirstWatchNudge, OAuthHandoff, ConnectSuccess, AutoWatchSheet, CF_ARTISTS,
});

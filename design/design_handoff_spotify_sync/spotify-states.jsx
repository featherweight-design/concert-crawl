// spotify-states.jsx — empty + failure states for Spotify Sync
//
// Voice = the shipped Hybrid empty-state: brand presence + clear status, playful
// not cute, never surveillance-y. ("Crickets." / "Signal lost.")
//
//   EmptyDenverMatch   — connected fine, but 0 of your artists play Denver (yet)
//   FailConnectDown    — Spotify unreachable at connect time
//   FailTokenRefresh   — sync broke; token no longer valid (banner + full)
//   FailExternalRevoke — user unlinked us from Spotify's side
//   RevokeBanner       — the compact in-settings warning strip

function StateShell({ children }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)", fontFamily: "Inter, system-ui", padding: "58px 24px 22px", display: "flex", flexDirection: "column" }}>{children}</div>
  );
}

function StateBody({ glyph, eyebrow, eyebrowTone = "muted", title, body, children }) {
  const ec = eyebrowTone === "danger" ? "var(--danger)" : eyebrowTone === "green" ? "var(--signal)" : "var(--fg-subtle)";
  return (
    <div style={{ margin: "auto 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ marginBottom: 18 }}>{glyph}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: ec, marginBottom: 10, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 5, height: 5, borderRadius: 5, background: ec }} />{eyebrow}
      </div>
      <div style={{ fontSize: 25, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.14, marginBottom: 10, maxWidth: 300 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, maxWidth: 300, marginBottom: 22 }}>{body}</div>
      <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

// centered SVG glyph helpers
function GreenDisc({ children, tone = "green" }) {
  const bg = tone === "danger" ? "color-mix(in oklch, var(--danger) 16%, var(--surface-1))" : tone === "muted" ? "var(--surface-2)" : "color-mix(in oklch, var(--signal) 14%, var(--surface-1))";
  const bd = tone === "danger" ? "color-mix(in oklch, var(--danger) 36%, transparent)" : tone === "muted" ? "var(--border-strong)" : "color-mix(in oklch, var(--signal) 30%, transparent)";
  return (
    <div style={{ width: 72, height: 72, borderRadius: 20, background: bg, border: `1px solid ${bd}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
  );
}

// ═══ EMPTY — connected, but nobody plays Denver ════════════════
function EmptyDenverMatch() {
  const { SpotifyLogo, SignalButton } = window;
  return (
    <StateShell>
      <StateBody
        glyph={<GreenDisc><SpotifyLogo size={36} radius={11} /></GreenDisc>}
        eyebrow="34 artists · 0 in denver" eyebrowTone="green"
        title="We got your taste. Denver didn't — yet."
        body="None of your 34 artists have a Denver date on the books right now. The second one does, it jumps to the top of your list.">
        <SignalButton>Watch for my artists</SignalButton>
        <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "11px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Browse everything instead</button>
      </StateBody>
    </StateShell>
  );
}

// ═══ FAILURE — Spotify down at connect ═════════════════════════
function FailConnectDown() {
  const { GreenButton, SpotifyLogo } = window;
  return (
    <StateShell>
      <StateBody
        glyph={<GreenDisc tone="muted"><svg width="34" height="34" viewBox="0 0 34 34" fill="none"><path d="M6 10s5-4 11-4 11 4 11 4M9 16s3.5-3 8-3 8 3 8 3M12 22s2-1.5 5-1.5 5 1.5 5 1.5" stroke="var(--fg-subtle)" strokeWidth="2.2" strokeLinecap="round"/><path d="M4 4l26 26" stroke="var(--fg-muted)" strokeWidth="2.2" strokeLinecap="round"/></svg></GreenDisc>}
        eyebrow="spotify · no answer" eyebrowTone="muted"
        title="Spotify's not picking up."
        body="Nothing you did — their side just isn't answering right now. Nothing was linked, so there's nothing to undo.">
        <GreenButton leftIcon={<SpotifyLogo size={18} radius={5} />}>Try again</GreenButton>
        <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "11px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Maybe later</button>
      </StateBody>
    </StateShell>
  );
}

// ═══ FAILURE — token refresh failed (was working, now broken) ══
function FailTokenRefresh() {
  const { GreenButton, SpotifyLogo } = window;
  return (
    <StateShell>
      <StateBody
        glyph={<GreenDisc tone="danger"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 3v10M16 22v.5" stroke="var(--danger)" strokeWidth="2.6" strokeLinecap="round"/><path d="M27 27a15 15 0 00-22 0" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round" opacity="0.5"/></svg></GreenDisc>}
        eyebrow="sync · lost the thread" eyebrowTone="danger"
        title="We lost the Spotify thread."
        body="Your link expired and Spotify wants a fresh hello. Your saved shows are safe — we just can't spot new matches until you reconnect.">
        <GreenButton leftIcon={<SpotifyLogo size={18} radius={5} />}>Reconnect Spotify</GreenButton>
        <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "11px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Not now</button>
      </StateBody>
    </StateShell>
  );
}

// ═══ FAILURE — user revoked from Spotify's side ════════════════
function FailExternalRevoke() {
  const { GreenButton, SpotifyLogo } = window;
  return (
    <StateShell>
      <StateBody
        glyph={<GreenDisc tone="muted"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M13 19l6-6m-4.5-3l1.5-1.5a5 5 0 017 7L21 17m-10 0l-1.5 1.5a5 5 0 007 7l1.5-1.5" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round"/><path d="M5 5l22 22" stroke="var(--danger)" strokeWidth="2.2" strokeLinecap="round"/></svg></GreenDisc>}
        eyebrow="link · cut on spotify's side" eyebrowTone="muted"
        title="You unlinked us over on Spotify."
        body="Totally fair — and it worked. We've cleared the connection here too. Want back in? It's one tap.">
        <GreenButton leftIcon={<SpotifyLogo size={18} radius={5} />}>Reconnect Spotify</GreenButton>
        <button style={{ all: "unset", cursor: "pointer", textAlign: "center", padding: "11px", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 14, color: "var(--fg-muted)" }}>Leave it unlinked</button>
      </StateBody>
    </StateShell>
  );
}

// ═══ Compact in-settings warning banner (broken-sync variant) ══
function RevokeBanner({ kind = "revoke" }) {
  const { SpotifyLogo } = window;
  const copy = kind === "token"
    ? { t: "Sync paused — link expired", d: "Reconnect to spot new matches again." }
    : { t: "Unlinked from Spotify's side", d: "We cleared it here too. Reconnect anytime." };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px", borderRadius: 14, background: "color-mix(in oklch, var(--warning) 12%, var(--surface-1))", border: "1px solid color-mix(in oklch, var(--warning) 36%, var(--border))" }}>
      <div style={{ position: "relative" }}>
        <SpotifyLogo size={34} radius={9} />
        <span style={{ position: "absolute", right: -3, bottom: -3, width: 16, height: 16, borderRadius: 999, background: "var(--warning)", color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>!</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }}>{copy.t}</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 1 }}>{copy.d}</div>
      </div>
      <button style={{ all: "unset", cursor: "pointer", padding: "7px 12px", borderRadius: 999, background: "var(--signal)", color: "#0A0A0A", fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 12 }}>Reconnect</button>
    </div>
  );
}

Object.assign(window, { EmptyDenverMatch, FailConnectDown, FailTokenRefresh, FailExternalRevoke, RevokeBanner });

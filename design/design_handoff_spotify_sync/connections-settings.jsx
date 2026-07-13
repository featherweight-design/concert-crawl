// connections-settings.jsx — Settings ▸ Connections, CONNECTED state
//
//   ConnectionsConnected  — account · last-synced · artist count · Refresh ·
//                           auto-watch preference · Disconnect
//   ConnectionsRefreshing — mid-sync variant of the same card
//   DisconnectConfirm     — confirmation sheet (warm, clear on what's lost)

const { MonoEyebrow: CsEyebrow, DragHandle: CsHandle, SheetChrome: CsSheet } = window;

function CSScreen({ children }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: "var(--bg)", color: "var(--fg)",
      fontFamily: "Inter, system-ui", padding: "58px 18px 20px",
      display: "flex", flexDirection: "column", overflowY: "auto",
    }}>{children}</div>
  );
}

function ConnHeader() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <svg width="9" height="15" viewBox="0 0 9 15" style={{ marginRight: 2 }}><path d="M7.5 1L1.5 7.5l6 6.5" stroke="var(--fg-muted)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <CsEyebrow size={10} letterSpacing="0.16em">SETTINGS</CsEyebrow>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.035em", margin: "6px 0 18px" }}>Connections</div>
    </>
  );
}

// Row inside the connected card
function CardRow({ label, children, top = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      padding: "13px 0", borderTop: top ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13.5, color: "var(--fg-muted)", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function ConnectedCard({ refreshing = false }) {
  const { SpotifyLogo } = window;
  return (
    <div style={{ borderRadius: 16, background: "var(--surface-1)", border: "1px solid var(--border)", overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <SpotifyLogo size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>Spotify</span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 999,
              background: "color-mix(in oklch, var(--signal) 15%, transparent)",
              border: "1px solid color-mix(in oklch, var(--signal) 32%, transparent)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)", boxShadow: "0 0 6px var(--signal)" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--signal)" }}>LINKED</span>
            </span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--fg-subtle)", letterSpacing: "0.04em", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>maya.k · spotify.com</div>
        </div>
      </div>

      {/* stats + meta */}
      <div style={{ padding: "2px 16px 6px" }}>
        <CardRow label="Artists we know" top>
          <span style={{ fontWeight: 800, fontSize: 14 }}>34 <span style={{ color: "var(--fg-muted)", fontWeight: 500 }}>· 9 play Denver</span></span>
        </CardRow>
        <CardRow label="Last synced">
          {refreshing
            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--signal)" }}>
                <span style={{ width: 11, height: 11, borderRadius: 999, border: "2px solid color-mix(in oklch, var(--signal) 30%, transparent)", borderTopColor: "var(--signal)", animation: "csSpin 0.8s linear infinite", display: "inline-block" }} />
                Syncing…
              </span>
            : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--fg-muted)" }}>2 hours ago</span>}
        </CardRow>
        <CardRow label={<span>Auto-watch matches</span>}>
          {/* toggle — off (highlight-only default) */}
          <span style={{ width: 40, height: 24, borderRadius: 999, background: "var(--surface-3)", border: "1px solid var(--border-strong)", position: "relative", display: "inline-block" }}>
            <span style={{ position: "absolute", top: 2, left: 2, width: 18, height: 18, borderRadius: 999, background: "var(--fg-subtle)" }} />
          </span>
        </CardRow>
      </div>

      {/* actions */}
      <div style={{ padding: 12, display: "flex", gap: 8, borderTop: "1px solid var(--border)" }}>
        <window.SignalButton tone="ghost" size="sm" style={{ flex: 1 }}
          leftIcon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M13 7.5a5.5 5.5 0 11-1.6-3.9M13 2v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          {refreshing ? "Syncing…" : "Refresh my taste"}
        </window.SignalButton>
        <button style={{ all: "unset", cursor: "pointer", padding: "9px 14px", borderRadius: 12, border: "1px solid var(--border-strong)", fontFamily: "Inter, system-ui", fontWeight: 700, fontSize: 13, color: "var(--fg-muted)" }}>Disconnect</button>
      </div>
    </div>
  );
}

function ConnectionsConnected() {
  return (
    <CSScreen>
      <ConnHeader />
      <ConnectedCard />
      <div style={{ marginTop: 14, padding: "0 4px" }}>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.5 }}>
          Refresh pulls your latest top &amp; followed artists — we also refresh quietly on our own about once a week.
        </div>
      </div>
    </CSScreen>
  );
}

function ConnectionsRefreshing() {
  return (
    <CSScreen>
      <ConnHeader />
      <ConnectedCard refreshing />
      <div style={{ marginTop: 14, padding: "0 4px" }}>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.5 }}>
          Checking Spotify for anything new since your last sync. Takes a few seconds.
        </div>
      </div>
    </CSScreen>
  );
}

// ═══ DISCONNECT CONFIRMATION ════════════════════════════════════
function DisconnectConfirm() {
  const { SpotifyLogo, GhostButton } = window;
  return (
    <CsSheet height="58%">
      <CsHandle />
      <div style={{ padding: "10px 22px 22px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <SpotifyLogo size={40} />
            <span style={{ position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 999, background: "var(--bg)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--danger)", fontSize: 12, fontWeight: 800 }}>✕</span>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 8 }}>
          Unlink Spotify?
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.5, marginBottom: 16 }}>
          No hard feelings. Here's exactly what happens the second you tap it:
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 8 }}>
          {[
            ["We drop the connection.", "Your Spotify token is deleted — we forget how to reach it."],
            ["Taste highlights switch off.", "No more 'You follow' flags. Your browsing goes back to plain."],
            ["Shows you're watching stay.", "Anything you already saved is yours — unlinking never touches it."],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 5, height: 5, borderRadius: 5, background: i === 2 ? "var(--signal)" : "var(--fg-subtle)", marginTop: 7, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg)" }}>{t} </span>
                <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{d}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={{ all: "unset", boxSizing: "border-box", cursor: "pointer", width: "100%", textAlign: "center", padding: "13px", borderRadius: 12, background: "color-mix(in oklch, var(--danger) 14%, transparent)", border: "1px solid color-mix(in oklch, var(--danger) 42%, transparent)", fontFamily: "Inter, system-ui", fontWeight: 800, fontSize: 15, color: "var(--danger)" }}>Unlink Spotify</button>
          <GhostButton>Keep it linked</GhostButton>
        </div>
      </div>
    </CsSheet>
  );
}

// keyframes for the refresh spinner (idempotent)
if (typeof document !== "undefined" && !document.getElementById("cs-keyframes")) {
  const s = document.createElement("style");
  s.id = "cs-keyframes";
  s.textContent = "@keyframes csSpin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}

Object.assign(window, { ConnectionsConnected, ConnectionsRefreshing, DisconnectConfirm });

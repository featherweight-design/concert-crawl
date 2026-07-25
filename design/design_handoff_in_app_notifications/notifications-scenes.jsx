// notifications-scenes.jsx — in-situ compositions
//
// Thin scaffolding so the panel/pip read in context. The browse list behind
// the sheet is context only — it is NOT a spec for Browse.

function BrowseBehind() {
  const rows = [
    ["Geese", "Bluebird Theater · Fri Aug 8", "$28"],
    ["Wednesday", "Mission Ballroom · Sat Aug 9", "$34"],
    ["Ekko Astral", "Hi-Dive · Wed Sep 3", "$18"],
    ["MJ Lenderman", "Ogden Theatre · Tue Oct 14", "$39"],
    ["Chat Pile", "Gothic Theatre · Thu Oct 23", "$31"],
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: "hidden", background: "var(--bg)" }}>
      <div style={{ display: "flex", gap: 7, padding: "2px 16px 12px" }}>
        {["date", "venue", "price", "genre"].map((c) => (
          <span key={c} style={{ padding: "6px 11px", borderRadius: 999,
            border: "1px solid var(--border)", background: "var(--surface-1)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)" }}>{c}</span>
        ))}
      </div>
      {rows.map(([artist, meta, price]) => (
        <div key={artist} style={{ display: "flex", gap: 11, alignItems: "center",
          padding: "11px 16px", borderTop: "1px solid var(--border)" }}>
          <span style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0,
            background: "var(--surface-2)", border: "1px solid var(--border)" }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, fontWeight: 700,
              color: "var(--fg)", letterSpacing: "-0.01em" }}>{artist}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-subtle)",
              marginTop: 4 }}>{meta}</div>
          </div>
          <span style={{ fontFamily: "Inter, system-ui", fontSize: 13.5, fontWeight: 800,
            color: "var(--signal)" }}>{price}</span>
        </div>
      ))}
    </div>
  );
}

// Full-height phone screen: chrome + content + optional overlay layer.
function PhoneScene({ items = [], overlay = null, activeTab = 0, unread, state = "ready",
  hasMore = false, content = null }) {
  const n = unread == null ? window.unreadCount(items) : unread;
  return (
    <div style={{ position: "relative", height: "100%", display: "flex",
      flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>
      <window.CCAppBar/>
      {content || <BrowseBehind/>}
      <window.CCTabBar active={activeTab} unread={n}/>
      {overlay && (
        <>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0,
            background: "var(--scrim)" }}/>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0,
            display: "flex", flexDirection: "column",
            height: overlay === "sheet" ? "88%" : "auto" }}>
            {overlay === "sheet" && (
              <window.NotifSheet height="100%" items={items} state={state} hasMore={hasMore}/>
            )}
            {overlay === "menu" && <window.CCUserMenu items={items} mode="strip" sheet/>}
            {overlay === "menuRow" && <window.CCUserMenu items={items} mode="row" sheet/>}
            {overlay === "menuPanel" && <window.CCUserMenu items={items} mode="panel" sheet/>}
          </div>
        </>
      )}
    </div>
  );
}

// Desktop: header + the real user menu anchored under the avatar.
// menu="strip" | "row" | "panel" — "panel" is the See-all state, swapped in place.
function DesktopScene({ items = [], open = true, state = "ready", hasMore = false, unread,
  install = true, offline = false, menu = "strip" }) {
  const n = unread == null ? window.unreadCount(items) : unread;
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--bg)", overflow: "hidden" }}>
      <window.DesktopHeader unread={n} install={install} offline={offline}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, padding: 22 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 132, borderRadius: 10, background: "var(--surface-1)",
            border: "1px solid var(--border)" }}/>
        ))}
      </div>
      {open && (
        <div style={{ position: "absolute", top: 70, right: 28 }}>
          <window.CCUserMenu items={items} mode={menu} width={340} panelMaxHeight={360}/>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BrowseBehind, PhoneScene, DesktopScene });
